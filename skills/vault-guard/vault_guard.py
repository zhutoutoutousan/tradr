#!/usr/bin/env python3
"""vault-guard — layered offline secret vault for mindcraft / QoderAI.

Crypto model (envelope, two long-term factors, authenticated encryption):

    passphrase ─┐
                ├─ scrypt ─→ KEK ─ AES-256-GCM ─→ wraps DEK
    TOTP secret ┘                                  │
                                                   └─ AES-256-GCM ─→ payload
                                                        (optionally ROT-256 first)

* The TOTP *shared secret* (160 bit, never stored in the repo) is mixed into
  the KDF. The 6-digit code is only a human gate, not key material.
* `vault/keywrap.json` and `vault/payload.enc` are safe to commit: they contain
  ciphertext only. The private GitHub repo is transport, not security.
* ROT-256 is cosmetic; it is applied for ritual value only and adds no strength.

Secrets are never printed unless you ask for one explicitly. Prefer `--exec`
which injects them into a child process environment (in-memory, no disk).

Usage:
    python skills/vault-guard/vault_guard.py init  --dir vault --totp
    python skills/vault-guard/vault_guard.py seal  --dir vault --in secrets.json
    python skills/vault-guard/vault_guard.py open  --dir vault --names
    python skills/vault-guard/vault_guard.py open  --dir vault --exec -- python job.py
    python skills/vault-guard/vault_guard.py code  --totp-secret-file ~/.vault/totp
    python skills/vault-guard/vault_guard.py self-test

Passphrase / TOTP secret are read from env (VAULT_PASSPHRASE, VAULT_TOTP_SECRET)
or from a 0600 file (--passphrase-file / --totp-secret-file), never from argv.
"""
from __future__ import annotations

import argparse
import base64
import getpass
import hashlib
import hmac
import json
import os
import struct
import subprocess
import sys
import tempfile
import time
from datetime import date
from pathlib import Path

try:
    from cryptography.hazmat.primitives.ciphers.aead import AESGCM
except ImportError:  # pragma: no cover
    sys.exit("Missing dependency: pip install cryptography")

VERSION = 1
AAD_KEYWRAP = b"vault-guard:v1:keywrap"
AAD_PAYLOAD = b"vault-guard:v1:payload"
KDF_N, KDF_R, KDF_P = 2 ** 15, 8, 1
KEYWRAP = "keywrap.json"
PAYLOAD = "payload.enc"


class VaultError(Exception):
    """Recoverable vault error reported without a traceback."""


# ---------- primitives ----------

def b64e(raw: bytes) -> str:
    return base64.b64encode(raw).decode()


def b64d(text: str) -> bytes:
    return base64.b64decode(text.encode())


def canonical(obj) -> bytes:
    return json.dumps(obj, sort_keys=True, separators=(",", ":"), ensure_ascii=False).encode()


def rot(data: bytes, shift: int) -> bytes:
    """ROT-256: byte-wise Caesar shift. Decorative only — zero cryptographic value."""
    shift %= 256
    return bytes((b + shift) & 0xFF for b in data)


def caesar(text: str, shift: int) -> str:
    """Rotate ASCII letters only. A memorability ritual, not key stretching."""
    shift %= 26
    out = []
    for char in text:
        if "A" <= char <= "Z":
            out.append(chr((ord(char) - 65 + shift) % 26 + 65))
        elif "a" <= char <= "z":
            out.append(chr((ord(char) - 97 + shift) % 26 + 97))
        else:
            out.append(char)
    return "".join(out)


CYRILLIC = "АБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯ"  # 33 letters, 1-based


def shift_for_day(day: date) -> int:
    """Today's Caesar shift = day of month (1..31). Easy to say out loud."""
    return day.day


def letter_for_shift(shift: int) -> str:
    """Mnemonic: the Nth Cyrillic letter means ROT N (0 = no rotation)."""
    if not shift:
        return "—"
    return CYRILLIC[(shift - 1) % len(CYRILLIC)]


def shift_for_letter(letter: str) -> int:
    letter = letter.strip().upper()
    if len(letter) != 1 or letter not in CYRILLIC:
        raise VaultError(f"not a Cyrillic letter from the 33-letter alphabet: {letter!r}")
    return CYRILLIC.index(letter) + 1


def describe_shift(shift: int) -> str:
    return f"{shift} → {letter_for_shift(shift)} ({shift}-я бу́ква)" if shift else "0 → —"


