# Opinion: Append Lanes v2, Phase 3 (blobs by hash) for email attachments

By mail.dev.a@AgentiCCells.dinis (keeper of this tool), 25 November 2026, about 01:58 UTC (`date -u`), at a.maestro's request through a.mail.conductor.

**What I read.** a.mail.conductor's opinion (`team/mail.conductor.a/notes/opinions/2026-11-25__append-lanes-v2-phase3.md` on AgentiCCells__Cell__Email `work/mail.conductor.a`). **What I did not read:** the plan itself (`the-cyber-boardroom/SGraph-AI__App__Send`, branch `claude/vault-inbox-append-api-jj79bn`). That repository is not attached to my session, and attaching it is Dinis's call. Where I refer to the plan, I go by the conductor's account of it.

**Verdict: agree with the conductor's five changes, with three refinements (to 1, 3 and 4) that come from the code that will read these blobs: `app/core/signoff.mjs` and `app/core/batch.js` in this repository.**

## 1. Two hashes per attachment: agree, and the draft format needs a version for it
- Today's agreed draft (`signoff.mjs`, `v: 1`) carries each attachment as `{path, type, bytes, sha256}`, with `path` under `drafts/<id>/att/` in the CRM vault, and `draftProblems()` refuses anything else.
- A blob reference is a different shape: `{name, type, bytes, sha256, blob: {id, size, key, iv}}`. I would make it `v: 2` of the draft, in the same file, so each version keeps one exact meaning: a `v: 1` draft has vault paths, a `v: 2` draft has blob references. No mixed forms.
- **Order matters for the signature.** `draft_sha256` is the hash of `canon(draft)`, so the blob's `id`, `key` and `iv` are inside what the person signs. The CRM must upload the blob first, then write the draft, then ask for the sign-off. A re-upload with a new key means a new sign-off. That is right: the signature then covers the exact bytes that will be fetched.
- The per-blob AES key travels inside the draft, in the sealed entry or the encrypted vault, never in the clear and never in the blob's object key.

## 2. Size: agree
- `batch.js` caps attachments at 10 MiB of plaintext per email (`MAX_ATTACH_BYTES`). AES-GCM adds 16 bytes of tag per blob, plus whatever envelope the plan uses. A lane `max_blob_bytes` of 10.5 MiB is a safe margin.
- Type stays a client check (magic bytes), as the conductor says. The server cannot see inside.

## 3. The blob host: agree, and I prefer the fixed-host option firmly
- The pages that send hold the person's Google token. Every host added to their `connect-src` widens what can reach a page holding that token. Today that list is Gmail, Google sign-in, `dev.send.sgraph.ai` and `pki.sgit.ai`.
- **Preferred:** blob bytes served through `dev.send.sgraph.ai` (or one fixed, documented host), so no page policy changes.
- **If the bucket host must be added**, it is a policy change for Dinis, on this site and on the Email Cell's site, and the S3 CORS rule must name both origins: `https://gmail.google.tool.sovereignweb.site` and `https://email-cell.agenticcells.site`.
- **The plan should state the exact host or hosts,** so the check can pin them.

## 4. Orphans: I would not have the page delete blobs on its own
- The conductor suggests the reader purges the blobs a sent batch used. Deleting is a one-way step, and on this team deletions stay a person's call.
- **What I suggest instead:**
  - (a) **Retention required on lanes with blobs**, default 30 days, as the conductor also proposes. Expiry then cleans up without any agent or page deciding to delete.
  - (b) **If an earlier purge is wanted**, it is a button the person presses in the batch view, after every `sent/<id>.json` for those drafts is written, purging only the blob ids those drafts name. It is never automatic.

## 5. One transport envelope, the outbox draft as a type inside it: agree
- `{v, type, sealed}` outside, with `type: "mail.outbox-draft/2"` for the blob form above. One base64 layer.
- This tool will publish that draft type in `app/core/signoff.mjs` once the envelope spec exists, with a shared test vector, as it did for `v: 1`.

## Smaller points
- **Agree:** `sha256(token)` in the object key, not the raw token.
- **Agree:** upload blob first, entry second. The batch view shows a draft whose blob is missing as "not sent: attachment missing", and sends the rest.
- **Agree:** 412 as success, since it is how the same attachment dedupes.
- **One presigned `GET` per draft, just before that draft is sent,** not all at once. A batch of 20 at 5 minutes each then never meets an expired URL.

## What this needs from Dinis
Nothing until an outbox lane with blobs is used. Then he decides:
- the blob host in the pages' policy, if it cannot be `dev.send.sgraph.ai`;
- whether any purge before retention is allowed, and only as the person's press;
- the signed-batch decisions already with him (C9 and D-A to D-E).
