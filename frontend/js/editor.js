/* ================================================================
Archivo: editor.js
Descripción: Permite agregar nuevas preguntas a una encuesta desde
la interfaz de editor, enviando los datos al servidor
y actualizando la tabla de manera dinámica.
Autor: Equipo de desarrollo
Última modificación: [Fecha]
================================================================ */

// ===== AGREGAR NUEVA PREGUNTA =====
document.querySelector("#btnAgregarPregunta").addEventListener("click", async () => {
    // Obtenemos los valores ingresados por el usuario
    const idEncuesta = document.querySelector("#id_encuesta").value; // ID de la encuesta
    const texto = document.querySelector("#nueva_pregunta").value; // Texto de la nueva pregunta

    // ===== ENVÍO DE DATOS AL SERVIDOR =====
    // Se realiza una petición POST para agregar la pregunta
    const res = await fetch("/editor/agregar-pregunta", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            id_encuesta: idEncuesta,
            texto_pregunta: texto
        })
    });

    // Se espera la respuesta en formato JSON
    const data = await res.json();

    // ===== VALIDACIÓN DE LA RESPUESTA =====
    if (!data.id_pregunta) {
        // Si no se recibe un ID válido, mostramos alerta
        alert("Error al agregar");
        return;
    }

    // ===== ACTUALIZAR TABLA DINÁMICAMENTE =====
    const tbody = document.querySelector(".editor-table tbody"); // Cuerpo de la tabla
    const nuevaFila = document.createElement("tr"); // Creamos una nueva fila

    // Insertamos el contenido de la fila con la nueva pregunta y select de estatus
    nuevaFila.innerHTML = `
        <td>${idEncuesta}</td>
        <td>${texto}</td>
        <td>-</td>
        <td>
            <input type="hidden" name="id_pregunta[]" value="${data.id_pregunta}" />
            <select name="estatus[]">
                <option value="1">Publicado</option>
                <option value="2">Borrador</option>
                <option value="3" selected>Archivado</option>
            </select>
        </td>
    `;

    // Agregamos la nueva fila al final de la tabla
    tbody.appendChild(nuevaFila);
});
