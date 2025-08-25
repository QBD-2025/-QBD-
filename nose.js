const mysql = require('mysql2/promise');

// Función para insertar ": " entre minúscula + mayúscula
function insertarDosPuntos(dato) {
  let resultado = '';

  for (let i = 0; i < dato.length; i++) {
    const c = dato[i];
    const next_c = dato[i + 1] || '';

    resultado += c;

    if (c.match(/[a-z]/) && next_c.match(/[A-Z]/)) {
      resultado += ': ';
    }
  }

  return resultado;
}

async function main() {
  // Conexión a la base de datos
  const connection = await mysql.createConnection({
    host: 'localhost',     // tu host
    user: 'root',          // tu usuario
    password: '',// tu contraseña
    database: 'quebuendato'     // nombre de tu BD
  });

  try {
    // 1. Leer todos los registros de la tabla
    const [rows] = await connection.query('SELECT id_dato, dato FROM dato_curioso');

    for (let row of rows) {
      const nuevoTexto = insertarDosPuntos(row.dato);

      // 2. Actualizar la tabla con el nuevo texto
      await connection.query('UPDATE dato_curioso SET dato = ? WHERE id_dato = ?', [nuevoTexto, row.id_dato]);

      console.log(`Registro ${row.id} actualizado: ${nuevoTexto}`);
    }

    console.log('Todos los registros han sido procesados.');
  } catch (err) {
    console.error('Error procesando registros:', err);
  } finally {
    connection.end();
  }
}

main();
