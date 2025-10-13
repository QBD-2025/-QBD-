/* ================================================================
Archivo: crucigrama.js
Descripción: Controla la lógica del crucigrama, incluyendo
navegación automática por inputs, verificación de respuestas
y retroalimentación visual para el usuario.
  Autor: Equipo de desarrollo
  Última modificación: [Fecha]
================================================================ */

   document.addEventListener("DOMContentLoaded", () => {
    // ===== ELEMENTOS DEL DOM =====
    const boton = document.getElementById("verificar"); // Botón para verificar respuestas
    const resultado = document.getElementById("resultado"); // Elemento donde se mostrará el mensaje de resultado
    const grid = document.querySelector(".crucigrama-grid"); // Contenedor principal del crucigrama
  
    // ===== OBTENER SOLUCIÓN =====
    // La solución está almacenada en el atributo data-solucion del grid como JSON
    const solucion = JSON.parse(grid.dataset.solucion);
  
    // ===== NAVEGACIÓN AUTOMÁTICA ENTRE INPUTS =====
    const inputs = document.querySelectorAll(".letra"); // Todos los inputs de letras del crucigrama
  
    inputs.forEach((input, index) => {
      // Cuando el usuario escribe una letra, se enfoca automáticamente el siguiente input
      input.addEventListener("input", (e) => {
        if (e.target.value.length === 1) {
          const next = index < inputs.length - 1 ? inputs[index + 1] : null;
          if (next) next.focus();
        }
      });
  
      // Permite moverse hacia atrás al presionar Backspace si el input actual está vacío
      input.addEventListener("keydown", (e) => {
        if (e.key === "Backspace" && e.target.value === "") {
          const prev = index > 0 ? inputs[index - 1] : null;
          if (prev) prev.focus();
        }
      });
    });
  
    // ===== VERIFICAR RESPUESTAS =====
    boton.addEventListener("click", () => {
      let correcto = true; // Bandera para determinar si todas las respuestas son correctas
  
      inputs.forEach(input => {
        const userValue = input.value.toUpperCase(); // Convertimos a mayúscula para comparación
        const correctValue = input.dataset.correctValue; // Valor correcto almacenado en el input
  
        if (userValue !== correctValue) {
          correcto = false;
          input.classList.add("incorrecta"); // Marcamos visualmente las respuestas incorrectas
        } else {
          input.classList.remove("incorrecta"); // Limpiamos marca si la respuesta es correcta
        }
      });
  
      // Mostramos retroalimentación visual al usuario
      if (correcto) {
        resultado.textContent = "¡CORRECTO! 🎉";
        resultado.style.background = "#dff0d8"; // Fondo verde claro
        resultado.style.color = "#3c763d"; // Texto verde oscuro
      } else {
        resultado.textContent = "❌ Algunas respuestas son incorrectas";
        resultado.style.background = "#f2dede"; // Fondo rojo claro
        resultado.style.color = "#a94442"; // Texto rojo oscuro
      }
    });
  
    // ===== ENFOQUE INICIAL =====
    // Coloca el cursor en el primer input al cargar la página
    if (inputs.length > 0) inputs[0].focus();
  });
  