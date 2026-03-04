# Estructura del Google Sheet (Versión PRO)

Para que el sistema funcione correctamente, tu archivo de Google Sheets debe tener las siguientes pestañas:

## 1. Pestaña: ListaDeDonghuas
Esta es tu fuente de verdad. Lo que pongas aquí es lo que se verá en la web.
- **Columna A:** ID (Cualquier número o código).
- **Columna B:** Nombre (El nombre exacto de la serie).
- **Columna C:** ImagenURL (Opcional: Link directo a la imagen).

## 2. Pestaña: Votaciones
Aquí la App escribirá los votos reales.
- **Cabecera (Fila 1):** Solo escribe `Fecha`, `Email`, `Nick`, `Tier`.
- **Dinámico:** El sistema añadirá automáticamente columnas para cada serie nueva que encuentre en la lista maestra.

## 3. Pestaña: Configuracion
Controla el comportamiento de la App sin tocar código.
- **A1:** Variable | **B1:** Valor
- **A2:** Mes Activo | **B2:** 2026-03 (Cambia esto cada mes para resetear votaciones).

## 4. Pestaña: Resumen
Se genera automáticamente. No necesitas editarla. Contiene las fórmulas que calculan el Patrocinio, x2, Votos Patreon y Totales.
