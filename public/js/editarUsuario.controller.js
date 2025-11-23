    document.addEventListener('DOMContentLoaded', function() {

      // Referencias a elementos del DOM
      const avatarInput = document.getElementById('avatar');
      const changeAvatarBtn = document.getElementById('changeAvatarBtn');
      const avatarPreview = document.getElementById('avatar-preview');
      const fileNameDisplay = document.getElementById('fileNameDisplay');
      const form = document.getElementById('editForm');
      const saveBtn = document.getElementById('saveBtn');

      // Abrir selector de archivos al hacer clic en botón
      changeAvatarBtn.addEventListener('click', (e) => {
        e.preventDefault();
        avatarInput.click();
      });

      // Procesar imagen seleccionada
      avatarInput.addEventListener('change', function(e) {
        const file = e.target.files[0];
        
        if (!file) return;

        console.log('Archivo seleccionado:', file.name, file.type, file.size);

        // Validar tipo de archivo
        const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
        if (!validTypes.includes(file.type)) {
          alert('Solo se permiten imágenes JPG, PNG o WEBP');
          avatarInput.value = '';
          return;
        }

        // Validar tamaño (máximo 5MB)
        if (file.size > 5 * 1024 * 1024) {
          alert('La imagen es demasiado grande. Máximo 5MB.');
          avatarInput.value = '';
          return;
        }

        // Mostrar preview local de la imagen seleccionada
        const reader = new FileReader();
        reader.onload = function(event) {
          avatarPreview.src = event.target.result;
          changeAvatarBtn.textContent = '✅ Imagen seleccionada';
          changeAvatarBtn.style.backgroundColor = '#4CAF50';
          fileNameDisplay.textContent = `📁 ${file.name}`;
        };
        reader.readAsDataURL(file);
      });

      // Validar formulario antes de enviar
      form.addEventListener('submit', function(e) {
        const apodo = document.getElementById('apodo').value.trim();
        
        if (!apodo) {
          e.preventDefault();
          alert('El alias no puede estar vacío');
          return false;
        }
        
        // Deshabilitar botón mientras se guarda
        saveBtn.disabled = true;
        saveBtn.textContent = 'Guardando...';
      });

      // Efectos hover en botones
      const cancelBtn = document.querySelector('.cancel-btn');
      [saveBtn, cancelBtn].forEach(btn => {
        btn.addEventListener('mouseenter', function() {
          if (!this.disabled) this.style.transform = 'translateY(-2px)';
        });
        btn.addEventListener('mouseleave', function() {
          this.style.transform = 'translateY(0)';
        });
      });

    });