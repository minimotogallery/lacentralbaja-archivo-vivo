import { randomBytes, createHash } from 'node:crypto';
const digest = value => createHash('sha256').update(value).digest('hex');
export function registerNewsletterRoutes(app, db, requireAdmin) {
  db.exec(`CREATE TABLE IF NOT EXISTS newsletter_subscribers (
    id INTEGER PRIMARY KEY AUTOINCREMENT, email TEXT NOT NULL UNIQUE,
    createdAt INTEGER NOT NULL, consentVersion TEXT NOT NULL,
    unsubscribeHash TEXT NOT NULL UNIQUE
  )`);
  const attempts = new Map();
  app.post('/api/newsletter/subscribe', (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    const body = req.body || {};
    if (body.website) return res.status(400).json({error:'No se pudo completar la solicitud.'});
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || body.consent !== true)
      return res.status(400).json({error:'Revisa el correo y acepta la suscripción.'});
    const now = Date.now();
    for (const [key, value] of attempts) if (now - value.start > 3600000) attempts.delete(key);
    const key = digest(email), entry = attempts.get(key) || {start:now,count:0};
    if (++entry.count > 5) return res.status(429).json({error:'Espera una hora antes de volver a intentarlo.'});
    attempts.set(key,entry);
    const token = randomBytes(32).toString('hex');
    try {
      const info = db.prepare('INSERT OR IGNORE INTO newsletter_subscribers (email,createdAt,consentVersion,unsubscribeHash) VALUES (?,?,?,?)').run(email, now, 'baja-frecuencia-v1', digest(token));
      // Existing tokens are never replaced by unauthenticated requests.
      return res.status(200).json({ok:true, ...(info.changes ? {unsubscribeToken:token} : {})});
    } catch (error) {
      console.error('newsletter_subscribe_failed', error.code || 'database_error');
      return res.status(500).json({error:'No se ha podido guardar. Inténtalo de nuevo.'});
    }
  });
  app.post('/api/newsletter/unsubscribe', (req,res) => {
    res.setHeader('Cache-Control','no-store');
    const token = req.body?.token;
    if (typeof token !== 'string' || !/^[a-f0-9]{64}$/.test(token)) return res.status(400).json({error:'El enlace de baja no es válido.'});
    db.prepare('DELETE FROM newsletter_subscribers WHERE unsubscribeHash = ?').run(digest(token));
    res.json({ok:true});
  });
  app.get('/api/admin/newsletter', (req,res) => {
    res.setHeader('Cache-Control','no-store');
    if (!requireAdmin(req,res)) return;
    res.json({items:db.prepare('SELECT id,email,createdAt,consentVersion FROM newsletter_subscribers ORDER BY createdAt DESC').all()});
  });
  app.delete('/api/admin/newsletter/:id', (req,res) => {
    res.setHeader('Cache-Control','no-store');
    if (!requireAdmin(req,res)) return;
    db.prepare('DELETE FROM newsletter_subscribers WHERE id = ?').run(req.params.id);
    res.json({ok:true});
  });
}