def derive_kek(passphrase: str, totp_secret: str | None, salt: bytes, day_shift: int = 0) -> bytes:
    material = caesar(passphrase, day_shift).encode()
    if totp_secret is not None:
        material += b"\x1f" + base32d(totp_secret)
    return hashlib.scrypt(material, salt=salt, n=KDF_N, r=KDF_R, p=KDF_P, dklen=32,
                          maxmem=128 * 1024 * 1024)


def base32d(text: str) -> bytes:
    text = "".join(text.split()).upper().rstrip("=")
    return base64.b32decode(text + "=" * ((8 - len(text) % 8) % 8))


def verify_code(secret_b32: str, code: str, skew: int = 1, at: float | None = None) -> bool:
    """Accept the current 30 s window and one step either side (clock drift)."""
    code = code.strip()
    now = time.time() if at is None else at
    return any(hmac.compare_digest(totp(secret_b32, at=now + offset * 30), code)
               for offset in range(-skew, skew + 1))


def totp(secret_b32: str, at: float | None = None, step: int = 30, digits: int = 6) -> str:
    """RFC 6238, SHA-1, 6 digits — matches Google Authenticator."""
    counter = int((time.time() if at is None else at) // step)
    digest = hmac.new(base32d(secret_b32), struct.pack(">Q", counter), hashlib.sha1).digest()
    offset = digest[-1] & 0x0F
    value = struct.unpack(">I", digest[offset:offset + 4])[0] & 0x7FFFFFFF
    return f"{value % 10 ** digits:0{digits}d}"


# ---------- key material ----------

def read_factor(explicit_file: str | None, env_name: str, label: str) -> str:
    if explicit_file:
        value = Path(explicit_file).expanduser().read_text(encoding="utf-8").strip()
        if value:
            return value
        sys.exit(f"{label}: file {explicit_file} is empty")
    value = os.environ.get(env_name, "").strip()
    if value:
        return value
    if sys.stdin.isatty():
        value = getpass.getpass(f"{label}: ").strip()
        if value:
            return value
    sys.exit(f"{label}: set {env_name}, or pass the matching --*-file")


def load_header(directory: Path) -> dict:
    path = directory / KEYWRAP
    if not path.exists():
        sys.exit(f"No vault at {directory} (missing {KEYWRAP}); run `init` first")
    return json.loads(path.read_text(encoding="utf-8"))


def unwrap_dek(header: dict, passphrase: str, totp_secret: str | None) -> bytes:
    if header["totp"] and not totp_secret:
        sys.exit("Vault requires the TOTP secret (--totp-secret-file / VAULT_TOTP_SECRET)")
    kek = derive_kek(passphrase, totp_secret if header["totp"] else None,
                     b64d(header["salt"]), int(header.get("day_shift", 0)))
    try:
        return AESGCM(kek).decrypt(b64d(header["nonce"]), b64d(header["wrapped"]), AAD_KEYWRAP)
    except Exception:
        raise VaultError("Unlock failed: wrong passphrase/TOTP secret, or keywrap.json was modified")


# ---------- commands ----------

def cmd_init(args) -> None:
    directory = Path(args.dir)
    if (directory / KEYWRAP).exists() and not args.force:
        sys.exit(f"{directory / KEYWRAP} exists; pass --force to overwrite")
    directory.mkdir(parents=True, exist_ok=True)

    totp_secret = None
    if args.totp:
        totp_secret = (args.totp_secret or os.environ.get("VAULT_TOTP_SECRET", "").strip()
                       or base64.b32encode(os.urandom(20)).decode().rstrip("="))

    passphrase = read_factor(args.passphrase_file, "VAULT_PASSPHRASE", "New vault passphrase")
    if len(passphrase) < 12:
        sys.exit("Passphrase too short: use at least 12 characters (a 5-word diceware phrase is better)")
    if args.passphrase_file is None and not os.environ.get("VAULT_PASSPHRASE") and sys.stdin.isatty():
        if getpass.getpass("Repeat passphrase: ") != passphrase:
            sys.exit("Passphrases differ")

    sealed_on = date.fromisoformat(args.seal_date) if args.seal_date else date.today()
    if args.day_shift is not None:
        day_shift = args.day_shift
    elif getattr(args, "letter", None):
        day_shift = shift_for_letter(args.letter)
    else:
        day_shift = shift_for_day(sealed_on)
    if not 0 <= day_shift <= len(CYRILLIC):
        raise VaultError(f"day shift must be 0..{len(CYRILLIC)} (one Cyrillic letter)")
    salt = os.urandom(32)
    dek = os.urandom(32)
    nonce = os.urandom(12)
    kek = derive_kek(passphrase, totp_secret, salt, day_shift)
    wrapped = AESGCM(kek).encrypt(nonce, dek, AAD_KEYWRAP)

    header = {
        "v": VERSION,
        "kdf": "scrypt",
        "n": KDF_N, "r": KDF_R, "p": KDF_P,
        "salt": b64e(salt), "nonce": b64e(nonce), "wrapped": b64e(wrapped),
        "totp": bool(totp_secret),
        "day": sealed_on.isoformat(), "day_shift": day_shift,
    }
    (directory / KEYWRAP).write_text(json.dumps(header, indent=2) + "\n", encoding="utf-8")
    print(f"vault initialised: {directory / KEYWRAP}")
    print(f"day shift: {describe_shift(day_shift)}  (sealed on {sealed_on.isoformat()}; "
          f"passphrase is Caesar-rotated by {day_shift} before scrypt)")
    if totp_secret:
        uri = (f"otpauth://totp/QoderVault:{args.label}?secret={totp_secret}"
               f"&issuer=QoderVault&algorithm=SHA1&digits=6&period=30")
        saved = None
        if args.save_totp:
            path = Path(args.save_totp).expanduser()
            path.parent.mkdir(parents=True, exist_ok=True)
            fd = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
            with os.fdopen(fd, "w", encoding="utf-8") as handle:
                handle.write(totp_secret + "\n")
            saved = path
        if args.quiet_totp:
            if not saved:
                raise VaultError("--quiet-totp needs --save-totp, otherwise the secret exists nowhere")
            print("\nTOTP provisioning (quiet, no secret on stdout):")
            print(f"  secret   {saved} (mode 0600; read it once, write it on paper)")
        else:
            print("\nTOTP provisioning (store this OFF the repo, e.g. phone + paper):")
            print(f"  base32   {totp_secret}")
            print(f"  otpauth  {uri}")
            print(f"  current  {totp(totp_secret)} (changes every 30 s)")
            if saved:
                print(f"  saved    {saved} (mode 0600, keep outside the repo)")
        _maybe_qr(uri, args.qr)
        print("  Google Authenticator → + → scan the QR (or enter the base32 manually)")
        print("  WARNING: losing this secret makes the vault unrecoverable. Back it up offline.")


def _maybe_qr(uri: str, target: str | None) -> None:
    try:
        import segno
    except ImportError:
        print("  (install `segno` to render a QR code: pip install segno)")
        return
    out = Path(target) if target else Path(tempfile.gettempdir()) / "vault-guard-otp.svg"
    segno.make(uri, error="m").save(str(out), scale=6, border=2)
    print(f"  qr       {out}  (scan, then move/delete the file)")


def parse_plaintext(path: Path | None, fmt: str) -> dict[str, str]:
    raw = sys.stdin.read() if path is None or str(path) == "-" else path.read_text(encoding="utf-8")
    if fmt == "env":
        result: dict[str, str] = {}
        for line in raw.splitlines():
            line = line.strip()
            if not line or line.startswith("#"):
                continue
            if line.startswith("export "):
                line = line[7:].strip()
            if "=" not in line:
                continue
            key, value = line.split("=", 1)
            result[key.strip()] = value.strip().strip('"').strip("'")
        return result
    data = json.loads(raw)
    if not isinstance(data, dict):
        sys.exit("Plaintext must be a JSON object or dotenv text")
    return {str(k): str(v) for k, v in data.items()}


def cmd_seal(args) -> None:
    directory = Path(args.dir)
    header = load_header(directory)
    sealed_shift = int(header.get("day_shift", 0))
    claimed = getattr(args, "day_shift", None)
    if getattr(args, "letter", None):
        claimed = shift_for_letter(args.letter)
        if claimed != sealed_shift:
            raise VaultError(f"letter {args.letter.upper()} means ROT {claimed}, "
                             f"but the vault is sealed with ROT {sealed_shift} "
                             f"({letter_for_shift(sealed_shift)})")
    if claimed is not None and claimed != sealed_shift:
        raise VaultError(f"vault was sealed with ROT {sealed_shift} "
                         f"({letter_for_shift(sealed_shift)}), you gave {claimed}")
    print(f"vault: sealed {header.get('day', '?')}, ROT {describe_shift(sealed_shift)}",
          file=sys.stderr)
    passphrase = read_factor(args.passphrase_file, "VAULT_PASSPHRASE", "Vault passphrase")
    totp_secret = None
    if header["totp"]:
        totp_secret = read_factor(args.totp_secret_file, "VAULT_TOTP_SECRET", "TOTP secret")
    dek = unwrap_dek(header, passphrase, totp_secret)

    items = parse_plaintext(Path(args.infile) if args.infile else None, args.format)
    if not items:
        sys.exit("Refusing to seal an empty secret set")
    body = canonical(items)
    nonce = os.urandom(12)
    ciphertext = AESGCM(dek).encrypt(nonce, rot(body, args.rot), AAD_PAYLOAD)
    (directory / PAYLOAD).write_text(
        json.dumps({"v": VERSION, "rot": args.rot % 256, "nonce": b64e(nonce),
                    "ct": b64e(ciphertext)}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"sealed {len(items)} secret(s) → {directory / PAYLOAD}")
    print("names: " + ", ".join(sorted(items)))


def unlock_items(directory: Path, args) -> dict[str, str]:
    """Decrypt the payload into memory. Nothing here prints a value."""
    header = load_header(directory)
    sealed_shift = int(header.get("day_shift", 0))
    claimed = getattr(args, "day_shift", None)
    if getattr(args, "letter", None):
        claimed = shift_for_letter(args.letter)
        if claimed != sealed_shift:
            raise VaultError(f"letter {args.letter.upper()} means ROT {claimed}, "
                             f"but the vault is sealed with ROT {sealed_shift} "
                             f"({letter_for_shift(sealed_shift)})")
    if claimed is not None and claimed != sealed_shift:
        raise VaultError(f"vault was sealed with ROT {sealed_shift} "
                         f"({letter_for_shift(sealed_shift)}), you gave {claimed}")
    print(f"vault: sealed {header.get('day', '?')}, ROT {describe_shift(sealed_shift)}",
          file=sys.stderr)
    passphrase = read_factor(args.passphrase_file, "VAULT_PASSPHRASE", "Vault passphrase")
    totp_secret = None
    if header["totp"]:
        totp_secret = read_factor(args.totp_secret_file, "VAULT_TOTP_SECRET", "TOTP secret")
        code = args.code
        if code is None and not getattr(args, "no_code_prompt", False) and sys.stdin.isatty():
            code = getpass.getpass("6-digit code from Google Authenticator: ")
        if code is not None and not verify_code(totp_secret, code):
            raise VaultError("TOTP code rejected (clock skew or wrong secret)")
    dek = unwrap_dek(header, passphrase, totp_secret)

    payload_path = directory / PAYLOAD
    if not payload_path.exists():
        raise VaultError(f"No payload at {payload_path}; run `seal` first")
    blob = json.loads(payload_path.read_text(encoding="utf-8"))
    try:
        body = AESGCM(dek).decrypt(b64d(blob["nonce"]), b64d(blob["ct"]), AAD_PAYLOAD)
    except Exception:
        raise VaultError("payload.enc failed authentication (file changed or wrong vault)")
    return json.loads(rot(body, -int(blob.get("rot", 0))))


def select_keys(items: dict[str, str], keys: list[str] | str | None) -> dict[str, str]:
    if not keys or keys == "*":
        return dict(items)
    names = keys.split(",") if isinstance(keys, str) else list(keys)
    names = [n.strip() for n in names if n.strip()]
    missing = [n for n in names if n not in items]
    if missing:
        raise VaultError(f"not in vault: {', '.join(missing)}")
    return {n: items[n] for n in names}


def minimal_env() -> dict[str, str]:
    keep = ("PATH", "HOME", "LANG", "LC_ALL", "TMPDIR", "SHELL", "USER", "TERM", "PWD")
    return {k: os.environ[k] for k in keep if k in os.environ}


def audit(directory: Path, action: str, keys, command: list[str] | None = None) -> None:
    """Append key *names* only — never a value. gitignored."""
    entry = {
        "ts": time.strftime("%Y-%m-%dT%H:%M:%S%z"),
        "action": action,
        "keys": sorted(keys),
        "cmd": command or [],
        "uid": os.getuid() if hasattr(os, "getuid") else None,
    }
    try:
        with (directory / "audit.log").open("a", encoding="utf-8") as handle:
            handle.write(json.dumps(entry, ensure_ascii=False) + "\n")
    except OSError:
        pass  # an unwritable audit trail must not block the job, but see SKILL.md


def cmd_open(args) -> None:
    directory = Path(args.dir)
    items = unlock_items(directory, args)

    if args.names:
        print("\n".join(sorted(items)))
        return
    if args.get:
        if not sys.stdout.isatty() and not args.force_print:
            raise VaultError(
                "--get refuses to print to a non-TTY (that is how values reach a model "
                "context). Use `run`/`--exec`, or --force-print in a human shell.")
        if args.get not in items:
            raise VaultError(f"No such secret: {args.get}")
        print(items[args.get])
        return
    if args.exec:
        command = args.rest[1:] if args.rest[:1] == ["--"] else args.rest
        if not command:
            raise VaultError("No command after --exec")
        _exec_with(directory, command, select_keys(items, args.only), args, "exec")
        return
    raise VaultError("Choose one: --names, --get NAME, or --exec -- <command>")


def _exec_with(directory: Path, command: list[str], selected: dict[str, str], args, action: str) -> None:
    env = minimal_env() if getattr(args, "minimal_env", False) else dict(os.environ)
    env.update(selected)
    if getattr(args, "dry_run", False):
        print(f"would run: {' '.join(command)}")
        print(f"would inject ({len(selected)}): {', '.join(sorted(selected)) or '-'}")
        return
    audit(directory, action, selected, command)
    if os.name == "nt":
        # Windows: os.execv* starts the child but never hands over the console, so the
        # job never comes up. Spawn it; the keys exist only in the child's environment
        # once Popen returns.
        subprocess.Popen(command, env=env)
        return
    # execvpe replaces this process: no parent copy of the secrets stays resident.
    os.execvpe(command[0], command, env)


def load_jobs(path: Path) -> dict:
    if not path.exists():
        raise VaultError(f"No job file at {path}; copy jobs.example.json and edit it by hand")
    data = json.loads(path.read_text(encoding="utf-8"))
    return data.get("jobs", data)


def cmd_run(args) -> None:
    directory = Path(args.dir)
    jobs_path = Path(args.jobs) if args.jobs else directory / "jobs.json"
    job = load_jobs(jobs_path).get(args.job)
    if not job:
        known = ", ".join(sorted(load_jobs(jobs_path))) or "-"
        raise VaultError(f"Unknown job '{args.job}'. Known: {known}")
    keys = job.get("keys", "*")
    selected = select_keys(unlock_items(directory, args), keys)
    args.minimal_env = job.get("env", "inherit") == "minimal"
    _exec_with(directory, list(job["command"]), selected, args, f"job:{args.job}")


def cmd_jobs(args) -> None:
    jobs_path = Path(args.jobs) if args.jobs else Path(args.dir) / "jobs.json"
    for name, job in sorted(load_jobs(jobs_path).items()):
        keys = job.get("keys", "*")
        keys = keys if isinstance(keys, str) else ",".join(keys)
        print(f"{name:<20} keys={keys:<40} {' '.join(job['command'])}")



def cmd_code(args) -> None:
    secret = read_factor(args.totp_secret_file, "VAULT_TOTP_SECRET", "TOTP secret")
    print(totp(secret))


def cmd_rewrap(args) -> None:
    """Change passphrase (and/or TOTP factor) without touching the secrets."""
    directory = Path(args.dir)
    header = load_header(directory)
    old_pass = read_factor(args.passphrase_file, "VAULT_PASSPHRASE", "Current passphrase")
    old_totp = None
    if header["totp"]:
        old_totp = read_factor(args.totp_secret_file, "VAULT_TOTP_SECRET", "Current TOTP secret")
    dek = unwrap_dek(header, old_pass, old_totp)

    new_secret_b32 = old_totp
    if args.totp:
        new_secret_b32 = base64.b32encode(os.urandom(20)).decode().rstrip("=")
        print(f"NEW TOTP secret (re-enrol your authenticator): {new_secret_b32}")
        _maybe_qr(f"otpauth://totp/QoderVault:{args.label}?secret={new_secret_b32}&issuer=QoderVault",
                  args.qr)
    wants_new_pass = bool(args.new_passphrase_file or os.environ.get("VAULT_NEW_PASSPHRASE"))
    new_pass = (read_factor(args.new_passphrase_file, "VAULT_NEW_PASSPHRASE", "New passphrase")
                if wants_new_pass else old_pass)
    rotated_on = date.fromisoformat(args.seal_date) if args.seal_date else date.today()
    if args.day_shift is not None:
        new_shift = args.day_shift
    elif getattr(args, "letter", None):
        new_shift = shift_for_letter(args.letter)
    else:
        new_shift = shift_for_day(rotated_on)
    if not 0 <= new_shift <= len(CYRILLIC):
        raise VaultError(f"day shift must be 0..{len(CYRILLIC)} (one Cyrillic letter)")
    salt, nonce = os.urandom(32), os.urandom(12)
    wrapped = AESGCM(derive_kek(new_pass, new_secret_b32, salt, new_shift)).encrypt(nonce, dek, AAD_KEYWRAP)
    header.update({"salt": b64e(salt), "nonce": b64e(nonce), "wrapped": b64e(wrapped),
                   "totp": bool(new_secret_b32), "day": rotated_on.isoformat(),
                   "day_shift": new_shift})
    print(f"rotated: day {rotated_on.isoformat()} → ROT {describe_shift(new_shift)}")
    (directory / KEYWRAP).write_text(json.dumps(header, indent=2) + "\n", encoding="utf-8")
    print(f"re-wrapped: {directory / KEYWRAP}")


def cmd_collect(args) -> None:
    """Merge local dotenv files into one JSON for `seal`. Prints names only."""
    if args.from_files:
        paths = [Path(item) for item in args.from_files]
    else:
        paths = sorted(Path(args.source_dir).glob("*.env"))
    if not paths:
        raise VaultError(f"no .env files under {args.source_dir}")
    merged: dict[str, str] = {}
    origin: dict[str, str] = {}
    for path in paths:
        if not path.exists():
            print(f"  skip  {path} (missing)", file=sys.stderr)
            continue
        prefix = f"{path.stem.upper()}_" if args.prefix else ""
        for key, value in parse_plaintext(path, "env").items():
            name = prefix + key.upper()
            if not name.replace("_", "").isalnum() or not name[0].isalpha():
                print(f"  skip  {path.name}:{key} → invalid name {name}", file=sys.stderr)
                continue
            if name in merged and origin[name] != str(path):
                print(f"  dup   {name} already from {Path(origin[name]).name}", file=sys.stderr)
                continue
            merged[name] = value
            origin[name] = str(path)
    if not merged:
        raise VaultError("nothing collected")
    out = Path(args.out)
    out.parent.mkdir(parents=True, exist_ok=True)
    fd = os.open(out, os.O_WRONLY | os.O_CREAT | os.O_TRUNC, 0o600)
    with os.fdopen(fd, "w", encoding="utf-8") as handle:
        json.dump(merged, handle, indent=2, sort_keys=True)
        handle.write("\n")
    print(f"collected {len(merged)} names from {len(paths)} file(s) → {out} (mode 0600)")
    print("names: " + ", ".join(sorted(merged)))


def cmd_info(args) -> None:
    directory = Path(args.dir)
    header = load_header(directory)
    names = sorted(unlock_items(directory, args))
    print(f"vault      {directory}")
    print(f"sealed     {header.get('day', '?')}")
    shift = int(header.get("day_shift", 0))
    print(f"day shift  {describe_shift(shift)}")
    print(f"totp       {'yes' if header.get('totp') else 'no'}")
    print(f"kdf        {header.get('kdf')} n={header.get('n')} r={header.get('r')} p={header.get('p')}")
    print(f"keys       {len(names)}: {', '.join(names) or '-'}")


def cmd_wizard(args) -> None:
    if not sys.stdin.isatty():
        raise VaultError("wizard needs a TTY (a human at a keyboard)")
    today = date.today()
    shift = shift_for_day(today)
    print(f"vault-guard — {today.isoformat()}, Caesar shift {shift}")
    jobs_path = Path(args.jobs) if args.jobs else Path(args.dir) / "jobs.json"
    jobs = load_jobs(jobs_path)
    print("jobs:")
    for index, name in enumerate(sorted(jobs), 1):
        print(f"  {index}. {name}")
    choice = input("pick a job (number or name): ").strip()
    if choice.isdigit() and 1 <= int(choice) <= len(jobs):
        args.job = sorted(jobs)[int(choice) - 1]
    else:
        args.job = choice
    if not args.job:
        raise VaultError("no job selected")
    cmd_run(args)


def cmd_self_test(_args) -> None:
    failures: list[str] = []

    def check(name: str, condition: bool) -> None:
        print(f"  {'ok  ' if condition else 'FAIL'} {name}")
        if not condition:
            failures.append(name)

    with tempfile.TemporaryDirectory() as tmp:
        directory = Path(tmp) / "v"
        directory.mkdir()
        secret = base64.b32encode(os.urandom(20)).decode().rstrip("=")  # desensitize:ignore
        passphrase = "correct horse battery staple 42"  # desensitize:ignore
        salt, dek = os.urandom(32), os.urandom(32)
        nonce = os.urandom(12)
        wrapped = AESGCM(derive_kek(passphrase, secret, salt, 25)).encrypt(nonce, dek, AAD_KEYWRAP)
        (directory / KEYWRAP).write_text(json.dumps({
            "v": 1, "kdf": "scrypt", "n": KDF_N, "r": KDF_R, "p": KDF_P,
            "salt": b64e(salt), "nonce": b64e(nonce), "wrapped": b64e(wrapped), "totp": True,
            "day": "2026-11-25", "day_shift": 25,
        }), encoding="utf-8")
        sample = {"ALPHA": "1", "BETA": "two"}
        body = canonical(sample)
        pnonce = os.urandom(12)
        (directory / PAYLOAD).write_text(json.dumps({
            "v": 1, "rot": 42, "nonce": b64e(pnonce),
            "ct": b64e(AESGCM(dek).encrypt(pnonce, rot(body, 42), AAD_PAYLOAD)),
        }), encoding="utf-8")

        header = load_header(directory)
        dek2 = unwrap_dek(header, passphrase, secret)
        check("unwraps DEK with both factors", dek2 == dek)

        bad = False
        try:
            unwrap_dek(header, passphrase, "ZZZZZZZZZZZZZZZZ")
        except (VaultError, Exception):
            bad = True
        check("wrong TOTP secret rejected", bad)

        bad = False
        try:
            unwrap_dek(header, passphrase + "x", secret)
        except (VaultError, Exception):
            bad = True
        check("wrong passphrase rejected", bad)

        blob = json.loads((directory / PAYLOAD).read_text())
        ct = bytearray(b64d(blob["ct"]))
        ct[0] ^= 1
        bad = False
        try:
            AESGCM(dek).decrypt(b64d(blob["nonce"]), bytes(ct), AAD_PAYLOAD)
        except Exception:
            bad = True
        check("tampered ciphertext rejected", bad)

        plain = rot(AESGCM(dek).decrypt(b64d(blob["nonce"]), b64d(blob["ct"]), AAD_PAYLOAD), -42)
        check("round-trip matches", json.loads(plain) == sample)
        check("ciphertext contains no plaintext", b"ALPHA" not in b64d(blob["ct"]))
        check("totp stable within 30 s window", totp(secret, at=1_700_000_010.0) == totp(secret, at=1_700_000_020.0))
        check("totp changes across windows", totp(secret, at=1_700_000_010.0) != totp(secret, at=1_700_000_041.0))

        check("caesar rotates letters only", caesar("Az-9_", 1) == "Ba-9_")
        check("caesar wraps around", caesar("Zz", 1) == "Aa")
        check("day shift is day of month", shift_for_day(date(2026, 11, 25)) == 25)
        check("letter 25 is Ч", letter_for_shift(25) == "Ч")
        check("letter 31 is Э", letter_for_shift(31) == "Э")
        check("letter 1 is А", letter_for_shift(1) == "А")
        check("letter Ч means 25", shift_for_letter("ч") == 25)
        bad = False
        try:
            shift_for_letter("Q")
        except VaultError:
            bad = True
        check("non-Cyrillic rejected", bad)
        now = 1_700_000_010.0
        check("code accepted in its window", verify_code(secret, totp(secret, at=now), at=now))
        check("wrong code rejected", not verify_code(secret, "000000" if totp(secret, at=now) != "000000" else "111111", at=now))

        bad = False
        try:
            unwrap_dek(header, passphrase, secret)
        except Exception:
            bad = True
        check("header shift is used", not bad)
        bad = False
        try:
            kek = derive_kek(passphrase, secret, salt, 24)
            AESGCM(kek).decrypt(b64d(header["nonce"]), b64d(header["wrapped"]), AAD_KEYWRAP)
        except Exception:
            bad = True
        check("wrong day shift rejected", bad)

    if failures:
        sys.exit(f"self-test failed: {', '.join(failures)}")
    print("self-test passed")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Layered offline secret vault (scrypt + AES-256-GCM)")
    sub = parser.add_subparsers(dest="cmd", required=True)

    def factors(p):
        p.add_argument("--passphrase-file")
        p.add_argument("--totp-secret-file")
        p.add_argument("--code", help="optional 6-digit gate; the TOTP secret is the real factor")
        p.add_argument("--day-shift", type=int, help="assert the vault's Caesar ROT")
        p.add_argument("--letter", help="assert with a Cyrillic letter (position = ROT)")
        p.add_argument("--no-code-prompt", action="store_true", help="never prompt for the 6-digit code")

    p = sub.add_parser("init", help="create keywrap.json and print TOTP provisioning")
    p.add_argument("--dir", default="vault")
    p.add_argument("--totp", action="store_true", help="enable TOTP as a second factor")
    p.add_argument("--totp-secret", help="reuse an existing base32 secret instead of generating one")
    p.add_argument("--label", default="mindcraft")
    p.add_argument("--qr")
    p.add_argument("--force", action="store_true")
    p.add_argument("--seal-date", help="YYYY-MM-DD used for the Caesar day shift (default: today)")
    p.add_argument("--save-totp", help="write the TOTP secret to this 0600 file (outside the repo)")
    p.add_argument("--quiet-totp", action="store_true",
                   help="do not print the TOTP secret (requires --save-totp); safe to run under an agent")
    factors(p)
    p.set_defaults(func=cmd_init)

    p = sub.add_parser("seal", help="encrypt a JSON/dotenv secret set into payload.enc")
    p.add_argument("--dir", default="vault")
    p.add_argument("--in", dest="infile")
    p.add_argument("--format", choices=["json", "env"], default="json")
    p.add_argument("--rot", type=int, default=0, help="cosmetic ROT-256 shift before encryption")
    factors(p)
    p.set_defaults(func=cmd_seal)

    p = sub.add_parser("open", help="decrypt: list names, read one, or exec with secrets")
    p.add_argument("--dir", default="vault")
    p.add_argument("--names", action="store_true")
    p.add_argument("--get")
    p.add_argument("--force-print", action="store_true", help="allow --get when stdout is not a TTY")
    p.add_argument("--exec", action="store_true", help="exec a command with the secrets in its env")
    p.add_argument("--only", help="comma-separated key subset for --exec")
    p.add_argument("--minimal-env", action="store_true", help="do not inherit the parent environment")
    p.add_argument("--dry-run", action="store_true", help="show what would run, inject nothing")
    p.add_argument("rest", nargs=argparse.REMAINDER)
    factors(p)
    p.set_defaults(func=cmd_open)

    p = sub.add_parser("run", help="exec a named job from jobs.json with only its keys")
    p.add_argument("job")
    p.add_argument("--dir", default="vault")
    p.add_argument("--jobs")
    p.add_argument("--dry-run", action="store_true")
    factors(p)
    p.set_defaults(func=cmd_run)

    p = sub.add_parser("jobs", help="list jobs.json entries (names only)")
    p.add_argument("--dir", default="vault")
    p.add_argument("--jobs")
    p.set_defaults(func=cmd_jobs)

    p = sub.add_parser("code", help="print the current 6-digit TOTP for a secret")
    factors(p)
    p.set_defaults(func=cmd_code)

    p = sub.add_parser("rewrap", help="change passphrase and/or TOTP factor")
    p.add_argument("--dir", default="vault")
    p.add_argument("--totp", action="store_true", help="generate a new TOTP secret")
    p.add_argument("--label", default="mindcraft")
    p.add_argument("--qr")
    p.add_argument("--new-passphrase-file")
    p.add_argument("--seal-date", help="YYYY-MM-DD for the new shift (default: today)")
    factors(p)
    p.set_defaults(func=cmd_rewrap)

    p = sub.add_parser("collect", help="merge local .env files into one JSON (names only)")
    p.add_argument("--source-dir", default=".private/00-secrets")
    p.add_argument("--from", dest="from_files", nargs="*", help="explicit files instead of --source-dir")
    p.add_argument("--prefix", action="store_true", help="prefix names with the file stem")
    p.add_argument("--out", default=".private/all-secrets.json")
    p.set_defaults(func=cmd_collect)

    p = sub.add_parser("info", help="show header fields and key names (no values)")
    p.add_argument("--dir", default="vault")
    factors(p)
    p.set_defaults(func=cmd_info)

    p = sub.add_parser("wizard", help="interactive picker: date, shift, job, then exec")
    p.add_argument("--dir", default="vault")
    p.add_argument("--jobs")
    factors(p)
    p.set_defaults(func=cmd_wizard)

    p = sub.add_parser("self-test", help="run crypto round-trip and tamper checks")
    p.set_defaults(func=cmd_self_test)
    return parser


def main() -> None:
    args = build_parser().parse_args()
    try:
        args.func(args)
    except VaultError as exc:
        sys.exit(str(exc))


if __name__ == "__main__":
    main()
