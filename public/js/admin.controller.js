  // Inicialización de modales de Bootstrap
  const modalEditar = new bootstrap.Modal(document.getElementById('modalEditarUsuario'));
  const modalAgregar = new bootstrap.Modal(document.getElementById('modalAgregarUsuario'));

  // Mostrar u ocultar input de fecha de suspensión según estatus
  function toggleSuspensionInput(select, userId) {
    const input = document.querySelector(`input[name="suspension_fin_${userId}"]`);
    if (input) {
      if (select.value == '3') { // Suspendido
        input.style.display = 'block';
      } else {
        input.style.display = 'none';
        input.value = '';
      }
    }
  }

  // Abrir modal para editar usuario
  function abrirModalEditar(id, nombre, email) {
    document.getElementById('edit-id_usuario').value = id;
    document.getElementById('edit-username').value = nombre;
    document.getElementById('edit-email').value = email;
    document.getElementById('edit-password').value = "";
    modalEditar.show();
  }

  // Abrir modal para agregar usuario
  function abrirModalAgregar() {
    document.getElementById('formAgregarUsuario').reset();
    modalAgregar.show();
  }

  // Submit para editar usuario
  document.getElementById('formEditarUsuario').addEventListener('submit', async function(e) {
    e.preventDefault();
    const payload = {
      id_usuario: document.getElementById('edit-id_usuario').value,
      username: document.getElementById('edit-username').value,
      email: document.getElementById('edit-email').value,
      password: document.getElementById('edit-password').value
    };

    try {
      const res = await fetch('/admin/editar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        alert("✅ Usuario editado correctamente");
        location.reload();
      } else {
        alert("❌ Error al editar usuario");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error en la conexión");
    }
  });

  // Submit para agregar usuario
  document.getElementById('formAgregarUsuario').addEventListener('submit', async function(e) {
    e.preventDefault();

    const username = document.getElementById('usernameAgregar').value.trim();
    const email = document.getElementById('emailAgregar').value.trim();
    const password = document.getElementById('passwordAgregar').value.trim();

    if (!username || !email || !password) {
      alert("Todos los campos son obligatorios.");
      return;
    }

    const payload = { username, email, password };

    try {
      const res = await fetch('/admin/agregar-usuario', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.id_usuario) {
        alert("✅ Usuario agregado con éxito");
        location.reload();
      } else {
        alert("❌ Error al agregar usuario");
      }
    } catch (err) {
      console.error(err);
      alert("❌ Error en la conexión");
    }
  });