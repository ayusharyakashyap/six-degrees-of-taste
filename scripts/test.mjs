// End-to-end smoke test against the bundled mock Qloo (no network needed).
import { spawn } from 'node:child_process';
import assert from 'node:assert';
const mock = spawn('node', ['scripts/mock-qloo.mjs']);
await new Promise((r) => setTimeout(r, 500));
process.env.QLOO_API_KEY = 'mock-key';
process.env.QLOO_BASE_URL = 'http://localhost:4010';
const { runPath } = await import('../lib/service.js');
try {
  const r = await runPath({ a: { label: 'A', items: ['Frank Sinatra'] }, b: { label: 'B', items: ['Fortnite'] }, city: 'Singapore' });
  assert(r.nodes.length >= 3, 'path has at least 3 nodes');
  assert.equal(r.nodes[0].name, 'Frank Sinatra');
  assert.equal(r.nodes.at(-1).name, 'Fortnite');
  assert.equal(r.edges.length, r.nodes.length - 1);
  assert(r.story.hops.length === r.edges.length);
  console.log('✓ path:', r.nodes.map((n) => n.name).join(' → '));
} finally {
  mock.kill();
}
