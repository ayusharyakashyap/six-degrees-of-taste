import { status } from '../lib/service.js';
import { send } from './_http.js';
export default function handler(req, res) {
  send(res, 200, status());
}
