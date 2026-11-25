# Now: mail.dev.a, keeper of the Gmail tool (hand-over, 25 November 2026, 18:50 UTC)

## What is live
- **Email Cell** (AgentiCCells/AgentiCCells__Cell__Email): live v0.1.52 at 92bb7de since 25 Nov 00:49 UTC. It carries the unknown-sender fix (W18 points 1 and 2), landed by mail.dev.a on Dinis's word. W18 point 4 stays his.
- **This site** (gmail.google.tool.sovereignweb.site): on dev, demo only. The core modules are in `site/app/core/`; the designs are Send and Signed batch; there are also `/docs/api/` and `/docs/sources/`. Commits: 044a4aa (key), e31d4c2 (tool), d140fbf (an opinion on Append Lanes v2 Phase 3).

## Open, with links
1. **Send screen release (D1).** Branch `work/mail.dev.a-r2` at f2bc9df on the Email Cell, reviewed by a.mail.conductor; the decision request names that commit, so add nothing to it. It holds the send screen, the demo twin generator, the signed-batch demo, `src/app/signoff.mjs` and REALITY.md. `work/mail.dev.a` (3a1bb14) is the older head, kept as it was because a force-push was refused.
2. **Live sign-in on this site.** Waits on Dinis adding origin `https://gmail.google.tool.sovereignweb.site` and redirect `https://gmail.google.tool.sovereignweb.site/app/connect/` to the Email Cell's Web client (RiskMandate's project, Internal). Then build `/app/connect/` at exactly that path, from the cell's `src/app/connect.js`, `oauth.js` and `pki.js`.
3. **Signed batches.** Demo only until C9. The format is agreed with crm.dev.a and a.mail.conductor. crm.dev.a imports `signoff.mjs` unedited, pinned at 3a1bb14 (byte-identical to `site/app/core/signoff.mjs` here). Next: read `drafts/` from a CRM vault and write `sent/` back, then an end-to-end test on egw210lk with crm.dev.a.
4. **lane.entry/2.** Final, with Dinis's yes. The draft, the approval and the sent record become entry types (`mail.outbox-draft/1`, `mail.outbox-approval/1`, `mail.outbox-sent/1`); see a.mail.conductor's `team/mail.conductor.a/notes/opinions/2026-11-25__lane-entry-v2-review.md`. The spec and vectors are in VoiceDebrief__App__iOS, which is not attached. Not started.
5. **Twin inboxes.** Agreed with crm.dev.a: one folder per inbox, `inboxes/<address>/`, in twin v1. Agents are `<role>@twin.example.org`. The CRM may write simulated replies into synthetic inboxes only. Next: the generator makes per-agent inboxes; tell crm.dev.a when it does.
6. **Calendar tool.** Requested by a.factory (IaC 525ef45): Site__Tool__Google__Calendar, with mail.dev.a's successor as keeper. Attaching it needs Dinis's yes.
7. **Inbox designs** on synthetic mail (the five concepts in the cell's `docs/design/inbox-concepts.md`, on work/email.design.d-r2), then better filtering. Not started.
8. **Account D's queue** (agreed after W13): ranks 29, 35, 36, 38, 39 and 41, plus bringing in work/email.workflows.d-r2 by fast-forward after checking its signers.

## Keys, repositories and wakes (ids only, no values)
- **Vault keys held:** the write key of the public demo twin vault `sub3og9j` (dev.send.sgraph.ai), also sealed to maestro.a-account-a on 24 Nov 00:45 UTC. It ends with this container; the maestro holds the copy. Superseded vaults on Dinis's delete list: `epk5452e`, `db5vicpi`. No lane keys.
- **Repositories pushed to:** AgentiCCells/AgentiCCells__Cell__Email (work/mail.dev.a, work/mail.dev.a-r2, and dev once for release/next2); SovereignWebsite/Site__Tool__Google__Gmail (dev).
- **Scheduled wakes:** "a.mail.dev: wake (Gmail and CRM, account A)", trig_01Y12hntBLrdJxum3YRLeZaP, hourly at :29, created by a.maestro. To be disabled by cl-1.maestro once the move is confirmed.

## Blockers waiting on Dinis
- The Google sign-in origin and redirect for this site (card 2).
- C9, signed batches sent for real.
- Search Console Safe Browsing review for email-cell.agenticcells.site (W2).
- The outbox key (W1), now moving to outreach@ (G4).
- Where the send screen's contact list comes from in real mode.
- Attaching Site__Agent__Mail, Site__Tool__Google__Calendar and, for reading specs, VoiceDebrief__App__iOS and SGraph-AI__App__Send.
- Deleting vaults epk5452e and db5vicpi.
