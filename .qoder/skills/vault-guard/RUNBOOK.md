# vault-guard — airport runbook

Do this on the laptop, with the phone next to it. Nothing here belongs in chat.

## 0. Get the branch

```bash
git fetch origin
git switch qoder/general-session-vnpxv4
python -m pip show cryptography >/dev/null || python -m pip install cryptography
python -m pip show segno >/dev/null || python -m pip install segno   # optional, for the QR
```

## 1. Collect the current keys (names only are printed)

```bash
python skills/vault-guard/vault_guard.py collect
```

Reads `.private/00-secrets/*.env` → `.private/all-secrets.json`, mode `0600`.
If a set lives elsewhere, add `--from path/a.env path/b.env`.

## 2. Create the envelope

```bash
python skills/vault-guard/vault_guard.py init --dir vault --totp --qr /tmp/otp.svg \
    --save-totp ~/.vault/totp
```

* Scan `/tmp/otp.svg` into Google Authenticator, then `shred -u /tmp/otp.svg`.
* `--save-totp` keeps the base32 in `~/.vault/totp` (0600) so `open`/`run` can
  prompt for the 6 digits instead of asking for the base32 every time.
* `--quiet-totp` keeps the secret off stdout — use it when an agent runs `init`.
  The human still scans the QR and writes the base32 on paper once.
  (Google Authenticator can also take the base32 string by manual entry.)
* Write the **base passphrase** and the **base32 TOTP secret** on paper, two
  copies, separate places. This paper is the only recovery.
* The output shows today's **day shift** as a letter, e.g. `25 → Ч`. The letter's
  position in the Russian alphabet is the ROT; say "Ч" for 25. You do not have to
  remember it: it lives in `keywrap.json`. `--letter Ч` asserts it later.

## 3. Seal, then sanity-check

```bash
python skills/vault-guard/vault_guard.py seal --dir vault --in .private/all-secrets.json --rot 13
python skills/vault-guard/vault_guard.py info --dir vault
python skills/vault-guard/vault_guard.py open --dir vault --names
```

`info` and `--names` must never show a value. If they do, stop and fix the tool.

## 4. Commit only ciphertext

```bash
git add vault/keywrap.json vault/payload.enc
git status --short          # must not list qr.svg, audit.log, or *.json plaintext
git commit -m "Add sealed mindcraft key vault (ciphertext only)"
git push -u origin qoder/general-session-vnpxv4
```

## 5. Daily use (never prints)

```bash
python skills/vault-guard/vault_guard.py wizard --dir vault        # pick a job, exec
python skills/vault-guard/vault_guard.py info --dir vault          # date, ROT letter, names
python skills/vault-guard/vault_guard.py run inflow-news --dir vault
python skills/vault-guard/vault_guard.py rewrap --dir vault        # rotate to today's shift
```

## If the day changed and a job fails

`open` prints `sealed YYYY-MM-DD, day shift N` on stderr. The header value is
authoritative, so decryption still works. `rewrap` only refreshes the salt/nonce
and moves the shift to today; the payload is not re-encrypted.

## If something leaks

Rotate the **provider** credential first, then `seal` again and force-push is
*not* enough — old ciphertext stays in git history. Treat the passphrase as
burned only if it leaked; a leaked provider token is revoked at the provider.
