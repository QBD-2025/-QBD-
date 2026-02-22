// ===========================
// 📧 mail.js - Configuración de envío de correos
// ===========================

const nodemailer = require('nodemailer');
require('dotenv').config();

// ===========================
// Función para enviar correo de verificación de cuenta
// ===========================
async function enviarCorreoVerificacion(correoDestino, token) {
  try {
    // Configura el transporter con Gmail y credenciales del .env
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.CORREO_APP,
        pass: process.env.CORREO_PASS,
      },
    });

    // 🔗 Determinar URL base dinámica (producción o desarrollo)
    const baseUrl = process.env.APP_BASE_URL || `https://localhost:${process.env.PORT || 3005}`;
    const verifyLink = `${baseUrl}/verificar-cuenta?correo=${encodeURIComponent(correoDestino)}&token=${token}`;

    // Contenido HTML del correo
    const htmlBody = `
      <html lang='es'>
      <head><meta charset='UTF-8'></head>
      <body style='font-family: Arial, sans-serif;'>
        <h2 style='color:#28a745;'>¡Hola!</h2>
        <p>Gracias por registrarte en <strong>¡QUE BUEN DATO!</strong>.</p>
        <p>Haz clic en el siguiente botón para verificar tu cuenta:</p>
        <p>
          <a href='${verifyLink}'
            style='padding:10px 20px; background-color:#28a745; color:white; text-decoration:none; border-radius:5px;'>
            ✅ Verificar Cuenta
          </a>
        </p>
        <p>Este enlace expirará en 1 hora.</p>
        <hr>
        <p style='font-size:12px;color:gray;'>Si no creaste esta cuenta, puedes ignorar este correo.</p>
      </body>
      </html>
    `;

    // Envía el correo
    const info = await transporter.sendMail({
      from: `"¡QUE BUEN DATO! - Verificación" <${process.env.CORREO_APP}>`,
      to: correoDestino,
      subject: 'Verifica tu cuenta en ¡QUE BUEN DATO! 🚀',
      html: htmlBody,
    });

    console.log('📨 Correo de verificación enviado:', info.messageId);
    return { ok: true, info };
  } catch (error) {
    console.error('❌ Error al enviar correo de verificación:', error);
    return { ok: false, error };
  }
}

// ===========================
// Función para enviar correo de recuperación de contraseña
// ===========================
async function enviarCorreoRecuperacion(correoDestino, token) {
  try {
    // Configura el transporter con Gmail y credenciales del .env
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.CORREO_APP,
        pass: process.env.CORREO_PASS,
      },
    });

    // 🔗 Determinar URL base dinámica (producción o desarrollo)
    const baseUrl = process.env.APP_BASE_URL || `https://localhost:${process.env.PORT || 3005}`;
    const resetLink = `${baseUrl}/cambiar-contrasena?token=${token}`;

    // Contenido HTML del correo
    const htmlBody = `
      <html lang='es'>
      <head><meta charset='UTF-8'></head>
      <body style='font-family: Arial, sans-serif;'>
        <h2 style='color:#007bff;'>Restablece tu contraseña 🔐</h2>
        <p>Recibimos una solicitud para restablecer tu contraseña en <strong>¡QUE BUEN DATO!</strong>.</p>
        <p>Haz clic en el botón para crear una nueva contraseña:</p>
        <p>
          <a href='${resetLink}'
            style='padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;'>
            🔄 Restablecer Contraseña
          </a>
        </p>
        <p>Este enlace expirará en 1 hora.</p>
        <hr>
        <p style='font-size:12px;color:gray;'>Si no solicitaste este cambio, ignora este correo.</p>
      </body>
      </html>
    `;

    // Envía el correo
    const info = await transporter.sendMail({
      from: `"¡QUE BUEN DATO! - Recuperación" <${process.env.CORREO_APP}>`,
      to: correoDestino,
      subject: 'Restablece tu contraseña en ¡QUE BUEN DATO! 🔐',
      html: htmlBody,
    });

    console.log('📨 Correo de recuperación enviado:', info.messageId);
    return { ok: true, mensaje: 'Correo de recuperación enviado' };
  } catch (error) {
    console.error('❌ Error al enviar el correo de recuperación:', error);
    return { ok: false, mensaje: 'No se pudo enviar el correo de recuperación', error };
  }
}

// ===========================
// Exportar funciones
// ===========================
module.exports = {
  enviarCorreoVerificacion,
  enviarCorreoRecuperacion,
};
