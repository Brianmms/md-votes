# Estructura del Google Sheet

Para que el sistema funcione correctamente, tu archivo de Google Sheets debe estar configurado exactamente como se describe a continuación.

## 1. Pestaña: `ListaDeDonghuas`
Es la fuente de datos para el catálogo de series.
- **Columna A:** ID (Número correlativo o identificador único).
- **Columna B:** Nombre (El nombre exacto de la serie).
- **Columna C:** ImagenURL (**Opcional:** Link directo a la imagen. Si se deja vacío, la serie se mostrará solo con su nombre).

## 2. Pestaña: `Votaciones`
Registro de votos en tiempo real.
- **Fila 1 (Encabezados):** Escribe inicialmente `Fecha`, `Email`, `Nick`, `Tier`.
- **Dinámico:** El sistema añadirá automáticamente columnas a la derecha para cada serie nueva que encuentre en la lista maestra.

## 3. Pestaña: `Configuracion`
Control maestro de la aplicación.
- **A1:** `Variable` | **B1:** `Valor`
- **A2:** `Mes Activo` | **B2:** `2026-03` (Formato YYYY-MM).
- **A3:** `Habilitar Encuesta` | **B3:** `si` o `no`.
- **A4:** `Mostrar Votaciones` | **B4:** `si` o `no` (Muestra/Oculta el dashboard lateral).
- **A5:** `Fecha Limite Edicion` | **B5:** `2026-03-20` (Formato YYYY-MM-DD).

## 4. Pestaña: `Resumen`
Se genera y actualiza automáticamente.
- Contiene las fórmulas que calculan **Patrocinio**, **x2**, **Votos Patreon** (Manual) y **Totales**.
- **Nota:** La columna "Votos Patreon" en esta hoja permite entrada manual de datos por parte del administrador.
