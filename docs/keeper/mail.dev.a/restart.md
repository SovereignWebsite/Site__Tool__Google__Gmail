# Restart: how a new session takes over from mail.dev.a

For cl-3.mail.dev@AgentiCCells.dinis (account C), or any successor. Read `now.md` first.

## Attach (each needs Dinis's yes in the new session)
- SovereignWebsite/Site__Tool__Google__Gmail, with push (this site; you are its keeper).
- AgentiCCells/AgentiCCells__Cell__Email, with push (the Email Cell; its CLAUDE.md applies there).
- Later: SovereignWebsite/Site__Agent__Mail (your area), SovereignWebsite/Site__Tool__Google__Calendar (once it exists).

## First steps
1. Make your own key: `sgit-ai pki keygen --label <your-label>` with a random passphrase in a 0600 file under ~/.sg-send/. Convert the signing half to OpenSSH form with python's `cryptography` (load the PEM with the passphrase, write PrivateFormat.OpenSSH). Install `openssh-client` if ssh-keygen is missing. Set repo-locally: `gpg.format ssh`, `gpg.ssh.program /usr/bin/ssh-keygen`, `user.signingkey <path>`, `commit.gpgsign true`.
2. In this repository, publish it alone in its own commit at `site/keys/<name>.json` (fields: agent, status "live", session, bundle {sign, encrypt, ...}), then push to dev. `.github/ci/signers.mjs` lets that one commit through.
3. In the Email Cell, add your key entry under `team/keys/` on your own branch; only Dinis merges a key there.
4. Before each push here: `node .github/ci/build.mjs`, `node .github/ci/share-check.mjs _site`, `node .github/ci/quality.mjs _site`, `npx html-validate@8.24.0 --config .github/ci/htmlvalidate.json "_site/**/*.html"`, and axe (`npm install --no-save playwright@1.49.1 @axe-core/playwright@4.10.1`; if the pinned browser is missing, run a copy of axe.mjs with `executablePath: '/opt/pw-browsers/chromium'`). Delete node_modules afterwards. If the seed adds `tools/check.sh`, use that.
5. In the Email Cell: `bash scripts/release.sh` runs every gate. Land on dev only on Dinis's word or a decision record, after a.mail.conductor's review.
6. Tell a.mail.conductor and the maestro of your account that you have taken over, with your key's fingerprint.

## Wake
The old wake (trig_01Y12hntBLrdJxum3YRLeZaP, hourly at :29) is disabled after the move. Your account's maestro creates the new one.

## Rules that matter most here
- Demo first, always clearly marked; never real mail, contacts or tokens in a repository or a public vault.
- No agent sends or reads mail: a person presses Send in their own browser.
- One-way doors stay Dinis's: anything sent outside, the Google client and credentials, main, deletions.
- Take every time from `date -u` or git. Send commit ids only after the push has returned.
