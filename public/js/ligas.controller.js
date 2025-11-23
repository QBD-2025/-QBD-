// Datos de universidades
const universidades = [
  {
    nombre: "Universidad Autónoma de Aguascalientes",
    logo: "/media/images/uaa.png",
    descripcion: "Institución pública con programas de excelencia académica.",
    nivel: "Licenciatura y Posgrado",
    carreras: "Medicina, Derecho, Ingeniería Civil, Psicología",
    recomendacion: "Ideal para quienes buscan una formación integral en una universidad pública.",
    link: "https://www.uaa.mx",
    tipo: "Pública"
  },
  {
    nombre: "Instituto Tecnológico de Aguascalientes",
    logo: "/media/images/ita.jpeg",
    descripcion: "Enfoque en ingeniería, tecnología y ciencias aplicadas.",
    nivel: "Licenciatura y Maestría",
    carreras: "Ingeniería Mecánica, Sistemas Computacionales, Industrial, Electrónica",
    recomendacion: "Perfecta para estudiantes con vocación tecnológica.",
    link: "https://www.ita.mx",
    tipo: "Pública"
  },
  {
    nombre: "Universidad Panamericana Campus Bonaterra",
    logo: "/media/images/panamericana.png",
    descripcion: "Educación privada con calidad internacional.",
    nivel: "Licenciatura y Posgrado",
    carreras: "Administración, Derecho, Ingeniería, Comunicación",
    recomendacion: "Enfocada en formación integral y valores.",
    link: "https://www.up.edu.mx/es/campus-aguascalientes",
    tipo: "Privada"
  },
  {
    nombre: "Universidad del Valle de México",
    logo: "/media/images/uvm.jpeg",
    descripcion: "Educación privada con enfoque tecnológico y empresarial.",
    nivel: "Licenciatura y Maestría",
    carreras: "Negocios, Ingeniería, Salud",
    recomendacion: "Flexible y con amplia oferta educativa.",
    link: "https://www.universidaduvm.mx/campus-aguascalientes",
    tipo: "Privada"
  },
  {
    nombre: "Universidad Tecnológica de Aguascalientes",
    logo: "/media/images/uta.jpeg",
    descripcion: "Formación técnica y tecnológica para el sector productivo.",
    nivel: "TSU y Licenciatura",
    carreras: "Mecatrónica, Procesos Industriales, TIC",
    recomendacion: "Especializada en formación técnica de alta empleabilidad.",
    link: "https://www.utags.edu.mx/",
    tipo: "Pública"
  },
  {
    nombre: "Universidad TecMilenio",
    logo: "/media/images/tecmilenio.jpeg",
    descripcion: "Enfoque en innovación y aprendizaje personalizado.",
    nivel: "Licenciatura y Maestría",
    carreras: "Negocios, Ingeniería, Psicología",
    recomendacion: "Ideal para quienes buscan flexibilidad y formación empresarial.",
    link: "https://www.tecmilenio.mx",
    tipo: "Privada"
  }
];

// Inicializar la página
document.addEventListener('DOMContentLoaded', function() {
  // Generar tarjetas de universidades
  const listaUniversidades = document.getElementById('listaUniversidades');
  universidades.forEach(u => {
    listaUniversidades.appendChild(crearCardUniversidad(u));
  });

  // Configurar navegación entre secciones
  const navButtons = document.querySelectorAll('.nav-btn');
  navButtons.forEach(button => {
    button.addEventListener('click', function() {
      // Quitar clase active de todos los botones
      navButtons.forEach(btn => btn.classList.remove('active'));
      // Agregar clase active al botón clickeado
      this.classList.add('active');
      
      // Ocultar todas las secciones
      document.querySelectorAll('.seccion').forEach(sec => {
        sec.classList.remove('activa');
      });
      
      // Mostrar la sección correspondiente
      const targetSection = document.getElementById(this.dataset.target);
      targetSection.classList.add('activa');
    });
  });

  // Configurar búsqueda de universidades
  const buscarInput = document.getElementById('buscarUniversidad');
  buscarInput.addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('.uni-card');
    
    cards.forEach(card => {
      const nombre = card.querySelector('h3').textContent.toLowerCase();
      const descripcion = card.querySelector('p').textContent.toLowerCase();
      
      if (nombre.includes(searchTerm) || descripcion.includes(searchTerm)) {
        card.style.display = 'flex';
      } else {
        card.style.display = 'none';
      }
    });
  });
});

// Función para crear tarjeta de universidad
function crearCardUniversidad(u) {
  const card = document.createElement('a');
  card.href = u.link;
  card.target = '_blank';
  card.className = 'uni-card';
  card.innerHTML = `
    <img src="${u.logo}" alt="${u.nombre}">
    <div>
      <h3>${u.nombre} <span class="badge">${u.tipo}</span></h3>
      <p>${u.descripcion}</p>
    </div>
    <button class="info-btn" onclick="event.preventDefault(); mostrarModalUniversidad('${u.nombre.replace(/'/g, "\\'")}', '${u.nivel.replace(/'/g, "\\'")}', '${u.carreras.replace(/'/g, "\\'")}', '${u.recomendacion.replace(/'/g, "\\'")}')">?</button>
  `;
  return card;
}

// Función para mostrar modal de universidad
function mostrarModalUniversidad(nombre, nivel, carreras, recomendacion) {
    // Crear modal si no existe
    let modal = document.getElementById('modal-universidad');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'modal-universidad';
        modal.className = 'modal-universidad';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>🎓 Información de la Universidad</h3>
                    <button class="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="info-item">
                        <strong>🏫 Universidad:</strong>
                        <p>${nombre}</p>
                    </div>
                    <div class="info-item">
                        <strong>📚 Nivel Académico:</strong>
                        <p>${nivel}</p>
                    </div>
                    <div class="info-item">
                        <strong>🎯 Carreras Destacadas:</strong>
                        <p>${carreras}</p>
                    </div>
                    <div class="info-item recomendacion">
                        <strong>💡 Recomendación:</strong>
                        <p>${recomendacion}</p>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        // Event listeners para cerrar
        modal.querySelector('.close-modal').addEventListener('click', cerrarModal);
        modal.addEventListener('click', (e) => {
            if (e.target === modal) cerrarModal();
        });

        // Cerrar con ESC key
        document.addEventListener('keydown', function(e) {
            if (e.key === 'Escape') cerrarModal();
        });
    } else {
        // Actualizar contenido si el modal ya existe
        modal.querySelector('.info-item:nth-child(1) p').textContent = nombre;
        modal.querySelector('.info-item:nth-child(2) p').textContent = nivel;
        modal.querySelector('.info-item:nth-child(3) p').textContent = carreras;
        modal.querySelector('.info-item:nth-child(4) p').textContent = recomendacion;
    }

    // Mostrar modal
    setTimeout(() => {
        modal.classList.add('active');
    }, 10);
}

function cerrarModal() {
    const modal = document.getElementById('modal-universidad');
    if (modal) {
        modal.classList.remove('active');
        // Remover después de la animación
        setTimeout(() => {
            if (modal && !modal.classList.contains('active')) {
                modal.remove();
            }
        }, 300);
    }
}