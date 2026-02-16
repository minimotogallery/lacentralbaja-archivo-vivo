const LS_KEY = 'lacentralbaja-archivo-v1';

const $ = (sel) => document.querySelector(sel);
const fmtEUR = (n) => {
  if (typeof n !== 'number' || Number.isNaN(n)) return '—';
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR', maximumFractionDigits: 0 }).format(n);
};
const fmtDate = (iso) => {
  try {
    const d = new Date(iso + 'T00:00:00');
    return new Intl.DateTimeFormat('es-ES', { year: 'numeric', month: 'short', day: '2-digit' }).format(d);
  } catch {
    return iso;
  }
};
const uid = () => 'e-' + Math.random().toString(16).slice(2) + '-' + Date.now().toString(16);

function normalizeTags(s) {
  if (!s) return [];
  return s
    .split(',')
    .map(t => t.trim())
    .filter(Boolean)
    .map(t => t.replace(/\s+/g, ' '));
}

function normalizeLinks(s) {
  if (!s) return [];
  return s
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean);
}

async function loadSeed() {
  // Served by the backend so it can keep project stats (e.g., crowdfunding) up-to-date.
  const res = await fetch('/api/seed', { cache: 'no-store' });
  if (!res.ok) throw new Error('No se pudo cargar seed');
  return res.json();
}

function loadState(seed) {
  const raw = localStorage.getItem(LS_KEY);
  if (!raw) return { ...seed, entries: [...seed.entries] };
  try {
    const st = JSON.parse(raw);
    // merge: prefer local entries, but DO NOT override server project.goals (keeps crowdfunding bar updated)
    const mergedProject = { ...seed.project, ...(st.project || {}) };
    mergedProject.goals = seed.project?.goals || mergedProject.goals;

    return {
      project: mergedProject,
      entries: Array.isArray(st.entries) ? st.entries : [...seed.entries]
    };
  } catch {
    return { ...seed, entries: [...seed.entries] };
  }
}

