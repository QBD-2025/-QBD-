window.addEventListener('DOMContentLoaded', () => {
  const sonido = document.getElementById('sonidoCurioso');
  let audioDesbloqueado = false;

  // Intentar reproducir automáticamente
  sonido.play()
    .then(() => { audioDesbloqueado = true; })
    .catch(() => {
      // Autoplay bloqueado — esperar primer click para desbloquear
      console.warn('Autoplay bloqueado, esperando interacción del usuario.');
    });

  document.body.addEventListener('click', () => {
    if (!audioDesbloqueado) {
      // Primer click: solo desbloquear el audio, NO redirigir aún
      sonido.play()
        .then(() => { audioDesbloqueado = true; })
        .catch(err => console.warn('No se pudo reproducir:', err));
      return;
    }

    // Audio ya sonando: redirigir
    window.location.href = '/menu_principal';
  });

  // Cuando el audio termine de forma natural, redirigir
  sonido.addEventListener('ended', () => {
    window.location.href = '/menu_principal';
  });
});