const COHORT = 'enero-2027';
const PROGRAMS = new Set(['xenovision', 'performance-arte-figital', 'ambos']);
const PAYMENTS = new Set(['general', 'general-fraccionado', 'reducida', 'beca']);
const text = (value, max) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export function registerStudyRoutes(app, db, requireAdmin) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_enrollments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      createdAt INTEGER NOT NULL,
      cohort TEXT NOT NULL,
      name TEXT NOT NULL,
      email TEXT NOT NULL,
      phone TEXT NOT NULL DEFAULT '',
      program TEXT NOT NULL,
      payment TEXT NOT NULL,
      motivation TEXT NOT NULL,
      accessibility TEXT NOT NULL DEFAULT '',
      consent INTEGER NOT NULL,
      status TEXT NOT NULL DEFAULT 'nueva',
      source TEXT NOT NULL DEFAULT 'web'
    )
  `);
  db.exec('CREATE UNIQUE INDEX IF NOT EXISTS study_enrollments_email_program_cohort ON study_enrollments(email, program, cohort)');

  const insert = db.prepare(`
    INSERT INTO study_enrollments
      (createdAt, cohort, name, email, phone, program, payment, motivation, accessibility, consent, source)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1, ?)
  `);
  const list = db.prepare('SELECT * FROM study_enrollments WHERE cohort = ? ORDER BY createdAt DESC, id DESC LIMIT 200');
  const count = db.prepare('SELECT COUNT(*) AS total FROM study_enrollments WHERE cohort = ?');

  app.post('/api/inscripciones', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const payload = req.body && typeof req.body === 'object' ? req.body : {};
    if (text(payload.website, 200)) {
      return res.status(201).json({ ok: true, reference: 'LCB-RECIBIDA' });
    }
    const name = text(payload.name, 100);
    const email = text(payload.email, 160).toLowerCase();
    const phone = text(payload.phone, 30);
    const program = text(payload.program, 40);
    const payment = text(payload.payment, 30);
    const motivation = text(payload.motivation, 900);
    const accessibility = text(payload.accessibility, 500);
    const source = text(payload.source, 120).replace(/[^a-zA-Z0-9_:-]/g, '') || 'web';

    if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ error: 'Revisa tu nombre y correo electrónico.' });
    }
    if (!PROGRAMS.has(program) || !PAYMENTS.has(payment)) {
      return res.status(400).json({ error: 'Selecciona un programa y una modalidad económica.' });
    }
    if (motivation.length < 30) {
      return res.status(400).json({ error: 'Cuéntanos un poco más sobre lo que quieres investigar.' });
    }
    if (payload.consent !== 'accepted') {
      return res.status(400).json({ error: 'Necesitamos tu consentimiento para guardar la solicitud.' });
    }

    try {
      const saved = insert.run(Date.now(), COHORT, name, email, phone, program, payment, motivation, accessibility, source);
      return res.status(201).json({ ok: true, reference: 'LCB-' + String(saved.lastInsertRowid).padStart(4, '0') });
    } catch (error) {
      if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
        return res.status(409).json({ error: 'Ya tenemos una solicitud con este correo para ese programa.' });
      }
      console.error('No se pudo guardar la preinscripción:', error.code || 'database_error');
      return res.status(500).json({ error: 'No hemos podido guardar tu solicitud. Inténtalo de nuevo.' });
    }
  });

  app.get('/api/admin/inscripciones', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    if (!requireAdmin(req, res)) return;
    try {
      const items = list.all(COHORT).map(row => ({ ...row, reference: 'LCB-' + String(row.id).padStart(4, '0') }));
      res.json({ items, total: count.get(COHORT).total });
    } catch (error) {
      console.error('No se pudieron consultar las preinscripciones:', error.code || 'database_error');
      res.status(500).json({ error: 'No se pudieron cargar las preinscripciones.' });
    }
  });
}