async function fetchBoard(limit = 60) {
  const res = await fetch(`/api/board?limit=${encodeURIComponent(String(limit))}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('board_fetch_failed');
  return res.json();
}

async function fetchArtists(limit = 60) {
  const res = await fetch(`/api/artists?limit=${encodeURIComponent(String(limit))}`, { cache: 'no-store' });
  if (!res.ok) throw new Error('artists_fetch_failed');
  return res.json();
}

function saveState(state) {
  localStorage.setItem(LS_KEY, JSON.stringify(state));
}

function renderProject(project) {
  $('#projectTitle').textContent = project.title || 'Proyecto';
  $('#projectTagline').textContent = project.tagline || '';
  $('#projectMeta').textContent = [project.category, project.location].filter(Boolean).join(' · ');

  const g = project?.links?.goteo;
  const ig = project?.links?.instagram;
  if (g) {
    $('#projectLink').href = g;
    $('#projectLink').textContent = 'Goteo';
  }
  if (ig) {
    $('#igLink').href = ig;
    $('#igLink').textContent = 'Instagram';
  }

  const goals = project.goals || {};
  $('#minGoal').textContent = fmtEUR(goals.min);
  $('#optGoal').textContent = fmtEUR(goals.opt);
  $('#raised').textContent = fmtEUR(goals.raised);
  $('#daysLeft').textContent = (typeof goals.daysLeft === 'number') ? `${goals.daysLeft} días` : '—';

  const min = goals.min || 0;
  const raised = goals.raised || 0;
  const pct = min > 0 ? Math.max(0, Math.min(100, (raised / min) * 100)) : 0;
  $('#barFill').style.width = `${pct}%`;
  $('.bar').setAttribute('aria-valuenow', String(Math.round(pct)));

  const desc = Array.isArray(project.description) ? project.description : [];
  $('#projectDesc').innerHTML = desc.map(p => `<p>${escapeHtml(p)}</p>`).join('');

  // button top
  const btnG = $('#btnGoteo');
  if (g) btnG.href = g;
}

function escapeHtml(s) {
  return String(s)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

const TYPES = [
  { key: 'all', label: 'todo' },
  { key: 'update', label: 'updates' },
  { key: 'hito', label: 'hitos' },
  { key: 'evento', label: 'eventos' },
  { key: 'prensa', label: 'prensa' },
  { key: 'finanzas', label: 'finanzas' },
  { key: 'contenido', label: 'contenido' },
  { key: 'aliados', label: 'aliados' }
];

function renderTypeChips(state, filter) {
  const wrap = $('#typeChips');
  wrap.innerHTML = '';
  for (const t of TYPES) {
    const b = document.createElement('button');
    b.className = 'chip';
    b.type = 'button';
    b.textContent = t.label;
    b.setAttribute('aria-pressed', String(filter.type === t.key));
    b.addEventListener('click', () => {
      filter.type = t.key;
      for (const el of wrap.querySelectorAll('.chip')) el.setAttribute('aria-pressed', 'false');
      b.setAttribute('aria-pressed', 'true');
      renderTimeline(state, filter);
    });
    wrap.appendChild(b);
  }
}

function entryMatches(e, filter) {
  if (!filter.showArchived && e.archived) return false;
  if (filter.type !== 'all' && e.type !== filter.type) return false;
  const q = (filter.q || '').trim().toLowerCase();
  if (!q) return true;

  const hay = [e.title, e.body, (e.tags || []).join(' '), (e.links || []).join(' ')].join(' ').toLowerCase();
  return hay.includes(q);
}

function sortEntries(entries) {
  return [...entries].sort((a,b) => {
    const da = (a.date || '0000-00-00');
    const db = (b.date || '0000-00-00');
    if (da !== db) return db.localeCompare(da); // newest first
    return (b.importance || '').localeCompare(a.importance || '');
  });
}

function renderTimeline(state, filter) {
  const root = $('#timeline');
  root.innerHTML = '';

  const entries = sortEntries(state.entries).filter(e => entryMatches(e, filter));
  if (!entries.length) {
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'No hay entradas con esos filtros. Añade un hito o cambia la búsqueda.';
    root.appendChild(p);
    return;
  }

  for (const e of entries) {
    const node = $('#tplItem').content.cloneNode(true);
    node.querySelector('.date').textContent = fmtDate(e.date);
    node.querySelector('.type').textContent = e.type || '—';
    const badge = node.querySelector('.badge');
    if (e.archived) {
      badge.hidden = false;
      badge.textContent = 'archivado';
    }

    node.querySelector('.title').textContent = e.title || '(sin título)';
    node.querySelector('.body').textContent = e.body || '';

    const tags = node.querySelector('.tags');
    (e.tags || []).forEach(t => {
      const s = document.createElement('span');
      s.className = 'tag';
      s.textContent = t;
      tags.appendChild(s);
    });

    const links = node.querySelector('.links');
    (e.links || []).forEach(u => {
      const a = document.createElement('a');
      a.href = u;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = u;
      links.appendChild(a);
    });

    const btnArchive = node.querySelector('[data-act="archive"]');
    btnArchive.textContent = e.archived ? 'Desarchivar' : 'Archivar';
    btnArchive.addEventListener('click', () => {
      e.archived = !e.archived;
      saveState(state);
      renderTimeline(state, filter);
    });

    const btnDelete = node.querySelector('[data-act="delete"]');
    btnDelete.addEventListener('click', () => {
      if (!confirm('¿Eliminar esta entrada? (No se puede deshacer salvo que hayas exportado JSON)')) return;
      state.entries = state.entries.filter(x => x.id !== e.id);
      saveState(state);
      renderTimeline(state, filter);
    });

    root.appendChild(node);
  }
}

function openAddDialog(state, filter) {
  const dlg = $('#dlg');
  const form = dlg.querySelector('form');
  form.reset();
  form.elements.date.valueAsDate = new Date();
  dlg.showModal();

  const btn = $('#btnSave');
  const abort = new AbortController();

  const cleanup = () => {
    try { abort.abort('dialog_closed'); } catch {}
    dlg.removeEventListener('close', cleanup);
  };
  dlg.addEventListener('close', cleanup);

  btn.onclick = async () => {
    // gather
    const fd = new FormData(form);
    const entry = {
      id: uid(),
      date: String(fd.get('date') || ''),
      type: String(fd.get('type') || 'update'),
      title: String(fd.get('title') || '').trim(),
      body: String(fd.get('body') || '').trim(),
      tags: normalizeTags(String(fd.get('tags') || '')),
      links: normalizeLinks(String(fd.get('links') || '')),
      archived: String(fd.get('archived') || 'false') === 'true',
      importance: String(fd.get('importance') || 'normal')
    };

    if (!entry.date || !entry.title) {
      alert('Fecha y título son obligatorios.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    try {
      if (abort.signal.aborted) return;
      state.entries.push(entry);
      saveState(state);
      renderTimeline(state, filter);
      dlg.close();
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  };
}

function exportJSON(state, board) {
  const payload = { ...state, board: board || [] };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = 'lacentralbaja-archivo.json';
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}

async function importJSON(file, seed) {
  const txt = await file.text();
  const st = JSON.parse(txt);
  const merged = {
    project: { ...seed.project, ...(st.project || {}) },
    entries: Array.isArray(st.entries) ? st.entries : [...seed.entries]
  };
  localStorage.setItem(LS_KEY, JSON.stringify(merged));
  if (Array.isArray(st.board)) {
    localStorage.setItem(LS_BOARD_KEY, JSON.stringify(st.board));
  }
  return merged;
}

function renderBoard(items){
  const root = $('#board');
  if (!root) return;
  root.innerHTML = '';

  if (!items.length){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Aún no hay publicaciones. Sé la primera persona en imaginar La Central Baja.';
    root.appendChild(p);
    return;
  }

  for (const it of items){
    const card = document.createElement('div');
    card.className = 'board-item';

    if (it.imageUrl){
      const img = document.createElement('img');
      img.src = it.imageUrl;
      img.alt = it.title || 'Imagen';
      card.appendChild(img);
    }

    const bi = document.createElement('div');
    bi.className = 'bi';
    const h = document.createElement('h4');
    h.textContent = it.title || '(sin título)';
    const p = document.createElement('p');
    p.textContent = it.body || '';
    bi.appendChild(h);
    bi.appendChild(p);

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (it.author){
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = it.author;
      meta.appendChild(who);
    }
    (it.tags||[]).forEach(t=>{
      const tg = document.createElement('span');
      tg.className = 'tag';
      tg.textContent = t;
      meta.appendChild(tg);
    });
    bi.appendChild(meta);

    card.appendChild(bi);
    root.appendChild(card);
  }
}

function isAdminPath(){
  return String(location.pathname || '').startsWith('/admin');
}

function getAdminKey(){
  try { return localStorage.getItem('ADMIN_KEY') || ''; } catch { return ''; }
}

function setAdminKey(v){
  try { localStorage.setItem('ADMIN_KEY', v); } catch {}
}

function ensureAdminKey(){
  let key = getAdminKey();
  if (key) return key;
  key = prompt('Clave admin:') || '';
  key = key.trim();
  if (key) setAdminKey(key);
  return key;
}

function openBoardDialog(){
  const dlg = $('#dlgBoard');
  const form = dlg.querySelector('form');
  form.reset();
  dlg.showModal();

  const btn = $('#btnSaveBoard');
  const abort = new AbortController();

  const cleanup = () => {
    try { abort.abort('dialog_closed'); } catch {}
    dlg.removeEventListener('close', cleanup);
  };
  dlg.addEventListener('close', cleanup);

  btn.onclick = async () => {
    const fd = new FormData(form);
    const title = String(fd.get('title')||'').trim();
    if (!title){
      alert('Título obligatorio.');
      return;
    }

    btn.disabled = true;
    btn.textContent = isAdminPath() ? 'Publicando…' : 'Enviando…';

    try {
      const headers = {};
      let url = '/api/board/submit';

      if (isAdminPath()){
        const key = ensureAdminKey();
        if (!key) throw new Error('admin_key_required');
        headers['x-admin-key'] = key;
        url = '/api/board';
      }

      const res = await fetch(url, { method: 'POST', body: fd, signal: abort.signal, headers });
      if (!res.ok) throw new Error('post_failed');

      dlg.close();
      if (!isAdminPath()){
        alert('Gracias. Tu idea se ha enviado y queda pendiente de revisión.');
      }
      await refreshBoard();
    } catch (e) {
      if (e?.name === 'AbortError') return; // cancelado
      console.error(e);
      alert(isAdminPath() ? 'No se pudo publicar.' : 'No se pudo enviar. Intenta de nuevo.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Publicar';
    }
  };
}

async function refreshBoard(){
  try {
    const items = await fetchBoard(90);
    renderBoard(items);
  } catch (e) {
    console.error(e);
    const root = $('#board');
    if (root){
      root.innerHTML = '<p class="muted">No se pudo cargar el tablón ahora mismo.</p>';
    }
  }
}

function renderArtists(items){
  const root = $('#artists');
  if (!root) return;
  root.innerHTML = '';
  if (!items.length){
    const p = document.createElement('p');
    p.className = 'muted';
    p.textContent = 'Todavía no hay artistas listados.';
    root.appendChild(p);
    return;
  }
  for (const it of items){
    const card = document.createElement('div');
    card.className = 'board-item';

    if (it.imageUrl){
      const img = document.createElement('img');
      img.src = it.imageUrl;
      img.alt = it.name || 'Artista';
      card.appendChild(img);
    }

    const bi = document.createElement('div');
    bi.className = 'bi';
    const h = document.createElement('h4');
    h.textContent = it.name || '(sin nombre)';
    const p = document.createElement('p');
    p.textContent = it.bio || '';
    bi.appendChild(h);
    bi.appendChild(p);

    const meta = document.createElement('div');
    meta.className = 'meta';
    if (it.role){
      const who = document.createElement('span');
      who.className = 'who';
      who.textContent = it.role;
      meta.appendChild(who);
    }
    (it.tags||[]).forEach(t=>{
      const tg = document.createElement('span');
      tg.className = 'tag';
      tg.textContent = t;
      meta.appendChild(tg);
    });
    bi.appendChild(meta);

    if (it.link){
      const links = document.createElement('div');
      links.className = 'links';
      const a = document.createElement('a');
      a.href = it.link;
      a.target = '_blank';
      a.rel = 'noreferrer';
      a.textContent = it.link;
      links.appendChild(a);
      bi.appendChild(links);
    }

    card.appendChild(bi);
    root.appendChild(card);
  }
}

async function refreshArtists(){
  try {
    const items = await fetchArtists(120);
    renderArtists(items);
  } catch (e) {
    console.error(e);
    const root = $('#artists');
    if (root){
      root.innerHTML = '<p class="muted">No se pudo cargar artistas ahora mismo.</p>';
    }
  }
}

function openArtistDialog(){
  const dlg = $('#dlgArtist');
  const form = dlg.querySelector('form');
  form.reset();
  dlg.showModal();

  const btn = $('#btnSaveArtist');
  const abort = new AbortController();

  const cleanup = () => {
    try { abort.abort('dialog_closed'); } catch {}
    dlg.removeEventListener('close', cleanup);
  };
  dlg.addEventListener('close', cleanup);

  btn.onclick = async () => {
    const fd = new FormData(form);
    const name = String(fd.get('name')||'').trim();
    if (!name){
      alert('Nombre obligatorio.');
      return;
    }

    btn.disabled = true;
    btn.textContent = 'Guardando…';

    try {
      const res = await fetch('/api/artists', { method: 'POST', body: fd, signal: abort.signal });
      if (!res.ok) throw new Error('artist_post_failed');
      dlg.close();
      await refreshArtists();
    } catch (e) {
      if (e?.name === 'AbortError') return;
      console.error(e);
      alert('No se pudo guardar.');
    } finally {
      btn.disabled = false;
      btn.textContent = 'Guardar';
    }
  };
}

(async function main() {
  const seed = await loadSeed();
  let state = loadState(seed);

  const filter = { q: '', type: 'all', showArchived: false };

  renderProject(state.project);
  renderTypeChips(state, filter);
  renderTimeline(state, filter);
  const isAdmin = isAdminPath();

  // Public vs admin controls
  const btnAdd = document.getElementById('btnAdd');
  const btnAddArtist = document.getElementById('btnAddArtist');
  const btnAddBoard = document.getElementById('btnAddBoard');
  if (!isAdmin) {
    if (btnAdd) btnAdd.style.display = 'none';
    if (btnAddArtist) btnAddArtist.style.display = 'none';
    if (btnAddBoard) btnAddBoard.textContent = 'Enviar idea';
  }

  await refreshBoard();
  await refreshArtists();

  // tabs
  const panels = Array.from(document.querySelectorAll('[data-tabpanel]'));
  const showTab = (key) => {
    panels.forEach(p => p.hidden = (p.getAttribute('data-tabpanel') !== key));
    document.querySelectorAll('[data-tab]').forEach(a => {
      a.setAttribute('aria-current', a.getAttribute('data-tab') === key ? 'page' : 'false');
    });
  };
  showTab('board');
  document.querySelectorAll('[data-tab]').forEach(a => {
    a.addEventListener('click', (ev) => {
      ev.preventDefault();
      showTab(a.getAttribute('data-tab'));
      // close mobile menu
      const links = document.getElementById('navLinks');
      const btn = document.getElementById('btnMenu');
      links?.classList.remove('open');
      if (btn) btn.setAttribute('aria-expanded', 'false');
    });
  });

  // mobile menu
  const btnMenu = document.getElementById('btnMenu');
  const navLinks = document.getElementById('navLinks');
  btnMenu?.addEventListener('click', () => {
    const isOpen = navLinks?.classList.toggle('open');
    btnMenu.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
  });
  document.addEventListener('click', (e) => {
    if (!navLinks || !btnMenu) return;
    if (navLinks.contains(e.target) || btnMenu.contains(e.target)) return;
    navLinks.classList.remove('open');
    btnMenu.setAttribute('aria-expanded', 'false');
  });

  $('#btnAdd').addEventListener('click', () => openAddDialog(state, filter));
  $('#btnAddBoard')?.addEventListener('click', () => openBoardDialog());
  $('#btnAddArtist')?.addEventListener('click', () => openArtistDialog());

  // cursor estrella (velocidad -> giro)
  const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const star = document.getElementById('cursorStar');
  if (!reduce && star) {
    document.body.classList.add('custom-cursor');
    let x = 0, y = 0, tx = 0, ty = 0;
    let lastX = 0, lastY = 0, lastT = performance.now();
    let rot = 0;
    let visible = false;

    const onMove = (ev) => {
      tx = ev.clientX;
      ty = ev.clientY;
      if (!visible) {
        visible = true;
        star.style.opacity = '1';
      }
    };

    window.addEventListener('mousemove', onMove, { passive: true });
    window.addEventListener('mouseout', () => { star.style.opacity = '0'; visible = false; }, { passive: true });

    const tick = () => {
      // smooth follow
      x += (tx - x) * 0.22;
      y += (ty - y) * 0.22;

      const t = performance.now();
      const dt = Math.max(16, t - lastT);
      const vx = (x - lastX) / dt;
      const vy = (y - lastY) / dt;
      const speed = Math.min(2.5, Math.hypot(vx, vy) * 60);

      // rotate more when moving fast
      rot += speed * 12;

      star.style.transform = `translate(${x}px, ${y}px) translate(-50%,-50%) rotate(${rot}deg) scale(${1 + Math.min(.25, speed/10)})`;

      lastX = x; lastY = y; lastT = t;
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);

    // click punch
    window.addEventListener('mousedown', () => {
      star.animate([
        { transform: star.style.transform },
        { transform: star.style.transform.replace(/scale\([^\)]*\)/, 'scale(1.35)') }
      ], { duration: 140, easing: 'cubic-bezier(.2,.9,.2,1)', iterations: 1 });
    }, { passive: true });
  }

  $('#btnExport').addEventListener('click', () => exportJSON(state, []));

  $('#fileImport').addEventListener('change', async (ev) => {
    const f = ev.target.files?.[0];
    if (!f) return;
    try {
      state = await importJSON(f, seed);
      renderProject(state.project);
      renderTimeline(state, filter);
      await refreshBoard();
      alert('Importado OK.');
    } catch (e) {
      console.error(e);
      alert('No se pudo importar el JSON.');
    }
  });

  $('#q').addEventListener('input', (ev) => {
    filter.q = ev.target.value || '';
    renderTimeline(state, filter);
  });

  $('#showArchived').addEventListener('change', (ev) => {
    filter.showArchived = !!ev.target.checked;
    renderTimeline(state, filter);
  });
})();
