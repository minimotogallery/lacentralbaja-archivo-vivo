import { registerNewsletterRoutes } from './newsletter-api.js';
import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import Database from 'better-sqlite3';
import multer from 'multer';
import { nanoid } from 'nanoid';
import { registerStudyRoutes } from './studies-api.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT ? Number(process.env.PORT) : 5173;
const ADMIN_KEY = (process.env.ADMIN_KEY || '').trim();

// For production (Render disk): set DATA_DIR + UPLOADS_DIR to a persistent mount.
const DATA_DIR = process.env.DATA_DIR || path.join(__dirname, 'data');
const UPLOADS_DIR = process.env.UPLOADS_DIR || path.join(__dirname, 'uploads');

const app = express();
app.use(express.json({ limit: '200kb' }));

// Helpful for verifying which code is deployed.
app.use((req, res, next) => {
  res.setHeader('x-archivo-vivo-version', process.env.RENDER_GIT_COMMIT || process.env.GIT_COMMIT || 'dev');
  next();
});

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
  attachments TEXT NOT NULL DEFAULT '[]',
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
  if (!cols.includes('attachments')) {
    db.exec(`ALTER TABLE board_posts ADD COLUMN attachments TEXT NOT NULL DEFAULT '[]'`);
  }
  db.exec(`CREATE INDEX IF NOT EXISTS idx_board_posts_status_createdAt ON board_posts(status, createdAt DESC)`);
} catch {}

// One-time MiniMoto territory card: Juan Sánchez + Cristina Luna Rodríguez.
try {
  const sharedSource = path.join(__dirname, 'assets', 'juan-sanchez-cristina-luna.jpeg');
  const sharedUpload = 'juan-sanchez-cristina-luna.jpeg';
  const sharedTarget = path.join(UPLOADS_DIR, sharedUpload);

  if (fs.existsSync(sharedSource)) {
    const sourceBytes = fs.readFileSync(sharedSource);
    const targetBytes = fs.existsSync(sharedTarget) ? fs.readFileSync(sharedTarget) : null;
    if (!targetBytes || !sourceBytes.equals(targetBytes)) {
      fs.writeFileSync(sharedTarget, sourceBytes);
    }

    const tx = db.transaction(() => {
      db.prepare('DELETE FROM artists WHERE id IN (?, ?) OR name = ?').run(
        'juan-sanchez-1987',
        'cristina-luna-rodriguez',
        'Joel Blanco'
      );

      db.prepare(
        `INSERT INTO artists (id, createdAt, name, bio, role, link, tags, imagePath)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?)
         ON CONFLICT(id) DO UPDATE SET
           name = excluded.name,
           bio = excluded.bio,
           role = excluded.role,
           link = excluded.link,
           tags = excluded.tags,
           imagePath = excluded.imagePath`
      ).run(
        'minimoto-pintura-aspersion-2026',
        1792604102002,
        'Juan Sánchez × Cristina Luna Rodríguez',
        'Juan Sánchez (Murcia, 1987), artista visual e investigador, trabaja sobre la pintura encubierta, el bricolaje y los sistemas pictóricos automatizados. En Pintura por aspersión continúa la investigación iniciada en Pintura por goteo. Cristina Luna Rodríguez, comisaria de arte y productora cultural vinculada a Madrid, Guatemala y Taipéi, comisaría la exposición. MiniMoto Gallery · La Central Baja · 30/10/2026 · 20:00 · C/ Pinatar 3, Murcia · entrada libre.',
        'MINIMOTO GALLERY · TERRITORIO TEMPORAL · PINTURA POR ASPERSIÓN',
        'https://minimotogallery.github.io/minimoto-gallery/',
        'MiniMoto Gallery, temporal, Juan Sánchez, Cristina Luna Rodríguez, Pintura por aspersión',
        sharedUpload
      );
    });
    tx();
  }
} catch (error) {
  console.error('MiniMoto territory migration failed', error);
}

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

const BOARD_ATTACHMENT_EXTENSIONS = new Set(['.pdf', '.txt', '.md', '.rtf', '.doc', '.docx', '.odt']);
const BOARD_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

const boardUpload = multer({
  storage,
  limits: { fileSize: 15 * 1024 * 1024, files: 7 },
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname || '').toLowerCase();
    if (file.fieldname === 'image') {
      if (!file.mimetype?.startsWith('image/') || !BOARD_IMAGE_EXTENSIONS.has(ext)) {
        return cb(new Error('Formato de imagen no permitido'));
      }
      return cb(null, true);
    }
    if (file.fieldname === 'attachments') {
      if (!BOARD_ATTACHMENT_EXTENSIONS.has(ext)) {
        return cb(new Error('Formato de documento no permitido'));
      }
      return cb(null, true);
    }
    return cb(new Error('Campo de archivo no permitido'));
  }
});

