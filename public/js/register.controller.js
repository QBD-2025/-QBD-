function validarFormulario() {
    const username = document.getElementById('username')
    const email = document.getElementById('email');
    const password = document.getElementById('password');
    const confirm_password = document.getElementById("confirm_password")

    // Limpiar errores anteriores
    document.querySelectorAll('.error-mensaje').forEach(e => e.remove());

    let valido = true;

    if (!username.value.trim()) {
        mostrarError(username, "El nombre de usuario es obligatorio");
        valido = false;
    }

    if (!email.value.trim()) {
        mostrarError(email, "El correo es obligatorio");
        valido = false;
    } else if (!/^[\w\.-]+@[\w\.-]+\.\w{2,4}$/.test(email.value)) {
        mostrarError(email, "Correo inválido");
        valido = false;
    }

    if (!password.value.trim()) {
        mostrarError(password, "La contraseña es obligatoria");
        valido = false;
    }

    if (!confirm_password.value.trim()) {
        mostrarError(confirm_password, "La confirmacion de la contraseña es obligatoria");
        valido = false;
    }


    return valido;
}

function mostrarError(input, mensaje) {
    const error = document.createElement('p');
    error.className = 'error-mensaje';
    error.style.color = 'red';
    error.style.fontSize = '14px';
    error.style.marginTop = '5px';
    error.textContent = mensaje;

    input.parentElement.appendChild(error);
}

// **Función togglePassword movida directamente aquí**
function togglePassword(idCampo, iconElement) {
    let input = document.getElementById(idCampo);
    if (input.type === "password") {
        input.type = "text";
        iconElement.textContent = "🔒"; // Icono de ojo tachado
    } else {
        input.type = "password";
        iconElement.textContent = "👁"; // Icono de ojo abierto
    }
}

// Tu JavaScript de validación de formulario existente (sin cambios)
document.addEventListener("DOMContentLoaded", function () {
    const params = new URLSearchParams(window.location.search);
    const error = params.get("error");
    const errorMensaje = document.getElementById("error-mensaje");

    if (error === "emailExists") {
        errorMensaje.innerHTML = `
            El correo ya está registrado o falta verificarse.<br>
            <a href="/login" style="color: #7B24C0; text-decoration: underline;">Inicia sesión aquí</a>
        `;
    } else if (error === "usernameTooLong") {
        errorMensaje.textContent= "Nombre de usuario muy largo"
    }else if (error === "passwordMismatch") {
        errorMensaje.textContent = "Las contraseñas no coinciden.";
    } else if (error === "passwordLength") {
        errorMensaje.textContent = "La contraseña debe tener entre 8 y 20 caracteres.";
    } else if (error === "passwordUppercase") {
        errorMensaje.textContent = "La contraseña debe incluir al menos una mayúscula.";
    } else if (error === "passwordLowercase") {
        errorMensaje.textContent = "La contraseña debe incluir al menos una minúscula.";
    } else if (error === "passwordNumber") {
        errorMensaje.textContent = "La contraseña debe incluir al menos un número.";
    } else if (error === "passwordSpecial") {
        errorMensaje.textContent = "La contraseña debe incluir al menos un caracter especial [!@#$%^&*(),.?:{}|<>]";
    } else if (error === "invalidEmail") {
        errorMensaje.textContent = "El formato del correo no es válido.";
    }
});

document.getElementById("registrationForm").addEventListener("submit", function (event) {
    let username = document.getElementById("username").value
    let password = document.getElementById("password").value;
    let confirmPassword = document.getElementById("confirm_password").value;
    let email = document.getElementById("email").value;
    let errorMensaje = document.getElementById("error-mensaje");
    errorMensaje.textContent = "";

    const emailRegex = /^[^\s@]+@[^\s@]+\.(com|mx)$/i;
    if (!emailRegex.test(email)) {
        errorMensaje.textContent = "El correo no es válido.";
        event.preventDefault();
        return;
    }

    if (username.length > 50) {
        errorMensaje.textContent = "El nombre de usuario es muy largo"
        event.preventDefault()
        return 
    }

    if (password.length > 20 || password.length < 8) {
        errorMensaje.textContent = "La contraseña debe tener entre 8 y 20 caracteres.";
        event.preventDefault();
        return;
    }
    if (!/[A-Z]/.test(password)) {
        errorMensaje.textContent = "La contraseña debe incluir al menos una mayúscula.";
        event.preventDefault();
        return;
    }
    if (!/[a-z]/.test(password)) {
        errorMensaje.textContent = "La contraseña debe incluir al menos una minúscula.";
        event.preventDefault();
        return;
    }
    if (!/[0-9]/.test(password)) {
        errorMensaje.textContent = "La contraseña debe incluir al menos un número.";
        event.preventDefault();
        return;
    }
    if (!/[!@#$%^&*(),.?":{}|<>]/.test(password)) {
        errorMensaje.textContent = "La contraseña debe incluir al menos un caracter especial [!@#$%^&*(),.?:{}|<>]";
        event.preventDefault();
        return;
    }
    if (password !== confirmPassword) {
        errorMensaje.textContent = "Las contraseñas no coinciden.";
        event.preventDefault();
        return;
    }
});