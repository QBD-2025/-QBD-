// =============================================
// 🏆 SISTEMA DE NOTIFICACIONES ÉPICAS
// public/js/achievement-popup.js
// =============================================
// Incluir en main.hbs DESPUÉS de notificacion.controller.js:
// <script src="/public/js/achievement-popup.js" defer></script>
// =============================================

(function () {
    'use strict';

    // ── CONFIG ─────────────────────────────────────────────
    const CONFIG = {
        pollInterval:   12000,  // Cada 12 segundos chequea el servidor
        autoCloseDelay: 6000,   // Se cierra solo a los 6s (si no clickean)
        betweenDelay:   800,    // Pausa entre un popup y el siguiente de la cola
        apiEndpoint:    '/api/logros/nuevos',
    };

    // ── ESTADO ─────────────────────────────────────────────
    let queue        = [];   // Cola de items por mostrar
    let isShowing    = false;
    let pollTimer    = null;
    let autoCloseTimer = null;

    // ── RAREZA ICONS MAP ─────────────────────────────────
    const RARITY_ICONS = {
        comun:      '⭐',
        rara:       '💎',
        epica:      '🔮',
        legendaria: '👑',
        especial:   '🔥',
    };

    const RARITY_LABELS = {
        comun:      'Común',
        rara:       'Rara',
        epica:      'Épica',
        legendaria: 'Legendaria',
        especial:   'Especial',
    };

    // ── CREAR ESTRUCTURA HTML ───────────────────────────
    function createModalHTML() {
        const flash = document.createElement('div');
        flash.id = 'achievement-flash';
        document.body.appendChild(flash);

        const overlay = document.createElement('div');
        overlay.id = 'achievement-overlay';
        overlay.innerHTML = `
            <div id="achievement-modal">
                <div id="achievement-particles"></div>
                <div id="achievement-banner"></div>

                <div id="achievement-header">
                    <div id="achievement-type-label">Nuevo Logro</div>
                    <div id="achievement-title-text">DESBLOQUEADO</div>
                </div>

                <div id="achievement-icon-wrap">
                    <div id="achievement-icon-bg">
                        <div id="achievement-icon-inner"></div>
                    </div>
                    <!-- estrellas dinámicas -->
                </div>

                <div id="achievement-body">
                    <div id="achievement-name"></div>
                    <div id="achievement-desc"></div>
                    <div id="achievement-rarity-badge"></div>
                    <div id="achievement-bonus"></div>
                </div>

                <div id="achievement-tap-hint">Toca para continuar</div>
                <div id="achievement-queue-indicator"></div>
                <div id="achievement-progress-bar"></div>
            </div>
        `;
        document.body.appendChild(overlay);

        // Click para cerrar
        overlay.addEventListener('click', () => closeModal(true));
    }

    // ── CREAR PARTÍCULAS ─────────────────────────────────
    function spawnParticles(count = 20) {
        const container = document.getElementById('achievement-particles');
        if (!container) return;
        container.innerHTML = '';

        for (let i = 0; i < count; i++) {
            const p = document.createElement('div');
            p.className = 'particle';

            const angle  = (Math.random() * 360) * (Math.PI / 180);
            const dist   = 60 + Math.random() * 150;
            const size   = 3 + Math.random() * 8;
            const dur    = 0.8 + Math.random() * 1.2;
            const delay  = Math.random() * 0.6;

            p.style.cssText = `
                --tx: ${Math.cos(angle) * dist}px;
                --ty: ${Math.sin(angle) * dist - 60}px;
                --size: ${size}px;
                --dur: ${dur}s;
                --delay: ${delay}s;
                left: ${30 + Math.random() * 40}%;
                top:  ${30 + Math.random() * 40}%;
            `;
            container.appendChild(p);
        }
    }

    // ── CREAR ESTRELLAS FLOTANTES ─────────────────────────
    function spawnStars() {
        const wrap = document.getElementById('achievement-icon-wrap');
        if (!wrap) return;

        // Limpiar estrellas previas
        wrap.querySelectorAll('.achievement-star').forEach(s => s.remove());

        const positions = [
            { top: '-10px', left: '10px' },
            { top: '-15px', right: '10px' },
            { bottom: '5px', left: '-5px' },
            { bottom: '-5px', right: '-5px' },
            { top: '40%',  left: '-20px' },
        ];

        positions.forEach((pos, i) => {
            const star = document.createElement('div');
            star.className = 'achievement-star';
            star.textContent = '✦';
            star.style.cssText = `
                --star-size: ${10 + Math.random() * 14}px;
                --star-dur:  ${2 + Math.random() * 2}s;
                --star-delay: ${i * 0.3}s;
                position: absolute;
                ${Object.entries(pos).map(([k,v]) => `${k}:${v}`).join(';')}
            `;
            wrap.appendChild(star);
        });
    }

    // ── POBLAR EL MODAL ──────────────────────────────────
    function populateModal(item) {
        const isInsignia = item._type === 'insignia';
        const rareza     = item.rareza || 'logro';

        // Clase de rareza en el modal
        const modal = document.getElementById('achievement-modal');
        modal.className = '';
        modal.classList.add(`rarity-${rareza}`);

        // Banner superior
        document.getElementById('achievement-type-label').textContent =
            isInsignia ? '✨ Insignia' : '🏆 Logro';

        document.getElementById('achievement-title-text').textContent =
            'DESBLOQUEADO';

        // Icono / imagen
        const inner = document.getElementById('achievement-icon-inner');
        if (isInsignia && item.imagen) {
            inner.innerHTML = `<img src="${item.imagen}" alt="${item.nombre}" onerror="this.parentElement.textContent='🏅'">`;
        } else {
            inner.textContent = item.icono || '🏆';
        }

        // Nombre y descripción
        document.getElementById('achievement-name').textContent = item.nombre;
        document.getElementById('achievement-desc').textContent  = item.descripcion;

        // Badge de rareza
        const badge = document.getElementById('achievement-rarity-badge');
        if (isInsignia) {
            badge.innerHTML = `${RARITY_ICONS[rareza] || '⭐'} ${RARITY_LABELS[rareza] || rareza}`;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }

        // Puntos bonus (solo logros)
        const bonusEl = document.getElementById('achievement-bonus');
        if (!isInsignia && item.puntos_bonus > 0) {
            bonusEl.innerHTML = `<span>+${item.puntos_bonus}</span> pts`;
            bonusEl.classList.add('visible');
        } else {
            bonusEl.innerHTML = '';
            bonusEl.classList.remove('visible');
        }

        // Cola
        const queueEl = document.getElementById('achievement-queue-indicator');
        const remaining = queue.length;
        if (remaining > 0) {
            queueEl.textContent = `+${remaining} más`;
            queueEl.classList.add('visible');
        } else {
            queueEl.classList.remove('visible');
        }

        // Barra de progreso
        const bar = document.getElementById('achievement-progress-bar');
        bar.style.animation = 'none';
        bar.offsetHeight;  // reflow
        bar.style.setProperty('--progress-duration', `${CONFIG.autoCloseDelay / 1000}s`);
        bar.style.setProperty('--progress-delay', '1.2s');
        bar.style.animation = '';
    }

    // ── ABRIR MODAL ──────────────────────────────────────
    function openModal(item) {
        isShowing = true;
        populateModal(item);
        spawnParticles(isLegendary(item) ? 35 : 18);
        spawnStars();

        // Flash de entrada
        const flash = document.getElementById('achievement-flash');
        if (flash) {
            flash.classList.remove('flash');
            flash.offsetHeight;
            flash.classList.add('flash');
        }

        // Vibración háptica en móvil
        if (navigator.vibrate) {
            navigator.vibrate(isLegendary(item) ? [100, 50, 200] : [80]);
        }

        const overlay = document.getElementById('achievement-overlay');
        const modal   = document.getElementById('achievement-modal');

        overlay.classList.add('active');
        modal.classList.remove('exit');
        modal.classList.add('enter');

        // Auto-cierre
        clearTimeout(autoCloseTimer);
        autoCloseTimer = setTimeout(() => closeModal(false), CONFIG.autoCloseDelay);
    }

    function isLegendary(item) {
        return item.rareza === 'legendaria' || item.rareza === 'especial';
    }

    // ── CERRAR MODAL ─────────────────────────────────────
    function closeModal(byUser = false) {
        clearTimeout(autoCloseTimer);

        const overlay = document.getElementById('achievement-overlay');
        const modal   = document.getElementById('achievement-modal');

        modal.classList.remove('enter');
        modal.classList.add('exit');

        setTimeout(() => {
            overlay.classList.remove('active');
            isShowing = false;

            // Siguiente en cola
            if (queue.length > 0) {
                setTimeout(showNext, CONFIG.betweenDelay);
            }
        }, 400);
    }

    // ── PROCESAR COLA ────────────────────────────────────
    function showNext() {
        if (queue.length === 0 || isShowing) return;
        const next = queue.shift();
        openModal(next);
    }

    function enqueue(items) {
        queue.push(...items);
        if (!isShowing) showNext();
    }

    // ── LLAMADA AL SERVIDOR ──────────────────────────────
    async function checkForNewAchievements() {
        // Solo si hay usuario logueado
        if (!window.usuarioActual) return;

        try {
            const res  = await fetch(CONFIG.apiEndpoint, { credentials: 'include' });
            if (!res.ok) return;
            const data = await res.json();

            const items = [];

            // Agregar insignias
            (data.insignias || []).forEach(ins => {
                items.push({ ...ins, _type: 'insignia' });
            });

            // Agregar logros
            (data.logros || []).forEach(log => {
                items.push({ ...log, _type: 'logro', rareza: 'logro' });
            });

            if (items.length > 0) {
                console.log(`[ACHIEVEMENTS] 🎉 ${items.length} nuevo(s) desbloqueado(s)!`);
                enqueue(items);
            }
        } catch (err) {
            console.warn('[ACHIEVEMENTS] Error al chequear:', err.message);
        }
    }

    // ── INIT ─────────────────────────────────────────────
    function init() {
        if (!window.usuarioActual) return; // Solo para usuarios logueados

        createModalHTML();

        // Primer chequeo al cargar (delay para no solapar con otras peticiones)
        setTimeout(checkForNewAchievements, 3000);

        // Chequeo periódico
        pollTimer = setInterval(checkForNewAchievements, CONFIG.pollInterval);

        // Exponer API global por si otros módulos quieren disparar un popup manualmente
        // Uso: window.AchievementPopup.show({ nombre, descripcion, icono, rareza, puntos_bonus })
        window.AchievementPopup = {
            show:  (item) => enqueue([item]),
            check: checkForNewAchievements,
        };

        console.log('[ACHIEVEMENTS] 🚀 Sistema de popups iniciado');
    }

    // Esperar a que el DOM esté listo
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

})();