// Sign-off of a draft email, shared by the CRM site (which signs) and the Email Cell's page (which checks
// and sends). One file, no page access, no imports beyond the vendored pki.sgit.ai keys.js; the CRM imports
// it unedited, pinned to a commit. A proposal, demo only until Dinis approves ABP line C9.
// Formats agreed by a.mail.conductor, crm.dev.a and mail.dev.a, 24 Nov 2026, 16:06 to 16:08 UTC:
//   drafts/<id>.json           { v:1, id, crm:{org, person, thread?}, to:[one address], subject, text,
//                                in_reply_to?, attachments:[{ path, type, bytes, sha256 }], send_after?,
//                                created_at, created_by }
//   drafts/<id>.approved.json  { draft_id, draft_sha256, key_fingerprint, signed_at, batch_id, sig }
//   sent/<id>.json             { draft_id, draft_sha256, batch_id, gmail_id, gmail_thread_id, sent_at,
//                                approved_by_key }   (written by the cell's page into the CRM vault)
// Bytes: draft_sha256 = lowercase SHA-256 hex of the UTF-8 of canon(draft), the whole draft as stored, no
// trailing newline. sig = ECDSA P-256 / SHA-256, IEEE P1363, standard base64, over the UTF-8 string
// draft_sha256 + batch_id (no separator). key_fingerprint = "sha256:" + the first 16 hex of SHA-256 over
// the signing key's SPKI DER (sgit's form). Test vector: tests/fixtures/signoff-vector.json.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { canon } from './vendor/pki/v0.2.28/keys.js';

const SIGN = { name: 'ECDSA', hash: 'SHA-256' };
const KEY = { name: 'ECDSA', namedCurve: 'P-256' };
const subtle = globalThis.crypto.subtle;
const enc = new TextEncoder();
const hex = (buf) => Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, '0')).join('');
export const sha256hex = async (bytes) => hex(await subtle.digest('SHA-256', bytes));
export const b64 = (bytes) => { let s = ''; for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b); return btoa(s); };
export const unb64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const iso = (d) => d.toISOString().replace(/\.\d+Z$/, 'Z');
const ADDRESS = /^[^\s@<>(),;:"[\]\\]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;
const ISO = /^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/;

export async function fingerprint(spki) { return 'sha256:' + (await sha256hex(spki)).slice(0, 16); }
export const draftHash = (draft) => sha256hex(enc.encode(canon(draft)));
const signedString = (draftSha, batchId) => enc.encode(String(draftSha) + String(batchId));
export const newBatchId = (now = new Date(), rand = globalThis.crypto.getRandomValues(new Uint8Array(2))) => `b-${iso(now).replace(/[-:]/g, '')}-${hex(rand)}`;

// Every way a draft breaks the agreed shape; empty means well formed. (The cell's page also runs its
// send rules and the attachment content checks before sending.)
export function draftProblems(d) {
  const out = [];
  const allowed = new Set(['v', 'id', 'crm', 'to', 'subject', 'text', 'in_reply_to', 'attachments', 'send_after', 'created_at', 'created_by']);
  if (!d || typeof d !== 'object') return ['not a draft'];
  if (d.v !== 1) out.push('v must be 1');
  if (typeof d.id !== 'string' || !/^[A-Za-z0-9._-]{1,80}$/.test(d.id)) out.push('id must be a short plain string');
  for (const k of Object.keys(d)) if (!allowed.has(k)) out.push(`unknown field ${k} (no cc or bcc on a draft)`);
  if (!d.crm || typeof d.crm.org !== 'string' || typeof d.crm.person !== 'string') out.push('crm needs org and person');
  if (!Array.isArray(d.to) || d.to.length !== 1 || !ADDRESS.test(d.to[0] || '')) out.push('to must be exactly one email address');
  if (typeof d.subject !== 'string' || !d.subject.trim() || /[\r\n]/.test(d.subject)) out.push('subject must be one non-empty line');
  if (typeof d.text !== 'string' || !d.text.trim()) out.push('text must not be empty');
  if (d.in_reply_to !== undefined && (typeof d.in_reply_to !== 'string' || !/^<[^<>\s]+>$/.test(d.in_reply_to))) out.push('in_reply_to must be a Message-ID like <id@host>');
  if (d.send_after !== undefined && !ISO.test(d.send_after)) out.push('send_after must be ISO UTC, like 2026-11-24T16:00:00Z');
  if (!ISO.test(d.created_at || '')) out.push('created_at must be ISO UTC');
  if (typeof d.created_by !== 'string' || !d.created_by) out.push('created_by missing');
  if (!Array.isArray(d.attachments)) out.push('attachments must be a list');
  else for (const a of d.attachments) {
    if (typeof a.path !== 'string' || !a.path.startsWith(`drafts/${d.id}/att/`)) out.push(`attachment path must be under drafts/${d.id}/att/`);
    if (!Number.isSafeInteger(a.bytes) || a.bytes < 0) out.push('attachment bytes must be its size');
    if (!/^[0-9a-f]{64}$/.test(a.sha256 || '')) out.push('attachment sha256 must be 64 hex');
    if (typeof a.type !== 'string') out.push('attachment type missing');
  }
  return out;
}

// The person's sign-off for one draft in one batch.
export async function approve(privateKey, publicSpki, draft, batchId, now = new Date()) {
  const draft_sha256 = await draftHash(draft);
  const sig = await subtle.sign(SIGN, privateKey, signedString(draft_sha256, batchId));
  return { draft_id: draft.id, draft_sha256, key_fingerprint: await fingerprint(publicSpki), signed_at: iso(now), batch_id: batchId, sig: b64(sig) };
}

// pinned: [{ fingerprint, spki (Uint8Array), name }]. batchId: the batch being sent ('' to skip that check).
export async function verifyApproval(draft, approved, pinned, batchId) {
  if (!approved) return { ok: false, reason: 'not signed off' };
  if (approved.draft_id !== draft.id) return { ok: false, reason: 'the sign-off is for another draft' };
  if (batchId && approved.batch_id !== batchId) return { ok: false, reason: `signed off for batch ${approved.batch_id}, not this one` };
  if (approved.draft_sha256 !== (await draftHash(draft))) return { ok: false, reason: 'the draft changed after it was signed off' };
  const pin = pinned.find((p) => p.fingerprint === approved.key_fingerprint);
  if (!pin) return { ok: false, reason: `signed off by ${approved.key_fingerprint}, a key not pinned in this page` };
  if ((await fingerprint(pin.spki)) !== pin.fingerprint) return { ok: false, reason: 'the pinned key does not match its fingerprint' };
  const key = await subtle.importKey('spki', pin.spki, KEY, false, ['verify']);
  let good = false;
  try { good = await subtle.verify(SIGN, key, unb64(approved.sig), signedString(approved.draft_sha256, approved.batch_id)); } catch { good = false; }
  return good ? { ok: true, signer: pin.name || pin.fingerprint } : { ok: false, reason: 'the signature does not match' };
}

// What the cell's page writes to sent/<id>.json after a send.
export const sentRecord = (draft, approved, res, now = new Date()) => ({ draft_id: draft.id, draft_sha256: approved.draft_sha256, batch_id: approved.batch_id, gmail_id: res.id, gmail_thread_id: res.threadId, sent_at: iso(now), approved_by_key: approved.key_fingerprint, ...(res.simulation ? { simulation: true } : {}) });
