// Signed batches (a proposal; demo only until Dinis approves ABP line C9): the cell's page side. The
// sign-off itself (formats, hashing, signing, checking) is in signoff.mjs, shared unedited with the CRM.
// This file adds what only the page does: the send rules, attachment content checks, the batch plan
// within the daily limit, and the MIME message.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { verifyApproval, draftProblems, sha256hex, b64 } from './signoff.mjs';
export { approve, verifyApproval, draftProblems, draftHash, fingerprint, newBatchId, sentRecord } from './signoff.mjs';
import { messageOf, problems, MAX_PER_DAY } from './send.js';

export const MAX_ATTACH_BYTES = 10 * 1024 * 1024; // per email, all attachments together
export const ATTACH_TYPES = { 'application/pdf': [0x25, 0x50, 0x44, 0x46], 'image/png': [0x89, 0x50, 0x4e, 0x47], 'image/jpeg': [0xff, 0xd8, 0xff] };
const enc = new TextEncoder();

// The email a draft becomes: one To address, no Cc, no Bcc.
export function messageOfDraft(d) {
  return messageOf({ to: d.to, subject: d.subject, status: 'draft', in_reply_to: d.in_reply_to || '', thread_id: d.crm?.thread || '' }, d.text);
}

// The attachment checks, on the bytes read from the vault: listed size and SHA-256 match, a known type
// whose first bytes match it, a plain file name, and at most 10 MB together.
export async function attachmentProblems(list = [], files = {}) {
  const out = [];
  let total = 0;
  for (const a of list) {
    const name = String(a.path || '').split('/').pop();
    const bytes = files[a.path];
    if (!bytes) { out.push(`${name}: the file is missing`); continue; }
    total += bytes.length;
    if (bytes.length !== a.bytes) out.push(`${name}: its size is not the one signed`);
    if ((await sha256hex(bytes)) !== a.sha256) out.push(`${name}: its content is not the one signed`);
    const magic = ATTACH_TYPES[a.type];
    if (!magic) out.push(`${name}: only PDF, PNG and JPEG may be attached`);
    else if (!magic.every((b, i) => bytes[i] === b)) out.push(`${name}: its content is not a ${a.type} file`);
    if (!/^[^\\/\r\n"]{1,120}$/.test(name)) out.push('an attachment has a bad file name');
  }
  if (total > MAX_ATTACH_BYTES) out.push(`attachments come to ${(total / 1048576).toFixed(1)} MB; at most 10 MB`);
  return out;
}

// One batch: every draft with its verdict, and which ones one press would send, in order, at most the
// day's remaining allowance. items: [{ draft, approved, files, sent }].
export async function planBatch(items, { pinned = [], sentToday = 0, batchId = '', now = new Date() } = {}) {
  const rows = [];
  let room = Math.max(0, MAX_PER_DAY - sentToday);
  for (const it of items) {
    const d = it.draft, m = messageOfDraft(d);
    const why = [];
    if (it.sent) why.push('already sent');
    why.push(...draftProblems(d));
    why.push(...problems(m, { sentToday: 0 }));
    why.push(...(await attachmentProblems(d.attachments, it.files)));
    if (d.send_after && Date.parse(d.send_after) > now.getTime()) why.push(`not before ${d.send_after}`);
    const v = await verifyApproval(d, it.approved, pinned, batchId);
    if (!v.ok) why.push(v.reason);
    if (!why.length && room === 0) why.push(`the daily limit of ${MAX_PER_DAY} is reached; it waits for tomorrow`);
    const send = !why.length;
    if (send) room--;
    rows.push({ id: d.id, m, signer: v.signer || '', send, why });
  }
  return { rows, toSend: rows.filter((r) => r.send).length };
}

// The RFC 5322 message with attachments (multipart/mixed), as Gmail's messages.send takes it.
export function rawWithAttachments(m, atts = [], boundary = 'cell-' + Math.random().toString(36).slice(2)) {
  const word = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(enc.encode(s))}?=`);
  const wrap = (s) => s.replace(/.{76}/g, '$&\r\n');
  const head = [`To: ${m.to.join(', ')}`, `Subject: ${word(m.subject)}`,
    ...(m.inReplyTo ? [`In-Reply-To: ${m.inReplyTo}`, `References: ${m.inReplyTo}`] : []), 'MIME-Version: 1.0'];
  const textPart = ['Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '', wrap(b64(enc.encode(m.text.replace(/\r?\n/g, '\r\n'))))].join('\r\n');
  let raw;
  if (!atts.length) raw = [...head, textPart].join('\r\n');
  else {
    const parts = [textPart, ...atts.map((a) => [`Content-Type: ${a.type}; name="${a.name}"`, `Content-Disposition: attachment; filename="${a.name}"`, 'Content-Transfer-Encoding: base64', '', wrap(b64(a.data))].join('\r\n'))];
    raw = [...head, `Content-Type: multipart/mixed; boundary="${boundary}"`, '', ...parts.map((p) => `--${boundary}\r\n${p}`), `--${boundary}--`, ''].join('\r\n');
  }
  return b64(enc.encode(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export const attachmentsFor = (d, files) => (d.attachments || []).map((a) => ({ name: a.path.split('/').pop(), type: a.type, data: files[a.path] }));
