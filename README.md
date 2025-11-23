# 🧩 Guía para el equipo - QBD

## 🌐 Estructura General

### FRONTEND
- `/frontend/views/` → Páginas (vistas .hbs)
- `/frontend/public/css/` → Estilos (usa subcarpetas base/páginas/juegos)
- `/frontend/public/js/` → Scripts del navegador
- `/frontend/public/img/`, `/audio/`, `/videos/` → Recursos multimedia

### BACKEND
- `/backend/controllers/` → Lógica del servidor por módulo
- `/backend/routes/` → Rutas de Express (usa nombres claros: usuario.routes.js)
- `/backend/sockets/` → Funcionalidades en tiempo real
- `/backend/utils/` → Funciones generales
- `/backend/db/` → Conexión y modelos de base de datos

### DOCUMENTACIÓN
- `/docs/manual_tecnico/` → Manual para los Product Owners / jueces
- `/docs/guia_desarrolladores.md` → Esta guía
- `/docs/bitacora.md` → Registro de avances

---

## 💡 Reglas básicas

1. **Frontend** nunca toca código del backend.  
    Solo trabaja dentro de `/frontend`.

2. **Backend** nunca modifica vistas ni CSS.  
    Solo responde a las rutas, lógica, controladores y BD.

3. **Nombres de archivos y carpetas:**  
    - Rutas → `modulo.routes.js`  
    - Controladores → `modulo.controller.js`  
    - CSS → `nombrePagina.css`  
    - JS → `nombrePagina.js`

4. **Nuevas funcionalidades:**  
    Antes de agregar una carpeta o módulo, anótalo en `/docs/bitacora.md`.

---

## 🧱 Ejemplo de flujo

Un botón del perfil no reacciona:

1. Buscar en `frontend/views/usuario/perfil.hbs`
2. Ver su clase o id → ejemplo: `id="btnGuardar"`
3. Revisar `frontend/public/js/paginas/perfil.js` (debe tener el evento del botón)
4. Si necesita conectar con backend → ver `backend/routes/usuario.routes.js`
5. Si hace una acción del servidor → revisar `backend/controllers/usuario.controller.js`
6. Si cambia estilo → editar `frontend/public/css/paginas/perfil.css`
