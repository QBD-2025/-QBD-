const multer = require('multer');
const path = require('path');
const fs = require('fs').promises;

// Carpeta donde se guardarán los avatares subidos
const uploadDir = path.join(__dirname, '../public/uploads/avatars');

// Configuración de almacenamiento de Multer
const storage = multer.diskStorage({
  // Definir la carpeta de destino
  destination: async (req, file, cb) => {
    try {
      // Crear la carpeta si no existe
      await fs.mkdir(uploadDir, { recursive: true });
      cb(null, uploadDir);
    } catch (err) {
      cb(err);
    }
  },
  // Definir el nombre del archivo
  filename: (req, file, cb) => {
    const uniqueName = `${req.session.user.id_usuario}_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  }
});

// Filtrar tipos de archivos permitidos
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  cb(null, allowedTypes.includes(file.mimetype));
};

// Configurar Multer con límites de tamaño y filtro de archivos
const upload = multer({ storage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Middleware para verificar si el usuario está autenticado
const isAuthenticated = (req, res, next) => {
  req.session.user ? next() : res.redirect('/login');
};

const hasCarrera = (req, res, next) => {
  if (req.session.user?.id_carrera) {
    return next();
  }
  return res.redirect('sin-carrera');
}

// Exportar el middleware y Multer
module.exports = { isAuthenticated, upload };
