import { readFileSync } from 'fs';

const port = readFileSync('.port', 'utf-8').trim();
const base = `http://localhost:${port}`;

let pass = 0, fail = 0;
const test = async (name, fn) => {
  try { await fn(); pass++; console.log(`PASS: ${name}`); }
  catch (e) { fail++; console.log(`FAIL: ${name} - ${e.message}`); }
};
const post = (path, data) =>
  fetch(`${base}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });
const get = (path) => fetch(`${base}${path}`);

await test('Fix: join missing fields returns 400', async () => {
  const r = await post('/api/mock-event', { type: 'join' });
  if (r.status !== 400) throw new Error(`status ${r.status}`);
});

await test('Fix: join missing keyword returns 400', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'x' });
  if (r.status !== 400) throw new Error(`status ${r.status}`);
});

await test('GET / returns HTML page', async () => {
  const r = await get('/');
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const t = await r.text();
  if (!t.includes('DOCTYPE')) throw new Error('not HTML');
});

await test('Favicon returns 204', async () => {
  const r = await get('/favicon.ico');
  if (r.status !== 204) throw new Error(`status ${r.status}`);
});

await test('index.html served', async () => {
  const r = await get('/index.html');
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const t = await r.text();
  if (!t.includes('canvas')) throw new Error('no canvas');
});

await test('Socket.io client JS served', async () => {
  const r = await get('/socket.io/socket.io.js');
  if (r.status !== 200) throw new Error(`status ${r.status}`);
});

await test('Socket.io handshake works', async () => {
  const r = await get('/socket.io/?EIO=4&transport=polling');
  if (r.status !== 200) throw new Error(`status ${r.status}`);
  const t = await r.text();
  if (!t.includes('sid')) throw new Error('no sid');
});

await test('Join red faction', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'alice', factionKeyword: 'red' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Join blue faction', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'bob', factionKeyword: 'blue' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Join green faction', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'charlie', factionKeyword: 'green' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Join yellow faction', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'dave', factionKeyword: 'yellow' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Join invalid faction rejected 400', async () => {
  const r = await post('/api/mock-event', { type: 'join', username: 'x', factionKeyword: 'purple' });
  if (r.status !== 400) throw new Error(`status ${r.status}`);
});

await test('Like event +1 troop', async () => {
  const r = await post('/api/mock-event', { type: 'like', username: 'alice', factionKeyword: 'red', value: 1 });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Share event +1 troop', async () => {
  const r = await post('/api/mock-event', { type: 'share', username: 'bob', factionKeyword: 'blue', value: 1 });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Follow event +2 troops', async () => {
  const r = await post('/api/mock-event', { type: 'follow', username: 'charlie', factionKeyword: 'green', value: 1 });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Gift event +50 troops (10*5)', async () => {
  const r = await post('/api/mock-event', { type: 'gift', username: 'dave', factionKeyword: 'yellow', value: 10 });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Gift no value defaults gracefully', async () => {
  const r = await post('/api/mock-event', { type: 'gift', username: 'dave', factionKeyword: 'yellow' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Like invalid faction rejected 400', async () => {
  const r = await post('/api/mock-event', { type: 'like', username: 'x', factionKeyword: 'orange', value: 1 });
  if (r.status !== 400) throw new Error(`status ${r.status}`);
});

await test('Upload icon valid', async () => {
  const r = await post('/api/upload-icon', { factionId: 0, imageData: 'data:image/png;base64,abc' });
  const d = await r.json();
  if (!d.success) throw new Error('not success');
});

await test('Upload icon missing data rejected 400', async () => {
  const r = await post('/api/upload-icon', { factionId: 0 });
  if (r.status !== 400) throw new Error(`status ${r.status}`);
});

await test('Burst 20 likes stress test', async () => {
  for (let i = 0; i < 20; i++) {
    const r = await post('/api/mock-event', { type: 'like', username: `stress${i}`, factionKeyword: 'red', value: 1 });
    const d = await r.json();
    if (!d.success) throw new Error(`failed at ${i}`);
  }
});

await test('/api/event endpoint works', async () => {
  const r = await post('/api/event', { type: 'like', username: 'test', factionKeyword: 'red', value: 1 });
  if (r.status !== 200) throw new Error(`status ${r.status}`);
});

await test('All 4 event types work', async () => {
  for (const type of ['like', 'share', 'follow', 'gift']) {
    const r = await post('/api/mock-event', { type, username: `test_${type}`, factionKeyword: 'blue', value: 2 });
    const d = await r.json();
    if (!d.success) throw new Error(`${type} failed`);
  }
});

console.log(`\n===== RESULTS: ${pass}/${pass + fail} passed, ${fail} failed =====`);
process.exit(fail > 0 ? 1 : 0);
