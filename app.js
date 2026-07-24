const $ = (selector, scope = document) => scope.querySelector(selector);
const $$ = (selector, scope = document) => [...scope.querySelectorAll(selector)];

const HTML_LANG = document.documentElement.lang || 'es';
const LANG = HTML_LANG.startsWith('zh') ? 'zh' : HTML_LANG.startsWith('en') ? 'en' : 'es';

const UI = {
  es: {
    locale: 'es-ES',
    all: 'todo',
    noDate: 'Sin fecha',
    imageOf: name => `Imagen de ${name || 'artista'}`,
    unnamed: 'Sin nombre',
    livingArchive: 'Archivo vivo',
    archive: 'archivo',
    archiveEntry: 'Entrada del archivo vivo',
    miniEntry: 'Entrada de MiniMoto Gallery',
    anonymous: 'Anónimo',
    imageArchive: 'Imagen del archivo',
    noResults: 'No hay entradas que coincidan con la búsqueda.',
    sending: 'Enviando…',
    sent: 'Entrada enviada. Se publicará después de revisión.',
    sendError: 'No se ha podido enviar. Escríbenos a lacentralbaja@gmail.com.',
    fallbacks: {
      artists: [
        { name: 'Aitana de Nit', role: 'Artista', bio: 'Práctica instalativa y material centrada en los vínculos entre cuerpo, espacio y ficción.', tags: ['instalación', 'escultura'] },
        { name: 'MiniMoto Gallery', role: 'Dispositivo expositivo', bio: 'Galería site-specific y plataforma de mediación dentro de La Central Baja.', tags: ['exposición', 'mediación'] },
        { name: 'Diego Lobenal', role: 'Artista y gestor cultural', bio: 'Investigación, performance, fotografía y construcción de infraestructuras culturales.', tags: ['performance', 'curaduría'] }
      ],
      posts: [
        { title: 'La nave como proceso', body: 'Montajes, pruebas, reuniones y tiempos de trabajo que hacen visible la construcción cotidiana del espacio.', author: 'La Central Baja', tags: ['proceso'] },
        { title: 'MiniMoto: activación 01', body: 'Un espacio expositivo mínimo que trabaja con la escala, la proximidad y la recepción de propuestas.', author: 'MiniMoto Gallery', tags: ['exposición'] },
        { title: 'Puestos en uso', body: 'El espacio empieza a tomar forma a través de quienes lo trabajan y modifican diariamente.', author: 'La Central Baja', tags: ['espacio'] }
      ]
    }
  },
  en: {
    locale: 'en-GB',
    all: 'all',
    noDate: 'No date',
    imageOf: name => `Image of ${name || 'artist'}`,
    unnamed: 'Untitled',
    livingArchive: 'Living archive',
    archive: 'archive',
    archiveEntry: 'Living archive entry',
    miniEntry: 'MiniMoto Gallery entry',
    anonymous: 'Anonymous',
    imageArchive: 'Archive image',
    noResults: 'No entries match your search.',
    sending: 'Sending…',
    sent: 'Entry submitted. It will be published after review.',
    sendError: 'The entry could not be sent. Write to lacentralbaja@gmail.com.',
    fallbacks: {
      artists: [
        { name: 'Aitana de Nit', role: 'Artist', bio: 'An installation and material practice focused on the links between body, space and fiction.', tags: ['installation', 'sculpture'] },
        { name: 'MiniMoto Gallery', role: 'Exhibition device', bio: 'A site-specific gallery and mediation platform within La Central Baja.', tags: ['exhibition', 'mediation'] },
        { name: 'Diego Lobenal', role: 'Artist and cultural manager', bio: 'Research, performance, photography and the construction of cultural infrastructures.', tags: ['performance', 'curating'] }
      ],
      posts: [
        { title: 'The industrial space as process', body: 'Installations, tests, meetings and working time that make the daily construction of the space visible.', author: 'La Central Baja', tags: ['process'] },
        { title: 'MiniMoto: activation 01', body: 'A minimal exhibition space working with scale, proximity and the reception of proposals.', author: 'MiniMoto Gallery', tags: ['exhibition'] },
        { title: 'Workspaces in use', body: 'The space begins to take shape through those who work in it and modify it every day.', author: 'La Central Baja', tags: ['space'] }
      ]
    }
  },
  zh: {
    locale: 'zh-CN',
    all: '全部',
    noDate: '无日期',
    imageOf: name => `${name || '艺术家'}的图片`,
    unnamed: '未命名',
    livingArchive: '活态档案',
    archive: '档案',
    archiveEntry: '活态档案条目',
    miniEntry: 'MiniMoto Gallery 条目',
    anonymous: '匿名',
    imageArchive: '档案图片',
    noResults: '没有符合搜索条件的条目。',
    sending: '正在提交…',
    sent: '条目已提交，将在审核后发布。',
    sendError: '提交失败，请联系 lacentralbaja@gmail.com。',
    fallbacks: {
      artists: [
        { name: 'Aitana de Nit', role: '艺术家', bio: '以身体、空间与虚构之间的关系为核心的装置与材料实践。', tags: ['装置', '雕塑'] },
        { name: 'MiniMoto Gallery', role: '展览装置', bio: '位于 La Central Baja 内部的场域特定画廊与文化中介平台。', tags: ['展览', '文化中介'] },
        { name: 'Diego Lobenal', role: '艺术家与文化管理者', bio: '研究、行为表演、摄影与文化基础设施的建构。', tags: ['行为表演', '策展'] }
      ],
      posts: [
        { title: '工业空间作为过程', body: '布展、测试、会议与工作时间，让空间的日常建构变得可见。', author: 'La Central Baja', tags: ['过程'] },
        { title: 'MiniMoto：激活 01', body: '一个围绕尺度、临近性与提案接收方式展开工作的微型展览空间。', author: 'MiniMoto Gallery', tags: ['展览'] },
        { title: '正在使用的工作空间', body: '空间通过每天在其中工作并改变它的人逐渐成形。', author: 'La Central Baja', tags: ['空间'] }
      ]
    }
  }
}[LANG];

