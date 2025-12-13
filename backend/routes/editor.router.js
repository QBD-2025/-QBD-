const express = require('express');
const router = express.Router();
const multer = require('multer');

// ✅ Configurar multer para manejar imágenes
const storage = multer.memoryStorage(); // Almacena en memoria temporalmente
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // Límite de 5MB
    fileFilter: (req, file, cb) => {
    // Solo aceptar imágenes
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('Solo se permiten imágenes'));
    }
    }
});

const { 
    mostrarExamenes, 
    mostrarDatos,
    agregarPreguntaExamen,
    eliminarPreguntaExamen,
    editarPreguntaExamen,
    agregardato, 
    editarDato, 
    borrarDato
} = require('../controllers/editor.controller.js');

const isAuthenticated = (req, res, next) => req.session.user ? next() : res.redirect('/login');

// Panel principal
router.get('/', isAuthenticated, (req, res) => res.redirect('/editor/examenes'));

// EXÁMENES
router.get('/examenes', isAuthenticated, mostrarExamenes);
router.post('/agregar-pregunta', isAuthenticated, agregarPreguntaExamen);
router.post('/editar-pregunta', isAuthenticated, editarPreguntaExamen);
router.delete('/eliminar-pregunta/:id', isAuthenticated, eliminarPreguntaExamen);

// DATOS CURIOSOS
router.get('/datos', isAuthenticated, mostrarDatos);

// ✅ Rutas con multer para manejar imágenes
router.post('/agregar-dato', isAuthenticated, upload.single('imagen'), agregardato);
router.post('/modificar-dato', isAuthenticated, upload.single('imagen'), editarDato);
router.delete('/eliminar-dato/:id', isAuthenticated, borrarDato);

// ✅ Ruta para servir imágenes de datos curiosos
router.get('/datos/imagen/:id', isAuthenticated, async (req, res) => {
  try {
    const idDato = req.params.id;
    const [rows] = await req.pool.query(
      'SELECT imagen FROM dato_curioso WHERE id_dato = ?', 
      [idDato]
    );
    
    if (rows.length === 0 || !rows[0].imagen) {
      return res.status(404).send('Imagen no encontrada');
    }
    
    // Enviar la imagen como respuesta
    res.set('Content-Type', 'image/jpeg'); // Ajusta según el tipo de imagen
    res.send(rows[0].imagen);
  } catch (err) {
    console.error('Error obteniendo imagen:', err);
    res.status(500).send('Error al obtener imagen');
  }
});

module.exports = router;