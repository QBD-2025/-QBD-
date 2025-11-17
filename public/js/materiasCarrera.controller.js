  // Array de materias pasado desde el servidor como JSON
  const materias = window.DATA_MATERIAS; 

  const carousel = document.getElementById('carousel'); // Contenedor del carrusel
  const cardCount = materias.length; // Número total de tarjetas
  const theta = 360 / cardCount; // Ángulo entre cada tarjeta
  const radius = 820; // Distancia de las tarjetas al centro del carrusel
  let currIndex = 0; // Índice de la tarjeta activa
  let currentRotation = 0; // Rotación acumulada del carrusel

  // Crear tarjetas dinámicamente
  materias.forEach((materia, i) => {
    const card = document.createElement('div'); 
    card.className = 'card';

    // GIF de la materia
    const gif = document.createElement('img');
    gif.src = `/media/videos/${materia.descripcion}.gif`;
    gif.alt = materia.descripcion;
    gif.className = 'gif-materia';

    // Texto de la materia
    const texto = document.createElement('div');
    texto.textContent = materia.descripcion;

    // Agregar GIF y texto a la tarjeta
    card.appendChild(gif);
    card.appendChild(texto);

    // Posicionar tarjeta en círculo
    const angle = theta * i;
    card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

    // Click en tarjeta: redirige al examen de esa materia
    card.onclick = () => {
      currIndex = i;
      rotateCarousel();
      window.location.href = `/examen/${materia.id_materia}`;
    };

    carousel.appendChild(card); // Añadir tarjeta al carrusel
  });

  // Función para rotar el carrusel
  function rotateCarousel() {
    const angle = currIndex * -theta;
    carousel.style.transition = 'transform 1.5s ease-in-out'; // Animación suave
    carousel.style.transform = `translateZ(-${radius}px) rotateY(${currentRotation}deg)`;
  }

  // Click en zona izquierda: girar carrusel hacia la izquierda
  document.getElementById('leftZone').addEventListener('click', () => {
    currIndex = Math.max(currIndex - 1, 0); // No pasar del índice 0
    currentRotation += theta; // Incrementar rotación
    rotateCarousel();
  });

  // Click en zona derecha: girar carrusel hacia la derecha
  document.getElementById('rightZone').addEventListener('click', () => {
    currIndex = Math.min(currIndex + 1, cardCount - 1); // No pasar del último índice
    currentRotation -= theta; // Decrementar rotación
    rotateCarousel();
  });