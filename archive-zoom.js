(() => {
  const archiveRoot = document.querySelector('#archive-list');
  const latest = document.querySelector('#latest-post');

  if (!archiveRoot && !latest) return;

  const MAX_ARCHIVE_SUMMARY = 300;
  const MAX_FEATURE_SUMMARY = 430;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  function excerpt(value, max) {
    const text = clean(value);
    if (text.length <= max) return text;
    const cut = text.slice(0, max);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > max * .72 ? lastSpace : max).trim()}…`;
  }

  function formatDate(value) {
    const parsed = new Date(Number(value) || value);
    if (Number.isNaN(parsed.getTime())) return 'Sin fecha';
    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(parsed);
  }

  function isMiniMoto(item = {}) {
    return [
      item.title,
      item.author,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].some(value => clean(value).toLocaleLowerCase('es').includes('minimoto'));
  }

  function isPolyvalent(item = {}) {
    return !isMiniMoto(item) && [
      item.title,
      item.author,
      ...(Array.isArray(item.tags) ? item.tags : [])
    ].some(value => clean(value).toLocaleLowerCase('es').includes('polivalente'));
  }

  /* ---------------------------------------------------------------
     Zoom editorial compartido
     --------------------------------------------------------------- */

  const dialog = document.createElement('dialog');
  dialog.id = 'archive-zoom-dialog';
  dialog.className = 'archive-zoom-dialog';
  dialog.setAttribute('aria-labelledby', 'archive-zoom-title');
  dialog.innerHTML = `
    <div class="archive-zoom-shell">
      <button class="archive-zoom-close" type="button" aria-label="Cerrar entrada">
        Cerrar / zoom out ×
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
            <span>LCB / ARCHIVO VIVO</span>
            <button class="archive-zoom-bottom-close" type="button">
              Reducir entrada ↙
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
    const minimoto = isMiniMoto(post) || sourceElement?.classList.contains('is-minimoto');
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
      zoomImage.alt = alt || `Imagen de ${titleText}`;
      zoomFigure.hidden = false;
      dialog.classList.add('has-image');
    } else {
      zoomImage.removeAttribute('src');
      zoomImage.alt = '';
      zoomFigure.hidden = true;
      dialog.classList.remove('has-image');
    }
  }

  function openPost(post, trigger, sourceElement, feature = false) {
    if (!post) return;

    lastTrigger = trigger || null;
    const titleText = clean(post.title) || 'Entrada del archivo vivo';

    zoomTitle.textContent = titleText;
    zoomDate.textContent = post.displayDate || formatDate(post.createdAt);
    zoomType.textContent = post.tags?.[0] || post.type || 'archivo';
    zoomBody.textContent = String(post.body || '').trim();

    applyIdentity(post, sourceElement, feature);
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
     Entradas del archivo
     --------------------------------------------------------------- */

  function archivePostFromEntry(entry) {
    return {
      title: entry.querySelector('h3')?.textContent,
      body: entry.dataset.archiveFullText || '',
      displayDate: entry.querySelector('time')?.textContent,
      type: entry.querySelector('.archive-entry-type')?.textContent,
      tags: [entry.querySelector('.archive-entry-type')?.textContent || 'archivo'],
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
    button.innerHTML =
      '<span>Leer entrada completa</span><span aria-hidden="true">＋</span>';

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
     Tablón con las tres publicaciones más recientes
     --------------------------------------------------------------- */

  const boardState = {
    posts: [],
    activeIndex: 0,
    loading: false,
    loaded: false,
    switching: false
  };

  function fallbackPostFromLatest() {
    if (!latest) return null;
    const image = latest.querySelector('#latest-post-media img');
    return {
      title: latest.querySelector('#latest-post-title')?.textContent,
      body: latest.querySelector('#latest-post-body')?.textContent,
      displayDate: latest.querySelector('#latest-post-date')?.textContent,
      tags: [latest.querySelector('#latest-post-tag')?.textContent || 'Archivo vivo'],
      imageUrl: image?.src || ''
    };
  }

  function renderMainMedia(post) {
    const media = latest?.querySelector('#latest-post-media');
    if (!media) return;

    if (post.imageUrl) {
      const image = document.createElement('img');
      image.src = post.imageUrl;
      image.alt = post.title
        ? `Imagen de “${post.title}”`
        : 'Imagen del archivo vivo';
      media.replaceChildren(image);
      return;
    }

    const fallback = document.createElement('div');
    fallback.className = 'fallback-grid';
    fallback.setAttribute('aria-hidden', 'true');
    fallback.innerHTML = '<span>archivo vivo</span>';
    media.replaceChildren(fallback);
  }

  function renderMainTitle(post) {
    const heading = latest?.querySelector('#latest-post-title');
    if (!heading) return;

    heading.replaceChildren();

    if (isMiniMoto(post)) {
      const link = document.createElement('a');
      link.href = 'https://minimotogallery.github.io/minimoto-gallery/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = post.title || 'Entrada de MiniMoto Gallery';
      heading.append(link);
    } else {
      heading.textContent = post.title || 'Entrada del archivo vivo';
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

  function ensureMainExpand(post) {
    const copy = latest?.querySelector('.feature-copy');
    if (!copy) return;

    copy.querySelector('.latest-expand')?.remove();

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'latest-expand';
    button.innerHTML = `
      <span>Leer entrada completa</span>
      <span aria-hidden="true">＋</span>
    `;
    button.addEventListener('click', event => {
      event.stopPropagation();
      openPost(post, button, latest, true);
    });
    copy.append(button);
  }

  function secondaryCard(post, index) {
    const button = document.createElement('button');
    const minimoto = isMiniMoto(post);
    const polyvalent = !minimoto && isPolyvalent(post);

    button.type = 'button';
    button.className = 'recent-post-card';
    if (minimoto) button.classList.add('is-minimoto');
    if (polyvalent) button.classList.add('is-polyvalent');
    button.dataset.postIndex = String(index);
    button.setAttribute(
      'aria-label',
      `Mostrar “${post.title || 'entrada del archivo'}” en primer plano`
    );

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
    category.textContent = post.tags?.[0] || 'Archivo vivo';

    const heading = document.createElement('strong');
    heading.textContent = post.title || 'Entrada del archivo vivo';

    const summary = document.createElement('span');
    summary.className = 'recent-post-summary';
    summary.textContent = excerpt(
      post.body || `Publicado por ${post.author || 'Anónimo'}.`,
      170
    );

    const action = document.createElement('span');
    action.className = 'recent-post-action';
    action.textContent = 'Poner en primer plano ↗';

    copy.append(meta, category, heading, summary, action);
    button.append(media, copy);

    button.addEventListener('click', () => activatePost(index));
    return button;
  }

  function renderSwitcher() {
    if (!latest) return;

    let switcher = latest.querySelector('.latest-post-switcher');
    if (!switcher) {
      switcher = document.createElement('div');
      switcher.className = 'latest-post-switcher';
      switcher.setAttribute('role', 'list');
      switcher.setAttribute('aria-label', 'Otras publicaciones recientes');
      latest.append(switcher);
    }

    const cards = boardState.posts
      .map((post, index) => ({ post, index }))
      .filter(item => item.index !== boardState.activeIndex)
      .map(item => secondaryCard(item.post, item.index));

    switcher.replaceChildren(...cards);
    switcher.hidden = cards.length === 0;
  }

  function renderActivePost() {
    if (!latest || !boardState.posts.length) return;

    const post = boardState.posts[boardState.activeIndex];
    const minimoto = isMiniMoto(post);
    const polyvalent = !minimoto && isPolyvalent(post);
    const summary = excerpt(
      post.body || `Publicado por ${post.author || 'Anónimo'}.`,
      MAX_FEATURE_SUMMARY
    );

    latest.classList.add('recent-board-ready', 'feature-card-compact');
    latest.classList.toggle('is-minimoto', minimoto);
    latest.classList.toggle('is-polyvalent', polyvalent);

    const tag = latest.querySelector('#latest-post-tag');
    const dateNode = latest.querySelector('#latest-post-date');
    const paragraph = latest.querySelector('#latest-post-body');
    const counter = ensurePositionCounter();

    if (tag) tag.textContent = post.tags?.[0] || 'Archivo vivo';
    if (dateNode) dateNode.textContent = formatDate(post.createdAt);
    if (paragraph) {
      paragraph.textContent = summary;
      paragraph.classList.add('latest-post-summary');
    }
    if (counter) {
      counter.textContent =
        `${String(boardState.activeIndex + 1).padStart(2, '0')} / ` +
        `${String(boardState.posts.length).padStart(2, '0')}`;
    }

    renderMainTitle(post);
    renderMainMedia(post);
    ensureMainExpand(post);
    renderSwitcher();

    latest.dataset.activeRecentIndex = String(boardState.activeIndex);
  }

  function activatePost(index) {
    if (
      boardState.switching ||
      index === boardState.activeIndex ||
      !boardState.posts[index]
    ) return;

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    boardState.switching = true;
    latest?.classList.add('is-switching');

    window.setTimeout(() => {
      boardState.activeIndex = index;
      renderActivePost();
      requestAnimationFrame(() => {
        latest?.classList.remove('is-switching');
        boardState.switching = false;
      });
    }, reduced ? 0 : 160);
  }

  function bindMainCardZoom() {
    if (!latest || latest.dataset.mainZoomReady === 'true') return;
    latest.dataset.mainZoomReady = 'true';

    latest.addEventListener('click', event => {
      if (event.target.closest('a, button, .latest-post-switcher')) return;
      const post = boardState.posts[boardState.activeIndex];
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
        .sort(
          (a, b) =>
            (Number(b.createdAt) || 0) - (Number(a.createdAt) || 0)
        )
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
      console.warn('No se pudo construir el tablón reciente:', error);
    } finally {
      boardState.loading = false;
    }
  }

  function initAfterAppRender() {
    enhanceArchive();

    if (archiveRoot?.querySelector('.archive-entry')) {
      loadRecentBoard();
    }
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
