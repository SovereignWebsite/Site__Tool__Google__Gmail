// The demo mailbox: a synthetic twin of a Gmail account, for demo mode. Everything here is made up
// and generated from a seed: people, organisations, threads and drafts, at reserved example domains
// only (RFC 2606). Nothing is real, nothing is stored, and nothing it does leaves the page.
// Dinis Cruz, 23 November 2026: "when we show this and we demo this, I always have a demo mode, a
// synthetic demo mode. That's super critical".
// FakeGmail answers the few Gmail calls the send screen makes (profile, send, sent today) and records
// every send with simulation: true, so a demo can never be mistaken for a real send.
// By mail.dev.a@AgentiCCells.dinis, 2026-11-23. Apache-2.0.

export const DEMO_ME = { name: 'Demo User', address: 'demo.user@mailbox.example.org' };
export const DEMO_SEED = 20261123;

// mulberry32: small, fast, deterministic; the same seed always gives the same mailbox.
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const FIRST = ['Ana', 'Bruno', 'Carla', 'Diogo', 'Eva', 'Filipe', 'Grace', 'Hugo', 'Inês', 'João', 'Kofi', 'Lena', 'Marta', 'Nuno', 'Olu', 'Priya', 'Rui', 'Sofia', 'Tomás', 'Uma'];
const LAST = ['Almeida', 'Brandt', 'Costa', 'Duarte', 'Evans', 'Ferreira', 'Gomes', 'Haddad', 'Ito', 'Jansen', 'Kowalski', 'Lopes', 'Mensah', 'Novak', 'Okoro', 'Pereira', 'Quinn', 'Ramos', 'Silva', 'Teixeira'];
// Made-up organisations, each at a subdomain of a reserved example domain.
// Made-up organisations, named so no one could take them for a real company or event (a.mail.conductor,
// 23 Nov 2026: a demo that labels a real name "prospect" would name a real prospect), each at a
// subdomain of a reserved example domain.
const ORGS = [
  ['Example Analytics (demo)', 'analytics.example.com', 'investor'],
  ['Example Summit (demo)', 'summit.example.org', 'event'],
  ['Example Security (demo)', 'security.example.net', 'prospect'],
  ['Example Risk Forum (demo)', 'forum.example.org', 'community'],
  ['Example Insurance (demo)', 'insurance.example.com', 'customer'],
  ['Example Ventures (demo)', 'ventures.example.net', 'investor'],
  ['Example Data Lab (demo)', 'datalab.example.org', 'partner'],
  ['Example Bank (demo)', 'bank.example.com', 'prospect'],
];
const ROLES = ['CISO', 'Head of Risk', 'Founder', 'Programme lead', 'CTO', 'Partner', 'Analyst', 'Director'];
// What each kind of contact gets as a first draft: a follow-up after meeting, in plain words.
const DRAFTS = {
  investor: ['Following up from the summit', 'Hi {first},\n\nThank you for the conversation at the summit. As promised, here is a short note on where we are: the email cell now sends from the browser with the person\'s own sign-in, and every send is pressed by a person.\n\nWould a 30-minute call next week suit you?\n\nBest wishes,\n{me}'],
  event: ['Thank you for the summit', 'Hi {first},\n\nThank you for having us at the summit. It was a pleasure to meet the team.\n\nIf it helps, I am happy to write a short piece for your newsletter about what we showed.\n\nBest wishes,\n{me}'],
  prospect: ['The demo we talked about', 'Hi {first},\n\nGood to meet you last week. You asked how the review step works before an email leaves: the draft is shown exactly as it will be sent, and nothing goes until a person presses Send.\n\nShall I set up a demo for your team?\n\nBest wishes,\n{me}'],
  community: ['Next forum meeting', 'Hi {first},\n\nI would like to propose a short talk for the next forum meeting on keeping agents to a signed policy.\n\nWould that fit the agenda?\n\nBest wishes,\n{me}'],
  customer: ['Checking in', 'Hi {first},\n\nA quick check-in: is everything working as you expected since the last update? Any rough edges, I would like to hear about them.\n\nBest wishes,\n{me}'],
  partner: ['Working together on open data', 'Hi {first},\n\nFollowing our chat, I have written up two ways we could work together on open data. I will send the page once you say which suits you best.\n\nBest wishes,\n{me}'],
};
const TOPICS = ['Notes from our call', 'Slides for Monday', 'Introductions', 'The pilot plan', 'Dates for the workshop', 'Your question about pricing', 'Agenda for Thursday', 'Draft agreement'];
const SNIPPETS = ['Thanks, that works for me.', 'Here are the notes, let me know what I missed.', 'Could we move it to the afternoon?', 'Attached is the latest version.', 'Happy to help, who else should join?', 'Great to meet you yesterday.'];

