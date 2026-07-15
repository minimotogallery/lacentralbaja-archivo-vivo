const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const adminState = { boardStatus: 'pending' };

function getKey() {
  try { return localStorage.getItem('LCB_ADMIN_KEY') || localStorage.getItem('ADMIN_KEY') || ''; }
  catch { return ''; }
}

function setKey(value) {
  try {
    localStorage.setItem('LCB_ADMIN_KEY', value);
    localStorage.setItem('ADMIN_KEY', value);
  } catch {}
}

async function adminApi(path, options = {}) {
  const key = getKey();
  if (!key) throw new Error('missing_key');
  const headers = { ...(options.headers || {}), 'x-admin-key': key };
  const response = await fetch(path, { ...options, headers, cache: 'no-store' });
  if (response.status === 401) throw new Error('unauthorized');
  if (!response.ok) throw new Error(`http_${response.status}`);
  return response.json();
}

function formatDate(value) {
  const date = new Date(Number(value) || value);
  if (Number.isNaN(date.getTime())) return 'Sin fecha';
  return new Intl.DateTimeFormat('es-ES', { dateStyle: 'medium', timeStyle: 'short' }).format(date);
}

function setupKey() {
  const form = $('#keyForm');
  const input = $('#adminKey');
  const status = $('#keyStatus');
  if (!form || !input || !status) return;
  input.value = getKey();

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const key = input.value.trim();
    if (!key) return;
    setKey(key);
    status.textContent = 'Comprobando…';
    try {
      await adminApi('/api/admin/board?status=pending&limit=1');
      status.textContent = 'Clave válida. Gestión conectada.';
      status.className = 'is-valid';
      await Promise.all([loadBoard(), loadArtists()]);
    } catch (error) {
      status.textContent = error.message === 'unauthorized' ? 'Clave incorrecta.' : 'No se pudo comprobar la conexión.';
      status.className = 'is-invalid';
    }
  });
}

function setupTabs() {
  const tabs = $$('.admin-tab');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((item) => item.setAttribute('aria-selected', String(item === tab)));
      const target = tab.getAttribute('aria-controls');
      $$('.admin-panel').forEach((panel) => panel.classList.toggle('is-hidden', panel.id !== target));
    });
  });
}

function setupBoardFilters() {
  const buttons = $$('#boardStatusFilters button');
  buttons.forEach((button) => {
    button.addEventListener('click', () => {
      adminState.boardStatus = button.dataset.status;
      buttons.forEach((item) => item.setAttribute('aria-pressed', String(item === button)));
      loadBoard();
    });
  });
  $('#reloadBoard')?.addEventListener('click', loadBoard);
}

function createBoardCard(post) {
  const card = document.createElement('article');
  card.className = 'admin-item-card';

  if (post.imageUrl) {
    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title ? `Imagen de ${post.title}` : 'Imagen de la aportación';
    image.loading = 'lazy';
    card.append(image);
  }

  const body = document.createElement('div');
  body.className = 'admin-item-body';
  const meta = document.createElement('p');
  meta.className = 'admin-item-meta';
  meta.textContent = `${formatDate(post.createdAt)} · ${post.author || 'Anónimo'}`;
  const title = document.createElement('h3');
  title.textContent = post.title || 'Sin título';
  body.append(meta, title);

  if (post.body) {
    const text = document.createElement('p');
    text.textContent = post.body;
    body.append(text);
  }

  if (post.tags?.length) {
    const tags = document.createElement('div');
    tags.className = 'artist-tags admin-tags';
    post.tags.forEach((tag) => {
      const span = document.createElement('span');
      span.textContent = tag;
      tags.append(span);
    });
    body.append(tags);
  }

  const actions = document.createElement('div');
  actions.className = 'admin-item-actions';
  if (adminState.boardStatus === 'pending') {
    actions.append(
      actionButton('Aprobar', 'approve', post.id, 'button-solid'),
      actionButton('Rechazar', 'reject', post.id, 'button-outline')
    );
  }
  if (adminState.boardStatus !== 'pending') actions.append(actionButton('Eliminar', 'delete', post.id, 'button-outline'));
  body.append(actions);
  card.append(body);
  return card;
}

function actionButton(label, action, id, styleClass) {
  const button = document.createElement('button');
  button.type = 'button';
  button.className = `button ${styleClass}`;
  button.textContent = label;
  button.addEventListener('click', async () => {
    const live = $('#boardLive');
    if (action === 'delete' && !window.confirm('¿Eliminar esta aportación definitivamente?')) return;
    button.disabled = true;
    try {
      const path = action === 'delete'
        ? `/api/board/${encodeURIComponent(id)}`
        : `/api/admin/board/${encodeURIComponent(id)}/${action}`;
      await adminApi(path, { method: action === 'delete' ? 'DELETE' : 'POST' });
      live.textContent = action === 'approve' ? 'Aportación publicada.' : action === 'reject' ? 'Aportación rechazada.' : 'Aportación eliminada.';
      await loadBoard();
    } catch (error) {
      live.textContent = error.message === 'unauthorized' ? 'La clave no es válida.' : 'No se pudo completar la acción.';
    } finally {
      button.disabled = false;
    }
  });
  return button;
}

