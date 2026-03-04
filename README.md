# Mundo Donghua - Votación PRO

Sistema profesional de votación acumulativa para patrocinadores de Mundo Donghua, con integración directa a Google Sheets y dashboard de resultados en tiempo real.

## 🚀 Características Premium

- **Votación por Puntos:** Reparte tus votos disponibles entre varias series o concéntralos en una sola para apoyarla al máximo.
- **Dashboard en Vivo:** Visualización inmediata de los resultados con lógica de "Patrocinio", "x2" y "Votos Patreon".
- **Integración Directa:** Sin formularios intermedios. Los datos viajan de la App a tu Google Sheet de forma segura.
- **Control por Excel:** Gestiona el mes activo y la lista de series directamente desde tu hoja de cálculo.
- **Modo Edición:** Permite a los usuarios modificar sus votos durante el mes en curso de forma sencilla.
- **Responsive & Dark Mode:** Interfaz moderna optimizada para móviles y escritorio.

## 🛠️ Estructura del Proyecto

- `/frontend`: Aplicación en React + Vite.
- `/backend`: API en Python (FastAPI) para gestión de Google Sheets.
- `/docs`: Guía de configuración del archivo Excel.

## 📋 Configuración Inicial

Para que la App funcione, debes preparar tu Google Sheet siguiendo la guía en [docs/SHEET_STRUCTURE.md](docs/SHEET_STRUCTURE.md).

### Variables de Entorno (.env)
Crea un archivo `.env` dentro de la carpeta `backend/` con:
```env
SPREADSHEET_ID=tu_id_de_google_sheet
MD_SVC='{"type": "service_account", ...contenido_del_json_de_google...}'
```

## 💻 Desarrollo Local

### Backend
```bash
cd backend
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python3 api/index.py
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## ☁️ Despliegue en Vercel

1. Conecta este repositorio a Vercel.
2. Configura las Environment Variables (\`SPREADSHEET_ID\` y \`MD_SVC\`) en el panel de Vercel.
3. El despliegue será automático para el Frontend y el Backend (Serverless).

---
*Herramienta desarrollada para facilitar las votaciones de la comunidad.*