const boardUploadFields = boardUpload.fields([
  { name: 'image', maxCount: 1 },
  { name: 'attachments', maxCount: 6 }
]);

function safeAttachmentName(value) {
  return path.basename(String(value || 'documento'))
    .replace(/[\u0000-\u001f\u007f]/g, '')
    .slice(0, 180) || 'documento';
}

function boardFilesFromRequest(req) {
  const image = req.files?.image?.[0];
  const documents = Array.isArray(req.files?.attachments) ? req.files.attachments : [];
  return {
    imagePath: image?.filename || '',
    attachments: documents.map(file => ({
      name: safeAttachmentName(file.originalname),
      path: file.filename,
      mimeType: file.mimetype || 'application/octet-stream',
      size: Number(file.size) || 0
    }))
  };
}

function parseAttachments(value) {
  try {
    const items = JSON.parse(value || '[]');
    return Array.isArray(items) ? items.filter(item => item && item.path) : [];
  } catch {
    return [];
  }
}

function publicAttachments(value) {
  return parseAttachments(value).map(item => ({
    name: safeAttachmentName(item.name),
    mimeType: String(item.mimeType || 'application/octet-stream'),
    size: Number(item.size) || 0,
    url: `/uploads/${encodeURIComponent(item.path)}`
  }));
}

function removeUploadFile(filename) {
  const safeName = path.basename(String(filename || ''));
  if (!safeName) return;
  try { fs.unlinkSync(path.join(uploadsDir, safeName)); } catch {}
}

function removeBoardFiles(row) {
  if (!row) return;
  removeUploadFile(row.imagePath);
  parseAttachments(row.attachments).forEach(item => removeUploadFile(item.path));
}

// --- static
// Application records must never be downloadable as static database files.
app.use((req, res, next) => {
  let pathname;
  try { pathname = decodeURIComponent(req.path); } catch { return res.sendStatus(400); }
  if (/(?:^|\/)db\.sqlite(?:-(?:wal|shm))?$/i.test(pathname)) return res.sendStatus(404);
  next();
});
app.use('/uploads', express.static(uploadsDir, {
  setHeaders: res => res.setHeader('X-Content-Type-Options', 'nosniff')
}));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
// NOTE: do not serve DB dir in prod; keep for local debugging only.
if (!process.env.NODE_ENV || process.env.NODE_ENV === 'development') {
  app.use('/data', express.static(DATA_DIR));
}
app.use(express.static(__dirname));

// --- seed/project config
const seedPath = path.join(__dirname, 'data', 'seed.json');
const projectOverridePath = path.join(DATA_DIR, 'project.json');

function readJsonSafe(p, fallback) {
  try {
    return JSON.parse(fs.readFileSync(p, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeJsonSafe(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj, null, 2), 'utf8');
}

function getMergedSeed() {
  const seed = readJsonSafe(seedPath, { project: {}, entries: [] });
  const override = readJsonSafe(projectOverridePath, null);
  if (override && typeof override === 'object') {
    seed.project = { ...(seed.project || {}), ...override };
    // Merge goals carefully
    seed.project.goals = { ...(seed.project?.goals || {}), ...(override.goals || {}) };
  }
  return seed;
}

// --- API
function requireAdmin(req, res) {
  if (!ADMIN_KEY || req.get('x-admin-key') !== ADMIN_KEY) {
    res.status(401).json({ error: 'unauthorized' });
    return false;
  }
  return true;
}

app.get('/api/seed', (req, res) => {
  res.json(getMergedSeed());
});

registerStudyRoutes(app, db, requireAdmin);
registerNewsletterRoutes(app, db, requireAdmin);

app.get('/api/project', (req, res) => {
  res.json(getMergedSeed().project || {});
});

// Admin: update project/goals (persists to Render disk via DATA_DIR)
app.put('/api/admin/project', (req, res) => {
  if (!requireAdmin(req, res)) return;

  const incoming = req.body && typeof req.body === 'object' ? req.body : {};
  const cur = readJsonSafe(projectOverridePath, {});

  const next = { ...cur, ...incoming };
  if (incoming.goals && typeof incoming.goals === 'object') {
    next.goals = { ...(cur.goals || {}), ...(incoming.goals || {}) };
  }

  // Basic validation/coercion for goals fields
  if (next.goals) {
    for (const k of ['min', 'opt', 'raised', 'daysLeft']) {
      if (k in next.goals) {
        const v = next.goals[k];
        const num = (v === '' || v === null || typeof v === 'undefined') ? undefined : Number(v);
        if (typeof num !== 'undefined' && Number.isNaN(num)) {
          return res.status(400).json({ error: `bad_goals_${k}` });
        }
        if (typeof num !== 'undefined') next.goals[k] = num;
      }
    }
  }

  writeJsonSafe(projectOverridePath, next);
  res.json({ ok: true, project: getMergedSeed().project });
});

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
    imageUrl: r.imagePath ? `/uploads/${r.imagePath}` : '',
    attachments: publicAttachments(r.attachments)
  }));
  res.json(out);
});