const pick = (r, list) => list[Math.floor(r() * list.length)];
const slug = (s) => s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
const pad = (n, w) => String(n).padStart(w, '0');
const BODIES = [
  'Hi {to},\n\n{snippet} I have put the main points below so we do not lose them.\n\n- what we agreed\n- what is still open\n\nBest,\n{from}',
  'Hi {to},\n\n{snippet}\n\nThanks,\n{from}',
  'Hello {to},\n\n{snippet} Shall we pick it up next week?\n\nBest wishes,\n{from}',
];

// The whole synthetic mailbox: { me, orgs, people, contacts, threads, messages, drafts, labels, generated }.
// orgs and people are the shared shape the CRM demo builds on (demo.org/1, demo.person/1); messages are
// the Email Cell's twin format (twin.message/1); contacts is the send screen's view of people.
// now is fixed by the caller so tests are stable; the page passes Date.now().
export function demoMailbox({ seed = DEMO_SEED, now = Date.now(), contacts: n = 16 } = {}) {
  const r = rng(seed);
  const DAY = 864e5;
  const orgs = ORGS.map(([name, domain, kind], i) => ({ id: `o${pad(i + 1, 2)}`, name, domain, kind }));
  const used = new Set();
  const people = [];
  while (people.length < n) {
    const first = pick(r, FIRST), last = pick(r, LAST);
    if (used.has(first + last)) continue;
    used.add(first + last);
    const o = orgs[people.length % orgs.length];
    people.push({ id: `p${pad(people.length + 1, 2)}`, name: `${first} ${last}`, first, emails: [`${slug(first)}.${slug(last)}@${o.domain}`], org: o.id, role: pick(r, ROLES), kind: o.kind });
  }
  const me = { name: DEMO_ME.name, address: DEMO_ME.address };
  const threads = [], messages = [];
  for (let i = 0; i < n * 2; i++) {
    // t-001..t-004 (waiting on a reply) go to p01, p03, p05, p07 and t-005..t-008 (answered) to p02,
    // p04, p06, p08, so the cases sit at different organisations; the rest are random.
    const p = i < 8 ? people[(i < 4 ? i * 2 : (i - 4) * 2 + 1)] : people[Math.floor(r() * people.length)];
    const them = { name: p.name, address: p.emails[0] };
    const tid = `t-${pad(i + 1, 3)}`, subject = pick(r, TOPICS);
    let count = 1 + Math.floor(r() * 3);
    let at = Math.round(now - (5 + r() * 55) * DAY);
    let outbound = r() < 0.4;
    // Fixed cases for the CRM demo's "no reply in 5 days" (asked by crm.dev.a, 23 Nov 2026): threads
    // t-001 to t-004 end with an email from the demo user 6 to 15 days ago and no answer; t-005 to
    // t-008 are an email from the demo user that got a reply.
    if (i < 4) { count = 1; outbound = true; at = now - (6 + i * 3) * DAY; }
    else if (i < 8) { count = 2; outbound = true; at = now - (10 + i * 2) * DAY; }
    // Every other thread ends with an email to the demo user, so only t-001 to t-004 wait on a reply and
    // half the organisations have nothing waiting (contrast, asked by crm.dev.a).
    else outbound = count % 2 === 0;
    const ids = [];
    for (let k = 0; k < count; k++) {
      const id = `m-${pad(messages.length + 1, 4)}`;
      const from = outbound ? me : them, to = outbound ? them : me;
      const snippet = pick(r, SNIPPETS);
      const prev = messages[messages.length - 1];
      messages.push({
        schema: 'twin.message/1', id, thread: tid, direction: outbound ? 'outbound' : 'inbound',
        source: { system: 'simulation', id: `demo-${id}`, thread_id: `demo-${tid}`, history_id: String(5000 + messages.length) },
        from, to: [to], cc: [], bcc: [], reply_to: [],
        subject: k ? `Re: ${subject}` : subject, date: new Date(at).toISOString().replace(/\.\d+Z$/, 'Z'),
        headers: { message_id: `<${id}@${from.address.split('@')[1]}>`, in_reply_to: k ? prev.headers.message_id : null, references: k ? [...prev.headers.references, prev.headers.message_id] : [] },
        labels: outbound ? ['SENT'] : (k === count - 1 && r() < 0.4 ? ['INBOX', 'UNREAD'] : ['INBOX']),
        language: 'en',
        body: { text: pick(r, BODIES).replace('{to}', to.name.split(' ')[0]).replace('{from}', from.name).replace('{snippet}', snippet), html: null },
        attachments: [],
        ...(outbound ? {} : { auth: { spf: 'pass', dkim: 'pass', dmarc: 'pass' } }),
        simulated: true,
      });
      ids.push(id);
      at += Math.round((0.1 + r() * 2) * DAY);
      if (at > now) at = now - 3600e3;
      outbound = !outbound;
    }
    const list = messages.slice(-count);
    threads.push({ schema: 'twin.thread/1', id: tid, subject, messages: ids, participants: [me.address, them.address].sort(), labels: [...new Set(list.flatMap((m) => m.labels))].sort(), last_date: list[list.length - 1].date, person: p.id });
  }
  threads.sort((a, b) => Date.parse(b.last_date) - Date.parse(a.last_date));
  const orgName = Object.fromEntries(orgs.map((o) => [o.id, o.name]));
  const contacts = people.map((p) => {
    const mine = threads.filter((t) => t.person === p.id);
    return { id: p.id, name: p.name, first: p.first, address: p.emails[0], org: orgName[p.org], org_id: p.org, role: p.role, kind: p.kind, threads: mine.length, last_contact: mine.length ? Date.parse(mine[0].last_date) : 0 };
  });
  // Contrast (a.mail.conductor and crm.dev.a, 23 Nov 2026): p01 to p04 always have a draft waiting
  // (the CRM demo's cases); the others in turn: a draft already sent, no draft, a draft waiting.
  const drafts = [];
  contacts.forEach((c, i) => {
    const turn = i < 4 ? 2 : (i - 4) % 3;
    if (turn === 0) drafts.push({ ...draftFor(c, DEMO_ME), status: 'sent' });
    else if (turn === 2) drafts.push(draftFor(c, DEMO_ME));
  });
  // Follow-ups in the thread (asked by crm.dev.a, 23 Nov 2026): where a person has a thread waiting on a
  // reply (t-001 to t-004) and a draft waiting, the draft is a follow-up in that thread.
  for (const t of threads.filter((x) => ['t-001', 't-002', 't-003', 't-004'].includes(x.id))) {
    const i = drafts.findIndex((d) => d.contact === t.person && d.status === 'draft');
    if (i < 0) continue;
    const last = messages.find((m) => m.id === t.messages[t.messages.length - 1]);
    const c = contacts.find((x) => x.id === t.person);
    drafts[i] = { ...drafts[i], subject: `Re: ${t.subject}`, text: `Hi ${c.first},\n\nA short follow-up on my last email about ${t.subject.toLowerCase()}. Is this still of interest? If the timing is wrong, just say and I will come back to it later.\n\nBest wishes,\n${DEMO_ME.name}`, in_reply_to: last.headers.message_id, thread_id: t.id };
  }
  const labels = [{ id: 'INBOX', name: 'Inbox', type: 'system' }, { id: 'SENT', name: 'Sent', type: 'system' }, { id: 'UNREAD', name: 'Unread', type: 'system' }];
  return { me: DEMO_ME, orgs, people, contacts, threads, messages, drafts, labels, generated: { seed, at: new Date(now).toISOString(), synthetic: true } };
}