const COMMON_TAGS = {
  'todo': { en: 'all', zh: '全部' },
  'proceso': { en: 'process', zh: '过程' },
  'historia': { en: 'history', zh: '历史' },
  'espacio': { en: 'space', zh: '空间' },
  'montaje': { en: 'installation', zh: '布展' },
  'encuentro': { en: 'encounter', zh: '相遇' },
  'exposición': { en: 'exhibition', zh: '展览' },
  'mediación': { en: 'mediation', zh: '文化中介' },
  'artistas': { en: 'artists', zh: '艺术家' },
  'apertura': { en: 'opening', zh: '开放' },
  'colaboración': { en: 'collaboration', zh: '合作' },
  'crowdfunding': { en: 'crowdfunding', zh: '众筹' },
  'instalación': { en: 'installation', zh: '装置' },
  'escultura': { en: 'sculpture', zh: '雕塑' },
  'performance': { en: 'performance', zh: '行为表演' },
  'curaduría': { en: 'curating', zh: '策展' },
  'polivalente': { en: 'multipurpose', zh: '多功能' },
  'archivo vivo': { en: 'living archive', zh: '活态档案' }
};

const MINIMOTO_URL = 'https://minimotogallery.github.io/minimoto-gallery/';
const state = { posts: [], query: '', tag: '__all__' };

function clean(value) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function excerpt(value, max = 260) {
  const text = clean(value);
  if (text.length <= max) return text;
  const cut = text.slice(0, max);
  if (LANG === 'zh') return `${cut.trim()}…`;
  const lastSpace = cut.lastIndexOf(' ');
  return `${cut.slice(0, lastSpace > max * .7 ? lastSpace : max).trim()}…`;
}

