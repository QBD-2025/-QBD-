const nodemailer = require('nodemailer');
require('dotenv').config();

// Función de verificación de cuenta
async function enviarCorreoVerificacion(correoDestino, token) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.CORREO_APP,
        pass: process.env.CORREO_PASS,
      },
    });

    const verifyLink = `http://localhost:${process.env.PORT || 3005}/verificar-cuenta?correo=${encodeURIComponent(correoDestino)}&token=${token}`;

    const htmlBody = `
      <html lang='es'>
      <head><meta charset='UTF-8'></head>
      <body>
        <p>Hola,</p>
        <p>Gracias por registrarte en ¡QUE BUEN DATO!.</p>
        <p>Haz clic en el siguiente botón para verificar tu cuenta:</p>
        <a href='${verifyLink}'
          style='padding:10px 20px; background-color:#28a745; color:white; text-decoration:none; border-radius:5px;'>
          Verificar Cuenta
        </a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no creaste esta cuenta, puedes ignorar este correo.</p>
      </body>
      </html>
    `;
    
    const info = await transporter.sendMail({
      from: `"¡QUE BUEN DATO! - Verificación" <${process.env.CORREO_APP}>`,
      to: correoDestino,
      subject: 'Verifica tu cuenta en ¡QUE BUEN DATO!',
      html: htmlBody,
    });

    console.log('Correo de verificación enviado:', info.messageId);
    return { ok: true, info };
  } catch (error) {
    console.error('Error al enviar correo de verificación:', error);
    return { ok: false, error };
  }
}



async function enviarCorreoRecuperacion(correoDestino, token) {
  try {
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.CORREO_APP,
        pass: process.env.CORREO_PASS,
      },
    });

    const resetLink = `http://localhost:${process.env.PORT || 3005}/cambiar-contrasena?token=${token}`;
    
    const htmlBody = `
      <html lang='es'>
      <head><meta charset='UTF-8'></head>
      <body>
        <p>Hola,</p>
        <p>Recibimos una solicitud para restablecer tu contraseña en ¡QUE BUEN DATO!.</p>
        <p>Haz clic en el botón para crear una nueva contraseña:</p>
        <a href='${resetLink}'
           style='padding:10px 20px; background-color:#007bff; color:white; text-decoration:none; border-radius:5px;'>
           Restablecer Contraseña
        </a>
        <p>Este enlace expirará en 1 hora.</p>
        <p>Si no solicitaste el cambio, ignora este correo.</p>
      </body>
      </html>
    `;
    
    const info = await transporter.sendMail({
      from: `"¡QUE BUEN DATO! - Recuperación" <${process.env.CORREO_APP}>`,
      to: correoDestino,
      subject: 'Restablece tu contraseña en ¡QUE BUEN DATO!',
      html: htmlBody,
    });

    console.log('Correo de recuperación enviado:', info.messageId);
    return { ok: true, mensaje: 'Correo de recuperación enviado' };
  } catch (error) {
    console.error('Error al enviar el correo de recuperación:', error);
    return { ok: false, mensaje: 'No se pudo enviar el correo de recuperación', error };
  }
}

module.exports = {
  enviarCorreoVerificacion,
  enviarCorreoRecuperacion
};