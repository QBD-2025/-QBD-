    // Crear partículas para el efecto de aurora
    document.addEventListener('DOMContentLoaded', function() {
      const particlesContainer = document.getElementById('particles');
      const particlesCount = 30;
      
      for (let i = 0; i < particlesCount; i++) {
        const particle = document.createElement('div');
        particle.classList.add('particle');
        
        // Tamaño aleatorio
        const size = Math.random() * 8 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        // Posición aleatoria
        const posX = Math.random() * 100;
        const posY = Math.random() * 100;
        particle.style.left = `${posX}%`;
        particle.style.top = `${posY}%`;
        
        // Color aleatorio (verde, azul o púrpura)
        const colors = ['#00ff9d', '#0099ff', '#bd00ff'];
        const color = colors[Math.floor(Math.random() * colors.length)];
        particle.style.background = color;
        
        // Retraso de animación aleatorio
        particle.style.animationDelay = `${Math.random() * 5}s`;
        particle.style.animationDuration = `${Math.random() * 10 + 5}s`;
        
        particlesContainer.appendChild(particle);
      }
    });