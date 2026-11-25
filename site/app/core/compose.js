// The simple send screen (/app/send.html), as pure functions (no page access), so tests can run them.
// One page: pick a contact, see the draft, edit, press Send (G3, Dinis's word in a.maestro's session,
// about 15:05 UTC 23 November 2026). The rules of the outbox's Approve and send hold, from send.js:
// no Bcc, a real address, a subject and text, no key material, at most 20 a day; then the person
// confirms. In demo mode the same checks run and the send goes to FakeGmail, recorded as a simulation.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.
import { messageOf, problems, MAX_PER_DAY } from './send.js';

export const DEMO = 'demo', REAL = 'real';

// Which mode the page opens in. Demo whenever asked for, and whenever there is no usable token that
// can send: anyone can try the page without signing in.
export function modeFor({ search = '', token = null, now = Date.now() } = {}) {
  const q = new URLSearchParams(search);
  if (q.has('demo')) return { mode: DEMO, why: 'asked for' };
  if (!token) return { mode: DEMO, why: 'this browser holds no Google token' };
  if (now >= token.expires_at - 60000) return { mode: DEMO, why: 'the Google token here has expired (they last an hour)' };
  if (!token.can_send) return { mode: DEMO, why: 'the Google token here cannot send; press Allow sending on the gateway' };
  return { mode: REAL, why: '' };
}

// The contact named by ?contact=<id> (for links from the CRM demo), or null. Demo mode only: with a
// real mailbox there is no contact list yet.
export function contactFrom(search, contacts) {
  const id = new URLSearchParams(search).get('contact');
  return (id && contacts.find((c) => c.id === id)) || null;
}

// Contacts matching what was typed (name, address or organisation), most recent first.
export function filterContacts(contacts, q = '') {
  const words = String(q).toLowerCase().split(/\s+/).filter(Boolean);
  return contacts
    .filter((c) => words.every((w) => `${c.name} ${c.address} ${c.org || ''}`.toLowerCase().includes(w)))
    .sort((a, b) => (b.last_contact || 0) - (a.last_contact || 0) || a.name.localeCompare(b.name));
}

// The message as the page will send it: To, Subject and text, and the thread it answers when the draft
// is a follow-up (in_reply_to, thread_id). This screen has no Cc and no Bcc.
export function toMessage({ to = '', subject = '', text = '', inReplyTo = '', threadId = '' } = {}) {
  return messageOf({ to, subject, status: 'draft', in_reply_to: inReplyTo, thread_id: threadId }, text);
}

// Every reason not to send; empty means the person may press Send.
export function check(m, { sentToday = 0 } = {}) {
  return problems(m, { sentToday });
}

// What the confirm box asks, word for word.
export function confirmText(m, from, mode) {
  const sim = mode === DEMO ? 'SIMULATION (demo mode, nothing leaves this page): ' : '';
  return `${sim}Send "${m.subject}" from ${from} to ${m.to.join(', ')} now?`;
}

// What the page records after a send. A demo send always says simulation, here and on screen.
export function sendRecord(m, result, { mode, from, now = new Date() } = {}) {
  const rec = { to: m.to, subject: m.subject, from, sent_at: now.toISOString().slice(0, 19) + 'Z', gmail_id: result.id, gmail_thread_id: result.threadId, approved_by: `${from}, by pressing Send and confirming` };
  if (mode === DEMO) { rec.simulation = true; rec.note = 'simulation: demo mode, sent to the demo mailbox only'; }
  return rec;
}

// The Gmail search for what was sent today (UTC), to keep to MAX_PER_DAY with a real token that can read.
export function sentTodayQuery(now = new Date()) {
  const midnight = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()) / 1000;
  return `in:sent after:${midnight}`;
}

// The day's send count with a real token, kept sealed in the browser (pki.js keep/recall) so that a
// reload does not reset it: a send-only token cannot search Sent, so the page's own count is all it has.
// load(key) and save(key, value) are injected; a load that fails throws, and the page then refuses to
// send (it cannot tell how many went today). The count used is max(stored, Gmail's Sent count).
export const countKey = (now = new Date()) => `send:count:${now.toISOString().slice(0, 10)}`;
export function dayCounter({ load, save, now = () => new Date() }) {
  const stored = async (k) => { const v = await load(k); const n = Number(v ?? 0); return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0; };
  return {
    async count(gmailCount = null) { return Math.max(await stored(countKey(now())), Number(gmailCount) || 0); },
    async add() { const k = countKey(now()); const n = (await stored(k)) + 1; await save(k, String(n)); return n; },
  };
}

export { MAX_PER_DAY };
