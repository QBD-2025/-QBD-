    // Ejecutar cuando el contenido del DOM haya cargado
    window.addEventListener('DOMContentLoaded', () => {
      
      // Obtener referencia al elemento de audio
      const sonido = document.getElementById('sonidoCurioso');
      
      // Intentar reproducir el audio automáticamente
      sonido.play().catch(err => {
        console.warn("El sonido no se pudo reproducir automáticamente:", err);
      });

      // Redirigir al usuario al menú principal al hacer clic en cualquier parte de la página
      document.body.addEventListener('click', () => {
        window.location.href = "/menu_principal";
      });
    });