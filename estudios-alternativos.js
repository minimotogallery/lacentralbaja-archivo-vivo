(() => {
  const form = document.getElementById('study-signup-form');
  if (!form) return;
  const errorMessage = document.getElementById('study-form-error');
  const success = document.getElementById('study-form-success');
  const reference = document.getElementById('study-reference');
  const submit = form.querySelector('button[type="submit"]');
  const submitLabel = submit.querySelector('span');
  const program = form.elements.namedItem('program');
  let sending = false;

  document.querySelectorAll('[data-program]').forEach(link => {
    link.addEventListener('click', () => { program.value = link.dataset.program; });
  });
  const campaign = new URLSearchParams(window.location.search);
  const requestedProgram = campaign.get('programa');
  if (Array.from(program.options).some(option => option.value === requestedProgram)) {
    program.value = requestedProgram;
  }

  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (sending) return;
    sending = true;
    submit.disabled = true;
    submitLabel.textContent = 'Enviando…';
    errorMessage.hidden = true;
    form.setAttribute('aria-busy', 'true');
    const payload = Object.fromEntries(new FormData(form).entries());
    payload.source = [campaign.get('utm_source'), campaign.get('utm_campaign')]
      .filter(Boolean).join(':').replace(/[^a-zA-Z0-9_:-]/g, '').slice(0, 120) || 'web';

    try {
      const response = await fetch('/api/inscripciones', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok || !result.ok || !result.reference) {
        throw new Error(result.error || 'No hemos podido guardar tu solicitud. Inténtalo de nuevo.');
      }
      reference.textContent = 'Referencia: ' + result.reference;
      form.reset();
      form.hidden = true;
      success.hidden = false;
      success.focus();
    } catch (error) {
      errorMessage.textContent = error instanceof TypeError || error instanceof SyntaxError
        ? 'No hemos podido conectar. Conservamos tus respuestas: vuelve a intentarlo.'
        : error.message || 'No hemos podido guardar tu solicitud. Inténtalo de nuevo.';
      errorMessage.hidden = false;
    } finally {
      sending = false;
      submit.disabled = false;
      submitLabel.textContent = 'Enviar preinscripción';
      form.removeAttribute('aria-busy');
    }
  });

  document.getElementById('study-another').addEventListener('click', () => {
    success.hidden = true;
    form.hidden = false;
    errorMessage.hidden = true;
    form.elements.namedItem('name').focus();
  });
})();
