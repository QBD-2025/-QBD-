let idEliminar = null;

// ==================== FILTRAR TEMÁTICAS POR MATERIA ====================
function filtrarTematicas() {
  const materiaSelect = document.getElementById('editar-id-materia');
  const tematicaSelect = document.getElementById('editar-id-tematica');
  const materiaSeleccionada = materiaSelect.value;
  
  // Recorrer todas las opciones
  Array.from(tematicaSelect.options).forEach(option => {
    if (option.value === '') {
      option.disabled = false;
      option.hidden = false;
      return;
    }
    
    const carreraOpcion = option.dataset.carrera; // ← Cambié de materia a carrera
    
    if (!materiaSeleccionada || carreraOpcion === materiaSeleccionada) {
      option.disabled = false;
      option.hidden = false;
    } else {
      option.disabled = true;
      option.hidden = true;
    }
  });
  
  // Reset del selector si la opción actual está oculta
  if (tematicaSelect.selectedOptions[0] && tematicaSelect.selectedOptions[0].hidden) {
    tematicaSelect.value = '';
  }
}

// ==================== MODAL ELIMINAR ====================
function abrirModalEliminar(id){
  idEliminar = id;
  document.getElementById('overlay-eliminar').style.display = 'block';
  document.getElementById('modal-eliminar').style.display = 'block';
}

function cerrarModalEliminar(){
  idEliminar = null;
  document.getElementById('overlay-eliminar').style.display = 'none';
  document.getElementById('modal-eliminar').style.display = 'none';
}

document.getElementById('btnEliminarSi').addEventListener('click', async function(){
  if(!idEliminar) return;

  try {
    const res = await fetch(`/editor/eliminar-pregunta/${idEliminar}`, { 
      method: 'DELETE' 
    });
    
    if(res.ok) {
      alert('Pregunta eliminada correctamente');
      location.reload();
    } else {
      const error = await res.json();
      alert('Error al eliminar: ' + error.error);
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error al eliminar la pregunta');
  }

  cerrarModalEliminar();
});

// ==================== EDITAR PREGUNTA ====================
function editarPreguntaDesdeAtributos(btn){
  document.getElementById('editar-id').value = btn.dataset.idPregunta || '';
  document.getElementById('editar-id-materia').value = btn.dataset.idMateria || '';
  document.getElementById('editar-id-tematica').value = btn.dataset.idTematica || ''; // ← Nuevo
  document.getElementById('editar-pregunta').value = btn.dataset.pregunta || '';
  document.getElementById('editar-retroalimentacion').value = btn.dataset.retroalimentacion || '';

  // Filtrar temáticas según materia seleccionada
  filtrarTematicas();

  const container = document.getElementById('respuestas-container');
  container.innerHTML = '';

  // Generar los 4 inputs de respuesta
  for(let i=0; i<4; i++){
    const div = document.createElement('div');
    div.className = 'respuesta-item mb-3';
    div.innerHTML = `
      <input type="hidden" name="respuestas_id[]" value="${btn.dataset[`res${i}Id`] || ''}">
      <label>Opción ${i+1}:</label>
      <input type="text" name="respuestas_texto[]" value="${btn.dataset[`res${i}Texto`] || ''}" required>
      <label>Puntos:</label>
      <input type="number" name="puntos[]" value="${btn.dataset[`res${i}Puntos`] || 0}" min="0" required>
      <label><input type="radio" name="correcta" value="${i}" ${btn.dataset[`res${i}Correcta`] === '1' ? 'checked' : ''}> Correcta</label>
      <br>
    `;
    container.appendChild(div);
  }

  document.getElementById('formulario-edicion').style.display='block';
  document.getElementById('overlay').style.display='block';
}

// ==================== AGREGAR PREGUNTA ====================
function agregarPregunta(){
  document.getElementById('editar-id').value='';
  document.getElementById('editar-id-materia').value='';
  document.getElementById('editar-id-tematica').value=''; // ← Nuevo
  document.getElementById('editar-pregunta').value='';
  document.getElementById('editar-retroalimentacion').value='';

  // Reset del filtro de temáticas
  filtrarTematicas();

  const container = document.getElementById('respuestas-container');
  container.innerHTML='';

  // Generar 4 opciones vacías
  for(let i=0; i<4; i++){
    const div = document.createElement('div');
    div.className = 'respuesta-item mb-3';
    div.innerHTML = `
      <input type="hidden" name="respuestas_id[]" value="">
      <label>Opción ${i+1}:</label>
      <input type="text" name="respuestas_texto[]" required>
      <label>Puntos:</label>
      <input type="number" name="puntos[]" min="0" value="0" required>
      <label><input type="radio" name="correcta" value="${i}" ${i===0?'checked':''}> Correcta</label>
      <br>
    `;
    container.appendChild(div);
  }

  document.getElementById('formulario-edicion').style.display='block';
  document.getElementById('overlay').style.display='block';
}

// ==================== CERRAR FORMULARIO ====================
function cerrarForm(){
  document.getElementById('formulario-edicion').style.display='none';
  document.getElementById('overlay').style.display='none';
}

// ==================== GUARDAR CAMBIOS ====================
const form = document.getElementById('formulario-edicion');
form.addEventListener('submit', async e => {
  e.preventDefault();
  
  const formData = new FormData(form);
  
  // ✅ FORMATO CORRECTO QUE ESPERA EL BACKEND
  const data = {
    id_materia: parseInt(formData.get('id_materia')),
    id_tematica: formData.get('id_tematica') ? parseInt(formData.get('id_tematica')) : null, // ← Nuevo
    pregunta: formData.get('pregunta'),
    retroalimentacion: formData.get('retroalimentacion') || '',
    respuestas: []
  };
  
  // Obtener todos los textos, puntos y el índice de la correcta
  const textosRespuestas = formData.getAll('respuestas_texto[]');
  const puntosRespuestas = formData.getAll('puntos[]');
  const indiceCorrecta = parseInt(formData.get('correcta'));
  
  console.log('Datos recopilados:');
  console.log('- ID Materia:', data.id_materia);
  console.log('- ID Temática:', data.id_tematica);
  console.log('- Pregunta:', data.pregunta);
  console.log('- Retroalimentación:', data.retroalimentacion);
  console.log('- Textos:', textosRespuestas);
  console.log('- Puntos:', puntosRespuestas);
  console.log('- Índice correcta:', indiceCorrecta);
  
  // ✅ Construir el array de respuestas en el formato correcto
  textosRespuestas.forEach((texto, index) => {
    data.respuestas.push({
      respuesta: texto,
      puntos: parseInt(puntosRespuestas[index]) || 0,
      correcta: index === indiceCorrecta ? 1 : 0
    });
  });
  
  console.log('Datos a enviar:', JSON.stringify(data, null, 2));
  
  // Validar que haya al menos una respuesta
  if (data.respuestas.length === 0) {
    alert('Debe agregar al menos una respuesta');
    return;
  }
  
  // Determinar si es edición o creación
  const idPregunta = formData.get('id_pregunta');
  const url = idPregunta ? `/editor/editar-pregunta` : '/editor/agregar-pregunta';
  
  if (idPregunta) {
    data.id_pregunta = parseInt(idPregunta);
  }

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(data)
    });
    
    const result = await res.json();
    console.log('Respuesta del servidor:', result);
    
    if (res.ok) {
      alert(result.mensaje || 'Operación exitosa');
      location.reload();
    } else {
      alert('Error: ' + result.error);
      console.error('Detalles del error:', result);
    }
  } catch (err) {
    console.error('Error en la petición:', err);
    alert('Error al guardar cambios');
  }
});