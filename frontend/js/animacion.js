// ======================================================================
// === CONFIGURACIÓN DE ELEMENTOS HTML =================================
// ======================================================================
const animationElement = document.getElementById('duolingoAnimation');
const startButtonContainer = document.getElementById('startButtonContainer');
const startButton = document.getElementById('startButton');
const formularioOverlay = document.getElementById("formularioOverlay");

// Audios
const bienvenidoAudio = document.getElementById('bienvenidoAudio');
const esperandoAudio = document.getElementById('esperandoAudio');
const hagamosloAudio = document.getElementById('hagamosloAudio');

// ======================================================================
// === CONFIGURACIÓN DE ESCENAS Y FRAMES ================================
// ======================================================================
const introStartFrameNum = 2;
const introEndFrameNum = 189;
const introTotalImages = introEndFrameNum - introStartFrameNum + 1;

const loopStartFrameNum = 245;
const loopEndFrameNum = 481;
const loopTotalImages = loopEndFrameNum - loopStartFrameNum + 1;

const outroStartFrameNum = 481;
const outroEndFrameNum = 711;
const outroTotalImages = outroEndFrameNum - outroStartFrameNum + 1;

// ======================================================================
// === RUTA DE LOS FRAMES ===============================================
// ======================================================================
const framePath = '/media/animacion_frames_p/video-bienvenida_000000_';
const frameExtension = '.webp';

function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(6, '0');
    return `${framePath}${paddedNumber}${frameExtension}`;
}

// ======================================================================
// === CACHÉ DE IMÁGENES ========================================
// ======================================================================
const imageCache = new Map();
let lastDisplayedFrame = -1; // Para evitar actualizar el mismo frame

function cacheFrame(frameNumber) {
    if (!imageCache.has(frameNumber)) {
        const img = new Image();
        img.src = getFramePath(frameNumber);
        imageCache.set(frameNumber, img);
    }
    return imageCache.get(frameNumber);
}

// ======================================================================
// === PRE-CARGA DE IMÁGENES MEJORADA ===================================
// ======================================================================
function preloadFrames(start, end, callback) {
    let loaded = 0;
    const total = end - start + 1;
    
    // Precargamos en lotes para no saturar el navegador
    const batchSize = 20;
    let currentBatch = 0;
    
    function loadBatch() {
        const batchStart = start + (currentBatch * batchSize);
        const batchEnd = Math.min(batchStart + batchSize - 1, end);
        
        for (let i = batchStart; i <= batchEnd; i++) {
            const img = cacheFrame(i);
            
            if (img.complete) {
                loaded++;
            } else {
                img.onload = () => {
                    loaded++;
                    checkProgress();
                };
                img.onerror = () => {
                    loaded++;
                    checkProgress();
                };
            }
        }
    }
    
    function checkProgress() {
        if (loaded === total && callback) {
            callback();
        } else if (loaded >= (currentBatch + 1) * batchSize && currentBatch * batchSize < total) {
            currentBatch++;
            loadBatch();
        }
    }
    
    loadBatch();
    checkProgress();
}

// Precarga inicial
preloadFrames(introStartFrameNum, introEndFrameNum, () => {
    waitForUserInteraction();
    preloadFrames(loopStartFrameNum, loopEndFrameNum, () => {
        preloadFrames(outroStartFrameNum, outroEndFrameNum, () => {
        });
    });
});

// ======================================================================
// === FUNCIÓN PARA ACTUALIZAR FRAME (OPTIMIZADA) =======================
// ======================================================================
function updateFrame(frameNumber) {
    // Evitar actualizar el mismo frame
    if (frameNumber === lastDisplayedFrame) return;
    
    const cachedImage = imageCache.get(frameNumber);
    
    if (cachedImage && cachedImage.complete) {
        // Usar el src del objeto Image cacheado
        animationElement.src = cachedImage.src;
        lastDisplayedFrame = frameNumber;
    } else {
        // Fallback si no está en caché
        animationElement.src = getFramePath(frameNumber);
        lastDisplayedFrame = frameNumber;
    }
}

// ======================================================================
// === TIMELINES DE ANIMACIÓN (OPTIMIZADAS) =============================
// ======================================================================
let introTimeline;
let loopTimeline;
let outroTimeline;

function initAnimation() {
    const introDuration = bienvenidoAudio.duration || 14;

    // Escena 1: Introducción
    introTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
            loopTimeline.play();
            showStartButton();
        }
    });

    introTimeline.to(animationElement, {
        duration: introDuration,
        ease: "none",
        onUpdate: function () {
            const progress = this.progress();
            const currentFrame = Math.floor(progress * introTotalImages) + introStartFrameNum;
            updateFrame(currentFrame);
        }
    });

    // Escena 2: Bucle Idle - sincronizado con audio
    loopTimeline = gsap.timeline({
        paused: true,
        repeat: -1
    });

    loopTimeline.to({}, {
        duration: 1,
        repeat: -1,
        ease: "none",
        onUpdate: function () {
            if (esperandoAudio.duration > 0) {
                const progress = (esperandoAudio.currentTime % esperandoAudio.duration) / esperandoAudio.duration;
                const currentFrame = Math.floor(progress * loopTotalImages) + loopStartFrameNum;
                updateFrame(currentFrame);
            }
        }
    });

    // Escena 3: Outro
    outroTimeline = gsap.timeline({
        paused: true,
        onComplete: async () => {

            updateFrame(700);

            const res = await fetch("/formulario1?partial=1");
            const html = await res.text();
            formularioOverlay.innerHTML = `
                <div class="formulario-container" style="background-color: transparent; left: 20px; right: auto;">
                    <div class="formulario-content">${html}</div>
                </div>
            `;
            formularioOverlay.style.display = "flex";
            formularioOverlay.style.backgroundColor = "transparent";

            outroTimeline.pause();
        }
    });

    outroTimeline.to(animationElement, {
        duration: outroTotalImages / 30,
        ease: "none",
        onUpdate: function () {
            const currentFrame = Math.floor(this.progress() * outroTotalImages) + outroStartFrameNum;
            updateFrame(currentFrame);
        }
    });

    // Botón "¡Hagámoslo!"
    startButton.addEventListener('click', () => {
        hideStartButton();

        loopTimeline.pause();

        esperandoAudio.pause();
        esperandoAudio.currentTime = 0;

        hagamosloAudio.currentTime = 0;
        hagamosloAudio.loop = false;
        hagamosloAudio.play()

        outroTimeline.play();
    });
}

// ======================================================================
// === FUNCIONES DE BOTONES =============================================
// ======================================================================
function showStartButton() {
    startButtonContainer.classList.add('active');
}

function hideStartButton() {
    startButtonContainer.classList.remove('active');
}

// ======================================================================
// === ESPERAR INTERACCIÓN DEL USUARIO ==================================
// ======================================================================
function waitForUserInteraction() {
    const startIntro = () => {
        document.removeEventListener('click', startIntro);

        bienvenidoAudio.currentTime = 0;
        bienvenidoAudio.play()

        bienvenidoAudio.onended = () => {
            esperandoAudio.currentTime = 0;
            esperandoAudio.loop = true;
            esperandoAudio.play()
        };

        initAnimation();
        introTimeline.play();
    };

    startIntro()
}

// Limpiar al descargar la página
window.addEventListener('beforeunload', () => {
    imageCache.clear();
});