// The first draft for a contact, from its kind.
export function draftFor(c, me = DEMO_ME) {
  const [subject, text] = DRAFTS[c.kind] || DRAFTS.customer;
  const fill = (s) => s.replace(/\{first\}/g, c.first).replace(/\{me\}/g, me.name);
  return { contact: c.id, ...(c.org_id ? { org: c.org_id } : {}), to: [c.address], subject: fill(subject), text: fill(text), status: 'draft' };
}

const fromB64url = (s) => {
  const bin = atob(s.replace(/-/g, '+').replace(/_/g, '/'));
  return new TextDecoder().decode(Uint8Array.from(bin, (ch) => ch.charCodeAt(0)));
};

// A stand-in for the Gmail API calls the send screen uses. It sends nothing anywhere: each "send" is
// kept in memory, in this tab only, marked simulation: true.
export class FakeGmail {
  constructor({ me = DEMO_ME, now = () => Date.now() } = {}) { this.me = me; this.now = now; this.sent = []; this.n = 0; }
  async profile() { return { emailAddress: this.me.address, simulation: true }; }
  async send(raw) {
    const text = fromB64url(raw);
    const head = text.slice(0, text.indexOf('\r\n\r\n'));
    const header = (name) => (head.match(new RegExp(`^${name}: (.*)$`, 'mi')) || [])[1] || '';
    if (/^Bcc:/mi.test(head)) throw new Error('the demo refuses Bcc, as the page does');
    const rec = { id: `sim-${++this.n}`, threadId: `sim-t${this.n}`, to: header('To'), cc: header('Cc'), subject: header('Subject'), in_reply_to: header('In-Reply-To'), sent_at: new Date(this.now()).toISOString().slice(0, 19) + 'Z', simulation: true };
    this.sent.push(rec);
    return { id: rec.id, threadId: rec.threadId, simulation: true };
  }
  async sentToday() { const day = new Date(this.now()).toISOString().slice(0, 10); return this.sent.filter((s) => s.sent_at.startsWith(day)).length; }
}
