document.addEventListener('DOMContentLoaded', () => {

  // ---------- ELIMINAR ----------
  let idAEliminar = null;
  const confirmModal = document.getElementById('confirmModal');
  const confirmYes = document.getElementById('confirmYes');
  const confirmNo = document.getElementById('confirmNo');

  document.querySelectorAll('.eliminar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      idAEliminar = btn.dataset.id;
      confirmModal.style.display = 'flex';
    });
  });

  confirmNo.addEventListener('click', () => {
    idAEliminar = null;
    confirmModal.style.display = 'none';
  });

  confirmYes.addEventListener('click', async () => {
    if(idAEliminar){
      const res = await fetch(`/editor/encuesta/eliminar-pregunta/${idAEliminar}`, { method: 'DELETE' });
      if(res.ok) location.reload();
      else alert('Error al eliminar pregunta');
    }
  });

  // ---------- EDITAR ----------
  const modal = document.getElementById('editorModal');
  const cerrarModal = document.getElementById('cerrarModal');
  const editarForm = document.getElementById('editarForm');
  const opcionesContainer = document.getElementById('editOpcionesContainer');

  document.querySelectorAll('.editar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.dataset.id;
      const texto = btn.dataset.texto;
      const opciones = btn.dataset.opciones ? btn.dataset.opciones.split(',') : [];

      document.getElementById('editId').value = id;
      document.getElementById('editTexto').value = texto;

      opcionesContainer.innerHTML = '';
      opciones.forEach((op,i) => {
        opcionesContainer.innerHTML += `<label>Opción ${i+1}:</label><input type="text" name="opciones[]" value="${op}" />`;
      });

      modal.style.display = 'flex';
    });
  });

  cerrarModal.addEventListener('click', () => modal.style.display = 'none');

  editarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(editarForm);
    const data = Object.fromEntries(formData.entries());
    data.opciones = formData.getAll('opciones[]');

    const res = await fetch('/editor/encuesta/editar-pregunta', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({
        id: data.id_pregunta,
        nuevoTexto: data.texto_pregunta,
        opciones: data.opciones
      })
    });

    if(res.ok) location.reload();
    else alert('Error al guardar los cambios');
  });

  // ---------- AGREGAR ----------
  const agregarModal = document.getElementById('agregarModal');
  const btnAgregarPregunta = document.getElementById('btnAgregarPregunta');
  const cerrarAgregar = document.getElementById('cerrarAgregarModal');
  const agregarForm = document.getElementById('agregarForm');
  const addOpcionesContainer = document.getElementById('agregarOpcionesContainer');
  const btnAddOpcion = document.getElementById('btnAddOpcion');

  let opcionCount = 2;

  btnAgregarPregunta.addEventListener('click', () => {
    agregarForm.reset();
    addOpcionesContainer.innerHTML = `
      <label>Opción 1:</label><input type="text" name="opciones[]" required />
      <label>Opción 2:</label><input type="text" name="opciones[]" required />
    `;
    opcionCount = 2;
    agregarModal.style.display = 'flex';
  });

  cerrarAgregar.addEventListener('click', () => agregarModal.style.display = 'none');

  btnAddOpcion.addEventListener('click', () => {
    opcionCount++;
    addOpcionesContainer.innerHTML += `<label>Opción ${opcionCount}:</label><input type="text" name="opciones[]" required />`;
  });

  agregarForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(agregarForm);
    const data = Object.fromEntries(formData.entries());
    data.opciones = formData.getAll('opciones[]');

    const res = await fetch('/editor/encuesta/agregar-pregunta', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify(data)
    });

    if(res.ok) location.reload();
    else alert('Error al guardar la nueva pregunta');
  });

});