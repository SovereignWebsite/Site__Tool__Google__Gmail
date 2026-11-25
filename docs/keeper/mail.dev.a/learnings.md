# Learnings: mail.dev.a (23 to 25 November 2026)

- **Send ids only after the command returns.** Twice I sent a commit id before the push finished, and it was wrong both times.
- **Create each vault in a new empty folder, and check its id before writing.** A second `sgit create` in an existing clone's folder re-initialised it as a new vault and lost the old vault's write key.
- **Times from the clock.** Estimates written ahead of the clock had to be corrected from git.
- **The leak scan refuses long hex.** Keep hashes out of committed fixtures; store the canonical bytes, compute the hashes in the test, and send them by message.
- **Permission checks.** Pushes to dev, force-pushes and add_repo can be refused by the session's check. Stop, do not work around it, and ask Dinis to say it in the session. A rebased branch can go to a new `-r2` branch without force.
- **Shared code in one file.** The CRM imports `signoff.mjs` unedited and pinned. One file with no page access and one vendored import keeps both sides on the same bytes.
- **Real-looking names in demos.** Synthetic organisations that might match real companies, labelled "prospect", read as naming real prospects. Use "Example ... (demo)".
- **Read only attached repositories,** even when a file is public. Ask for an attach instead.