// Public submit: creates pending
app.post('/api/board/submit', boardUploadFields, (req, res) => {
  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });

  const id = nanoid(12);
  const createdAt = Date.now();
  const body = String(req.body.body || '').trim();
  const author = String(req.body.author || '').trim() || 'Anónimo';
  const tags = String(req.body.tags || '').trim();
  const { imagePath, attachments } = boardFilesFromRequest(req);
  if (!body && !imagePath && !attachments.length) {
    return res.status(400).json({ error: 'content_required' });
  }

  db.prepare(
    `INSERT INTO board_posts (id, createdAt, title, body, author, tags, imagePath, attachments, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'pending')`
  ).run(id, createdAt, title, body, author, tags, imagePath, JSON.stringify(attachments));

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
    attachments: publicAttachments(r.attachments),
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
app.post('/api/board', boardUploadFields, (req, res) => {
  if (!requireAdmin(req, res)) return;

  const title = String(req.body.title || '').trim();
  if (!title) return res.status(400).json({ error: 'title_required' });

  const id = nanoid(12);
  const createdAt = Date.now();
  const body = String(req.body.body || '').trim();
  const author = String(req.body.author || '').trim() || 'Anónimo';
  const tags = String(req.body.tags || '').trim();
  const { imagePath, attachments } = boardFilesFromRequest(req);
  if (!body && !imagePath && !attachments.length) {
    return res.status(400).json({ error: 'content_required' });
  }

  db.prepare(
    `INSERT INTO board_posts (id, createdAt, title, body, author, tags, imagePath, attachments, status)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'approved')`
  ).run(id, createdAt, title, body, author, tags, imagePath, JSON.stringify(attachments));

  res.json({
    id,
    createdAt,
    title,
    body,
    author,
    tags: tags.split(',').map(s => s.trim()).filter(Boolean),
    imageUrl: imagePath ? `/uploads/${imagePath}` : '',
    attachments: publicAttachments(JSON.stringify(attachments))
  });
});

app.delete('/api/board/:id', (req, res) => {
  if (!requireAdmin(req, res)) return;
  const id = String(req.params.id || '');
  const row = db.prepare('SELECT imagePath, attachments FROM board_posts WHERE id = ?').get(id);
  const info = db.prepare('DELETE FROM board_posts WHERE id = ?').run(id);
  if (info.changes) removeBoardFiles(row);
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

// Admin UI
app.get(['/admin', '/admin/'], (req, res) => res.sendFile(path.join(__dirname, 'admin.html')));

// Training is a separate page within the existing website.
app.get(['/estudios-alternativos', '/estudios-alternativos/'], (req, res) => res.sendFile(path.join(__dirname, 'estudios-alternativos.html')));

app.get(['/newsletter', '/newsletter/'], (req,res) => res.sendFile(path.join(__dirname, 'newsletter.html')));

// SPA-ish fallback
app.get('*', (req, res) => res.sendFile(path.join(__dirname, 'index.html')));

// Upload validation errors are user input errors, not server failures.
app.use((error, req, res, next) => {
  if (error instanceof multer.MulterError || /Formato de|Campo de archivo/.test(String(error?.message || ''))) {
    return res.status(400).json({ error: 'invalid_upload', message: String(error.message || 'Archivo no válido') });
  }
  console.error('request_failed', error);
  res.status(500).json({ error: 'server_error' });
});

app.listen(PORT, () => {
  console.log(`Archivo vivo running on http://localhost:${PORT}`);
  if (!ADMIN_KEY) console.log('ADMIN_KEY not set (delete endpoint disabled)');
});
