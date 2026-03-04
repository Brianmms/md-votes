# Mundo Donghua - Votación PRO (Directo a Sheets)

Esta es una evolución profesional de la herramienta de votación para patrocinadores de Mundo Donghua. Ahora los votos se registran directamente en un Google Sheet, permitiendo votaciones acumulativas y un dashboard de resultados en tiempo real.

## Características

- **Votación por Puntos:** Reparte tus votos disponibles entre varias series o concéntralos en una sola para "salvarla".
- **Dashboard en Vivo:** Visualiza cómo van las votaciones globales sin ver datos privados.
- **Integración Directa con Google Sheets:** Sin formularios intermedios.
- **Sincronización Inteligente:** Lee la lista de series directamente de una hoja de cálculo o mediante scraping automático.
- **Seguridad:** Los datos sensibles se manejan mediante variables de entorno en el backend.

## Estructura del Google Sheet

Para que la app funcione, crea un Sheet con las siguientes hojas:
1. **`ListaDeDonghuas`**: Columnas `Nombre`, `ImagenURL` (Opcional).
2. **`Votaciones`**: Se generará automáticamente. Una fila por usuario, columnas por Donghua.
3. **`Resumen`**: (Opcional) Hoja con sumatorias de votos.

## Configuración de Desarrollo

### Backend (.env)
Crea un archivo `.env` en la raíz con:
```env
SPREADSHEET_ID=tu_id_de_google_sheet
MD_SVC={"type": "service_account", ...contenido_del_json_de_google...}
```

### Comandos
1. **Instalar:** `npm install` y `pip install -r requirements.txt`.
2. **Local:** `python api/index.py` y `npm run dev`.

## Despliegue

La app está lista para **Vercel**. Solo recuerda configurar las variables `SPREADSHEET_ID` y `MD_SVC` en el panel de Vercel.
