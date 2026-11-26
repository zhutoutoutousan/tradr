---
name: vault-guard
description: >-
  Layered offline secret vault for mindcraft. One passphrase + one TOTP secret
  unwrap an AES-256-GCM envelope; only ciphertext is committed to the private
  GitHub repo. Use when the human names vault-guard, "all my keys in GitHub",
  TOTP / Google Authenticator, AES-256, passphrase, cold backup, or asks how
  Claude should load secrets safely.
---

# vault-guard

Tool: [`skills/vault-guard/vault_guard.py`](../../../skills/vault-guard/vault_guard.py)
(crypto: `scrypt` → KEK → AES-256-GCM wraps a random DEK → AES-256-GCM payload).

## What it is for

A **cold backup** of all keys that is safe to sit in a private GitHub repo.
The repo is transport and versioning; it is **not** a security boundary.

Online use inside Qoder Cloud keeps using `cron/vault-sync.py` +
`cron/cloud-agent-run.py` (platform-injected `vault_ids`, 32 env vars, never on
disk). `vault-guard` answers a different question: *how do I keep a copy of
everything that survives losing a laptop or a cloud account?*

## Layers, honestly

| Layer | Buys you | Does **not** buy you |
| --- | --- | --- |
| Private GitHub repo | versioning, cheap off-site copy | secrecy — assume it leaks |
| AES-256-GCM | confidentiality + tamper detection (AuthenticatedEncryption) | protection from a compromised agent after unlock |
| scrypt (n=2^15, r=8) | slows offline passphrase guessing | rescue from a weak passphrase |
| TOTP **secret** mixed into the KDF | a second 160-bit factor that never touches the repo | anything if the secret is stored beside the vault |
| 6-digit TOTP code | human intent check | key material — 20 bits, brute-forceable offline |
| Caesar day shift on the passphrase | a ritual you can say out loud, and a changing KEK input | entropy — 31 values, ~5 bits |
| ROT-256 before AES | ritual only | zero cryptographic value |

Do not call ROT a security layer. It is `--rot 13` for the aesthetic.

## Rotating day shift

The effective passphrase is `caesar(base_passphrase, day_of_month)`. The header
stores `day` and `day_shift`, so a backup is never a treasure hunt; `--day-shift N`
asserts it and fails loudly on a mismatch. `rewrap` re-wraps the DEK with today's
shift (fresh salt + nonce, payload untouched, base passphrase unchanged).

The shift is recorded in plaintext on purpose. Keeping it out would mean trying
31 values or remembering a calendar — a lockout, not a factor. It changes what
`scrypt` sees, which is nice, but it is not what keeps the vault shut.

### Unlock UX: passphrase, then six digits

`init --save-totp ~/.vault/totp` writes the base32 secret once to a `0600` file
outside the repo. After that, every `open` / `run` / `wizard` prompts for the
passphrase and then for the 6-digit code, which is checked with ±30 s tolerance.
`--code 123456` works non-interactively; `--no-code-prompt` skips it for cron.
`init --quiet-totp` (with `--save-totp`) keeps the base32 off stdout, so an agent
can create the vault without the secret entering its context; the human scans the
QR and writes the secret on paper.

The code is a human gate, not a second key: the tool still needs the base32 to
derive the KEK, so a phone-only secret breaks unattended use. Type the code into
the terminal prompt, never into chat — chat is the context you are avoiding.

### One Cyrillic letter as the mnemonic

The shift is also printed as the Nth letter of the 33-letter Russian alphabet:

| ROT | 1 | 2 | … | 25 | 26 | 27 | … | 31 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| letter | А | Б | … | Ч | Ш | Щ | … | Э |

Say "Ч" and it means ROT 25. `--letter Ч` asserts it and fails if the letter does
not match the header. The letter follows from the date (day of month), so it is a
memory hook, not a secret.

## Runtime injection is the point

The decrypting process **execs** the target job (`os.execvpe`), so the plaintext
exists only in that process's environment for its lifetime. It is never written
to stdout, a file, a log, or the model context, and no parent process keeps a
copy.

Three controls enforce that:

1. **Job allowlist.** `vault/jobs.json` maps a job name to a command and the
   exact keys it may see. `run <job>` is the sanctioned entry point; there is no
   shell string to inject into.
