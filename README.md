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
1. Crea un proyecto en [Google Cloud Console](https://console.cloud.google.com/).
2. Habilita las APIs de **Google Sheets** y **Google Drive**.
3. Crea una **Service Account**, genera una clave **JSON** y descárgala.
4. **IMPORTANTE:** Comparte tu archivo de Google Sheets con el email de la Service Account como **Editor**.
5. Copia el contenido completo del JSON en una sola línea para la variable `MD_SVC`.

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
