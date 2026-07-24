(() => {
  const archiveRoot = document.querySelector('#archive-list');
  const latest = document.querySelector('#latest-post');
  if (!archiveRoot && !latest) return;

  const I18N = window.LCB_I18N || {};
  const LANG = I18N.lang || 'es';
  const t = {
    es: {
      closeAria: 'Cerrar entrada',
      close: 'Cerrar / zoom out ×',
      archiveLabel: 'LCB / ARCHIVO VIVO',
      reduce: 'Reducir entrada ↙',
      noDate: 'Sin fecha',
      imageOf: title => `Imagen de ${title}`,
      entry: 'Entrada del archivo vivo',
      archive: 'archivo',
      read: 'Leer entrada completa',
      open: title => `Abrir “${title || 'entrada del archivo'}” completa`,
      livingArchive: 'Archivo vivo',
      archiveFallback: 'archivo vivo',
      miniEntry: 'Entrada de MiniMoto Gallery',
      anonymous: 'Anónimo',
      previousAria: 'Publicaciones anteriores',
      previousLabel: 'PUBLICACIONES ANTERIORES',
      full: 'Abrir entrada completa ＋',
      loadError: 'No se pudo construir el tablón reciente:'
    },
    en: {
      closeAria: 'Close entry',
      close: 'Close / zoom out ×',
      archiveLabel: 'LCB / LIVING ARCHIVE',
      reduce: 'Reduce entry ↙',
      noDate: 'No date',
      imageOf: title => `Image of ${title}`,
      entry: 'Living archive entry',
      archive: 'archive',
      read: 'Read full entry',
      open: title => `Open “${title || 'archive entry'}” in full`,
      livingArchive: 'Living archive',
      archiveFallback: 'living archive',
      miniEntry: 'MiniMoto Gallery entry',
      anonymous: 'Anonymous',
      previousAria: 'Previous publications',
      previousLabel: 'PREVIOUS PUBLICATIONS',
      full: 'Open full entry ＋',
      loadError: 'The recent-publications board could not be built:'
    },
    zh: {
      closeAria: '关闭条目',
      close: '关闭 / 缩小 ×',
      archiveLabel: 'LCB / 活态档案',
      reduce: '缩小条目 ↙',
      noDate: '无日期',
      imageOf: title => `${title}的图片`,
      entry: '活态档案条目',
      archive: '档案',
      read: '阅读完整条目',
      open: title => `打开“${title || '档案条目'}”全文`,
      livingArchive: '活态档案',
      archiveFallback: '活态档案',
      miniEntry: 'MiniMoto Gallery 条目',
      anonymous: '匿名',
      previousAria: '较早发布',
      previousLabel: '较早发布',
      full: '打开完整条目 ＋',
      loadError: '无法生成近期发布面板：'
    }
  }[LANG];

  const clean = I18N.clean || (value => String(value || '').replace(/\s+/g, ' ').trim());
  const excerpt = I18N.excerpt || ((value, max) => {
    const text = clean(value);
    return text.length > max ? `${text.slice(0, max).trim()}…` : text;
  });
  const formatDate = I18N.formatDate || (value => {
    const date = new Date(Number(value) || value);
    return Number.isNaN(date.getTime()) ? t.noDate : date.toLocaleDateString();
  });
  const localizePost = I18N.localizePost || (post => post);
  const isMiniMoto = I18N.isMiniMoto || (item =>
    [item?.title, item?.author, ...(item?.tags || [])]
      .some(value => clean(value).toLowerCase().includes('minimoto'))
  );
  const isPolyvalent = I18N.isPolyvalent || (() => false);

  const MAX_ARCHIVE_SUMMARY = LANG === 'zh' ? 150 : 300;
  const MAX_FEATURE_SUMMARY = LANG === 'zh' ? 220 : 430;

  /* ---------------------------------------------------------------
     Shared editorial zoom
     --------------------------------------------------------------- */

  const dialog = document.createElement('dialog');
  dialog.id = 'archive-zoom-dialog';
  dialog.className = 'archive-zoom-dialog';
  dialog.setAttribute('aria-labelledby', 'archive-zoom-title');
  dialog.innerHTML = `
    <div class="archive-zoom-shell">
      <button class="archive-zoom-close" type="button" aria-label="${t.closeAria}">
        ${t.close}
      </button>

      <header class="archive-zoom-head">
        <div class="archive-zoom-meta">
          <time id="archive-zoom-date"></time>
          <span id="archive-zoom-type"></span>
        </div>
        <h2 id="archive-zoom-title"></h2>
      </header>

      <div class="archive-zoom-content">
        <figure class="archive-zoom-media">
          <img id="archive-zoom-image" src="" alt="" />
        </figure>

        <article class="archive-zoom-text">
          <p id="archive-zoom-body"></p>
          <footer>
            <span>${t.archiveLabel}</span>
            <button class="archive-zoom-bottom-close" type="button">
              ${t.reduce}
            </button>
          </footer>
        </article>
      </div>
    </div>
  `;
  document.body.append(dialog);

  const shell = dialog.querySelector('.archive-zoom-shell');
  const zoomTitle = dialog.querySelector('#archive-zoom-title');
  const zoomDate = dialog.querySelector('#archive-zoom-date');
  const zoomType = dialog.querySelector('#archive-zoom-type');
  const zoomBody = dialog.querySelector('#archive-zoom-body');
  const zoomFigure = dialog.querySelector('.archive-zoom-media');
  const zoomImage = dialog.querySelector('#archive-zoom-image');
  const closeButtons = dialog.querySelectorAll(
    '.archive-zoom-close, .archive-zoom-bottom-close'
  );

  let closeTimer = 0;
  let lastTrigger = null;

  function applyIdentity(post, sourceElement, feature = false) {
    const minimoto =
      isMiniMoto(post) || sourceElement?.classList.contains('is-minimoto');
    const polyvalent = !minimoto && (
      isPolyvalent(post) || sourceElement?.classList.contains('is-polyvalent')
    );

    dialog.classList.toggle('is-minimoto', minimoto);
    dialog.classList.toggle('is-polyvalent', polyvalent);
    dialog.classList.toggle('is-feature', feature);
  }

  function setZoomImage(source, titleText) {
    const src = typeof source === 'string' ? source : source?.src;
    const alt = typeof source === 'string' ? '' : source?.alt;

    if (src) {
      zoomImage.src = src;
      zoomImage.alt = alt || t.imageOf(titleText);
      zoomFigure.hidden = false;
      dialog.classList.add('has-image');
    } else {
      zoomImage.removeAttribute('src');
      zoomImage.alt = '';
      zoomFigure.hidden = true;
      dialog.classList.remove('has-image');
    }
  }

  function openPost(rawPost, trigger, sourceElement, feature = false) {
    if (!rawPost) return;
    const post = localizePost(rawPost);

    lastTrigger = trigger || null;
    const titleText = clean(post.title) || t.entry;

    zoomTitle.textContent = titleText;
    zoomDate.textContent = post.displayDate || formatDate(post.createdAt);
    zoomType.textContent = post.tags?.[0] || post.type || t.archive;
    zoomBody.textContent = String(post.body || '').trim();

    applyIdentity(rawPost, sourceElement, feature);
    setZoomImage(post.imageUrl || post.image, titleText);

    if (!dialog.open) dialog.showModal();
    shell.scrollTop = 0;
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
  }

  window.openArchiveZoomPost = openPost;

  function closeDialog() {
    if (!dialog.open || dialog.classList.contains('is-closing')) return;

    dialog.classList.remove('is-visible');
    dialog.classList.add('is-closing');
    clearTimeout(closeTimer);

    closeTimer = window.setTimeout(() => {
      dialog.close();
      dialog.classList.remove(
        'is-closing',
        'is-minimoto',
        'is-polyvalent',
        'is-feature',
        'has-image'
      );
      lastTrigger?.focus({ preventScroll: true });
    }, 300);
  }

  closeButtons.forEach(button => button.addEventListener('click', closeDialog));

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  /* ---------------------------------------------------------------
     Archive entries
     --------------------------------------------------------------- */

  function archivePostFromEntry(entry) {
    return {
      title: entry.querySelector('h3')?.textContent,
      body: entry.dataset.archiveFullText || '',
      displayDate: entry.querySelector('time')?.textContent,
      type: entry.querySelector('.archive-entry-type')?.textContent,
      tags: [entry.querySelector('.archive-entry-type')?.textContent || t.archive],
      image: entry.querySelector('img') || null
    };
  }

  function enhanceArchiveEntry(entry) {
    if (entry.dataset.archiveZoomReady === 'true') return;

    const content = entry.children[2];
    const paragraph = content?.querySelector('p');
    if (!content || !paragraph) return;

    const fullText = String(paragraph.textContent || '').trim();
    entry.dataset.archiveFullText = fullText;
    entry.dataset.archiveZoomReady = 'true';
    entry.classList.add('archive-entry-compact');

    paragraph.textContent = excerpt(fullText, MAX_ARCHIVE_SUMMARY);
    paragraph.classList.add('archive-entry-summary');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'archive-expand';
    button.innerHTML = `<span>${t.read}</span><span aria-hidden="true">＋</span>`;

    button.addEventListener('click', event => {
      event.stopPropagation();
      openPost(archivePostFromEntry(entry), button, entry, false);
    });

    content.append(button);

    entry.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      openPost(archivePostFromEntry(entry), button, entry, false);
    });
  }

  function enhanceArchive() {
    archiveRoot?.querySelectorAll('.archive-entry').forEach(enhanceArchiveEntry);
  }

  /* ---------------------------------------------------------------
     Three most recent publications: newest fixed, two previous below
     --------------------------------------------------------------- */

  const boardState = {
    posts: [],
    loading: false,
    loaded: false
  };

  function fallbackPostFromLatest() {
    if (!latest) return null;
    const image = latest.querySelector('#latest-post-media img');
    return {
      title: latest.querySelector('#latest-post-title')?.textContent,
      body: latest.querySelector('#latest-post-body')?.textContent,
      displayDate: latest.querySelector('#latest-post-date')?.textContent,
      tags: [latest.querySelector('#latest-post-tag')?.textContent || t.livingArchive],
      imageUrl: image?.src || ''
    };
  }

  function renderMainMedia(rawPost) {
    const post = localizePost(rawPost);
    const media = latest?.querySelector('#latest-post-media');
    if (!media) return;

    if (post.imageUrl) {
      const image = document.createElement('img');
      image.src = post.imageUrl;
      image.alt = post.title ? t.imageOf(`“${post.title}”`) : t.livingArchive;
      media.replaceChildren(image);
      return;
    }

    const fallback = document.createElement('div');
    fallback.className = 'fallback-grid';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.innerHTML = `<span>${t.archiveFallback}</span>`;
    media.replaceChildren(fallback);
  }

  function renderMainTitle(rawPost) {
    const post = localizePost(rawPost);
    const heading = latest?.querySelector('#latest-post-title');
    if (!heading) return;
    heading.replaceChildren();

    if (isMiniMoto(rawPost)) {
      const link = document.createElement('a');
      link.href = 'https://minimotogallery.github.io/minimoto-gallery/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = post.title || t.miniEntry;
      heading.append(link);
    } else {
      heading.textContent = post.title || t.entry;
    }
  }

  function ensurePositionCounter() {
    const meta = latest?.querySelector('.meta-row');
    if (!meta) return null;

    let counter = meta.querySelector('.recent-position');
    if (!counter) {
      counter = document.createElement('span');
      counter.className = 'recent-position';
      counter.setAttribute('aria-live', 'polite');
      meta.insertBefore(counter, meta.children[1] || null);
    }
    return counter;
  }

  function ensureMainExpand(rawPost) {
    const copy = latest?.querySelector('.feature-copy');
    if (!copy) return;

    copy.querySelector('.latest-expand')?.remove();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'latest-expand';
    button.innerHTML = `<span>${t.read}</span><span aria-hidden="true">＋</span>`;
    button.addEventListener('click', event => {
      event.stopPropagation();
      openPost(rawPost, button, latest, true);
    });
    copy.append(button);
  }

  function secondaryCard(rawPost, index) {
    const post = localizePost(rawPost);
    const minimoto = isMiniMoto(rawPost);
    const polyvalent = !minimoto && isPolyvalent(rawPost);

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'recent-post-card';
    if (minimoto) button.classList.add('is-minimoto');
    if (polyvalent) button.classList.add('is-polyvalent');
    button.dataset.postIndex = String(index);
    button.setAttribute('aria-label', t.open(post.title));

    const media = document.createElement('span');
    media.className = 'recent-post-media';

    if (post.imageUrl) {
      const image = document.createElement('img');
      image.src = post.imageUrl;
      image.alt = '';
      image.loading = 'lazy';
      media.append(image);
    } else {
      const fallback = document.createElement('span');
      fallback.className = 'recent-post-fallback';
      fallback.textContent = String(index + 1).padStart(2, '0');
      media.append(fallback);
    }

    const copy = document.createElement('span');
    copy.className = 'recent-post-copy';

    const meta = document.createElement('span');
    meta.className = 'recent-post-meta';
    meta.innerHTML = `
      <span>${String(index + 1).padStart(2, '0')} / ${String(boardState.posts.length).padStart(2, '0')}</span>
      <time>${formatDate(post.createdAt)}</time>
    `;

    const category = document.createElement('span');
    category.className = 'recent-post-category';
    category.textContent = post.tags?.[0] || t.livingArchive;

    const heading = document.createElement('strong');
    heading.textContent = post.title || t.entry;

    const summary = document.createElement('span');
    summary.className = 'recent-post-summary';
    summary.textContent = excerpt(
      post.body || `${post.author || t.anonymous}.`,
      LANG === 'zh' ? 95 : 170
    );

    const action = document.createElement('span');
    action.className = 'recent-post-action';
    action.textContent = t.full;

    copy.append(meta, category, heading, summary, action);
    button.append(media, copy);

    button.addEventListener('click', () => {
      openPost(rawPost, button, button, true);
    });

    return button;
  }

  function renderSwitcher() {
    if (!latest) return;

    let switcher = latest.querySelector('.latest-post-switcher');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'latest-post-switcher';
      switcher.setAttribute('role', 'list');
      switcher.setAttribute('aria-label', t.previousAria);
      switcher.dataset.label = t.previousLabel;
      latest.append(switcher);
    }

    const cards = boardState.posts
      .slice(1, 3)
      .map((post, offset) => secondaryCard(post, offset + 1));

    switcher.replaceChildren(...cards);
    switcher.hidden = cards.length === 0;
  }

  function renderActivePost() {
    if (!latest || !boardState.posts.length) return;

    const rawPost = boardState.posts[0];
    const post = localizePost(rawPost);
    const minimoto = isMiniMoto(rawPost);
    const polyvalent = !minimoto && isPolyvalent(rawPost);
    const summary = excerpt(
      post.body || `${post.author || t.anonymous}.`,
      MAX_FEATURE_SUMMARY
    );

    latest.classList.add('recent-board-ready', 'feature-card-compact');
    latest.classList.toggle('is-minimoto', minimoto);
    latest.classList.toggle('is-polyvalent', polyvalent);

    const tag = latest.querySelector('#latest-post-tag');
    const dateNode = latest.querySelector('#latest-post-date');
    const paragraph = latest.querySelector('#latest-post-body');
    const counter = ensurePositionCounter();

    if (tag) tag.textContent = post.tags?.[0] || t.livingArchive;
    if (dateNode) dateNode.textContent = formatDate(post.createdAt);
    if (paragraph) {
      paragraph.textContent = summary;
      paragraph.classList.add('latest-post-summary');
    }
    if (counter) {
      counter.textContent = `01 / ${String(boardState.posts.length).padStart(2, '0')}`;
    }

    renderMainTitle(rawPost);
    renderMainMedia(rawPost);
    ensureMainExpand(rawPost);
    renderSwitcher();
    latest.dataset.activeRecentIndex = '0';
  }

  function bindMainCardZoom() {
    if (!latest || latest.dataset.mainZoomReady === 'true') return;
    latest.dataset.mainZoomReady = 'true';

    latest.addEventListener('click', event => {
      if (event.target.closest('a, button, .latest-post-switcher')) return;
      const post = boardState.posts[0];
      if (post) openPost(post, latest.querySelector('.latest-expand'), latest, true);
    });
  }

  async function loadRecentBoard() {
    if (!latest || boardState.loading || boardState.loaded) return;
    boardState.loading = true;

    try {
      const response = await fetch('/api/board', {
        headers: { Accept: 'application/json' },
        cache: 'no-store'
      });
      if (!response.ok) throw new Error(String(response.status));

      const result = await response.json();
      const rawPosts = Array.isArray(result)
        ? result
        : (result.posts || result.items || []);

      boardState.posts = rawPosts
        .filter(post => post && post.approved !== false)
        .sort((a, b) => (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0))
        .slice(0, 3);

      if (!boardState.posts.length) {
        const fallback = fallbackPostFromLatest();
        if (fallback) boardState.posts = [fallback];
      }

      boardState.loaded = true;
      renderActivePost();
      bindMainCardZoom();
    } catch (error) {
      const fallback = fallbackPostFromLatest();
      if (fallback) {
        boardState.posts = [fallback];
        boardState.loaded = true;
        renderActivePost();
        bindMainCardZoom();
      }
      console.warn(t.loadError, error);
    } finally {
      boardState.loading = false;
    }
  }

  function initAfterAppRender() {
    enhanceArchive();
    if (archiveRoot?.querySelector('.archive-entry')) loadRecentBoard();
  }

  if (archiveRoot) {
    const observer = new MutationObserver(() => {
      enhanceArchive();
      if (!boardState.loaded && archiveRoot.querySelector('.archive-entry')) {
        loadRecentBoard();
      }
    });
    observer.observe(archiveRoot, { childList: true });
  }

  initAfterAppRender();
  window.setTimeout(loadRecentBoard, 1200);
})();
