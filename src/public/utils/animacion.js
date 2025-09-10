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
// === PRE-CARGA DE IMÁGENES ============================================
// ======================================================================
const preloadedImages = [];
let loadedImagesCount = 0;
let totalUniqueImagesToLoad = 0;

const framesToLoad = new Set();

// Introducción
for (let i = introStartFrameNum; i <= introEndFrameNum; i++) framesToLoad.add(i);
// Bucle Idle
for (let i = loopStartFrameNum; i <= loopEndFrameNum; i++) framesToLoad.add(i);
// Outro
for (let i = outroStartFrameNum; i <= outroEndFrameNum; i++) framesToLoad.add(i);

totalUniqueImagesToLoad = framesToLoad.size;

framesToLoad.forEach(frameNumber => {
    const img = new Image();
    img.src = getFramePath(frameNumber);
    img.onload = () => {
        loadedImagesCount++;
        if (loadedImagesCount === totalUniqueImagesToLoad) {
            console.log('✅ Todos los frames cargados. Animación lista.');
            waitForUserInteraction();
        }
    };
    img.onerror = () => {
        console.error(`❌ Error al cargar frame: ${getFramePath(frameNumber)}`);
        loadedImagesCount++;
        if (loadedImagesCount === totalUniqueImagesToLoad) waitForUserInteraction();
    };
    preloadedImages.push(img);
});

// ======================================================================
// === TIMELINES DE ANIMACIÓN ===========================================
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
            console.log('🎬 Intro terminada → bucle idle + botón');
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
            animationElement.src = getFramePath(currentFrame);
        }
    });

    // Escena 2: Bucle Idle
    loopTimeline = gsap.timeline({
        paused: true,
        repeat: -1
    });

    loopTimeline.to(animationElement, {
        duration: loopTotalImages / 20,
        ease: "none",
        onUpdate: function () {
            const currentFrame = Math.floor(this.progress() * loopTotalImages) + loopStartFrameNum;
            animationElement.src = getFramePath(currentFrame);
        }
    });

    // Escena 3: Outro
    outroTimeline = gsap.timeline({
        paused: true,
        onComplete: async () => {
            console.log("🏁 Outro terminado → mostrando formulario...");

            animationElement.src = "/media/animacion_frames_p/video-bienvenida_000000_000700.webp";

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
        duration: outroTotalImages / 20,
        ease: "none",
        onUpdate: function () {
            const currentFrame = Math.floor(this.progress() * outroTotalImages) + outroStartFrameNum;
            animationElement.src = getFramePath(currentFrame);
        }
    });

    // Botón "¡Hagámoslo!"
    startButton.addEventListener('click', () => {
        hideStartButton();

        // Pausar bucle idle
        loopTimeline.pause();

        // Detener audio de esperando si está sonando
        esperandoAudio.pause();
        esperandoAudio.currentTime = 0;

        // Reproducir audio Hagamoslo
        hagamosloAudio.currentTime = 0;
        hagamosloAudio.loop = false;
        hagamosloAudio.play().catch(() => console.warn("🎵 Audio Hagamoslo bloqueado"));

        // Iniciar animación outro
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

        // Reproducir audio Bienvenido
        bienvenidoAudio.currentTime = 0;
        bienvenidoAudio.play().catch(() => console.warn("🎵 Audio Bienvenido bloqueado"));

        // Cuando termine Bienvenido → empezar audio de Esperando
        bienvenidoAudio.onended = () => {
            console.log("🎵 Bienvenido terminado → iniciando audio Esperando");
            esperandoAudio.currentTime = 0;
            esperandoAudio.loop = true;
            esperandoAudio.play().catch(() => console.warn("🎵 Audio Esperando bloqueado"));
        };

        // Inicializar animación y reproducir intro
        initAnimation();
        introTimeline.play();
    };

    // ✅ Si venimos desde la página de "Empezar Ahora"
    if (localStorage.getItem("startClicked") === "true") {
        localStorage.removeItem("startClicked");
        startIntro();
    } else {
        // ⏳ Si el usuario entra directo → esperar click
        document.addEventListener('click', startIntro);
    }
}
