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
  const title = dialog.querySelector('#archive-zoom-title');
  const date = dialog.querySelector('#archive-zoom-date');
  const type = dialog.querySelector('#archive-zoom-type');
  const body = dialog.querySelector('#archive-zoom-body');
  const figure = dialog.querySelector('.archive-zoom-media');
  const image = dialog.querySelector('#archive-zoom-image');
  const closeButtons = dialog.querySelectorAll(
    '.archive-zoom-close, .archive-zoom-bottom-close'
  );

  let closeTimer = 0;
  let lastTrigger = null;
  let writingLatestSummary = false;

  function setIdentity(element, feature = false) {
    dialog.classList.toggle(
      'is-minimoto',
      element?.classList.contains('is-minimoto')
    );
    dialog.classList.toggle(
      'is-polyvalent',
      element?.classList.contains('is-polyvalent')
    );
    dialog.classList.toggle('is-feature', feature);
  }

  function setImage(source, heading) {
    if (source?.src) {
      image.src = source.src;
      image.alt = source.alt || `Imagen de ${heading}`;
      figure.hidden = false;
      dialog.classList.add('has-image');
      return;
    }

    image.removeAttribute('src');
    image.alt = '';
    figure.hidden = true;
    dialog.classList.remove('has-image');
  }

  function showDialog(data, trigger) {
    lastTrigger = trigger;

    title.textContent = clean(data.title) || 'Entrada del archivo vivo';
    date.textContent = clean(data.date);
    type.textContent = clean(data.type) || 'archivo';
    body.textContent = String(data.body || '').trim();

    setIdentity(data.element, data.feature);
    setImage(data.image, title.textContent);

    dialog.showModal();
    shell.scrollTop = 0;
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
  }

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

  function openArchiveEntry(entry, trigger) {
    const heading = entry.querySelector('h3');
    const entryDate = entry.querySelector('time');
    const entryType = entry.querySelector('.archive-entry-type');
    const entryImage = entry.querySelector('img');

    showDialog({
      title: heading?.textContent,
      date: entryDate?.textContent,
      type: entryType?.textContent,
      body: entry.dataset.archiveFullText,
      image: entryImage,
      element: entry,
      feature: false
    }, trigger);
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
      openArchiveEntry(entry, button);
    });

    content.append(button);

    entry.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      openArchiveEntry(entry, button);
    });
  }

  function enhanceArchive() {
    archiveRoot
      ?.querySelectorAll('.archive-entry')
      .forEach(enhanceArchiveEntry);
  }

  function openLatest(trigger) {
    if (!latest) return;

    const paragraph = latest.querySelector('#latest-post-body');
    const fullText =
      latest.dataset.archiveFullText ||
      String(paragraph?.textContent || '').trim();

    showDialog({
      title: latest.querySelector('#latest-post-title')?.textContent,
      date: latest.querySelector('#latest-post-date')?.textContent,
      type: latest.querySelector('#latest-post-tag')?.textContent,
      body: fullText,
      image: latest.querySelector('#latest-post-media img'),
      element: latest,
      feature: true
    }, trigger);
  }

  function ensureLatestButton() {
    if (!latest) return null;

    const copy = latest.querySelector('.feature-copy');
    if (!copy) return null;

    let button = copy.querySelector('.latest-expand');

    if (!button) {
      button = document.createElement('button');
      button.type = 'button';
      button.className = 'latest-expand';
      button.innerHTML = `
        <span>Leer entrada completa</span>
        <span aria-hidden="true">＋</span>
      `;

      button.addEventListener('click', event => {
        event.stopPropagation();
        openLatest(button);
      });

      copy.append(button);
    }

    return button;
  }

  function syncLatest() {
    if (!latest || writingLatestSummary) return;

    const paragraph = latest.querySelector('#latest-post-body');
    if (!paragraph) return;

    const currentText = String(paragraph.textContent || '').trim();
    const previousSummary = latest.dataset.archiveSummaryText || '';

    /*
      app.js escribe primero el texto completo. Después este script conserva
      ese texto en data-archive-full-text y solo deja visible el resumen.
    */
    if (currentText && currentText !== previousSummary) {
      latest.dataset.archiveFullText = currentText;
    }

    const fullText = latest.dataset.archiveFullText || currentText;
    if (!fullText) return;

    const summary = excerpt(fullText, MAX_FEATURE_SUMMARY);

    latest.dataset.archiveSummaryText = summary;
    latest.dataset.archiveZoomReady = 'true';
    latest.classList.add('feature-card-compact');
    paragraph.classList.add('latest-post-summary');

    if (clean(paragraph.textContent) !== clean(summary)) {
      writingLatestSummary = true;
      paragraph.textContent = summary;
      queueMicrotask(() => {
        writingLatestSummary = false;
      });
    }

    const button = ensureLatestButton();

    if (latest.dataset.latestCardClickReady !== 'true') {
      latest.dataset.latestCardClickReady = 'true';

      latest.addEventListener('click', event => {
        if (event.target.closest('a, button')) return;
        openLatest(button);
      });
    }
  }

  closeButtons.forEach(button =>
    button.addEventListener('click', closeDialog)
  );

  dialog.addEventListener('cancel', event => {
    event.preventDefault();
    closeDialog();
  });

  dialog.addEventListener('click', event => {
    if (event.target === dialog) closeDialog();
  });

  if (archiveRoot) {
    const archiveObserver = new MutationObserver(enhanceArchive);
    archiveObserver.observe(archiveRoot, { childList: true });
    enhanceArchive();
  }

  if (latest) {
    const latestObserver = new MutationObserver(syncLatest);
    latestObserver.observe(latest, {
      childList: true,
      subtree: true,
      characterData: true
    });
    syncLatest();
  }
})();
