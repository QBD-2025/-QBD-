/* ================================================================
Archivo: animacion2.js
Descripción: Controla la animación tipo Duolingo para la introducción,
incluyendo precarga de frames y reproducción al pasar el cursor o al hacer clic en el botón.
Autor: Equipo de desarrollo
Última modificación: [Fecha]
   ================================================================ */

// ===== CONFIGURACIÓN Y CAPTURA DE ELEMENTOS DEL DOM =====
document.addEventListener('DOMContentLoaded', function() {
  // Elementos clave de la página
  const animationElement = document.getElementById('duolingoAnimation'); // Imagen donde se mostrará la animación
  const startButtonContainer = document.getElementById('startButtonContainer'); // Contenedor opcional del botón de inicio
  const startButton = document.getElementById('startButton'); // Botón opcional para iniciar la animación

  // Protege contra errores si no se encuentra el elemento principal
  if (!animationElement) {
    console.error('No se encontró #duolingoAnimation en el DOM');
    return; // Detiene la ejecución si no existe el elemento de animación
  }

  // ===== CONFIGURACIÓN DE FRAMES =====
  const framesPerStep = 3; // Cada cuántos frames reales se actualiza la imagen para optimizar rendimiento
  const introStartFrameNum = 1; // Primer frame de la animación
  const introEndFrameNum = 141; // Último frame de la animación
  const introTotalImages = Math.floor((introEndFrameNum - introStartFrameNum) / framesPerStep) + 1; 
  // Total de imágenes únicas que se mostrarán en la animación

  const framePath = '/media/stuart_octavio_libro/stuart_octavio_libro_'; // Ruta base de las imágenes
  const frameExtension = '.webp'; // Extensión de las imágenes

  // ===== FUNCIONES AUXILIARES =====

  // Función que devuelve la ruta completa de una imagen según su número de frame
  function getFramePath(frameNumber) {
    const paddedNumber = String(frameNumber).padStart(6, '0'); // Asegura 6 dígitos para nombres como 000001.webp
    return `${framePath}${paddedNumber}${frameExtension}`;
  }

  // ===== PRECARGA DE IMÁGENES =====
  const preloadedImages = []; // Array donde se guardan las imágenes precargadas
  let loadedImagesCount = 0; // Contador de imágenes cargadas exitosamente
  const framesToLoad = new Set(); // Conjunto de frames únicos a cargar

  // Agrega cada frame que se mostrará a framesToLoad
  for (let i = introStartFrameNum; i <= introEndFrameNum; i += framesPerStep) {
    framesToLoad.add(i);
  }
  const totalUniqueImagesToLoad = framesToLoad.size; // Número total de imágenes a cargar

  let introTimeline; // Timeline de GSAP que controlará la animación

  // ===== INICIALIZACIÓN DE LA ANIMACIÓN =====
  function initAnimation() {
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
      introTimeline.restart();
    });

    // Reproduce animación al hacer clic en el botón de inicio (si existe)
    if (startButton) {
      startButton.addEventListener('click', () => {
        introTimeline.restart();
      });
    }
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