function safeUrl(value) {
  try {
    const url = new URL(String(value || ''), location.origin);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function fieldCandidates(key) {
  const suffix = LANG === 'en' ? 'en' : LANG === 'zh' ? 'zh' : 'es';
  const camel = suffix[0].toUpperCase() + suffix.slice(1);
  return [
    `${key}_${suffix}`,
    `${key}${camel}`,
    `${key}-${suffix}`
  ];
}

function localizedField(item, key, fallback = '') {
  if (!item || typeof item !== 'object') return fallback;
  if (LANG !== 'es') {
    for (const candidate of fieldCandidates(key)) {
      if (item[candidate] !== undefined && item[candidate] !== null && clean(item[candidate])) {
        return item[candidate];
      }
    }
    const nested = item.translations?.[LANG]?.[key];
    if (nested !== undefined && nested !== null && clean(nested)) return nested;
  }
  return item[key] !== undefined && item[key] !== null ? item[key] : fallback;
}

function normalizeTags(value) {
  if (Array.isArray(value)) return value.map(clean).filter(Boolean);
  return clean(value).split(',').map(clean).filter(Boolean);
}

function translateTag(tag) {
  const original = clean(tag);
  if (!original || LANG === 'es') return original;
  const match = COMMON_TAGS[original.toLocaleLowerCase('es')];
  return match?.[LANG] || original;
}

function localizedTags(item) {
  if (!item) return [];
  if (LANG !== 'es') {
    for (const candidate of fieldCandidates('tags')) {
      if (item[candidate] !== undefined && item[candidate] !== null && clean(item[candidate])) {
        return normalizeTags(item[candidate]);
      }
    }
    const nested = item.translations?.[LANG]?.tags;
    if (nested) return normalizeTags(nested);
  }
  return normalizeTags(item.tags).map(translateTag);
}

function localizeArtist(item) {
  return {
    ...item,
    name: localizedField(item, 'name', item?.name),
    role: localizedField(item, 'role', item?.role),
    bio: localizedField(item, 'bio', item?.bio),
    tags: localizedTags(item)
  };
}

function localizePost(item) {
  return {
    ...item,
    title: localizedField(item, 'title', item?.title),
    body: localizedField(item, 'body', item?.body),
    author: localizedField(item, 'author', item?.author),
    tags: localizedTags(item)
  };
}

function isMiniMoto(item = {}) {
  const values = [
    item.name, item.title, item.author, item.role,
    ...(Array.isArray(item.tags) ? item.tags : []),
    item.title_en, item.title_zh, item.role_en, item.role_zh
  ];
  return values.some(value => clean(value).toLocaleLowerCase().includes('minimoto'));
}

function isPolyvalent(item = {}) {
  const values = [
    item.name, item.title, item.author, item.role,
    ...(Array.isArray(item.tags) ? item.tags : []),
    item.title_en, item.title_zh, item.role_en, item.role_zh
  ].map(value => clean(value).toLocaleLowerCase());
  return values.some(value =>
    value.includes('polivalente') ||
    value.includes('multipurpose') ||
    value.includes('多功能')
  );
}

function formatDate(value) {
  const date = new Date(Number(value) || value);
  return Number.isNaN(date.getTime())
    ? UI.noDate
    : new Intl.DateTimeFormat(UI.locale, {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
      }).format(date);
}

async function getJson(path) {
  const response = await fetch(path, {
    headers: { Accept: 'application/json' },
    cache: 'no-store'
  });
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

  $$('a', nav).forEach(link => link.addEventListener('click', () => {
    button.setAttribute('aria-expanded', 'false');
    nav.classList.remove('is-open');
  }));
}

function setupTime() {
  const clock = $('#local-time');
  const year = $('#year');
  if (year) year.textContent = String(new Date().getFullYear());

  const update = () => {
    if (!clock) return;
    clock.textContent = new Intl.DateTimeFormat(UI.locale, {
      timeZone: 'Europe/Madrid',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    }).format(new Date());
  };

  update();
  setInterval(update, 30000);
}

function artistCard(rawArtist, index) {
  const artist = localizeArtist(rawArtist);
  const article = document.createElement('article');
  article.className = 'artist-card';
  if (isMiniMoto(rawArtist)) article.classList.add('is-minimoto');

  const media = document.createElement('div');
  media.className = 'artist-media';

  const number = document.createElement('span');
  number.className = 'artist-number';
  number.textContent = String(index + 1).padStart(2, '0');
  media.append(number);

  if (artist.imageUrl) {
    const image = document.createElement('img');
    image.src = artist.imageUrl;
    image.alt = UI.imageOf(artist.name);
    image.loading = index < 2 ? 'eager' : 'lazy';
    media.append(image);
  } else {
    const placeholder = document.createElement('div');
    placeholder.className = 'artist-placeholder';
    placeholder.textContent = (artist.name || 'LCB').slice(0, 1);
    media.append(placeholder);
  }

  const copy = document.createElement('div');
  copy.className = 'artist-copy';

  if (artist.role) {
    const role = document.createElement('span');
    role.className = 'artist-role';
    role.textContent = artist.role;
    copy.append(role);
  }

  const heading = document.createElement('h3');
  const url = safeUrl(artist.link) || (isMiniMoto(rawArtist) ? MINIMOTO_URL : '');

  if (url) {
    const link = document.createElement('a');
    link.href = url;
    link.target = '_blank';
    link.rel = 'noreferrer';
    link.textContent = artist.name || UI.unnamed;
    heading.append(link);
  } else {
    heading.textContent = artist.name || UI.unnamed;
  }
  copy.append(heading);

  if (artist.bio) {
    const bio = document.createElement('p');
    bio.textContent = artist.bio;
    copy.append(bio);
  }

  if (artist.tags.length) {
    const list = document.createElement('div');
    list.className = 'artist-tags';
    artist.tags.slice(0, 5).forEach(tag => {
      const span = document.createElement('span');
      span.textContent = tag;
      list.append(span);
    });
    copy.append(list);
  }

  article.append(media, copy);
  return article;
}

function renderArtists(artists) {
  const grid = $('#artists-grid');
  if (!grid) return;

  grid.replaceChildren();
  grid.setAttribute('aria-busy', 'false');

  const source = artists.length ? artists : UI.fallbacks.artists;
  source.slice(0, 8).forEach((artist, index) => {
    grid.append(artistCard(artist, index));
  });
}

function renderLatest(rawPosts) {
  const rawPost = rawPosts[0];
  if (!rawPost) return;
  const post = localizePost(rawPost);

  const minimoto = isMiniMoto(rawPost);
  const polyvalent = !minimoto && isPolyvalent(rawPost);
  const feature = $('#latest-post');

  feature?.classList.toggle('is-minimoto', minimoto);
  feature?.classList.toggle('is-polyvalent', polyvalent);

  $('#latest-post-tag').textContent = post.tags?.[0] || UI.livingArchive;
  $('#latest-post-date').textContent = formatDate(post.createdAt);

  const heading = $('#latest-post-title');
  heading.replaceChildren();

  if (minimoto) {
    const link = document.createElement('a');
    link.href = MINIMOTO_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = post.title || UI.miniEntry;
    heading.append(link);
  } else {
    heading.textContent = post.title || UI.archiveEntry;
  }

  $('#latest-post-body').textContent =
    post.body || `${post.author || UI.anonymous}.`;

  if (post.imageUrl) {
    const media = $('#latest-post-media');
    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title ? UI.imageOf(`“${post.title}”`) : UI.imageArchive;
    media.replaceChildren(image);
  }
}

function tagsFrom(posts) {
  const count = new Map();
  posts.forEach(rawPost => {
    localizePost(rawPost).tags.forEach(tag => {
      const value = clean(tag);
      if (value) count.set(value, (count.get(value) || 0) + 1);
    });
  });
  return [...count]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([tag]) => tag);
}

function renderFilters() {
  const root = $('#archive-filters');
  if (!root) return;
  root.replaceChildren();

  const entries = [
    { key: '__all__', label: UI.all },
    ...tagsFrom(state.posts).map(tag => ({ key: tag, label: tag }))
  ];

  entries.forEach(({ key, label }) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'filter-button';
    button.textContent = label;
    button.setAttribute('aria-pressed', String(state.tag === key));
    button.addEventListener('click', () => {
      state.tag = key;
      renderFilters();
      renderArchive();
    });
    root.append(button);
  });
}

