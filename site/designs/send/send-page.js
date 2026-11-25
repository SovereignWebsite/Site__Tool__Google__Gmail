// Design "Send": pick a contact, see the draft, edit, press Send. On this site, demo only for now: the
// synthetic mailbox (/app/core/demo/mailbox.js) and FakeGmail, every send recorded as a simulation;
// live mode follows once the owner adds this site's address to the Google sign-in client. send.js's
// checks run and the person confirms before anything is sent.
// From AgentiCCells__Cell__Email src/app/send-page.js at 3a1bb14 (see /docs/sources/).
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23 and 2026-11-25. Apache-2.0.
import { DEMO, contactFrom, filterContacts, toMessage, check, confirmText, sendRecord, MAX_PER_DAY } from '/app/core/compose.js';
import { demoMailbox, FakeGmail } from '/app/core/demo/mailbox.js';
import { rawMessage } from '/app/core/send.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };

let mode = DEMO, from = '';
let box = null, gmail = null, chosen = null, draft = { to: '', subject: '', text: '' };
let sentToday = 0, counter = null, countFailed = false; // counter: live mode only (not on this site yet)

// Live mode (the person's own Gmail) comes once the owner adds this site's address to the Google
// sign-in client; until then this design runs on the synthetic mailbox only.

// ------------------------------------------------------------ the screen
function showContacts() {
  const list = filterContacts(box.contacts, $('q').value);
  $('contacts').replaceChildren(...list.map((c) => {
    const b = el('button', { type: 'button', className: 'contact' + (chosen?.id === c.id ? ' on' : '') },
      el('span', { className: 'name', textContent: c.name }),
      el('span', { className: 'muted small', textContent: `${c.role}, ${c.org}` }),
      el('span', { className: 'muted small addr', textContent: c.address }));
    b.setAttribute('aria-pressed', String(chosen?.id === c.id));
    b.addEventListener('click', () => choose(c));
    return el('li', {}, b);
  }));
  if (!list.length) $('contacts').append(el('li', { className: 'muted', textContent: 'Nobody matches.' }));
}

function choose(c) {
  chosen = c;
  $('draft').classList.remove('waiting');
  // Not everyone has a draft waiting; then the page starts one with only To filled in.
  const d = box.drafts.find((x) => x.contact === c.id && x.status === 'draft');
  const sent = box.drafts.find((x) => x.contact === c.id && x.status === 'sent');
  draft = d ? { to: d.to.join(', '), subject: d.subject, text: d.text, inReplyTo: d.in_reply_to || '', threadId: d.thread_id || '' } : { to: c.address, subject: '', text: '' };
  $('status').textContent = d ? '' : sent ? `No draft waiting for ${c.first}; "${sent.subject}" was already sent. Write a new one if you like.` : `No draft waiting for ${c.first}: write one.`;
  fill();
  showContacts();
  $('text').focus();
}

function fill() {
  $('to').value = draft.to; $('subject').value = draft.subject; $('text').value = draft.text;
  $('thread-note').hidden = !draft.inReplyTo;
  $('thread-note').textContent = draft.inReplyTo ? `A follow-up: it is sent as a reply in thread ${draft.threadId}, after the last email there.` : '';
  review();
}

function message() { return toMessage({ to: $('to').value, subject: $('subject').value, text: $('text').value, inReplyTo: draft.inReplyTo, threadId: draft.threadId }); }

// The checks, live as the person types; Send is pressable only when there is nothing in the way.
function review() {
  const why = check(message(), { sentToday });
  if (countFailed) why.push('the page cannot read how many were sent today, so it cannot keep to the daily limit');
  $('problems').replaceChildren(...why.map((w) => el('li', { textContent: `Not sendable: ${w}.` })));
  $('send').disabled = why.length > 0;
  $('today').textContent = countFailed ? '?' : String(sentToday);
  return why;
}

async function send() {
  const m = message();
  if (review().length) return;
  if (!confirm(confirmText(m, from, mode))) { $('status').textContent = 'Not sent.'; return; }
  $('send').disabled = true; $('status').textContent = mode === DEMO ? 'Sending to the demo mailbox (simulation)...' : 'Sending...';
  let res;
  try { res = await gmail.send(rawMessage(m)); }
  catch (e) { $('status').textContent = `Not sent: ${e.message}.`; review(); return; }
  let counted = true;
  if (counter) { try { await counter.add(); } catch { counted = false; countFailed = true; } }
  const rec = sendRecord(m, res, { mode, from });
  $('status').textContent = mode === DEMO ? `Simulation: "sent" to the demo mailbox (id ${rec.gmail_id}). Nothing left this page.` : `Sent (Gmail id ${rec.gmail_id}). It is in your Gmail Sent folder.${counted ? '' : ' The page could not record it in today\'s count, so it will not send again until reloaded.'}`;
  const li = el('li', {}, el('span', { textContent: `${rec.sent_at.slice(11, 16)} UTC, to ${rec.to.join(', ')}: ${rec.subject}` }));
  if (rec.simulation) li.prepend(el('span', { className: 'tag', textContent: 'simulation' }), ' ');
  $('sent').prepend(li);
  if (counted) await recount();
  review();
}

// Today's count: in live mode max(the sealed count, Gmail's Sent count when the token can read);
// in demo mode FakeGmail's own count.
async function recount() {
  let g = null;
  try { g = await gmail.sentToday(); } catch { /* fall back to the sealed count */ }
  if (!counter) { sentToday = g || 0; return; }
  try { sentToday = await counter.count(g); countFailed = false; } catch { countFailed = true; }
}

function setMode(why) {
  const demo = mode === DEMO;
  document.body.classList.toggle('is-demo', demo);
  $('mode').hidden = false; $('mode').textContent = demo ? 'Demo mode' : 'Your Gmail';
  $('demo-banner').hidden = !demo; $('real-banner').hidden = demo;
  $('why').hidden = !(demo && why && why !== 'asked for');
  $('why').textContent = demo ? `Opened in demo mode: ${why}.` : '';
  $('contacts-box').hidden = !demo; $('no-lookup').hidden = demo;
  $('max').textContent = String(MAX_PER_DAY);
}

async function start() {
  // On this site, demo only until the owner adds its address to the Google sign-in client.
  const m = { mode: DEMO, why: 'this site runs on synthetic mail until its Google sign-in is set up' };
  mode = m.mode;
  box = demoMailbox(); gmail = new FakeGmail({ me: box.me }); from = box.me.address;
  $('today-src').textContent = ' (in this demo)';
  showContacts();
  $('from').textContent = `From ${from}${mode === DEMO ? ' (made up)' : ''}.`;
  setMode(m.why);
  // G3's order: the page opens on the contact list; the draft shows once a contact is picked.
  // ?contact=<id> opens straight on that contact's draft (for links from the CRM demo).
  const linked = mode === DEMO ? contactFrom(location.search, box.contacts) : null;
  if (linked) choose(linked);
  $('draft').classList.toggle('waiting', mode === DEMO && !chosen);
  review();
}

for (const f of ['to', 'subject', 'text']) $(f).addEventListener('input', review);
$('q').addEventListener('input', showContacts);
$('send').addEventListener('click', send);
$('reset').addEventListener('click', () => { if (chosen) choose(chosen); else { draft = { to: '', subject: '', text: '' }; fill(); } });
start().catch((e) => { $('status').textContent = `The page could not start: ${e.message}.`; });
