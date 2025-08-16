console.log('🚀 Script JS iniciado');

document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded fired');

  // Elementos del DOM
  const animationElement = document.getElementById('duolingoAnimation6');
  const startButtonContainer = document.getElementById('startButtonContainer');
  const startButton = document.getElementById('startButton');

  console.log('animationElement:', animationElement);

  // Protegemos cualquier uso de elementos que podrían no existir
  if (!animationElement) {
    console.error('No se encontró el elemento con id "duolingoAnimation6" en el DOM.');
    return; // No continuar si no está el elemento principal
  }

  // Configuración de frames
  const framesPerStep = 2;
  const introStartFrameNum = 1;
  const introEndFrameNum = 78;
  const introTotalImages = Math.floor((introEndFrameNum - introStartFrameNum) / framesPerStep) + 1;

  const framePath = '/media/batalla-sin-cuartel_000/batalla-sin-cuartel_';
  const frameExtension = '.jpg';

  function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(3, '0'); // 6 dígitos si tus imágenes tienen 6 ceros delante
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
      duration: introTotalImages / 10,
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
    const framePathFull = getFramePath(frameNumber);
    img.src = framePathFull;

    img.onload = () => {
      console.log(`✅ Imagen cargada: ${framePathFull}`);
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        console.log('🎉 Todos los frames han sido cargados');
        initAnimation();
      }
    };

    img.onerror = () => {
      console.error(`❌ Error al cargar: ${framePathFull}`);
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        console.warn('⚠️ Precarga incompleta, pero inicializando animación');
        initAnimation();
      }
    };

    preloadedImages.push(img);
  });

});