function archiveEntry(rawPost) {
  const post = localizePost(rawPost);
  const minimoto = isMiniMoto(rawPost);
  const polyvalent = !minimoto && isPolyvalent(rawPost);

  const article = document.createElement('article');
  article.className = 'archive-entry';
  article.setAttribute('role', 'listitem');
  if (minimoto) article.classList.add('is-minimoto');
  if (polyvalent) article.classList.add('is-polyvalent');

  const time = document.createElement('time');
  time.textContent = formatDate(post.createdAt);

  const type = document.createElement('span');
  type.className = 'archive-entry-type';
  type.textContent = post.tags?.[0] || UI.archive;

  const content = document.createElement('div');
  const heading = document.createElement('h3');

  if (minimoto) {
    const link = document.createElement('a');
    link.href = MINIMOTO_URL;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.textContent = post.title || 'MiniMoto Gallery';
    heading.append(link);
  } else {
    heading.textContent = post.title || UI.unnamed;
  }

  content.append(heading);

  if (post.body) {
    const paragraph = document.createElement('p');
    paragraph.textContent = post.body;
    content.append(paragraph);
  }

  article.append(time, type, content);

  if (post.imageUrl) {
    const image = document.createElement('img');
    image.src = post.imageUrl;
    image.alt = post.title ? UI.imageOf(`“${post.title}”`) : '';
    image.loading = 'lazy';
    article.append(image);
  }

  return article;
}

