const form = document.querySelector('#newsletterForm');
const status = document.querySelector('#newsletterStatus');
form.addEventListener('submit', async event => {
  event.preventDefault();
  const button = form.querySelector('button');
  button.disabled = true;
  status.textContent = 'Guardando…';
  try {
    const response = await fetch('/api/newsletter/subscribe', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email:form.email.value,consent:form.consent.checked,website:form.website.value})});
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'No se pudo guardar la suscripción.');
    status.textContent = 'Solicitud registrada. Si ya estabas en la lista, conservamos tu suscripción. Puedes leer el número 000 mientras preparamos el primer envío.';
    const link = document.querySelector('#unsubscribeLink');
    link.hidden = !data.unsubscribeToken;
    if (data.unsubscribeToken) {link.href = '/newsletter#baja=' + data.unsubscribeToken;link.textContent = 'Guarda este enlace personal para darte de baja';}
    form.reset();
  } catch(error) {status.textContent = error.message || 'No hay conexión. Inténtalo de nuevo.';}
  finally {button.disabled = false;}
});
function showUnsubscribe() {
  const token = location.hash.match(/^#baja=([a-f0-9]{64})$/)?.[1];
  if (!token) return;
  const panel = document.querySelector('#baja');
  panel.hidden = false;
  panel.scrollIntoView();
  document.querySelector('#unsubscribeButton').onclick = async () => {
    const button = document.querySelector('#unsubscribeButton');
    button.disabled = true;
    const status = document.querySelector('#unsubscribeStatus');
    try {
      const response = await fetch('/api/newsletter/unsubscribe',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({token})});
      if (!response.ok) throw new Error();
      status.textContent = 'Baja completada. Tu dirección ya no está en la lista.';
      history.replaceState(null,'','/newsletter#baja');
    } catch {status.textContent = 'No se pudo completar. Inténtalo de nuevo o escríbenos.';button.disabled = false;}
  };
}
showUnsubscribe();
window.addEventListener('hashchange',showUnsubscribe);
