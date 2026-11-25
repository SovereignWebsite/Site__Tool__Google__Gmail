// Approve and send, as pure functions (no page access), so tests can run them.
// Dinis Cruz, 21 November 2026: "the main thing I want to do is to make sure that I can actually
// open the email and I can start to send from there. So actually, that's your approve and send".
// An outbox entry is a folder in the outbox vault: meta.json ({ to, cc, subject, status, ... })
// and the text in one of BODY_FILES (or meta.text). The page shows the exact message, the person
// presses Approve and send, the checks below run, and only then does the page call Gmail.
// By cell.email.b@AgentiCCells.dinis, 2026-11-21. Apache-2.0.

export const BODY_FILES = ['body.txt', 'body.md', 'message.txt', 'email.txt', 'text.txt'];
export const DONE = new Set(['sent', 'rejected', 'withdrawn', 'stopped']);
export const MAX_RECIPIENTS = 10;
export const MAX_PER_DAY = 20;
const ADDRESS = /^[^\s@<>(),;:"\[\]\\]+@[a-z0-9-]+(\.[a-z0-9-]+)+$/i;

// Text that must never leave in an email: key material and tokens (a short form of scripts/leak-scan).
const SECRETS = [
  [/-----BEGIN [A-Z ]*PRIVATE KEY-----/, 'a private key'],
  [/sgit_private_vault_/, 'a vault key'],
  [/\bya29\.[\w-]{20,}/, 'a Google token'],
  [/\b(ghp|gho|ghs|github_pat)_[A-Za-z0-9_]{20,}/, 'a GitHub token'],
  [/\bsk-[A-Za-z0-9-]{20,}/, 'an API key'],
];

const list = (v) => (Array.isArray(v) ? v : v ? String(v).split(',') : []).map((a) => String(a).trim()).filter(Boolean);

// What the page shows and sends, from meta.json and the body text.
export function messageOf(meta, bodyText) {
  meta = meta || {};
  return {
    to: list(meta.to), cc: list(meta.cc), bcc: list(meta.bcc),
    subject: String(meta.subject || '').trim(),
    text: String(bodyText ?? meta.text ?? meta.body ?? ''),
    status: String(meta.status || 'draft').toLowerCase(),
    inReplyTo: meta.in_reply_to || '', threadId: meta.thread_id || '',
  };
}

// Every reason not to send; empty means the person may send it.
// sentToday: how many the outbox already records as sent today.
export function problems(m, { sentToday = 0 } = {}) {
  const out = [];
  if (DONE.has(m.status)) out.push(`its status is "${m.status}"`);
  if (!m.to.length) out.push('it has no recipient');
  const all = [...m.to, ...m.cc];
  const bad = all.filter((a) => !ADDRESS.test(a));
  if (bad.length) out.push(`not an email address: ${bad.join(', ')}`);
  if (m.bcc.length) out.push('it has Bcc recipients, which the page does not send');
  if (all.length > MAX_RECIPIENTS) out.push(`it has ${all.length} recipients; at most ${MAX_RECIPIENTS}`);
  if (!m.subject) out.push('it has no subject');
  if (/[\r\n]/.test(m.subject)) out.push('its subject has a line break');
  if (!m.text.trim()) out.push('it has no text');
  for (const [re, what] of SECRETS) if (re.test(m.subject + '\n' + m.text)) out.push(`its text holds what looks like ${what}`);
  if (sentToday >= MAX_PER_DAY) out.push(`${sentToday} already sent today; at most ${MAX_PER_DAY} a day`);
  return out;
}

const b64 = (bytes) => { let s = ''; for (const b of bytes) s += String.fromCharCode(b); return btoa(s); };
const utf8 = (s) => new TextEncoder().encode(s);
// RFC 2047 for a header with non-ASCII text.
const word = (s) => (/^[\x20-\x7e]*$/.test(s) ? s : `=?UTF-8?B?${b64(utf8(s))}?=`);

// The RFC 5322 message, as Gmail's messages.send takes it: base64url in "raw".
export function rawMessage(m) {
  const lines = [`To: ${m.to.join(', ')}`];
  if (m.cc.length) lines.push(`Cc: ${m.cc.join(', ')}`);
  lines.push(`Subject: ${word(m.subject)}`);
  if (m.inReplyTo) lines.push(`In-Reply-To: ${m.inReplyTo}`, `References: ${m.references || m.inReplyTo}`);
  lines.push('MIME-Version: 1.0', 'Content-Type: text/plain; charset="UTF-8"', 'Content-Transfer-Encoding: base64', '');
  const body = b64(utf8(m.text.replace(/\r?\n/g, '\r\n'))).replace(/.{76}/g, '$&\r\n');
  const raw = lines.join('\r\n') + '\r\n' + body;
  return b64(utf8(raw)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

// How many entries the outbox records as sent on the given day (UTC).
export function sentOn(metas, now = new Date()) {
  const day = now.toISOString().slice(0, 10);
  return metas.filter((x) => String(x?.status).toLowerCase() === 'sent' && String(x?.sent_at || '').startsWith(day)).length;
}
