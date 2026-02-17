// materiasCarrera.controller.js - ACTUALIZADO o numero 2
const materias = window.DATA_MATERIAS; 

const carousel = document.getElementById('carousel');
const cardCount = materias.length;
const theta = 360 / cardCount;
const radius = 820;
let currIndex = 0;
let currentRotation = 0;

console.log('🎓 Carreras cargadas:', materias.length);

// Crear tarjetas dinámicamente
materias.forEach((materia, i) => {
  const card = document.createElement('div'); 
  card.className = 'card';

  // Contenedor del contenido
  const cardContent = document.createElement('div');
  cardContent.className = 'card-content';

  // GIF de la carrera
  const gif = document.createElement('img');
  gif.src = `/media/videos/${materia.descripcion}.gif`;
  gif.alt = materia.descripcion;
  gif.className = 'gif-materia';
  gif.onerror = function() {
    // Si no existe el GIF, usar un ícono por defecto
    this.style.display = 'none';
    const iconDiv = document.createElement('div');
    iconDiv.innerHTML = '<i class="fas fa-graduation-cap" style="font-size: 4rem; color: var(--accent-yellow);"></i>';
    iconDiv.style.marginBottom = '1rem';
    cardContent.insertBefore(iconDiv, cardContent.firstChild);
  };

  // Título de la carrera
  const titulo = document.createElement('div');
  titulo.className = 'card-title';
  titulo.textContent = materia.descripcion;

  // Descripción
  const descripcion = document.createElement('div');
  descripcion.className = 'card-description';
  descripcion.textContent = 'Click para comenzar';

  // Agregar elementos al contenido
  cardContent.appendChild(gif);
  cardContent.appendChild(titulo);
  cardContent.appendChild(descripcion);
  card.appendChild(cardContent);

  // Posicionar tarjeta en círculo
  const angle = theta * i;
  card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

  // Click en tarjeta: redirige al examen de esa carrera
  card.onclick = () => {
    console.log(`🎯 Seleccionada carrera: ${materia.descripcion} (ID: ${materia.id_carrera})`);
    currIndex = i;
    rotateCarousel();
    
    // Pequeño delay para la animación
    setTimeout(() => {
      window.location.href = `/examen-carrera/${materia.id_carrera}`;
    }, 300);
  };

  carousel.appendChild(card);
});

// Función para rotar el carrusel
function rotateCarousel() {
  const angle = currIndex * -theta;
  carousel.style.transition = 'transform 1.5s ease-in-out';
  carousel.style.transform = `translateZ(-${radius}px) rotateY(${currentRotation}deg)`;
}

// Click en zona izquierda: girar carrusel hacia la izquierda
document.getElementById('leftZone').addEventListener('click', () => {
  currIndex = Math.max(currIndex - 1, 0);
  currentRotation += theta;
  rotateCarousel();
  console.log('⬅️ Rotación izquierda, índice:', currIndex);
});

// Click en zona derecha: girar carrusel hacia la derecha
document.getElementById('rightZone').addEventListener('click', () => {
  currIndex = Math.min(currIndex + 1, cardCount - 1);
  currentRotation -= theta;
  rotateCarousel();
  console.log('➡️ Rotación derecha, índice:', currIndex);
});

// Navegación con teclado
document.addEventListener('keydown', (e) => {
  if (e.key === 'ArrowLeft') {
    document.getElementById('leftZone').click();
  } else if (e.key === 'ArrowRight') {
    document.getElementById('rightZone').click();
  } else if (e.key === 'Enter' && materias[currIndex]) {
    window.location.href = `/examen-carrera/${materias[currIndex].id_carrera}`;
  }
});

// Inicializar posición
rotateCarousel();

console.log('✅ Controlador de carreras cargado');