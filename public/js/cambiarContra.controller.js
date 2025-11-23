        // Validación de que las contraseñas coincidan antes de enviar el formulario
        document.getElementById('reset-form').addEventListener('submit', function(event) {
            const password = document.getElementById('password').value;
            const confirmPassword = document.getElementById('confirmPassword').value;

            if (password !== confirmPassword) {
                alert('Las contraseñas no coinciden.');
                event.preventDefault(); // evita que el formulario se envíe
            }
        });

        // Función para mostrar u ocultar la contraseña al hacer clic en el icono
        function togglePassword(idCampo, iconElement) {
            let input = document.getElementById(idCampo);
            if (input.type === "password") {
                input.type = "text"; // mostrar texto
                iconElement.textContent = "🔒"; // cambiar icono a candado
            } else {
                input.type = "password"; // ocultar texto
                iconElement.textContent = "👁"; // volver a icono de ojo
            }
        }