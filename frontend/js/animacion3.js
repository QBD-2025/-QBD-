/* ================================================================
Archivo: animacion3.js
Descripción: Controla la segunda animación tipo Duolingo, incluyendo
precarga de frames y reproducción al pasar el cursor o hacer clic.
  Autor: Equipo de desarrollo
  Última modificación: [Fecha]
================================================================ */

// ===== INICIALIZACIÓN AL CARGAR EL DOM =====
document.addEventListener('DOMContentLoaded', function() {
  console.log('DOMContentLoaded fired'); // Confirmación de que el DOM está listo

  // ===== ELEMENTOS DEL DOM =====
  const animationElement = document.getElementById('duolingoAnimation2'); // Imagen donde se mostrará la animación
  const startButtonContainer = document.getElementById('startButtonContainer'); // Contenedor del botón de inicio (opcional)
  const startButton = document.getElementById('startButton'); // Botón que inicia la animación (opcional)

  console.log('animationElement:', animationElement);

  // Protege contra errores si no se encuentra el elemento principal
  if (!animationElement) {
    console.error('No se encontró el elemento con id "duolingoAnimation2" en el DOM.');
    return; // Detiene la ejecución si no existe el elemento de animación
  }

  // ===== CONFIGURACIÓN DE FRAMES =====
  const framesPerStep = 2; // Cada cuántos frames reales se actualiza la imagen
  const introStartFrameNum = 1; // Primer frame de la animación
  const introEndFrameNum = 150; // Último frame de la animación
  const introTotalImages = Math.floor((introEndFrameNum - introStartFrameNum) / framesPerStep) + 1; 
  // Total de imágenes únicas que se mostrarán

  const framePath = '/media/video_stuart_octavio/frame-'; // Ruta base de las imágenes
  const frameExtension = '.webp'; // Extensión de los archivos de imagen

  // ===== FUNCIONES AUXILIARES =====
  // Devuelve la ruta completa de un frame según su número, con padding de ceros
  function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(0, '0'); // Ejemplo: 000001.webp
    return `${framePath}${paddedNumber}${frameExtension}`;
  }

  // ===== PRECARGA DE IMÁGENES =====
  const preloadedImages = []; // Almacena imágenes precargadas para evitar parpadeos
  let loadedImagesCount = 0; // Contador de imágenes cargadas exitosamente
  const framesToLoad = new Set(); // Conjunto de frames únicos a precargar

  // Agrega cada frame que se mostrará a framesToLoad
  for (let i = introStartFrameNum; i <= introEndFrameNum; i += framesPerStep) {
    framesToLoad.add(i);
  }
  const totalUniqueImagesToLoad = framesToLoad.size; // Número total de imágenes a cargar

  let introTimeline; // Timeline de GSAP para controlar la animación

  // ===== INICIALIZACIÓN DE LA ANIMACIÓN =====
  function initAnimation() {
    console.log('Inicializando animación');

    // Creamos un timeline pausado con GSAP
    introTimeline = gsap.timeline({ paused: true });

    // Animación que recorre todos los frames
    introTimeline.to(animationElement, {
      duration: introTotalImages / 15, // Duración proporcional al número de frames
      ease: "none", // Sin aceleración para una animación uniforme
      onUpdate: function() {
        // Calcula el frame actual según el progreso de la animación
        const progress = this.progress();
        const frameIndex = Math.min(Math.floor(progress * (introTotalImages - 1)), introTotalImages - 1);
        const currentFrame = introStartFrameNum + frameIndex * framesPerStep;
        animationElement.src = getFramePath(currentFrame); // Actualiza la imagen
      }
    });

    // Reproduce animación al pasar el cursor sobre la imagen
    animationElement.addEventListener('mouseenter', () => {
      console.log('hover detectado');
      introTimeline.restart();
    });

    // Reproduce animación al hacer clic en el botón de inicio (si existe)
    if (startButton) {
      startButton.addEventListener('click', () => {
        console.log('startButton clickeado');
        introTimeline.restart();
      });
    }

    // ⚠️ Nota: Para probar la animación automáticamente sin hover, se puede descomentar:
    // introTimeline.play();
  }

  // ===== PROCESO DE PRECARGA DE IMÁGENES =====
  framesToLoad.forEach(frameNumber => {
    const img = new Image(); // Creamos un objeto de imagen
    img.src = getFramePath(frameNumber); // Asignamos la ruta del frame

    // Evento al cargar correctamente la imagen
    img.onload = () => {
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        console.log('Todos los frames han sido cargados');
        initAnimation(); // Inicia la animación una vez que todas las imágenes estén listas
      }
    };

    // Manejo de error si la imagen no se carga
    img.onerror = () => {
      console.error(`Error al cargar: ${getFramePath(frameNumber)}`);
      loadedImagesCount++;
      if (loadedImagesCount === totalUniqueImagesToLoad) {
        initAnimation(); // Inicia la animación aunque falten imágenes
      }
    };

    preloadedImages.push(img); // Guardamos la imagen en el array para que no sea recolectada por GC
  });
});
