# Portal Universitario UTSC

PWA del portal estudiantil de la Universidad Tecnológica de Santa Catarina.

## Avance por semana

| Semana | Tema | Estado |
|---|---|---|
| 21–25 sep | Propuesta y alcance | ✅ |
| 5–9 oct | App shell y base web | ✅ |
| 19–23 oct | Service worker y caché | Pendiente |
| 2–6 nov | Datos offline y estrategias | Pendiente |
| 16–20 nov | Capacidades avanzadas y rendimiento | Pendiente |
| 1–4 dic | Entrega y presentación | Pendiente |

## Semana 2: App shell y base web

- **App shell:** el encabezado, la barra de módulos y el pie están escritos directamente en `index.html` (dentro de `#shell`). Se pintan al instante; JavaScript solo cambia el contenido de `<main id="vista">`. Mientras carga, se ve un esqueleto.
- **Código separado:** `css/app.css`, `js/datos.js`, `js/nucleo.js`, `js/menu-usuario.js`, `js/vistas/*.js` (una vista por archivo) y `js/app.js` (rutas y render).
- **Manifest:** `manifest.webmanifest` con nombre, colores, `display: standalone`, iconos de 192 y 512 px (incluye uno *maskable*) y accesos directos.
- **Iconos:** set de iconos de línea (Lucide, licencia ISC) en un sprite SVG al inicio de `index.html`. En JS se usan con `I("bell")`.

## Cómo correrlo

El manifest (y en la semana 3 el service worker) no funcionan abriendo el archivo con doble clic. Hay que usar un servidor local:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

O en VS Code con la extensión **Live Server**.

Para revisar el manifest: Chrome → DevTools → **Application → Manifest**.

## Estructura

```
index.html              app shell + sprite de iconos
manifest.webmanifest
css/app.css
js/iconos.js            función I() para los iconos
js/datos.js             catálogo y datos de ejemplo
js/nucleo.js            guardado, utilidades, modales, avisos
js/menu-usuario.js      perfil, configuración, privacidad
js/vistas/*.js          una vista por sección
js/app.js               login, shell, rutas y render
img/                    fotos, logo e iconos de la app
```

Cuenta de prueba: `27254@utsc.edu.mx` / `utsc2026`.
