# Portal Universitario UTSC

Aplicación Web Progresiva (PWA) que simula el portal estudiantil de la Universidad Tecnológica de Santa Catarina: blog estudiantil, noticias, directorio, kárdex, horarios, pagos, trámites, biblioteca y DriverUTSC.

Proyecto de la materia Aplicaciones Web — Ingeniería en Desarrollo de Software Multiplataforma, grupo DSM04AV.

## Equipo

| Integrante | Rol |
|---|---|
| Juan Manuel Flores Fernández | Líder de proyecto y backend |
| Elisa Berenice Ovalle Sánchez | Interfaz |
| Juan Francisco Sánchez Pérez | Diseño (Figma) |
| José Antonio Prado Segura | Base de datos |

## Avance por semana

| Semana | Tema | Estado |
|---|---|---|
| 21–25 sep | Propuesta y alcance (`docs/propuesta-y-alcance.docx`) | ✅ |
| 5–9 oct | App shell y base web | ✅ |
| 19–23 oct | Service worker y caché | ✅ |
| 2–6 nov | Datos offline y estrategias | Pendiente |
| 16–20 nov | Capacidades avanzadas y rendimiento | Pendiente |
| 1–4 dic | Entrega y presentación | Pendiente |

## Semana 2: App shell y base web

- **App shell:** el encabezado, la barra de módulos y el pie están escritos directamente en `index.html` (dentro de `#shell`). Se pintan al instante; JavaScript solo cambia el contenido de `<main id="vista">`. Mientras carga, se ve un esqueleto.
- **Código separado:** `css/app.css`, `js/datos.js`, `js/nucleo.js`, `js/menu-usuario.js`, `js/vistas/*.js` (una vista por archivo) y `js/app.js` (rutas y render).
- **Manifest:** `manifest.webmanifest` con nombre, colores, `display: standalone`, iconos de 192 y 512 px (incluye uno *maskable*) y accesos directos.
- **Iconos:** set de iconos de línea (Lucide, licencia ISC) en un sprite SVG al inicio de `index.html`. En JS se usan con `I("bell")`.

## Semana 3: Service worker y caché

El portal funciona **sin internet** después de abrirlo una vez con conexión.

- **`sw.js`** (en la raíz del proyecto) es el service worker:
  - **Instalación:** guarda en caché todo el app shell (HTML, CSS, JS, fuentes, iconos y fotos), 34 archivos (~1.3 MB).
  - **Activación:** borra los cachés de versiones anteriores y toma el control de las pestañas abiertas.
  - **Peticiones (`fetch`)**, con una estrategia según el tipo de archivo:

| Tipo de petición | Estrategia | Por qué |
|---|---|---|
| Páginas (navegación) | Red primero, si falla la copia guardada | Siempre intenta el HTML más nuevo, pero abre aunque no haya internet |
| CSS, JS y fuentes (app shell) | Caché primero | Carga instantánea; se renuevan al cambiar de versión |
| Imágenes | Caché primero + se guardan al pedirlas (máx. 60) | Las fotos no se vuelven a descargar y no se llena el teléfono |
| Otros sitios (IEEE, Moodle…) | No se interceptan | No es contenido nuestro |

- **`js/pwa.js`** registra el service worker y muestra:
  - **Aviso de versión nueva** con botón **Actualizar**: el service worker nuevo espera hasta que el usuario acepta; luego se activa (`skipWaiting`) y la página se recarga una sola vez.
  - **Aviso de «Sin conexión»** y una línea amarilla en el encabezado mientras no hay internet.
  - En **Configuración → Uso sin conexión**: versión del caché, número de archivos guardados y espacio usado.

**Cómo publicar un cambio:** después de modificar cualquier archivo, sube `VERSION` en `sw.js` (por ejemplo `v1.4.0` → `v1.4.1`). Si agregas un archivo nuevo, agrégalo también a la lista `APP_SHELL`.

**Cómo probarlo:**
1. `python3 -m http.server 8000` y abre `http://localhost:8000` (el service worker solo funciona en `localhost` o `https`).
2. Chrome → DevTools → **Application → Service workers**: debe aparecer `sw.js` como *activated and running*.
3. **Application → Cache storage → utsc-shell-v1.4.0**: ahí están los archivos guardados.
4. En **Network** marca **Offline** y recarga: el portal sigue funcionando.

## Cuentas de usuario

- Pantallas de **Iniciar sesión** y **Crear cuenta** (nombre, matrícula, carrera, cuatrimestre, grupo, correo `@utsc.edu.mx` y contraseña).
- Las cuentas se guardan en el navegador con **IndexedDB** (`js/cuentas.js`). La contraseña no se guarda: se guarda un hash **PBKDF2** con sal aleatoria.
- Los datos de cada alumno (publicaciones, pagos, trámites, viajes) se guardan por separado en `localStorage`.
- Botón **«Explorar con una cuenta de prueba»** para revisar el portal sin registrarse (`demo@utsc.edu.mx` / `demo2026`).
- Más adelante `App.cuentas` se puede reemplazar por Supabase sin cambiar las pantallas.

## Fluidez

- Transición suave entre secciones con la **View Transitions API** (con respaldo para navegadores que no la tienen).
- Tarjetas que aparecen en cascada, respuesta al pasar el mouse y al presionar, ventanas que entran y salen animadas (en celular suben desde abajo).
- El encabezado toma sombra al hacer scroll y la barra de módulos se esconde al bajar y regresa al subir.
- Buscadores con espera de 120 ms para no trabarse mientras escribes.
- Fuentes guardadas en `fonts/` para que se vean igual sin internet.
- Solo se animan `transform` y `opacity`, y todo se desactiva si el sistema tiene «reducir movimiento».

## Cómo correrlo

El manifest y el service worker no funcionan abriendo el archivo con doble clic. Hay que usar un servidor local:

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

O en VS Code con la extensión **Live Server**.

Para revisar el manifest: Chrome → DevTools → **Application → Manifest**.

## Estructura

```
index.html              app shell + sprite de iconos
sw.js                   service worker (caché y modo sin conexión)
manifest.webmanifest
css/app.css
js/iconos.js            función I() para los iconos
js/cuentas.js           cuentas de usuario (IndexedDB + hash de contraseña)
js/datos.js             catálogo y datos de ejemplo
js/nucleo.js            guardado, utilidades, modales, avisos
js/menu-usuario.js      perfil, configuración, privacidad
js/vistas/*.js          una vista por sección
js/app.js               login, shell, rutas y render
js/pwa.js               registro del service worker y avisos de conexión/versión
img/                    fotos, logo e iconos de la app
fonts/                  Outfit, Fraunces y JetBrains Mono (licencia SIL OFL)
docs/                   documentos entregables
```

Cuenta de prueba: `demo@utsc.edu.mx` / `demo2026` (o usa el botón de la pantalla de inicio).

## Ramas

- `main` — versiones entregadas a la docente.
- `develop` — integración del trabajo del equipo.
- `feature/nombre-de-la-funcion` — trabajo individual.

```bash
git checkout develop
git pull origin develop
git checkout -b feature/mi-funcion
# ...trabajar y hacer commits...
git push origin feature/mi-funcion
```

Después se abre un pull request hacia `develop` para revisión.
