import { runPath } from '../lib/service.js';
import { withRequestKey } from '../lib/qloo.js';
import { send, fail, readBody } from './_http.js';

export const config = { maxDuration: 60 };

export default async function handler(req, res) {
  if (req.method !== 'POST') return send(res, 405, { error: 'POST only' });
  try {
    const body = await readBody(req);
    send(res, 200, await withRequestKey(req.headers['x-qloo-key'], () => runPath(body)));
  } catch (e) {
    fail(res, e);
  }
}
