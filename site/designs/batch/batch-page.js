// The signed batch page (/app/batch.html), demo only, in the format agreed on 24 Nov 2026 (see batch.js).
// A test key made in this page (private half not extractable, gone when the tab closes) signs off
// synthetic drafts from the demo mailbox for one batch; the page verifies each, shows why any is refused,
// and sends the good ones to FakeGmail on one confirmation, stopping at the first error. Each send
// produces the sent/<id>.json record the CRM reads, marked simulation. Real sending waits on ABP line C9.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-24. Apache-2.0.
import { planBatch, approve, fingerprint, rawWithAttachments, attachmentsFor, sentRecord, newBatchId } from '/app/core/batch.js';
import { MAX_PER_DAY } from '/app/core/send.js';
import { demoMailbox, FakeGmail } from '/app/core/demo/mailbox.js';

const $ = (id) => document.getElementById(id);
const el = (tag, props = {}, ...kids) => { const e = Object.assign(document.createElement(tag), props); e.append(...kids); return e; };
const subtle = crypto.subtle;
const sha = async (b) => Array.from(new Uint8Array(await subtle.digest('SHA-256', b)), (x) => x.toString(16).padStart(2, '0')).join('');

// Made-up attachments: a few bytes that start like a PDF and a PNG; enough for the checks and the MIME.
const DEMO_FILES = [
  { name: 'one-pager-demo.pdf', type: 'application/pdf', data: new TextEncoder().encode('%PDF-1.4\n% synthetic demo file, not a real document\n%%EOF\n') },
  { name: 'screenshot-demo.png', type: 'image/png', data: new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]) },
];

let box, gmail, pinned, items, batchId, sentToday = 0, plan;

async function newKey() {
  const k = await subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign', 'verify']);
  const spki = new Uint8Array(await subtle.exportKey('spki', k.publicKey));
  return { k, spki, fp: await fingerprint(spki) };
}

async function build() {
  box = demoMailbox(); gmail = new FakeGmail({ me: box.me }); sentToday = 0;
  const mine = await newKey(), stranger = await newKey();
  pinned = [{ fingerprint: mine.fp, spki: mine.spki, name: 'Demo signer (test key)' }];
  batchId = newBatchId();
  const drafts = box.drafts.filter((d) => d.status === 'draft').slice(0, 6);
  items = [];
  for (const [i, src] of drafts.entries()) {
    const id = `d-demo-${i + 1}`;
    const files = {}, attachments = [];
    if (i < 2) {
      const f = DEMO_FILES[i], path = `drafts/${id}/att/${f.name}`;
      files[path] = f.data;
      attachments.push({ path, type: f.type, bytes: f.data.length, sha256: await sha(f.data) });
    }
    const draft = { v: 1, id, crm: { org: src.org, person: src.contact, ...(src.thread_id ? { thread: src.thread_id } : {}) }, to: src.to, subject: src.subject, text: src.text, attachments, ...(src.in_reply_to ? { in_reply_to: src.in_reply_to } : {}), created_at: box.generated.at.replace(/\.\d+Z$/, 'Z'), created_by: 'demo generator' };
    // Six cases: three signed off by the pinned key; one not signed off; one by a key not pinned here;
    // one changed after it was signed off.
    let approved = null;
    if (i !== 3) approved = await approve((i === 4 ? stranger : mine).k.privateKey, (i === 4 ? stranger : mine).spki, draft, batchId);
    if (i === 5) draft.text += '\nP.S. added after signing.';
    items.push({ draft, approved, files });
  }
  $('pinned').textContent = `${pinned[0].name}: ${pinned[0].fingerprint}`;
  $('batch-id').textContent = batchId;
  $('max').textContent = String(MAX_PER_DAY);
  $('sent').replaceChildren(); $('status').textContent = '';
  await show();
}

async function show() {
  plan = await planBatch(items, { pinned, sentToday, batchId });
  $('rows').replaceChildren(...plan.rows.map((r, i) => {
    const it = items[i];
    const files = it.draft.attachments.map((a) => `${a.path.split('/').pop()} (${a.bytes} bytes)`).join(', ');
    return el('li', { className: r.send ? 'ok' : it.sent ? 'done' : 'no' },
      el('strong', { textContent: r.send ? 'Will send' : (it.sent ? 'Sent' : 'Not sent') }), ' ',
      el('span', { textContent: `to ${r.m.to.join(', ')}: ${r.m.subject}` }),
      ...(files ? [el('div', { className: 'muted small', textContent: `Attached: ${files}` })] : []),
      el('div', { className: 'muted small', textContent: r.send ? `Signed off by ${r.signer}; the signature matches this exact draft.` : r.why.join('; ') + '.' }));
  }));
  $('today').textContent = String(sentToday);
  $('send').disabled = plan.toSend === 0;
  $('send').textContent = plan.toSend ? `Send batch (${plan.toSend})` : 'Send batch';
}

async function sendBatch() {
  const go = plan.rows.map((r, i) => [r, items[i]]).filter(([r]) => r.send);
  if (!go.length) return;
  if (!confirm(`SIMULATION (demo mode, nothing leaves this page): send batch ${batchId}, ${go.length} signed-off emails from ${box.me.address}, now?`)) { $('status').textContent = 'Not sent.'; return; }
  $('send').disabled = true;
  let n = 0;
  for (const [r, it] of go) {
    try {
      const res = await gmail.send(rawWithAttachments(r.m, attachmentsFor(it.draft, it.files)));
      it.sent = sentRecord(it.draft, it.approved, res);
      n++; sentToday++;
      $('sent').prepend(el('li', {}, el('span', { className: 'tag', textContent: 'simulation' }), ` sent/${it.draft.id}.json: to ${r.m.to.join(', ')}, ${r.m.subject} (${res.id})`));
    } catch (err) { $('status').textContent = `Stopped at "${r.m.subject}": ${err.message}. ${n} sent before it.`; await show(); return; }
  }
  $('status').textContent = `Simulation: ${n} "sent" to the demo mailbox. Nothing left this page.`;
  await show();
}

$('send').addEventListener('click', sendBatch);
$('reset').addEventListener('click', () => build().catch((e) => { $('status').textContent = `Could not start: ${e.message}.`; }));
build().catch((e) => { $('status').textContent = `Could not start: ${e.message}.`; });
