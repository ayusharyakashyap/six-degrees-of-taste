export function send(res, status, data) {
  res.statusCode = status;
  res.setHeader('content-type', 'application/json; charset=utf-8');
  res.setHeader('cache-control', 'no-store');
  res.end(JSON.stringify(data));
}

export async function readBody(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string') return JSON.parse(req.body || '{}');
  const chunks = [];
  for await (const c of req) chunks.push(c);
  const raw = Buffer.concat(chunks).toString('utf8');
  return raw ? JSON.parse(raw) : {};
}

export function fail(res, e) {
  const status = e && e.status && e.status >= 400 && e.status < 600 ? e.status : 500;
  const message =
    status === 401 || status === 403
      ? 'Qloo rejected the API key. Check the key and try again.'
      : status === 429
      ? 'Qloo rate limit hit — wait a few seconds and try again.'
      : e?.message || 'Something went wrong.';
  send(res, status === 401 || status === 403 ? 502 : status, { error: message });
}
