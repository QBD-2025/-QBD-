document.querySelector("#btnAgregarPregunta").addEventListener("click", async () => {
  const idEncuesta = document.querySelector("#id_encuesta").value;
  const texto = document.querySelector("#nueva_pregunta").value;

  const res = await fetch("/editor/agregar-pregunta", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ id_encuesta: idEncuesta, texto_pregunta: texto })
  });

  const data = await res.json();

  if (!data.id_pregunta) {
    alert("Error al agregar");
    return;
  }

  // Agregar nueva fila a la tabla
  const tbody = document.querySelector(".editor-table tbody");
  const nuevaFila = document.createElement("tr");

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

  tbody.appendChild(nuevaFila);
});
