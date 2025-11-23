      document.addEventListener("DOMContentLoaded", () => {
        // Selecciona todas las tarjetas
        const cards = document.querySelectorAll(".card");
        
        // Contenedor del carrusel
        const carousel = document.querySelector(".carousel");
        
        // Número total de tarjetas
        const total = cards.length;
        
        // Ángulo entre cada tarjeta en grados
        const angleStep = 360 / total;
        
        // Distancia radial del carrusel 3D
        const radius = 350;
        
        // Índice de la tarjeta actual
        let currentIndex = 0;

        // Distribuye las cartas en círculo 3D
        cards.forEach((card, i) => {
          const angle = i * angleStep;
          card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;
        });

        // Función para rotar el carrusel y resaltar la tarjeta activa
        function rotateCarousel() {
          const angle = currentIndex * -angleStep;
          carousel.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`;

          // Quita el resaltado de todas las tarjetas
          cards.forEach(card => card.classList.remove('highlight'));
          
          // Resalta la tarjeta actual
          cards[currentIndex].classList.add('highlight');
        }

        // Botón "Siguiente" del carrusel
        document.getElementById("next").addEventListener("click", () => {
          currentIndex = (currentIndex + 1) % total;
          rotateCarousel();
        });

        // Botón "Anterior" del carrusel
        document.getElementById("prev").addEventListener("click", () => {
          currentIndex = (currentIndex - 1 + total) % total;
          rotateCarousel();
        });

        // Inicializa la rotación del carrusel
        rotateCarousel();
      });