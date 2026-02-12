import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import { nanoid } from 'nanoid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const ADMIN_KEY = process.env.ADMIN_KEY || '';

// For production (Render disk): set DATA_DIR + UPLOADS_DIR to a persistent mount.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

const app = express();

// --- DB
fs.mkdirSync(DATA_DIR, { recursive: true });
fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const dbPath = path.join(DATA_DIR, 'db.sqlite');
const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

db.exec(`
CREATE TABLE IF NOT EXISTS board_posts (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  author TEXT,
  tags TEXT,
  imagePath TEXT,
  status TEXT NOT NULL DEFAULT 'approved'
);
CREATE INDEX IF NOT EXISTS idx_board_posts_createdAt ON board_posts(createdAt DESC);

CREATE TABLE IF NOT EXISTS artists (
  id TEXT PRIMARY KEY,
  createdAt INTEGER NOT NULL,
  name TEXT NOT NULL,
  bio TEXT,
  role TEXT,
  link TEXT,
  tags TEXT,
  imagePath TEXT
);
CREATE INDEX IF NOT EXISTS idx_artists_createdAt ON artists(createdAt DESC);
`);

// lightweight migration: add status column if missing (older DB)
try {
  const cols = db.prepare(`PRAGMA table_info(board_posts)`).all().map(r => r.name);
  if (!cols.includes('status')) {
    db.exec(`ALTER TABLE board_posts ADD COLUMN status TEXT NOT NULL DEFAULT 'approved'`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_board_posts_status_createdAt ON board_posts(status, createdAt DESC)`);
} catch {}

// --- uploads
const uploadsDir = UPLOADS_DIR;
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').slice(0, 10);
    cb(null, `${Date.now()}-${nanoid(10)}${ext}`);
  }
});

const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (!file.mimetype?.startsWith('image/')) return cb(new Error('Solo imágenes'));
    cb(null, true);
  }
});

// --- static
app.use('/uploads', express.static(uploadsDir));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// NOTE: do not serve DB dir in prod; keep for local debugging only.
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  app.use('/data', express.static(DATA_DIR));
}
app.use(express.static(__dirname));

// --- API
function requireAdmin(req, res) {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

// Public board: only approved
app.get('/api/board', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 60)));
  const rows = db.prepare(`SELECT * FROM board_posts WHERE status = 'approved' ORDER BY createdAt DESC LIMIT ?`).all(limit);
  const out = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    title: r.title,
    body: r.body || '',
    author: r.author || 'Anónimo',
    tags: (r.tags || '').split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: r.imagePath ? `/uploads/${r.imagePath}` : ''
  }));
  res.json(out);
});

// Public submit: creates pending
app.post('/api/board/submit', upload.single('image'), (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });

  const id = nanoid(12);
  const createdAt = Date.now();
  const body = String(req.body.body || '').trim();
  const author = String(req.body.author || '').trim() || 'Anónimo';
  const tags = String(req.body.tags || '').trim();
  const imagePath = req.file ? req.file.filename : '';

  db.prepare(
    `INSERT INTO board_posts (id, createdAt, title, body, author, tags, imagePath, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(id, createdAt, title, body, author, tags, imagePath);

  res.json({ ok: true, id });
});

// Admin: list board posts by status
app.get('/api/admin/board', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const status = String(req.query.status || 'pending');
  if (!['pending', 'approved', 'rejected'].includes(status)) {
    return res.status(400).json({ error: 'bad_status' });
  }
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 120)));
  const rows = db.prepare(`SELECT * FROM board_posts WHERE status = ? ORDER BY createdAt DESC LIMIT ?`).all(status, limit);
  const out = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    title: r.title,
    body: r.body || '',
    author: r.author || 'Anónimo',
    tags: (r.tags || '').split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: r.imagePath ? `/uploads/${r.imagePath}` : '',
    status: r.status
  }));
  res.json(out);
});

app.post('/api/admin/board/:id/approve', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params.id || '');
  const info = db.prepare(`UPDATE board_posts SET status = 'approved' WHERE id = ?`).run(id);
  res.json({ ok: true, updated: info.changes });
});

app.post('/api/admin/board/:id/reject', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params.id || '');
  const info = db.prepare(`UPDATE board_posts SET status = 'rejected' WHERE id = ?`).run(id);
  res.json({ ok: true, updated: info.changes });
});

// Admin: create approved (used by current admin UI)
app.post('/api/board', upload.single('image'), (req, res) => {
  if (!requireAdmin(req, res)) return;

  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });

  const id = nanoid(12);
  const createdAt = Date.now();
  const body = String(req.body.body || '').trim();
  const author = String(req.body.author || '').trim() || 'Anónimo';
  const tags = String(req.body.tags || '').trim();
  const imagePath = req.file ? req.file.filename : '';

  db.prepare(
    `INSERT INTO board_posts (id, createdAt, title, body, author, tags, imagePath, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'approved')`
  ).run(id, createdAt, title, body, author, tags, imagePath);

  res.json({
    id,
    createdAt,
    title,
    body,
    author,
    tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: imagePath ? `/uploads/${imagePath}` : ''
  });
});

app.delete('/api/board/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params.id || '');
  const info = db.prepare('DELETE FROM board_posts WHERE id = ?').run(id);
  res.json({ ok: true, deleted: info.changes });
});

// --- artists
app.get('/api/artists', (req, res) => {
  const limit = Math.max(1, Math.min(200, Number(req.query.limit || 80)));
  const rows = db.prepare('SELECT * FROM artists ORDER BY createdAt DESC LIMIT ?').all(limit);
  const out = rows.map(r => ({
    id: r.id,
    createdAt: r.createdAt,
    name: r.name,
    bio: r.bio || '',
    role: r.role || '',
    link: r.link || '',
    tags: (r.tags || '').split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: r.imagePath ? `/uploads/${r.imagePath}` : ''
  }));
  res.json(out);
});

app.post('/api/artists', upload.single('image'), (req, res) => {
  const name = String(req.body.name || '').trim();
  if (!name) return res.status(400).json({ error: 'name_required' });

  const id = nanoid(12);
  const createdAt = Date.now();
  const bio = String(req.body.bio || '').trim();
  const role = String(req.body.role || '').trim();
  const link = String(req.body.link || '').trim();
  const tags = String(req.body.tags || '').trim();
  const imagePath = req.file ? req.file.filename : '';

  db.prepare(
    'INSERT INTO artists (id, createdAt, name, bio, role, link, tags, imagePath) VALUES (?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, createdAt, name, bio, role, link, tags, imagePath);

  res.json({
    id,
    createdAt,
    name,
    bio,
    role,
    link,
    tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: imagePath ? `/uploads/${imagePath}` : ''
  });
});

app.delete('/api/artists/:id', (req, res) => {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    return res.status(401).json({ error: 'unauthorized' });
  }
  const id = String(req.params.id || '');
  const info = db.prepare('DELETE FROM artists WHERE id = ?').run(id);
  res.json({ ok: true, deleted: info.changes });
});

// SPA-ish fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

app.listen(PORT, () => {
  console.log(`Archivo vivo running on http://localhost:${PORT}`);
  if (!ADMIN_KEY) console.log('ADMIN_KEY not set (delete endpoint disabled)');
});
