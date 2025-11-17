    // Validación del formulario antes de enviarlo
    document.getElementById("loginForm").addEventListener("submit", function (event) {
      const email = document.getElementById("email");
      const password = document.getElementById("password");
      const errorSpan = document.getElementById("login-error");

      // Limpiar errores anteriores
      errorSpan.textContent = "";
      email.style.border = "";
      password.style.border = "";

      // Verifica que ambos campos no estén vacíos
      if (!email.value || !password.value) {
        errorSpan.textContent = "Todos los campos son obligatorios";
        email.style.border = "2px solid red";
        password.style.border = "2px solid red";
        event.preventDefault();
        return;
      }

      // Validación simple del correo electrónico
      const emailRegex = /^[^\s@]+@[^\s@]+\.(com|mx)$/i;
      if (!emailRegex.test(email.value)) {
        errorSpan.textContent = "El correo no es válido";
        email.style.border = "2px solid red";
        event.preventDefault();
        return;
      }
    });

    // Función para mostrar u ocultar la contraseña
    function togglePassword(inputId, buttonElement) {
      const input = document.getElementById(inputId);
      if (input.type === "password") {
        input.type = "text";
        buttonElement.textContent = "🔒"; // Icono cuando está visible
      } else {
        input.type = "password";
        buttonElement.textContent = "👁"; // Icono cuando está oculto
      }
    }