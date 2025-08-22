document.addEventListener("DOMContentLoaded", () => {
  const boton = document.getElementById("verificar");
  const resultado = document.getElementById("resultado");
  const grid = document.querySelector(".crucigrama-grid");

  // Obtener solución del atributo data
  const solucion = JSON.parse(grid.dataset.solucion);

  // Auto-enfoque y navegación con teclado
  const inputs = document.querySelectorAll(".letra");
  inputs.forEach((input, index) => {
    input.addEventListener("input", (e) => {
      if (e.target.value.length === 1) {
        const next = index < inputs.length - 1 ? inputs[index + 1] : null;
        if (next) next.focus();
      }
    });

    input.addEventListener("keydown", (e) => {
      if (e.key === "Backspace" && e.target.value === "") {
        const prev = index > 0 ? inputs[index - 1] : null;
        if (prev) prev.focus();
      }
    });
  });

  // Verificar respuestas
  boton.addEventListener("click", () => {
    let correcto = true;
    inputs.forEach(input => {
      const userValue = input.value.toUpperCase();
      const correctValue = input.dataset.correctValue;
      
      if (userValue !== correctValue) {
        correcto = false;
        input.classList.add("incorrecta");
      } else {
        input.classList.remove("incorrecta");
      }
    });

    if (correcto) {
      resultado.textContent = "¡CORRECTO! 🎉";
      resultado.style.background = "#dff0d8";
      resultado.style.color = "#3c763d";
    } else {
      resultado.textContent = "❌ Algunas respuestas son incorrectas";
      resultado.style.background = "#f2dede";
      resultado.style.color = "#a94442";
    }
  });

  // Enfocar primer input al cargar
  if (inputs.length > 0) inputs[0].focus();
});