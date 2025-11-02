// controllers/reenviar.controller.js

const enviarCorreoVerificacion = require('/utils/mail.js');
const mysql = require('mysql');
const crypto = require('crypto');

// ========================
// Función para reenviar correo de verificación
// ========================
const reenviarCorreo = (req, res) => {
  const { correo } = req.body;

  // Validar que se reciba un correo
  if (!correo) {
    return res.status(400).json({ ok: false, mensaje: 'Correo no recibido' });
  }

  // Obtener conexión a la base de datos
  req.getConnection((err, conn) => {
    if (err) return res.status(500).json({ ok: false, mensaje: 'Error en conexión', error: err });

    // Generar token aleatorio y establecer expiración (1 minuto)
    const token = crypto.randomBytes(16).toString('hex');
    const expiracion = new Date(Date.now() + 60 * 1000); // 1 minuto

    // Actualizar token y fecha de expiración del usuario
    conn.query(
      'UPDATE usuarios SET token = ?, token_expira = ? WHERE email = ?',
      [token, expiracion, correo],
      async (error, result) => {
        if (error) return res.status(500).json({ ok: false, mensaje: 'Error al actualizar token', error });

        // Enviar correo de verificación con el token
        const resultadoCorreo = await enviarCorreoVerificacion(correo, token);
        if (!resultadoCorreo.ok) {
          return res.status(500).json(resultadoCorreo);
        }

        // Responder éxito
        res.json({ ok: true, mensaje: 'Correo reenviado con éxito' });
      }
    );
  });
};

// ========================
// Exportar función
// ========================
module.exports = { reenviarCorreo };
