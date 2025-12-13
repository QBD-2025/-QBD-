let idEliminar = null;

// ==================== MODAL ELIMINAR ====================
document.querySelectorAll('.btn-eliminar').forEach(btn => {
  btn.addEventListener('click', function(e) {
    e.preventDefault();
    idEliminar = this.dataset.id;
    abrirModalEliminar();
  });
});

function abrirModalEliminar() {
  document.getElementById('overlay-eliminar').style.display = 'block';
  document.getElementById('modal-eliminar').style.display = 'block';
}

function cerrarModalEliminar() {
  idEliminar = null;
  document.getElementById('overlay-eliminar').style.display = 'none';
  document.getElementById('modal-eliminar').style.display = 'none';
}

document.getElementById('btnEliminarSi').addEventListener('click', async function() {
  if (!idEliminar) return;
  
  try {
    const res = await fetch(`/editor/eliminar-dato/${idEliminar}`, { 
      method: 'DELETE' 
    });
    
    if (res.ok) {
      alert('Dato eliminado correctamente');
      location.reload();
    } else {
      const error = await res.json();
      alert('Error al eliminar: ' + error.error);
    }
  } catch (err) {
    console.error('Error:', err);
    alert('Error al eliminar');
  }
  
  cerrarModalEliminar();
});

// ==================== FORMULARIO ====================
function cerrarForm() {
  document.getElementById('formEditarDato').style.display = 'none';
  document.getElementById('overlay').style.display = 'none';
  document.getElementById('formEditarDato').reset();
  document.getElementById('imagen-actual-container').style.display = 'none';
  document.getElementById('eliminar-imagen-check').checked = false;
}

function agregarDato() {
  document.getElementById('form-titulo').textContent = "Agregar Dato";
  document.getElementById('editar-id').value = "";
  document.getElementById('editar-dato').value = "";
  document.getElementById('editar-fuente').value = "";
  document.getElementById('editar-id-materia').value = "";
  document.getElementById('editar-imagen').value = "";
  document.getElementById('imagen-actual-container').style.display = 'none';
  document.getElementById('eliminar-imagen-check').checked = false;
  document.getElementById('formEditarDato').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}

function editarDatoDesdeAtributos(btn) {
  document.getElementById('form-titulo').textContent = "Editar Dato";
  document.getElementById('editar-id').value = btn.dataset.id;
  document.getElementById('editar-dato').value = btn.dataset.dato;
  document.getElementById('editar-fuente').value = btn.dataset.fuente || "";
  document.getElementById('editar-id-materia').value = btn.dataset.idMateria || "";
  document.getElementById('editar-imagen').value = ""; // Limpiar input de archivo
  
  // Mostrar imagen actual si existe
  const tieneImagen = btn.dataset.tieneImagen === 'true';
  if (tieneImagen) {
    document.getElementById('imagen-actual-container').style.display = 'block';
    document.getElementById('imagen-actual-preview').src = `/datos/imagen/${btn.dataset.id}`;
    document.getElementById('eliminar-imagen-check').checked = false;
  } else {
    document.getElementById('imagen-actual-container').style.display = 'none';
  }
  
  document.getElementById('formEditarDato').style.display = 'block';
  document.getElementById('overlay').style.display = 'block';
}

// ==================== SUBMIT DEL FORMULARIO ====================
document.getElementById('formEditarDato').addEventListener('submit', async (e) => {
  e.preventDefault();
  
  const formData = new FormData(e.target);
  const idDato = formData.get('id');
  
  // ✅ Si no hay archivo seleccionado, remover el campo 'imagen' del FormData
  const archivoImagen = document.getElementById('editar-imagen').files[0];
  if (!archivoImagen) {
    formData.delete('imagen');
  }
  
  // ✅ Agregar flag de eliminar imagen si está marcado
  const eliminarImagen = document.getElementById('eliminar-imagen-check').checked;
  if (eliminarImagen) {
    formData.append('eliminar_imagen', 'true');
  }
  
  console.log('========== DEBUG FORMULARIO ==========');
  console.log('ID Dato:', idDato);
  console.log('Archivo de imagen:', archivoImagen ? archivoImagen.name : 'No seleccionado');
  console.log('Eliminar imagen:', eliminarImagen);
  console.log('FormData entries:');
  for (let pair of formData.entries()) {
    if (pair[1] instanceof File) {
      console.log(`${pair[0]}: [Archivo: ${pair[1].name}]`);
    } else {
      console.log(`${pair[0]}: ${pair[1]}`);
    }
  }
  console.log('======================================');
  
  try {
    let url;
    
    if (idDato) {
      // Es EDICIÓN
      url = '/editor/modificar-dato';
      formData.append('id_dato', idDato);
    } else {
      // Es CREACIÓN
      url = '/editor/agregar-dato';
    }
    
    const res = await fetch(url, {
      method: 'POST',
      body: formData  // ✅ Enviar FormData directamente (NO JSON cuando hay archivos)
    });
    
    const result = await res.json();
    console.log('Respuesta del servidor:', result);
    
    if (res.ok) {
      alert(result.mensaje || 'Operación exitosa');
      location.reload();
    } else {
      alert('Error: ' + result.error);
      console.error('Detalles:', result);
    }
  } catch (err) {
    console.error('Error en la petición:', err);
    alert('Error al guardar cambios');
  }
});