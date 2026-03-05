# Mundo Donghua - Votación

Sistema de votación acumulativa para patrocinadores, con integración directa a Google Sheets y dashboard de resultados.

## 🚀 Características

- **Votación por Puntos:** Reparte puntos según el Tier del patrocinador.
- **Dashboard en Vivo:** Resultados dinámicos basados en lógica de "Patrocinio", "x2" y "Votos Patreon".
- **Control Remoto:** Gestiona la habilitación de la encuesta, visibilidad de resultados y fechas límite desde Google Sheets.
- **Privacidad y Seguridad:** Autenticación mediante Service Account y variables de entorno.
- **Diseño Premium:** Interfaz moderna, responsiva y con modo oscuro.

## 🛠️ Estructura del Proyecto

- `/src`: Aplicación Frontend (React + Vite).
- `/api`: Backend (Python FastAPI) - Serverless para Vercel.
- `/docs`: Documentación detallada del sistema.
- `/tests`: Pruebas unitarias para Frontend y Backend.

## 📋 Configuración de Credenciales

### 1. Extraer SPREADSHEET_ID
El ID se encuentra en la URL de tu Google Sheet:
`https://docs.google.com/spreadsheets/d/ID_AQUI/edit`
Copia la parte entre `/d/` y `/edit`.

### 2. Configurar Service Account (MD_SVC)
Este paso permite que la App "hable" con tu Excel de forma segura:
1. Entra a [Google Cloud Console](https://console.cloud.google.com/).
2. **Crea un Proyecto:** Haz clic en el selector de proyectos (arriba a la izquierda) y dale a "Nuevo proyecto". Ponle un nombre (ej: `md-votes-api`).
3. **Habilita las APIs:** 
   - Busca "Google Sheets API" en la barra superior y dale a "Habilitar".
   - Busca "Google Drive API" y dale a "Habilitar" también.
4. **Crea la Cuenta de Servicio:**
   - Ve al menú lateral: **IAM y administración > Cuentas de servicio**.
   - Haz clic en "+ Crear cuenta de servicio".
   - Ponle un nombre (ej: `mundo-donghua-svc`) y dale a "Crear y continuar".
   - (Opcional) En roles, puedes poner "Editor", aunque no es obligatorio aquí. Dale a "Listo".
5. **Genera la Clave JSON:**
   - En la lista de cuentas de servicio, haz clic en el email de la que acabas de crear.
   - Ve a la pestaña **Claves** (Keys) > **Agregar clave** > **Crear clave nueva**.
   - Selecciona **JSON** y dale a "Crear". Se descargará un archivo `.json` a tu PC.
   - **⚠️ SEGURIDAD:** Este archivo contiene tu clave privada. **NUNCA** lo compartas, ni lo subas a GitHub, ni lo envíes por chat. Es el acceso total a tu integración.
6. **Vincula el Excel (CRÍTICO):** 
   - Abre tu archivo JSON descargado y busca el campo `"client_email"`.
   - Copia ese email (ej: `algo@proyecto.iam.gserviceaccount.com`).
   - Ve a tu Google Sheet, dale al botón **Compartir** y pega ese email dándole permisos de **Editor**.
7. **Configura la Variable:** 
   - Copia todo el contenido del archivo JSON.
   - En Vercel (o en tu `.env` local), pégalo como el valor de `MD_SVC`. 
   - **Tip:** Asegúrate de que quede en una sola línea y sin comillas adicionales que puedan romper el formato.

## 💻 Desarrollo Local

1. Instala dependencias:
   ```bash
   npm install
   ```
2. Crea un archivo `.env` en la raíz con:
   ```env
   SPREADSHEET_ID=tu_id_de_google_sheet
   MD_SVC='{"type": "service_account", ...}'
   ```
3. Ejecuta el Backend:
   ```bash
   python3 api/index.py
   ```
4. Ejecuta el Frontend (en otra terminal):
   ```bash
   npm run dev
   ```

## 🧪 Pruebas (Tests)

### Backend
```bash
python3 -m venv venv_tests
source venv_tests/bin/activate
pip install -r requirements.txt pytest httpx pytest-mock
export PYTHONPATH=$PYTHONPATH:.
pytest tests/backend/test_api.py
```

### Frontend
```bash
npm test
```

## ☁️ Despliegue en Vercel

1. Sube el código a GitHub.
2. Conecta el repositorio a Vercel.
3. En **Project Settings > Environment Variables**, añade `SPREADSHEET_ID` y `MD_SVC`.
4. Vercel detectará automáticamente la carpeta `api/` como Serverless Functions y el `package.json` para el Frontend.

---
*Herramienta desarrollada para facilitar las votaciones de la comunidad.*
