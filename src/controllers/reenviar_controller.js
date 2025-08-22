const enviarCorreoVerificacion = require('/utils/mail.js');
const mysql = require('mysql');
const crypto = require('crypto');

const reenviarCorreo = (req, res) => {
  const { correo } = req.body;

  if (!correo) {
    return res.status(400).json({ ok: false, mensaje: 'Correo no recibido' });
  }

  req.getConnection((err, conn) => {
    if (err) return res.status(500).json({ ok: false, mensaje: 'Error en conexión', error: err });

    const token = crypto.randomBytes(16).toString('hex');
    const expiracion = new Date(Date.now() + 60 * 1000); // 1 minuto

    conn.query(
      'UPDATE usuario SET token = ?, token_expira = ? WHERE email = ?',
      [token, expiracion, correo],
      async (error, result) => {
        if (error) return res.status(500).json({ ok: false, mensaje: 'Error al actualizar token', error });

        // Enviar correo
        const resultadoCorreo = await enviarCorreoVerificacion(correo, token);
        if (!resultadoCorreo.ok) {
          return res.status(500).json(resultadoCorreo);
        }

        res.json({ ok: true, mensaje: 'Correo reenviado con éxito' });
      }
    );
  });
};

module.exports = { reenviarCorreo };
