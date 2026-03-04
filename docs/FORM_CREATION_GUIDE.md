# Guía para la Creación de Google Forms Compatibles

Para que la aplicación detecte automáticamente los campos de tu formulario de Google, sigue estas reglas al nombrar las preguntas:

## 1. Campos Obligatorios

La app busca palabras clave (keywords) en los títulos de las preguntas para mapear los IDs.

| Campo | Palabras Clave Recomendadas |
| :--- | :--- |
| **Email** | `Email`, `Correo`, `Mail`, `Patreon` |
| **Nick** | `Nick`, `Usuario`, `Nombre`, `Name` |
| **Tier** | `Tier`, `Nivel`, `Rango`, `Perteneces` |
| **Series** | `Serie`, `Voto`, `Donghua` |

## 2. Tipos de Estructura Soportados

### A. Formulario Lineal (Simple)
Todas las preguntas están en una sola página.
- **Ejemplo:** Nick -> Email -> Tier -> Serie 1 -> Serie 2... hasta Serie 40.
- La app simplemente llenará las series en el orden en que las encuentre.

### B. Formulario Condicional (Por Secciones)
Las series se muestran en secciones diferentes según el Tier elegido.
- **Regla de Oro:** El nombre del Tier debe aparecer en el título de las preguntas de esa sección.
- **Ejemplo de Títulos:**
  - `Serie #1 (Celestial $25)`
  - `Serie #2 (Celestial $25)`
  - `Serie #1 (Base $5)`
- **Cómo funciona:** La app detecta que "Celestial" está en el título de la pregunta y solo usa esos IDs cuando el usuario elige el Tier "Celestial" en la UI.

## 3. Notas Técnicas sobre Google Forms

- **IDs Dinámicos:** Cada vez que "duplicas" un formulario en Google, los IDs (`entry.XXXX`) cambian. Por eso es vital que la app analice la URL cada mes.
- **PageHistory:** La app genera automáticamente el historial de navegación (ej. `0,7`) para saltar directamente a la sección correcta y evitar el error **400 Bad Request**.
- **Confirmación:** Siempre es recomendable que el formulario tenga activada la opción "Enviar una copia de las respuestas" para que el usuario tenga un respaldo de su voto.

---
*Esta guía ayuda a asegurar que la automatización sea 100% efectiva.*
