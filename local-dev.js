const http = require('http');
const path = require('path');
const fs = require('fs');

const PUBLIC_DIR = path.join(__dirname, 'public');
const API_DIR = path.join(__dirname, 'api');
const DEFAULT_PORT = 3000;

function getContentType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.js':
    case '.jsx': return 'application/javascript; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.ico': return 'image/x-icon';
    case '.png': return 'image/png';
    case '.jpg':
    case '.jpeg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'text/plain; charset=utf-8';
  }
}

function serveStatic(req, res) {
  let urlPath = req.url.split('?')[0];
  if (urlPath === '/') urlPath = '/index.html';
  const safePath = path.normalize(urlPath).replace(/^\.\.(\/|\\)/g, '');
  const filePath = path.join(PUBLIC_DIR, safePath);
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.statusCode = 403; res.end('Forbidden'); return;
  }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.statusCode = 404; res.end('Not Found'); return; }
    res.setHeader('Content-Type', getContentType(filePath));
    res.end(data);
  });
}

function wrapRes(nativeRes) {
  const res = nativeRes;
  res.status = (code) => { res.statusCode = code; return res; };
  res.type = (mime) => { res.setHeader('Content-Type', mime); return res; };
  res.send = (body) => {
    if (Buffer.isBuffer(body)) return res.end(body);
    if (typeof body === 'string') return res.end(body);
    try { return res.end(String(body)); } catch { return res.end(); }
  };
  res.json = (obj) => {
    try {
      const s = JSON.stringify(obj);
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
      return res.end(s);
    } catch {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json');
      return res.end('{}');
    }
  };
  return res;
}

function loadApiHandlerForPath(pathname) {
  let file = 'index.js';
  const p = pathname.replace(/^\/api\/?/, '');
  if (p && p !== 'index') file = `${p}.js`;
  const target = path.join(API_DIR, file);
  if (fs.existsSync(target)) return require(target);
  return require(path.join(API_DIR, 'index.js'));
}

function handleApi(req, res) {
  const wrappedRes = wrapRes(res);
  const pathname = req.url.split('?')[0];
  let handler;
  try { handler = loadApiHandlerForPath(pathname); } catch { handler = null; }
  if (!handler) { wrappedRes.status(404).type('application/json').send(JSON.stringify({ error: 'Not Found' })); return; }

  if (req.method === 'POST') {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => {
      req.body = body;
      try { handler(req, wrappedRes); } catch { wrappedRes.status(500).json({ error: 'Server error' }); }
    });
    return;
  }
  try { handler(req, wrappedRes); } catch { wrappedRes.status(500).json({ error: 'Server error' }); }
}

const server = http.createServer((req, res) => {
  if (req.url.startsWith('/api')) return handleApi(req, res);
  return serveStatic(req, res);
});

function start(port) {
  server.listen(port, () => {
    console.log(`Local dev server running at http://localhost:${port}`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && port < 3010) start(port + 1);
    else { console.error('Failed to start server:', err); process.exit(1); }
  });
}

start(DEFAULT_PORT);