2. **Least privilege.** A job gets only its `keys`, and `"env": "minimal"` drops
   the inherited environment so unrelated secrets do not ride along.
3. **Print guard.** `--get` refuses to write to a non-TTY, which is exactly the
   pipe an agent uses to capture output. A human at a terminal can still use
   `--get` (or `--force-print`).

```bash
cp skills/vault-guard/jobs.example.json vault/jobs.json   # edit by hand
python skills/vault-guard/vault_guard.py jobs --dir vault
python skills/vault-guard/vault_guard.py run inflow-news --dir vault --dry-run
python skills/vault-guard/vault_guard.py run inflow-news --dir vault
```

`vault/audit.log` records timestamp, key **names** and the argv — never a value.

### What this still does not stop

If the agent holds the passphrase *and* the TOTP secret (the cloud-sandbox case),
it can call `open --get --force-print` or `run` a job it just wrote into
`jobs.json`. The runtime design protects against **accidental** context leakage —
logs, transcripts, model memory — not against a fully compromised agent. Real
enforcement needs the factors to stay outside the agent, or a vault daemon that
reads an allowlist the agent cannot write.

## Commands

```bash
# 1. create the envelope; prints the TOTP secret + otpauth URI + QR (keep OFF the repo)
python skills/vault-guard/vault_guard.py init --dir vault --totp --qr /tmp/vault-otp.svg \
    --save-totp ~/.vault/totp      # 0600, outside the repo; enables the code prompt

# 2. collect the local .env files into one JSON (0600), then seal it (stays in .private/)
python skills/vault-guard/vault_guard.py collect
python skills/vault-guard/vault_guard.py seal --dir vault --in .private/all-secrets.json --rot 13

# 3. use it — never print values, exec a vetted job
python skills/vault-guard/vault_guard.py wizard --dir vault
python skills/vault-guard/vault_guard.py info --dir vault
python skills/vault-guard/vault_guard.py run inflow-news --dir vault
python skills/vault-guard/vault_guard.py open --dir vault --exec --only A,B -- python job.py

# 4. rotate to today's Caesar shift, or re-enrol TOTP
python skills/vault-guard/vault_guard.py rewrap --dir vault
python skills/vault-guard/vault_guard.py rewrap --dir vault --totp

# 5. after any edit to the script
python skills/vault-guard/vault_guard.py self-test
```

Factors come from `VAULT_PASSPHRASE` / `VAULT_TOTP_SECRET` or from
`--passphrase-file` / `--totp-secret-file` (0600, outside the repo). They are
never read from argv, so they do not land in shell history or `ps`.

## What gets committed

```
vault/keywrap.json   # salt, nonce, wrapped DEK, KDF params — ciphertext only
vault/payload.enc    # nonce + AES-256-GCM ciphertext — ciphertext only
```

Never commit `vault/qr*.svg` (the QR *is* the TOTP secret), `*.pass`, `totp*`,
or any plaintext export. Both ignore files already cover these paths.

## Agent rules

- Never paste, echo, log or summarise a secret value. `run` is the default entry
  point; `--get NAME` only works for a human at a TTY.
- Never `cat` `keywrap.json` into chat as a "debug" step.
- Do not invent that a vault was created or migrated. `init` is a human step.
- If a value leaks: rotate the **provider** token first, then re-`seal`. Deleting
  the ciphertext does not revoke anything.
- The 6-digit code is a gate, not a factor you can rebuild from the vault.
  Losing the TOTP secret or passphrase = unrecoverable by design. Recovery is an
  offline paper backup, not a support ticket.

## Failure modes to state out loud

1. **Unlocked means plaintext.** Once the agent holds the DEK, a prompt
   injection or a malicious skill can read every value. Scope one vault per
   trust level if that matters.
2. **A weak passphrase plus a leaked TOTP secret is one factor.** Use 5+ diceware
   words, or a password-manager-generated string stored offline.
3. **GitHub account is the real perimeter.** Passkey/2FA on the account and a
   fine-grained PAT matter more than the cipher choice.
4. **Custom crypto.** This tool is small and tested, but for the three most
   valuable credentials prefer audited tooling: `age -p`, `sops` + `age`, or a
   `1Password` / `Bitwarden` CLI. Keep `vault-guard` for the long tail.
