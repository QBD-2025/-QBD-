const sharp = require("sharp");
const fs = require("fs");
const path = require("path");

// Ruta corregida
const carpeta = path.join(__dirname, "src/media/animacion-competitivo");

// Verificar si la carpeta existe
if (!fs.existsSync(carpeta)) {
  console.error(`❌ Error: La carpeta no existe en: ${carpeta}`);
  console.log("📂 Directorio actual contiene:", fs.readdirSync(__dirname));
  process.exit(1);
}

// Verificar que hay archivos JPG
const archivos = fs.readdirSync(carpeta).filter(f => f.endsWith('.jpg'));
if (archivos.length === 0) {
  console.error("❌ No se encontraron archivos .jpg en la carpeta");
  process.exit(1);
}

console.log(`🔄 Procesando ${archivos.length} archivos...`);

archivos.forEach((file, index) => {
  const inputPath = path.join(carpeta, file);
  const outputPath = path.join(carpeta, `${path.basename(file, ".jpg")}.webp`);

  sharp(inputPath)
    .webp({ quality: 80 })
    .toFile(outputPath)
    .then(() => {
      // Eliminar el JPG después de la conversión exitosa
      fs.unlink(inputPath, (err) => {
        if (err) {
          console.error(`⚠️ No se pudo eliminar ${file}:`, err.message);
        } else {
          console.log(`✅ [${index + 1}/${archivos.length}] Convertido y eliminado: ${file}`);
        }
      });
    })
    .catch(err => {
      console.error(`❌ Error con ${file}:`, err.message);
    });
});