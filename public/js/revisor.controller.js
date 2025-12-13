// ==================== VARIABLES GLOBALES ====================
let accionActual = null;
let idActual = null;
let tipoActual = null;

// ==================== MODAL ====================
function mostrarModal(titulo, mensaje, callback) {
  document.getElementById('modal-titulo').textContent = titulo;
  document.getElementById('modal-mensaje').textContent = mensaje;
  document.getElementById('modal-confirmacion').style.display = 'block';
  document.getElementById('modal-overlay').style.display = 'block';
  
  // Guardar el callback para ejecutarlo al confirmar
  accionActual = callback;
}

function cerrarModal() {
  document.getElementById('modal-confirmacion').style.display = 'none';
  document.getElementById('modal-overlay').style.display = 'none';
  accionActual = null;
  idActual = null;
  tipoActual = null;
}

// ==================== EVENT LISTENERS ====================
document.addEventListener('DOMContentLoaded', () => {
  
  // Botón cancelar del modal
  document.getElementById('modal-cancelar').addEventListener('click', cerrarModal);
  
  // Overlay del modal
  document.getElementById('modal-overlay').addEventListener('click', cerrarModal);
  
  // Botón confirmar del modal
  document.getElementById('modal-confirmar').addEventListener('click', () => {
    if (accionActual) {
      accionActual();
    }
    cerrarModal();
  });
  
  // ==================== BOTONES APROBAR ====================
  document.querySelectorAll('.btn-aprobar').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const tipo = this.dataset.tipo; // 'pregunta' o 'dato'
      
      idActual = id;
      tipoActual = tipo;
      
      const nombreTipo = tipo === 'pregunta' ? 'pregunta' : 'dato';
      mostrarModal(
        '¿Aprobar y publicar?',
        `¿Estás seguro de que quieres aprobar este ${nombreTipo}? Se publicará y estará visible para todos.`,
        () => aprobarElemento(id, tipo)
      );
    });
  });
  
  // ==================== BOTONES RECHAZAR ====================
  document.querySelectorAll('.btn-rechazar').forEach(btn => {
    btn.addEventListener('click', function() {
      const id = this.dataset.id;
      const tipo = this.dataset.tipo; // 'pregunta' o 'dato'
      
      idActual = id;
      tipoActual = tipo;
      
      const nombreTipo = tipo === 'pregunta' ? 'pregunta' : 'dato';
      mostrarModal(
        '¿Rechazar y eliminar?',
        `¿Estás seguro de que quieres rechazar este ${nombreTipo}? Se eliminará PERMANENTEMENTE de la base de datos.`,
        () => rechazarElemento(id, tipo)
      );
    });
  });
});

// ==================== FUNCIONES DE APROBACIÓN Y RECHAZO ====================
async function aprobarElemento(id, tipo) {
  const url = tipo === 'pregunta' 
    ? `/revisor/aprobar-pregunta/${id}` 
    : `/revisor/aprobar-dato/${id}`;
  
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.mensaje}`);
      location.reload();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error aprobando:', error);
    alert('❌ Error al aprobar el elemento');
  }
}

async function rechazarElemento(id, tipo) {
  const url = tipo === 'pregunta' 
    ? `/revisor/rechazar-pregunta/${id}` 
    : `/revisor/rechazar-dato/${id}`;
  
  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    const data = await response.json();
    
    if (data.success) {
      alert(`✅ ${data.mensaje}`);
      location.reload();
    } else {
      alert(`❌ Error: ${data.error}`);
    }
  } catch (error) {
    console.error('Error rechazando:', error);
    alert('❌ Error al rechazar el elemento');
  }
}