function renderArchive() {
  const root = $('#archive-list');
  if (!root) return;
  root.replaceChildren();

  const query = state.query.toLocaleLowerCase(UI.locale);
  const filtered = state.posts.filter(rawPost => {
    const post = localizePost(rawPost);
    const matchesTag =
      state.tag === '__all__' ||
      post.tags.some(tag => clean(tag).toLocaleLowerCase(UI.locale) === state.tag.toLocaleLowerCase(UI.locale));

    const haystack = [
      post.title, post.body, post.author, ...post.tags
    ].map(clean).join(' ').toLocaleLowerCase(UI.locale);

    return matchesTag && (!query || haystack.includes(query));
  });

  if (!filtered.length) {
    const paragraph = document.createElement('p');
    paragraph.className = 'archive-empty';
    paragraph.textContent = UI.noResults;
    root.append(paragraph);
    return;
  }

  filtered.forEach(post => root.append(archiveEntry(post)));
}

function setupSearch() {
  const input = $('#archive-search');
  input?.addEventListener('input', () => {
    state.query = input.value.trim();
    renderArchive();
  });
}

function setupForm() {
  const form = $('#contribution-form');
  const status = $('#form-status');
  if (!form || !status) return;

  form.addEventListener('submit', async event => {
    event.preventDefault();
    const button = $('button[type="submit"]', form);
    button.disabled = true;
    status.textContent = UI.sending;

    try {
      const response = await fetch('/api/board/submit', {
        method: 'POST',
        body: new FormData(form)
      });
      if (!response.ok) throw new Error(String(response.status));
      form.reset();
      const langInput = $('input[name="lang"]', form);
      if (langInput) langInput.value = LANG;
      status.textContent = UI.sent;
    } catch {
      status.textContent = UI.sendError;
    } finally {
      button.disabled = false;
    }
  });
}

async function init() {
  setupMenu();
  setupTime();
  setupSearch();
  setupForm();

  const [artistsResult, postsResult] = await Promise.allSettled([
    getJson('/api/artists'),
    getJson('/api/board')
  ]);

  const artistsRaw = artistsResult.status === 'fulfilled'
    ? artistsResult.value
    : UI.fallbacks.artists;

  const postsRaw = postsResult.status === 'fulfilled'
    ? postsResult.value
    : UI.fallbacks.posts.map((post, index) => ({
        ...post,
        createdAt: Date.now() - index * 86400000 * 4
      }));

  const artists = Array.isArray(artistsRaw)
    ? artistsRaw
    : (artistsRaw.artists || UI.fallbacks.artists);

  const posts = Array.isArray(postsRaw)
    ? postsRaw
    : (postsRaw.posts || postsRaw.items || UI.fallbacks.posts);

  state.posts = posts
    .filter(post => post && post.approved !== false)
    .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0));

  renderArtists(artists);
  renderLatest(state.posts);
  renderFilters();
  renderArchive();
}

window.LCB_I18N = {
  lang: LANG,
  locale: UI.locale,
  ui: UI,
  clean,
  excerpt,
  formatDate,
  localizePost,
  localizeArtist,
  translateTag,
  isMiniMoto,
  isPolyvalent
};

document.addEventListener('DOMContentLoaded', init);
