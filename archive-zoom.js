(() => {
  const root = document.querySelector('#archive-list');
  if (!root) return;

  const MAX_SUMMARY = 300;
  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  function excerpt(value) {
    const text = clean(value);
    if (text.length <= MAX_SUMMARY) return text;
    const cut = text.slice(0, MAX_SUMMARY);
    const lastSpace = cut.lastIndexOf(' ');
    return `${cut.slice(0, lastSpace > 220 ? lastSpace : MAX_SUMMARY).trim()}…`;
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
        'has-image'
      );
      lastTrigger?.focus({ preventScroll: true });
    }, 300);
  }

  function openDialog(entry, trigger) {
    const heading = entry.querySelector('h3');
    const entryDate = entry.querySelector('time');
    const entryType = entry.querySelector('.archive-entry-type');
    const entryImage = entry.querySelector('img');

    lastTrigger = trigger || entry.querySelector('.archive-expand');

    title.textContent =
      clean(heading?.textContent) || 'Entrada del archivo vivo';
    date.textContent = clean(entryDate?.textContent);
    type.textContent = clean(entryType?.textContent) || 'archivo';
    body.textContent = entry.dataset.archiveFullText || '';

    dialog.classList.toggle(
      'is-minimoto',
      entry.classList.contains('is-minimoto')
    );
    dialog.classList.toggle(
      'is-polyvalent',
      entry.classList.contains('is-polyvalent')
    );

    if (entryImage?.src) {
      image.src = entryImage.src;
      image.alt = entryImage.alt || `Imagen de ${title.textContent}`;
      figure.hidden = false;
      dialog.classList.add('has-image');
    } else {
      image.removeAttribute('src');
      image.alt = '';
      figure.hidden = true;
      dialog.classList.remove('has-image');
    }

    dialog.showModal();
    shell.scrollTop = 0;
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
  }

  function enhanceEntry(entry) {
    if (entry.dataset.archiveZoomReady === 'true') return;

    const content = entry.children[2];
    const paragraph = content?.querySelector('p');
    if (!content || !paragraph) return;

    const fullText = String(paragraph.textContent || '').trim();

    entry.dataset.archiveFullText = fullText;
    entry.dataset.archiveZoomReady = 'true';
    entry.classList.add('archive-entry-compact');

    paragraph.textContent = excerpt(fullText);
    paragraph.classList.add('archive-entry-summary');

    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'archive-expand';
    button.innerHTML =
      '<span>Leer entrada completa</span><span aria-hidden="true">＋</span>';

    button.addEventListener('click', event => {
      event.stopPropagation();
      openDialog(entry, button);
    });

    content.append(button);

    entry.addEventListener('click', event => {
      if (event.target.closest('a, button')) return;
      openDialog(entry, button);
    });
  }

  function enhanceAll() {
    root.querySelectorAll('.archive-entry').forEach(enhanceEntry);
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

  const observer = new MutationObserver(enhanceAll);
  observer.observe(root, { childList: true });
  enhanceAll();
})();
