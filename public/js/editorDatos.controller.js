let idEliminar = null;

// Asignar modal a todos los botones eliminar
document.querySelectorAll('.btn-eliminar').forEach(btn=>{
  btn.addEventListener('click', function(e){
    e.preventDefault();
    idEliminar = this.dataset.id; // Guardar ID del dato a eliminar
    abrirModalEliminar();
  });
});

// Funciones para mostrar/ocultar modal eliminar
function abrirModalEliminar(){
  document.getElementById('overlay-eliminar').style.display = 'block';
  document.getElementById('modal-eliminar').style.display = 'block';
}

function cerrarModalEliminar(){
  idEliminar = null;
  document.getElementById('overlay-eliminar').style.display = 'none';
  document.getElementById('modal-eliminar').style.display = 'none';
}

// Confirmar eliminación
document.getElementById('btnEliminarSi').addEventListener('click', function(){
  if(!idEliminar) return;
  fetch(`/editor/eliminar-dato/${idEliminar}`, { method: 'DELETE' })
    .then(res => {
      if(res.ok) location.reload(); // Recargar tabla
      else alert('Error al eliminar');
    });
  cerrarModalEliminar();
});

// Funciones para abrir/editar formulario de datos
function cerrarForm() {
  document.getElementById('formEditarDato').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('formEditarDato').reset();
}

function editarDato(id, texto, fuente, id_materia) {
  document.getElementById('form-titulo').textContent = "Editar Dato";
  document.getElementById('editar-id').value = id;
  document.getElementById('editar-dato').value = texto;
  document.getElementById('editar-fuente').value = fuente || "";
  document.getElementById('editar-id-materia').value = id_materia || "";
  document.getElementById('formEditarDato').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
  document.getElementById('formEditarDato').action = "/editor/editar-dato-binario";
}

function agregarDato() {
  document.getElementById('form-titulo').textContent = "Agregar Dato";
  document.getElementById('editar-id').value = "";
  document.getElementById('editar-dato').value = "";
  document.getElementById('editar-fuente').value = "";
  document.getElementById('editar-id-materia').value = "";
  document.getElementById('formEditarDato').action = "/editor/agregar-dato";
  document.getElementById('formEditarDato').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}

// Editar dato a partir de los atributos del botón
function editarDatoDesdeAtributos(btn) {
  const id = btn.dataset.id;
  const texto = btn.dataset.dato;
  const fuente = btn.dataset.fuente;
  const id_materia = btn.dataset.idMateria;
  editarDato(id, texto, fuente, id_materia);
}