async function loadBoard() {
  const list = $('#boardAdminList');
  const live = $('#boardLive');
  if (!list || !live) return;
  list.innerHTML = '<p class="loading-message">Cargando aportaciones…</p>';
  try {
    const rows = await adminApi(`/api/admin/board?status=${encodeURIComponent(adminState.boardStatus)}&limit=200`);
    live.textContent = `${rows.length} aportaciones en esta bandeja.`;
    list.replaceChildren();
    if (!rows.length) {
      list.innerHTML = '<p class="empty-message">No hay elementos en esta bandeja.</p>';
      return;
    }
    rows.forEach((post) => list.append(createBoardCard(post)));
  } catch (error) {
    list.innerHTML = '<p class="empty-message">Introduce una clave válida para cargar la moderación.</p>';
    live.textContent = error.message === 'unauthorized' ? 'Clave incorrecta.' : 'Gestión sin conectar.';
  }
}

function createArtistAdminCard(artist) {
  const card = document.createElement('article');
  card.className = 'admin-item-card';
  if (artist.imageUrl) {
    const image = document.createElement('img');
    image.src = artist.imageUrl;
    image.alt = `Imagen de ${artist.name || 'artista'}`;
    image.loading = 'lazy';
    card.append(image);
  }

  const body = document.createElement('div');
  body.className = 'admin-item-body';
  const role = document.createElement('p');
  role.className = 'admin-item-meta';
  role.textContent = artist.role || 'Sin rol indicado';
  const title = document.createElement('h3');
  title.textContent = artist.name || 'Sin nombre';
  body.append(role, title);
  if (artist.bio) {
    const bio = document.createElement('p');
    bio.textContent = artist.bio;
    body.append(bio);
  }
  const actions = document.createElement('div');
  actions.className = 'admin-item-actions';
  const remove = document.createElement('button');
  remove.type = 'button';
  remove.className = 'button button-outline';
  remove.textContent = 'Eliminar perfil';
  remove.addEventListener('click', async () => {
    if (!window.confirm(`¿Eliminar el perfil de ${artist.name || 'este artista'}?`)) return;
    remove.disabled = true;
    try {
      await adminApi(`/api/artists/${encodeURIComponent(artist.id)}`, { method: 'DELETE' });
      $('#artistsLive').textContent = 'Perfil eliminado.';
      await loadArtists();
    } catch (error) {
      $('#artistsLive').textContent = error.message === 'unauthorized' ? 'La clave no es válida.' : 'No se pudo eliminar.';
    } finally {
      remove.disabled = false;
    }
  });
  actions.append(remove);
  body.append(actions);
  card.append(body);
  return card;
}

async function loadArtists() {
  const list = $('#artistsAdminList');
  const live = $('#artistsLive');
  if (!list || !live) return;
  list.innerHTML = '<p class="loading-message">Cargando perfiles…</p>';
  try {
    const response = await fetch('/api/artists?limit=200', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`http_${response.status}`);
    const artists = await response.json();
    live.textContent = `${artists.length} perfiles publicados.`;
    list.replaceChildren();
    if (!artists.length) {
      list.innerHTML = '<p class="empty-message">Todavía no hay perfiles.</p>';
      return;
    }
    artists.forEach((artist) => list.append(createArtistAdminCard(artist)));
  } catch {
    list.innerHTML = '<p class="empty-message">No se pudieron cargar los perfiles.</p>';
    live.textContent = 'Error de conexión.';
  }
}

function setupArtistForm() {
  const form = $('#artistForm');
  const status = $('#artistFormStatus');
  if (!form || !status) return;
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    status.textContent = 'Publicando…';
    status.className = 'form-status';
    try {
      await adminApi('/api/artists', { method: 'POST', body: new FormData(form) });
      form.reset();
      status.textContent = 'Perfil publicado.';
      status.className = 'form-status is-success';
      await loadArtists();
    } catch (error) {
      status.textContent = error.message === 'unauthorized' ? 'La clave no es válida.' : 'No se pudo publicar el perfil.';
      status.className = 'form-status is-error';
    } finally {
      button.disabled = false;
    }
  });
  $('#reloadArtists')?.addEventListener('click', loadArtists);
}

function bootAdmin() {
  setupKey();
  setupTabs();
  setupBoardFilters();
  setupArtistForm();
  if (getKey()) Promise.all([loadBoard(), loadArtists()]);
  else {
    $('#boardAdminList').innerHTML = '<p class="empty-message">Introduce la clave para empezar.</p>';
    $('#artistsAdminList').innerHTML = '<p class="empty-message">Introduce la clave para gestionar perfiles.</p>';
  }
}

bootAdmin();
