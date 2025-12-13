let idEliminar = null; // Guardará el id de la pregunta a eliminar

// Abrir modal de eliminar
function abrirModalEliminar(id){
  idEliminar = id;
  document.getElementById('overlay-eliminar').style.display = 'block';
  document.getElementById('modal-eliminar').style.display = 'block';
}

// Cerrar modal de eliminar
function cerrarModalEliminar(){
  idEliminar = null;
  document.getElementById('overlay-eliminar').style.display = 'none';
  document.getElementById('modal-eliminar').style.display = 'none';
}

// Confirmar eliminación
document.getElementById('btnEliminarSi').addEventListener('click', function(){
  if(!idEliminar) return;

  fetch(`/editor/eliminar-preguntas/${idEliminar}`, { method: 'DELETE' })
    .then(res => {
      if(res.ok) location.reload(); // Recarga la página si se elimina correctamente
      else alert('Error al eliminar');
    });

  cerrarModalEliminar();
});

// Cargar los datos de una pregunta en el formulario desde atributos del botón
function editarPreguntaDesdeAtributos(btn){
  document.getElementById('editar-id').value = btn.dataset.idPregunta || '';
  document.getElementById('editar-id-materia').value = btn.dataset.idMateria || '';
  document.getElementById('editar-pregunta').value = btn.dataset.pregunta || '';
  document.getElementById('editar-retroalimentacion').value = btn.dataset.retroalimentacion || '';

  const container = document.getElementById('respuestas-container');
  container.innerHTML = '';

  // Generar los 4 inputs de respuesta
  for(let i=0;i<4;i++){
    const div = document.createElement('div');
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

// Función para agregar una nueva pregunta (formulario vacío)
function agregarPregunta(){
  document.getElementById('editar-id').value='';
  document.getElementById('editar-id-materia').value='';
  document.getElementById('editar-pregunta').value='';
  document.getElementById('editar-retroalimentacion').value='';

  const container = document.getElementById('respuestas-container');
  container.innerHTML='';

  // Generar 4 opciones vacías
  for(let i=0;i<4;i++){
    const div = document.createElement('div');
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

// Cerrar formulario de edición
function cerrarForm(){
  document.getElementById('formulario-edicion').style.display='none';
  document.getElementById('overlay').style.display='none';
}

// Evento de envío del formulario (POST para agregar o editar pregunta)
const form=document.getElementById('formulario-edicion');
form.addEventListener('submit', async e=>{
  e.preventDefault();
  const data = new FormData(form);
  const payload={};

  // Convertir FormData a JSON
  for(const [key,value] of data.entries()){
    if(key.endsWith('[]')){
      const k = key.slice(0,-2);
      if(!payload[k]) payload[k]=[];
      payload[k].push(value);
    } else {
      payload[key]=value;
    }
  }

  // Convertir la opción correcta a número
  payload.correcta=parseInt(data.get('correcta'));
  const id=payload.id_pregunta;
  const url=id? `/editor/editar-pregunta/${id}`:'/editor/agregar-pregunta';

  try{
    const res=await fetch(url,{
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify(payload)
    });
    if(res.ok) location.reload();
    else alert('Error al guardar cambios');
  }catch(err){
    console.error(err);
    alert('Error al guardar cambios');
  }
});