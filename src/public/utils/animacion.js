// Asegúrate de que GSAP esté cargado.
// Si usas ScrollTrigger para otras partes, recuerda registrarlo.
// gsap.registerPlugin(ScrollTrigger);

const animationElement = document.getElementById('duolingoAnimation');
const startButtonContainer = document.getElementById('startButtonContainer');
const startButton = document.getElementById('startButton');

// ======================================================================
// === ¡VALORES ACTUALIZADOS BASADOS EN TUS FRAMES! =====================
// ======================================================================
const framesPerStep = 3;

// Escena 1: Introducción (zen00001.jpg al zen00052.jpg)
const introStartFrameNum = 1;
const introEndFrameNum = 245;
const introTotalImages = Math.floor((introEndFrameNum - introStartFrameNum) / framesPerStep) + 1;

// Escena 2: Bucle de Espera (zen00067.jpg al zen00118.jpg)
const loopStartFrameNum = 255;
const loopEndFrameNum = 481;
const loopTotalImages = Math.floor((loopEndFrameNum - loopStartFrameNum) / framesPerStep) + 1;

// Escena 3: Salida (zen00121.jpg al zen00175.jpg)
const outroStartFrameNum = 481;
const outroEndFrameNum = 712;
const outroTotalImages = Math.floor((outroEndFrameNum - outroStartFrameNum) / framesPerStep) + 1;

// ======================================================================

// REVISAR ESTA RUTA Y EXTENSIÓN
// Si tus frames están en `src/media/animacion_frames_p/`,
// y tu app.js tiene `app.use('/media', express.static(path.join(__dirname, 'src', 'media')));`
// Entonces la ruta en el navegador es `/media/animacion_frames_p/zenXXXXX.jpg`
const framePath = 'media/animacion_frames_p/video-bienvenida_000000_'; // <--- ¡Asegura que el slash inicial sea correcto!
const frameExtension = '.webp'; // <--- CAMBIADO a .jpg según tu descripción y frames enviados

// Función para generar la ruta completa del frame
function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(6, '0');
    return `${framePath}${paddedNumber}${frameExtension}`;
}

// ======================================================================
// === Pre-carga de imágenes ==========================================
// ======================================================================
const preloadedImages = [];
let loadedImagesCount = 0;
let totalUniqueImagesToLoad = 0;

// Calcula cuántas imágenes únicas hay en total para la pre-carga
for (let i = introStartFrameNum; i <= introEndFrameNum; i += framesPerStep) { totalUniqueImagesToLoad++; }
for (let i = loopStartFrameNum; i <= loopEndFrameNum; i += framesPerStep) { totalUniqueImagesToLoad++; }
for (let i = outroStartFrameNum; i <= outroEndFrameNum; i += framesPerStep) { totalUniqueImagesToLoad++; }

// Array para almacenar los frames a cargar (para evitar duplicados en la lógica de pre-carga)
const framesToLoad = new Set();
for (let i = introStartFrameNum; i <= introEndFrameNum; i += framesPerStep) { framesToLoad.add(i); }
for (let i = loopStartFrameNum; i <= loopEndFrameNum; i += framesPerStep) { framesToLoad.add(i); }
for (let i = outroStartFrameNum; i <= outroEndFrameNum; i += framesPerStep) { framesToLoad.add(i); }

// Ahora iteramos sobre el set de frames únicos para la pre-carga
framesToLoad.forEach(frameNumber => {
    const img = new Image();
    img.src = getFramePath(frameNumber);
    img.onload = () => {
        loadedImagesCount++;
        if (loadedImagesCount === totalUniqueImagesToLoad) {
            console.log('Todos los frames necesarios cargados. Iniciando animación.');
            initAnimation();
        }
    };
    img.onerror = () => {
        console.error(`Error al cargar frame: ${getFramePath(frameNumber)}`);
        // Si un frame falla, aún queremos intentar iniciar la animación si el resto cargó
        loadedImagesCount++;
        if (loadedImagesCount === totalUniqueImagesToLoad) {
            initAnimation();
        }
    };
    preloadedImages.push(img);
});


let introTimeline;
let loopTimeline;
let outroTimeline;

function initAnimation() {
    // 1. Animación de Introducción (Escena 1)
    introTimeline = gsap.timeline({
        paused: true,
        onComplete: () => {
            console.log('Introducción terminada. Iniciando bucle idle y mostrando botón.');
            loopTimeline.play(); // <--- CORRECCIÓN AQUÍ: Llamar a .play() en el timeline del bucle
            showStartButton();
        }
    });

    introTimeline.to(animationElement, {
        duration: introTotalImages / 17,
        snap: { frame: framesPerStep },
        ease: "none",
        onUpdate: function() {
            const currentFrame = Math.floor(this.progress() * introTotalImages) * framesPerStep + introStartFrameNum;
            animationElement.src = getFramePath(currentFrame);
        }
    });

    // 2. Animación de Bucle de Espera (Escena 2)
    loopTimeline = gsap.timeline({
        paused: true,
        repeat: -1,
        onComplete: () => {
            console.log('Bucle completado (esto es inusual para un loop infinito, revisar lógica).');
        }
    });

        loopTimeline.to(animationElement, {
            duration: loopTotalImages / 20,
            snap: { frame: framesPerStep },
            ease: "none",
            onUpdate: function() {
                const currentFrame = Math.floor(this.progress() * loopTotalImages) * framesPerStep + loopStartFrameNum;
                animationElement.src = getFramePath(currentFrame);
            }
        });

        // 3. Animación de Salida (Escena 3 - cuando se presiona el botón)
    // En la parte del outroTimeline, modifica el onComplete:
    outroTimeline = gsap.timeline({
        paused: true,
        onComplete: async () => {
            console.log("Animación de salida terminada. Cargando formulario...");
            
            // Congelar en el frame 700
            animationElement.src = "/media/animacion_frames_p/video-bienvenida_000000_000700.webp";
            
            // Cargar y mostrar el formulario con fondo transparente
            const res = await fetch("/formulario1?partial=1");
            const html = await res.text();
            const formularioOverlay = document.getElementById("formularioOverlay");
            
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
        snap: { frame: framesPerStep },
        ease: "none",
        onUpdate: function() {
            const currentFrame = Math.floor(this.progress() * outroTotalImages) * framesPerStep + outroStartFrameNum;
            animationElement.src = getFramePath(currentFrame);
        }
    });

    // --- Control de las animaciones ---

    // Iniciar la introducción una vez que todos los frames estén cargados
    introTimeline.play();

    // Event listener para el botón "¡Hagámoslo!"
    startButton.addEventListener('click', () => {
        hideStartButton();
        loopTimeline.pause(); // Pausa el bucle de espera
        outroTimeline.play(); // Inicia la animación de salida
    });
}

// Funciones para mostrar/ocultar el botón
function showStartButton() {
    startButtonContainer.classList.add('active');
}

function hideStartButton() {
    startButtonContainer.classList.remove('active');
}