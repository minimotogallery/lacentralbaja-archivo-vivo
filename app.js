const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const fallbackArtists = [
  { name: 'Aitana de Nit', role: 'Artista', bio: 'Práctica instalativa y material centrada en los vínculos entre cuerpo, espacio y ficción.', tags: ['instalación', 'escultura'] },
  { name: 'MiniMoto Gallery', role: 'Dispositivo expositivo', bio: 'Galería site-specific y plataforma de mediación dentro de La Central Baja.', tags: ['exposición', 'mediación'] },
  { name: 'Diego Lobenal', role: 'Artista y gestor cultural', bio: 'Investigación, performance, fotografía y construcción de infraestructuras culturales.', tags: ['performance', 'curaduría'] }
];

const fallbackPosts = [
  { title: 'La nave como proceso', body: 'Montajes, pruebas, reuniones y tiempos de trabajo que hacen visible la construcción cotidiana del espacio.', author: 'La Central Baja', tags: ['proceso'], createdAt: Date.now() },
  { title: 'MiniMoto: activación 01', body: 'Un espacio expositivo mínimo que trabaja con la escala, la proximidad y la recepción de propuestas.', author: 'MiniMoto Gallery', tags: ['exposición'], createdAt: Date.now() - 86400000 * 4 },
  { title: 'Puestos en uso', body: 'El espacio empieza a tomar forma a través de quienes lo trabajan y modifican diariamente.', author: 'La Central Baja', tags: ['espacio'], createdAt: Date.now() - 86400000 * 10 }
];

const state = { posts: [], query: '', tag: 'todo' };

function clean(value) { return String(value || '').replace(/\s+/g, ' ').trim(); }
function excerpt(value, max = 260) { const text = clean(value); return text.length > max ? `${text.slice(0, max).trim()}…` : text; }
function formatDate(value) { const d = new Date(Number(value) || value); return Number.isNaN(d.getTime()) ? 'Sin fecha' : new Intl.DateTimeFormat('es-ES', { day: '2-digit', month: '2-digit', year: 'numeric' }).format(d); }
function safeUrl(value) { try { const u = new URL(String(value || ''), location.origin); return ['http:', 'https:'].includes(u.protocol) ? u.href : ''; } catch { return ''; } }

async function getJson(path) {
  const response = await fetch(path, { headers: { Accept: 'application/json' }, cache: 'no-store' });
  if (!response.ok) throw new Error(String(response.status));
  return response.json();
}

function setupMenu() {
  const button = $('.menu-button');
  const nav = $('#site-nav');
  if (!button || !nav) return;
  button.addEventListener('click', () => {
    const open = button.getAttribute('aria-expanded') !== 'true';
    button.setAttribute('aria-expanded', String(open));
    nav.classList.toggle('is-open', open);
  });
  $$('a', nav).forEach(link => link.addEventListener('click', () => { button.setAttribute('aria-expanded', 'false'); nav.classList.remove('is-open'); }));
}

function setupTime() {
  const clock = $('#local-time');
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());
  const update = () => { if (clock) clock.textContent = new Intl.DateTimeFormat('es-ES', { timeZone: 'Europe/Madrid', hour: '2-digit', minute: '2-digit', hour12: false }).format(new Date()); };
  update(); setInterval(update, 30000);
}

function artistCard(artist, index) {
  const article = document.createElement('article'); article.className = 'artist-card';
  const media = document.createElement('div'); media.className = 'artist-media';
  const number = document.createElement('span'); number.className = 'artist-number'; number.textContent = String(index + 1).padStart(2, '0'); media.append(number);
  if (artist.imageUrl) { const img = document.createElement('img'); img.src = artist.imageUrl; img.alt = `Imagen de ${artist.name || 'artista'}`; img.loading = index < 2 ? 'eager' : 'lazy'; media.append(img); }
  else { const placeholder = document.createElement('div'); placeholder.className = 'artist-placeholder'; placeholder.textContent = (artist.name || 'LCB').slice(0, 1); media.append(placeholder); }
  const copy = document.createElement('div'); copy.className = 'artist-copy';
  if (artist.role) { const role = document.createElement('span'); role.className = 'artist-role'; role.textContent = artist.role; copy.append(role); }
  const h3 = document.createElement('h3'); const url = safeUrl(artist.link);
  if (url) { const a = document.createElement('a'); a.href = url; a.target = '_blank'; a.rel = 'noreferrer'; a.textContent = artist.name || 'Sin nombre'; h3.append(a); } else h3.textContent = artist.name || 'Sin nombre';
  copy.append(h3);
  if (artist.bio) { const p = document.createElement('p'); p.textContent = excerpt(artist.bio, 280); copy.append(p); }
  const tags = Array.isArray(artist.tags) ? artist.tags.filter(Boolean).slice(0, 5) : [];
  if (tags.length) { const list = document.createElement('div'); list.className = 'artist-tags'; tags.forEach(t => { const s = document.createElement('span'); s.textContent = t; list.append(s); }); copy.append(list); }
  article.append(media, copy); return article;
}

