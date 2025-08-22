document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded fired');

  // Elementos del DOM
  const animationElement = document.getElementById('duolingoAnimation2');
  const startButtonContainer = document.getElementById('startButtonContainer');
  const startButton = document.getElementById('startButton');

  console.log('animationElement:', animationElement);

  // Protegemos cualquier uso de elementos que podrían no existir
  if (!animationElement) {
    console.error('No se encontró el elemento con id "duolingoAnimation2" en el DOM.');
    return; // No continuar si no está el elemento principal
  }

  // Configuración de frames
  const framesPerStep = 3;
  const introStartFrameNum = 1;
  const introEndFrameNum = 189;
  const introTotalImages = Math.floor((introEndFrameNum - introStartFrameNum) / framesPerStep) + 1;

  const framePath = '/media/video_stuart_octavio/Video_stuart_octavio_';
  const frameExtension = '.webp';

  function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(6, '0'); // 6 dígitos si tus imágenes tienen 6 ceros delante
    return `${framePath}${paddedNumber}${frameExtension}`;
  }

  // Precarga de imágenes
  const preloadedImages = [];
  let loadedImagesCount = 0;
  const framesToLoad = new Set();
  for (let i = introStartFrameNum; i <= introEndFrameNum; i += framesPerStep) {
    framesToLoad.add(i);
  }
  const totalUniqueImagesToLoad = framesToLoad.size;

  let introTimeline;

  function initAnimation() {
    console.log('Inicializando animación');
    introTimeline = gsap.timeline({ paused: true });

    introTimeline.to(animationElement, {
      duration: introTotalImages / 15,
      ease: "none",
      onUpdate: function() {
        const progress = this.progress();
        const frameIndex = Math.min(Math.floor(progress * (introTotalImages - 1)), introTotalImages - 1);
        const currentFrame = introStartFrameNum + frameIndex * framesPerStep;
        animationElement.src = getFramePath(currentFrame);
      }
    });

    animationElement.addEventListener('mouseenter', () => {
      console.log('hover detectado');
      introTimeline.restart();
    });

    if (startButton) {
      startButton.addEventListener('click', () => {
        console.log('startButton clickeado');
        introTimeline.restart();
      });
    }

    // Para probar la animación sin hover, descomenta esta línea:
    // introTimeline.play();
  }

  // Precarga imágenes
  framesToLoad.forEach(frameNumber => {
    const img = new Image();
    img.src = getFramePath(frameNumber);
    img.onload = () => {
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        console.log('Todos los frames han sido cargados');
        initAnimation();
      }
    };
    img.onerror = () => {
      console.error(`Error al cargar: ${getFramePath(frameNumber)}`);
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        initAnimation();
      }
    };
    preloadedImages.push(img);
  });
});
