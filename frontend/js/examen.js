/* ================================================================
  Archivo: examenController.js
  Descripción: Controla el flujo de un examen en línea:
    - Permite marcar preguntas como pendientes
    - Visualizar preguntas pendientes
    - Finalizar examen con o sin pendientes
      Funciona sin librerías externas y opera sobre radios
      dentro de cada ".bloque-pregunta".
  Autor: Equipo de desarrollo
  Última modificación: [Fecha]
================================================================ */

   const Examen = (() => {

    // ===== UTILIDADES =====
    // Selector simple
    const $ = (sel, root = document) => root.querySelector(sel);
    const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  
    // Crear elemento con atributos, dataset, eventos y children
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
  
    // ===== ESTADO =====
    let cfg = {};                 // Configuración del examen
    let preguntas = [];           // Lista de preguntas con radios y estado
    let respuestas = [];          // Array de índices seleccionados o null
    let pendientes = new Set();   // Índices de preguntas marcadas como pendientes
    let inputHidden;              // Input hidden para sincronizar respuestas
  
    // ===== INICIALIZACIÓN =====
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
  
      // Asegurar existencia de input hidden para enviar respuestas
      inputHidden = form.querySelector(`input[name="${cfg.respuestasHiddenName}"]`);
      if (!inputHidden) {
        inputHidden = createEl('input', { type: 'hidden', name: cfg.respuestasHiddenName });
        form.appendChild(inputHidden);
      }
  
      // Mapear preguntas y radios
      const bloques = $$(cfg.questionSelector);
      if (!bloques.length) console.warn('[Examen] No se encontraron bloques de pregunta:', cfg.questionSelector);
  
      preguntas = bloques.map((el, idx) => {
        const radios = $$('input[type="radio"]', el);
        const selIdx = radios.findIndex(r => r.checked) >= 0 ? radios.findIndex(r => r.checked) : null;
        return { el, radios, index: idx, pendiente: false, seleccion: selIdx };
      });
  
      respuestas = preguntas.map(q => q.seleccion);
  
      // Insertar botón "Marcar como pendiente" en cada pregunta
      preguntas.forEach(q => injectPendingButton(q));
  
      // Barra superior flotante con contadores y botón "Ver pendientes"
      injectToolbar(form);
  
      // Escuchar cambios en radios para actualizar estado
      preguntas.forEach(q => {
        q.radios.forEach((radio, ridx) => {
          radio.addEventListener('change', () => {
            q.seleccion = ridx;
            respuestas[q.index] = ridx;
            // Si respondió, quitar pendiente automáticamente
            if (q.pendiente) setPendiente(q.index, false);
            syncHidden();
            refreshCounters();
          });
        });
      });
  
      // Botón de finalizar examen
      let btnFinal = $(cfg.finalizeButtonSelector);
      if (!btnFinal) {
        btnFinal = createEl('button', { type: 'button', id: cfg.finalizeButtonSelector.replace('#',''), class: 'btn-finalizar' }, ['Finalizar examen']);
        form.appendChild(btnFinal);
      }
      btnFinal.addEventListener('click', handleFinalize);
  
      // Interceptar submit para sincronizar respuestas
      form.addEventListener('submit', () => syncHidden());
  
      // Primera sincronización y actualización de contadores
      syncHidden();
      refreshCounters();
    }
  
    // ===== BOTÓN "PENDIENTE" EN CADA PREGUNTA =====
    function injectPendingButton(q) {
      const btn = createEl('button', {
        type: 'button',
        class: 'btn-pendiente',
        dataset: { index: q.index },
        onclick: () => togglePendiente(q.index)
      }, ['Marcar como pendiente']);
  
      const badge = createEl('span', { class: 'badge-pendiente', 'aria-hidden': 'true', style: 'display:none;margin-left:.5rem;' }, ['⏳ Pendiente']);
      const header = createEl('div', { class: 'pregunta-tools' }, [btn, badge]);
      q.el.appendChild(header);
  
      q._btnPendiente = btn;
      q._badgePendiente = badge;
    }
  
    // ===== BARRA SUPERIOR (TOOLBAR) =====
    function injectToolbar(form) {
      const bar = createEl('div', { class: 'examen-toolbar', style: 'position:sticky;top:0;z-index:999;background:#fff;padding:.75rem;border-bottom:1px solid #ddd;display:flex;gap:.5rem;align-items:center;flex-wrap:wrap' });
      const info = createEl('span', { class: 'examen-info' }, ['Pendientes: ', createEl('strong', { class: 'count-pendientes' }, ['0']), ' | Respondidas: ', createEl('strong', { class: 'count-respondidas' }, ['0'])]);
      const btnVerPend = createEl('button', { type: 'button', class: 'btn-ver-pendientes' }, ['Ver pendientes']);
      btnVerPend.addEventListener('click', showPendientesDialog);
      bar.appendChild(info);
      bar.appendChild(btnVerPend);
      form.prepend(bar);
    }
  
    // ===== MARCAR / DESMARCAR PENDIENTE =====
    function setPendiente(index, val) {
      const q = preguntas[index];
      if (!q) return;
      q.pendiente = !!val;
      if (q.pendiente) pendientes.add(index);
      else pendientes.delete(index);
  
      if (q._btnPendiente) q._btnPendiente.textContent = q.pendiente ? 'Quitar pendiente' : 'Marcar como pendiente';
      if (q._badgePendiente) q._badgePendiente.style.display = q.pendiente ? '' : 'none';
  
      refreshCounters();
    }
    function togglePendiente(index) {
      const q = preguntas[index];
      setPendiente(index, !q.pendiente);
    }
  
    // ===== SINCRONIZAR INPUT HIDDEN =====
    function syncHidden() {
      inputHidden.value = JSON.stringify(respuestas);
    }
  
    // ===== ACTUALIZAR CONTADORES =====
    function refreshCounters() {
      const respondidas = respuestas.filter(x => Number.isInteger(x)).length;
      const cPend = $('.count-pendientes');
      const cResp = $('.count-respondidas');
      if (cPend) cPend.textContent = pendientes.size.toString();
      if (cResp) cResp.textContent = respondidas.toString();
    }
  
    // ===== DIÁLOGO PENDIENTES =====
    function showPendientesDialog() {
      const list = Array.from(pendientes).sort((a,b)=>a-b);
  
      const overlay = createEl('div', { class: 'overlay-examen', style: 'position:fixed;inset:0;background:rgba(0,0,0,.35);display:flex;align-items:center;justify-content:center;padding:1rem' });
      const modal = createEl('div', { class: 'modal-examen', style: 'background:#fff;max-width:640px;width:100%;border-radius:12px;box-shadow:0 10px 30px rgba(0,0,0,.2);padding:1rem' });
  
      const title = createEl('h3', {}, ['Preguntas pendientes']);
      const body = createEl('div', { style: 'max-height:50vh;overflow:auto' });
  
      if (!list.length) body.appendChild(createEl('p', {}, ['No tienes preguntas pendientes. 🎉']));
      else {
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
  
    function closeOverlay(overlay) { overlay?.remove(); }
  
    // ===== FINALIZAR EXAMEN =====
    function handleFinalize() {
      const form = $(cfg.formSelector);
      if (!form) return;
      const hayPendientes = pendientes.size > 0;
  
      if (!hayPendientes) {
        syncHidden();
        form.submit();
        return;
      }
  
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
      btnEnviar.addEventListener('click', () => { closeOverlay(overlay); syncHidden(); form.submit(); });
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
  
    // ===== SCROLL A PREGUNTA ESPECÍFICA =====
    function scrollToPregunta(index) {
      const q = preguntas[index];
      if (!q) return;
      const top = q.el.getBoundingClientRect().top + window.scrollY - (cfg.scrollOffset || 0);
      window.scrollTo({ top, behavior: 'smooth' });
  
      // Resaltar temporalmente
      q.el.style.transition = 'box-shadow .2s ease, background-color .2s ease';
      const prevBg = q.el.style.backgroundColor;
      q.el.style.backgroundColor = 'rgba(255, 243, 205, .6)';
      q.el.style.boxShadow = '0 0 0 2px rgba(255,193,7,.8)';
      setTimeout(() => {
        q.el.style.backgroundColor = prevBg || '';
        q.el.style.boxShadow = '';
      }, 1200);
    }
  
    // ===== API PÚBLICA =====
    return {
      init,
      togglePendiente,
      setPendiente,
      scrollToPregunta
    };
  })();
  