function renderArtists(artists) {
  const grid = $('#artists-grid'); if (!grid) return;
  grid.replaceChildren(); grid.setAttribute('aria-busy', 'false');
  (artists.length ? artists : fallbackArtists).slice(0, 8).forEach((artist, i) => grid.append(artistCard(artist, i)));
}

function renderLatest(posts) {
  const post = posts[0]; if (!post) return;
  $('#latest-post-tag').textContent = post.tags?.[0] || 'Archivo vivo';
  $('#latest-post-date').textContent = formatDate(post.createdAt);
  $('#latest-post-title').textContent = post.title || 'Entrada del archivo vivo';
  $('#latest-post-body').textContent = post.body ? excerpt(post.body, 420) : `Publicado por ${post.author || 'Anónimo'}.`;
  if (post.imageUrl) { const media = $('#latest-post-media'); const img = document.createElement('img'); img.src = post.imageUrl; img.alt = post.title ? `Imagen de “${post.title}”` : 'Imagen del archivo'; media.replaceChildren(img); }
}

function tagsFrom(posts) {
  const count = new Map(); posts.forEach(p => (Array.isArray(p.tags) ? p.tags : []).forEach(t => { const v = clean(t); if (v) count.set(v, (count.get(v) || 0) + 1); }));
  return [...count].sort((a,b) => b[1]-a[1]).slice(0,8).map(([tag]) => tag);
}

function renderFilters() {
  const root = $('#archive-filters'); if (!root) return; root.replaceChildren();
  ['todo', ...tagsFrom(state.posts)].forEach(tag => { const b = document.createElement('button'); b.type = 'button'; b.className = 'filter-button'; b.textContent = tag; b.setAttribute('aria-pressed', String(state.tag === tag)); b.addEventListener('click', () => { state.tag = tag; renderFilters(); renderArchive(); }); root.append(b); });
}

function archiveEntry(post) {
  const article = document.createElement('article'); article.className = 'archive-entry'; article.setAttribute('role', 'listitem');
  const time = document.createElement('time'); time.textContent = formatDate(post.createdAt);
  const type = document.createElement('span'); type.className = 'archive-entry-type'; type.textContent = post.tags?.[0] || 'archivo';
  const content = document.createElement('div');
  const h3 = document.createElement('h3'); h3.textContent = post.title || 'Sin título'; content.append(h3);
  if (post.body) { const p = document.createElement('p'); p.textContent = excerpt(post.body, 420); content.append(p); }
  article.append(time, type, content);
  if (post.imageUrl) { const img = document.createElement('img'); img.src = post.imageUrl; img.alt = ''; img.loading = 'lazy'; article.append(img); }
  return article;
}

function renderArchive() {
  const root = $('#archive-list'); if (!root) return; root.replaceChildren();
  const q = state.query.toLocaleLowerCase('es');
  const filtered = state.posts.filter(post => {
    const matchesTag = state.tag === 'todo' || (post.tags || []).some(t => clean(t).toLocaleLowerCase('es') === state.tag.toLocaleLowerCase('es'));
    const haystack = [post.title, post.body, post.author, ...(post.tags || [])].map(clean).join(' ').toLocaleLowerCase('es');
    return matchesTag && (!q || haystack.includes(q));
  });
  if (!filtered.length) { const p = document.createElement('p'); p.className = 'archive-empty'; p.textContent = 'No hay entradas que coincidan con la búsqueda.'; root.append(p); return; }
  filtered.forEach(post => root.append(archiveEntry(post)));
}

function setupSearch() { const input = $('#archive-search'); if (input) input.addEventListener('input', () => { state.query = input.value.trim(); renderArchive(); }); }

function setupForm() {
  const form = $('#contribution-form'); const status = $('#form-status'); if (!form) return;
  form.addEventListener('submit', async event => {
    event.preventDefault(); const button = $('button[type="submit"]', form); button.disabled = true; status.textContent = 'Enviando…';
    try { const response = await fetch('/api/board/submit', { method: 'POST', body: new FormData(form) }); if (!response.ok) throw new Error(String(response.status)); form.reset(); status.textContent = 'Entrada enviada. Se publicará después de revisión.'; }
    catch { status.textContent = 'No se ha podido enviar. Escríbenos a lacentralbaja@gmail.com.'; }
    finally { button.disabled = false; }
  });
}

async function init() {
  setupMenu(); setupTime(); setupSearch(); setupForm();
  const [artistsResult, postsResult] = await Promise.allSettled([getJson('/api/artists'), getJson('/api/board')]);
  const artistsRaw = artistsResult.status === 'fulfilled' ? artistsResult.value : fallbackArtists;
  const postsRaw = postsResult.status === 'fulfilled' ? postsResult.value : fallbackPosts;
  const artists = Array.isArray(artistsRaw) ? artistsRaw : (artistsRaw.artists || fallbackArtists);
  const posts = Array.isArray(postsRaw) ? postsRaw : (postsRaw.posts || postsRaw.items || fallbackPosts);
  state.posts = posts.filter(p => p && p.approved !== false).sort((a,b) => (Number(b.createdAt)||0) - (Number(a.createdAt)||0));
  renderArtists(artists); renderLatest(state.posts); renderFilters(); renderArchive();
}

document.addEventListener('DOMContentLoaded', init);
