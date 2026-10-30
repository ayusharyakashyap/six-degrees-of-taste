import { status } from '../lib/service.js';
import { send } from './_http.js';
import { withRequestKey } from '../lib/qloo.js';
export default function handler(req, res) {
  send(res, 200, withRequestKey(req.headers['x-qloo-key'], () => status()));
}
