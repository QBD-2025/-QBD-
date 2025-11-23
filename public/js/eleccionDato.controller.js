// Rotación actual del carrusel
let currentRotation = 0;

// ✅ OBTENER MATERIAS DEL OBJETO GLOBAL
const materias = window.MATERIAS_DATA;
console.log("Materias recibidas:", materias);
console.log("Total de materias:", materias?.length);

// Validar que materias exista
if (!materias || materias.length === 0) {
  console.error('❌ ERROR: No hay materias disponibles');
  document.getElementById('carousel').innerHTML = '<p style="color: white; text-align: center;">No hay materias disponibles</p>';
  throw new Error('No se pudieron cargar las materias');
}

const carousel = document.getElementById('carousel');
const cardCount = materias.length;
const theta = 360 / cardCount;
const radius = 820;
let currIndex = 0;

console.log(`Configuración del carrusel:
  - Materias: ${cardCount}
  - Theta: ${theta}°
  - Radio: ${radius}px
`);

// ✅ DEFINIR rotateCarousel() ANTES DE USARLA
function rotateCarousel() {
  const angle = currIndex * -theta; // ✅ USAR EL ÁNGULO CALCULADO
  carousel.style.transition = 'transform 1.5s ease-in-out';
  carousel.style.transform = `translateZ(-${radius}px) rotateY(${angle}deg)`; // ✅ USAR angle, NO currentRotation
  
  console.log(`Rotando carrusel a índice ${currIndex}, ángulo: ${angle}°`);
}

// Crear tarjetas dinámicamente
materias.forEach((materia, i) => {
  console.log(`Creando tarjeta ${i + 1}:`, materia.descripcion);
  
  const card = document.createElement('div');
  card.className = 'card';

  // Crear el GIF de la materia
  const gif = document.createElement('img');
  gif.src = `/media/videos/${materia.descripcion}.gif`;
  gif.alt = `Animación de ${materia.descripcion}`;
  gif.className = 'gif-materia';
  
  // ✅ Agregar manejador de error para imágenes
  gif.onerror = function() {
    console.warn(`⚠️ No se pudo cargar: ${this.src}`);
    this.src = '/media/default-placeholder.png'; // Imagen de respaldo
  };

  // Texto descriptivo de la materia
  const texto = document.createElement('div');
  texto.textContent = materia.descripcion;
  texto.style.color = 'white';
  texto.style.marginTop = '10px';
  texto.style.textAlign = 'center';

  // Agregar GIF y texto a la tarjeta
  card.appendChild(gif);
  card.appendChild(texto);

  // Posicionar la tarjeta en el carrusel 3D
  const angle = theta * i;
  card.style.transform = `rotateY(${angle}deg) translateZ(${radius}px)`;

  // Al hacer click en la tarjeta, se selecciona y se redirige
  card.onclick = () => {
    console.log(`Click en tarjeta ${i}: ${materia.descripcion}`);
    currIndex = i;
    rotateCarousel(); // ✅ Ahora rotateCarousel() ya está definida
    
    // Redirigir después de la animación
    setTimeout(() => {
      window.location.href = `/dato-curioso/${materia.id_materia}`;
    }, 1500);
  };

  // Agregar la tarjeta al carrusel
  carousel.appendChild(card);
});

// Posicionar inicialmente el carrusel
rotateCarousel();
console.log('✅ Carrusel inicializado correctamente');

// Evento para hacer clic en la zona izquierda
document.getElementById('leftZone').addEventListener('click', () => {
  if (currIndex > 0) {
    currIndex--;
    currentRotation += theta;
    rotateCarousel();
    console.log(`← Navegando a la izquierda (índice: ${currIndex})`);
  }
});

// Evento para hacer clic en la zona derecha
document.getElementById('rightZone').addEventListener('click', () => {
  if (currIndex < cardCount - 1) {
    currIndex++;
    currentRotation -= theta;
    rotateCarousel();
    console.log(`→ Navegando a la derecha (índice: ${currIndex})`);
  }
});