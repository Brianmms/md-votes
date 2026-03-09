# Mundo Donghua - Votación (Versión Simplificada)

Esta es la versión de "Fácil Despliegue", diseñada para personas que no tienen conocimientos técnicos profundos y quieren evitar configurar Google Cloud o tarjetas de crédito.

## 🚀 Despliegue en 3 Pasos

### 1. Configurar el Google Sheet
1. Abre tu archivo de Google Sheets.
2. Ve al menú **Extensiones > Apps Script**.
3. Borra todo el código que veas y pega el contenido del archivo `docs/GOOGLE_APPS_SCRIPT.gs` que está en este repositorio.
4. Dale al botón **Guardar** (el icono del disco).
5. Dale al botón azul **Implementar > Nueva implementación**.
6. En "Seleccionar tipo", elige **Aplicación web**.
7. En "Quién tiene acceso", elige **Cualquiera** (esto es muy importante).
8. Dale a "Implementar", autoriza los permisos y **copia la URL** que te darán.

### 2. Configurar Vercel
1. Sube este código a tu GitHub.
2. Conéctalo a Vercel.
3. En **Settings > Environment Variables**, añade solo una variable:
   - **Key:** `APPS_SCRIPT_URL`
   - **Value:** (Pega la URL que copiaste en el paso anterior).

### 3. ¡Listo!
Tu aplicación ya está conectada al Excel sin usar contraseñas complicadas ni tarjetas.

---
*Nota: Esta versión usa un puente intermedio para facilitar la gestión al administrador.*
