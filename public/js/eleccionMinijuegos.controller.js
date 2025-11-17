    // Array de minijuegos enviado desde el servidor como JSON válido
    const materias = window.MATERIAS_DATA;

    // Referencia al contenedor del carrusel
    const carousel = document.getElementById('carousel');

    // Número total de tarjetas
    const cardCount = materias.length;

    // Ángulo que separa cada tarjeta (360° dividido entre el número de tarjetas)
    const theta = 360 / cardCount;

    // Distancia desde el centro para crear efecto 3D
    const radius = 650;

    // Índice de la tarjeta actualmente seleccionada
    let currIndex = 0;

    // Crear tarjetas dinámicamente
    materias.forEach((materia, i) => {
      const card = document.createElement('div');
      card.className = 'card'; // clase para estilos de la tarjeta
      card.textContent = materia.descripcion; // nombre del minijuego

      // Posicionar la tarjeta en el carrusel 3D usando rotación y traslación Z
      const angle = theta * i;
      card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

      // Al hacer click en la tarjeta, se selecciona y redirige al minijuego
      card.onclick = () => {
        currIndex = i; // actualizar índice actual
        rotateCarousel(); // girar carrusel hacia esta tarjeta
        window.location.href = `/examen/${materia.id_materia}`; // redirigir
      };

      // Agregar la tarjeta al carrusel
      carousel.appendChild(card);
    });

    // Función que rota el carrusel hacia la tarjeta seleccionada
    function rotateCarousel() {
      const angle = currIndex * -theta; // calcular ángulo según índice
      carousel.style.transition = 'transform 1.5s ease-in-out'; // animación suave
      carousel.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`; // aplicar rotación
    }

    // Evento botón anterior: reduce índice y rota carrusel
    document.getElementById('prevBtn').addEventListener('click', () => {
      currIndex = (currIndex - 1 + cardCount) % cardCount; // ciclo circular
      rotateCarousel();
    });

    // Evento botón siguiente: aumenta índice y rota carrusel
    document.getElementById('nextBtn').addEventListener('click', () => {
      currIndex = (currIndex + 1) % cardCount; // ciclo circular
      rotateCarousel();
    });

    // Evento botón aleatorio: elige una tarjeta al azar
    document.getElementById('randomBtn').addEventListener('click', () => {
      const randomIndex = Math.floor(Math.random() * materias.length); // índice aleatorio
      currIndex = randomIndex; // actualizar índice
      rotateCarousel(); // girar hacia la tarjeta aleatoria

      // Esperar que termine la animación antes de redirigir
      setTimeout(() => {
        window.location.href = `/examen/${materias[randomIndex].id_materia}`;
      }, 1500); // tiempo igual al de la transición
    });

    // Posición inicial del carrusel al cargar la página
    rotateCarousel();