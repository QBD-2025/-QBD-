// Examen controller - marca pendientes, lista pendientes, permite finalizar con o sin pendientes.
// No requiere librerías. Funciona con radios dentro de cada .bloque-pregunta.

const Examen = (() => {
  /** Utilidades **/
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const createEl = (tag, attrs = {}, children = []) => {
    const el = document.createElement(tag);
    Object.entries(attrs).forEach(([k, v]) => {
      if (k === 'class') el.className = v;
      else if (k === 'dataset') Object.assign(el.dataset, v);
      else if (k.startsWith('on') && typeof v === 'function') el.addEventListener(k.slice(2), v);
      else el.setAttribute(k, v);
    });
    children.forEach(c => el.appendChild(typeof c === 'string' ? document.createTextNode(c) : c));
    return el;
  };

  /** Estado **/
  let cfg = {};
  let preguntas = [];         // [{el, radios[], index, pendiente:boolean, seleccion:number|null}]
  let respuestas = [];        // array de índices seleccionados (o null)
  let pendientes = new Set(); // índices de preguntas marcadas como pendientes
  let inputHidden;            // <input type="hidden" name="respuestas">

  /** Inicialización **/
  function init(userCfg = {}) {
    cfg = Object.assign({
      formSelector: '#formExamen',
      questionSelector: '.bloque-pregunta',
      finalizeButtonSelector: '#btnFinalizar',
      respuestasHiddenName: 'respuestas',
      scrollOffset: 0
    }, userCfg);

    const form = $(cfg.formSelector);
    if (!form) {
      console.error('[Examen] No se encontró el formulario:', cfg.formSelector);
      return;
    }

    // Asegurar hidden "respuestas"
    inputHidden = form.querySelector(`input[name="${cfg.respuestasHiddenName}"]`);
    if (!inputHidden) {
      inputHidden = createEl('input', { type: 'hidden', name: cfg.respuestasHiddenName });
      form.appendChild(inputHidden);
    }

    // Mapear preguntas
    const bloques = $$(cfg.questionSelector);
    if (!bloques.length) {
      console.warn('[Examen] No se encontraron bloques de pregunta:', cfg.questionSelector);
    }

    preguntas = bloques.map((el, idx) => {
      // Buscar radios (una pregunta = grupo de radios con mismo name)
      const radios = $$('input[type="radio"]', el);
      // deducir índice seleccionado inicial (si ya venía marcado)
      const selIdx = radios.findIndex(r => r.checked) >= 0 ? radios.findIndex(r => r.checked) : null;
      return { el, radios, index: idx, pendiente: false, seleccion: selIdx };
    });

    respuestas = preguntas.map(q => q.seleccion);

    // Botón por pregunta: "Marcar como pendiente"
    preguntas.forEach(q => injectPendingButton(q));

    // Barra flotante para "Ver pendientes" y "Finalizar"
    injectToolbar(form);

    // Escuchar cambios en radios para actualizar estado
    preguntas.forEach(q => {
      q.radios.forEach((radio, ridx) => {
        radio.addEventListener('change', () => {
          q.seleccion = ridx;
          respuestas[q.index] = ridx;
          // Si respondió, quitar pendiente automáticamente (opcional)
          if (q.pendiente) setPendiente(q.index, false);
          syncHidden();
          refreshCounters();
        });
      });
    });

    // Finalizar: confirmación si hay pendientes
    let btnFinal = $(cfg.finalizeButtonSelector);
    if (!btnFinal) {
      // crear uno si no existe
      btnFinal = createEl('button', { type: 'button', id: cfg.finalizeButtonSelector.replace('#',''), class: 'btn-finalizar' }, ['Finalizar examen']);
      form.appendChild(btnFinal);
    }
    btnFinal.addEventListener('click', handleFinalize);

    // Interceptar submit para asegurar payload
    form.addEventListener('submit', (e) => {
      // El usuario puede enviar desde confirmación; aquí solo sincronizamos por si acaso
      syncHidden();
    });

    // Sincronizar por primera vez
    syncHidden();
    refreshCounters();
  }

  /** Insertar botón de pendiente en cada pregunta **/
  function injectPendingButton(q) {
    const btn = createEl('button', {
      type: 'button',
      class: 'btn-pendiente',
      dataset: { index: q.index },
      onclick: () => togglePendiente(q.index)
    }, ['Marcar como pendiente']);
    // marcador visual
    const badge = createEl('span', { class: 'badge-pendiente', 'aria-hidden': 'true', style: 'display:none;margin-left:.5rem;' }, ['⏳ Pendiente']);

    // Header auxiliar (no rompe tu HBS)
    const header = createEl('div', { class: 'pregunta-tools' }, [btn, badge]);
    q.el.appendChild(header);
    q._btnPendiente = btn;
    q._badgePendiente = badge;
  }

  /** Barra superior de utilidades **/
  function injectToolbar(form) {
    const bar = createEl('div', { class: 'examen-toolbar', style: 'position:sticky;top:0;z-index:999;background:#fff;padding:.75rem;border-bottom:1px solid #ddd;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap' });
    const info = createEl('span', { class: 'examen-info' }, ['Pendientes: ', createEl('strong', { class: 'count-pendientes' }, ['0']), ' | Respondidas: ', createEl('strong', { class: 'count-respondidas' }, ['0'])]);
    const btnVerPend = createEl('button', { type: 'button', class: 'btn-ver-pendientes' }, ['Ver pendientes']);
    btnVerPend.addEventListener('click', showPendientesDialog);
    bar.appendChild(info);
    bar.appendChild(btnVerPend);
    form.prepend(bar);
  }

  /** Marcar / desmarcar / alternar pendiente **/
  function setPendiente(index, val) {
    const q = preguntas[index];
    if (!q) return;
    q.pendiente = !!val;
    if (q.pendiente) pendientes.add(index);
    else pendientes.delete(index);
    // UI
    if (q._btnPendiente) q._btnPendiente.textContent = q.pendiente ? 'Quitar pendiente' : 'Marcar como pendiente';
    if (q._badgePendiente) q._badgePendiente.style.display = q.pendiente ? '' : 'none';
    refreshCounters();
  }
  function togglePendiente(index) {
    const q = preguntas[index];
    setPendiente(index, !q.pendiente);
  }

  /** Sincronizar hidden con arreglo de índices (o null) **/
  function syncHidden() {
    // tu backend espera un JSON array de índices (0..n-1) o null si no respondió
    inputHidden.value = JSON.stringify(respuestas);
  }

  /** Contadores en la barra **/
  function refreshCounters() {
    const respondidas = respuestas.filter(x => Number.isInteger(x)).length;
    const cPend = $('.count-pendientes');
    const cResp = $('.count-respondidas');
    if (cPend) cPend.textContent = pendientes.size.toString();
    if (cResp) cResp.textContent = respondidas.toString();
  }

  /** Mostrar diálogo de pendientes con opciones **/
  function showPendientesDialog() {
    const list = Array.from(pendientes).sort((a,b)=>a-b);
    const overlay = createEl('div', { class: 'overlay-examen', style: 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:1rem' });
    const modal = createEl('div', { class: 'modal-examen', style: 'background:#fff;max-width:640px;width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:1rem' });

    const title = createEl('h3', {}, ['Preguntas pendientes']);
    const body = createEl('div', { style: 'max-height:50vh;overflow:auto' });
    if (list.length === 0) {
      body.appendChild(createEl('p', {}, ['No tienes preguntas pendientes. 🎉']));
    } else {
      const ul = createEl('ul', { style: 'display:grid;grid-template-columns:repeat(auto-fill,minmax(120px,1fr));gap:.5rem;list-style:none;padding:0;margin:0' });
      list.forEach(idx => {
        const btn = createEl('button', { type: 'button', class: 'chip', style: 'width:100%;padding:.5rem;border:1px solid #ddd;border-radius:999px' }, [`Pregunta ${idx+1}`]);
        btn.addEventListener('click', () => {
          closeOverlay(overlay);
          scrollToPregunta(idx);
        });
        ul.appendChild(createEl('li', {}, [btn]));
      });
      body.appendChild(ul);
    }

    const footer = createEl('div', { style: 'display:flex;gap:.5rem;justify-content:flex-end;margin-top:1rem;flex-wrap:wrap' });
    const btnIrPrimera = createEl('button', { type: 'button' }, ['Ir a la primera pendiente']);
    btnIrPrimera.addEventListener('click', () => {
      closeOverlay(overlay);
      if (list.length) scrollToPregunta(list[0]);
    });
    const btnCerrar = createEl('button', { type: 'button' }, ['Cerrar']);
    btnCerrar.addEventListener('click', () => closeOverlay(overlay));

    footer.appendChild(btnIrPrimera);
    footer.appendChild(btnCerrar);

    modal.appendChild(title);
    modal.appendChild(body);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  function closeOverlay(overlay) {
    overlay?.remove();
  }

  /** Finalizar examen con confirmación si hay pendientes **/
  function handleFinalize() {
    const form = $(cfg.formSelector);
    if (!form) return;
    const hayPendientes = pendientes.size > 0;

    if (!hayPendientes) {
      // Enviar directo
      syncHidden();
      form.submit();
      return;
    }

    // Mostrar confirmación
    const overlay = createEl('div', { class: 'overlay-examen', style: 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:1rem' });
    const modal = createEl('div', { class: 'modal-examen', style: 'background:#fff;max-width:520px;width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:1rem' });
    const title = createEl('h3', {}, ['Tienes preguntas pendientes']);
    const msg = createEl('p', {}, [`Tienes ${pendientes.size} pregunta(s) marcada(s) como pendiente. ¿Qué te gustaría hacer?`]);

    const footer = createEl('div', { style: 'display:flex;gap:.5rem;justify-content:flex-end;flex-wrap:wrap;margin-top:1rem' });
    const btnIrPend = createEl('button', { type: 'button' }, ['Contestar pendientes']);
    const btnEnviar = createEl('button', { type: 'button' }, ['Enviar de todos modos']);
    const btnCancelar = createEl('button', { type: 'button' }, ['Cancelar']);

    btnIrPend.addEventListener('click', () => {
      closeOverlay(overlay);
      const first = Array.from(pendientes).sort((a,b)=>a-b)[0];
      if (first !== undefined) scrollToPregunta(first);
      else showPendientesDialog();
    });
    btnEnviar.addEventListener('click', () => {
      closeOverlay(overlay);
      syncHidden();
      form.submit(); // permitir terminar aunque haya pendientes
    });
    btnCancelar.addEventListener('click', () => closeOverlay(overlay));

    footer.appendChild(btnIrPend);
    footer.appendChild(btnEnviar);
    footer.appendChild(btnCancelar);

    modal.appendChild(title);
    modal.appendChild(msg);
    modal.appendChild(footer);
    overlay.appendChild(modal);
    document.body.appendChild(overlay);
  }

  /** Scroll a una pregunta específica **/
  function scrollToPregunta(index) {
    const q = preguntas[index];
    if (!q) return;
    const top = q.el.getBoundingClientRect().top + window.scrollY - (cfg.scrollOffset || 0);
    window.scrollTo({ top, behavior: 'smooth' });
    // Resaltar momentáneamente
    q.el.style.transition = 'box-shadow .2s ease, background-color .2s ease';
    const prevBg = q.el.style.backgroundColor;
    q.el.style.backgroundColor = 'rgba(255, 243, 205, .6)';
    q.el.style.boxShadow = '0 0 0 2px rgba(255,193,7,.8)';
    setTimeout(() => {
      q.el.style.backgroundColor = prevBg || '';
      q.el.style.boxShadow = '';
    }, 1200);
  }

  /** API pública mínima **/
  return {
    init,
    togglePendiente,
    setPendiente,
    scrollToPregunta
  };
})();
