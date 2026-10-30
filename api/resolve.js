import { resolveText } from '../lib/service.js';
import { send, fail } from './_http.js';

export default async function handler(req, res) {
  try {
    const url = new URL(req.url, 'http://x');
    const q = (url.searchParams.get('q') || '').slice(0, 80);
    if (!q.trim()) return send(res, 400, { error: 'Missing q' });
    const results = await resolveText(q, null, 6);
    send(res, 200, { results: results.map(({ id, name, type, domain, image, year, tags }) => ({ id, name, type, domain, image, year, tags: tags.slice(0, 12) })) });
  } catch (e) {
    fail(res, e);
  }
}
