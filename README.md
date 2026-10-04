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
| 2–6 nov | Datos offline y estrategias | ✅ |
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

**Cómo publicar un cambio:** después de modificar cualquier archivo, sube `VERSION` en `sw.js` (por ejemplo `v1.5.0` → `v1.5.1`). Si agregas un archivo nuevo, agrégalo también a la lista `APP_SHELL`.

**Cómo probarlo:**
1. `python3 -m http.server 8000` y abre `http://localhost:8000` (el service worker solo funciona en `localhost` o `https`).
2. Chrome → DevTools → **Application → Service workers**: debe aparecer `sw.js` como *activated and running*.
3. **Application → Cache storage → utsc-shell-v1.5.0**: ahí están los archivos guardados.
4. En **Network** marca **Offline** y recarga: el portal sigue funcionando.

## Semana 4: Datos offline y estrategias

Ahora el portal no solo **abre** sin internet: también **guarda lo que haces** sin internet y lo envía cuando vuelve la conexión.

**1. Los datos viven en IndexedDB** (`js/bd.js`). Una base `utsc-portal` con tres tablas:

| Tabla | Llave | Qué guarda |
|---|---|---|
| `cuentas` | correo | perfil y hash de la contraseña |
| `estado` | correo | publicaciones, pagos, trámites, viajes… de cada alumno |
| `cola` | id | acciones hechas sin conexión que faltan por enviar |

- Los datos que estaban en `localStorage` (semanas 2 y 3) se **migran solos** a IndexedDB la primera vez.
- Los guardados seguidos se juntan en una sola escritura (250 ms) y se fuerzan al cerrar la pestaña.
- Se pide **almacenamiento persistente** (`navigator.storage.persist()`) para que el navegador no borre los datos.

**2. Cola de envío / outbox** (`js/sync.js`). Publicar, comentar, escribir a un departamento y solicitar un trámite funcionan sin conexión:
- La acción se ve al instante con la etiqueta **«Pendiente de enviar»** y se guarda en la tabla `cola`.
- En el encabezado aparece un indicador con el número de pendientes (al tocarlo se ve la lista y el botón **Sincronizar ahora**).
- Se envía sola: de inmediato si hay internet, con el evento `online`, al volver a la pestaña o con **Background Sync** (`sync` en `sw.js`, Chrome/Edge/Android).
- Como todavía no hay backend, `App.api` simula el servidor. Para conectar uno real solo se cambia esa función por un `fetch`.

**3. Una estrategia de caché para cada tipo de dato:**

| Recurso | Estrategia | Por qué |
|---|---|---|
| App shell (HTML, CSS, JS, fuentes) | Precache + caché primero | Cambia solo con una versión nueva |
| Páginas (navegación) | Red primero, copia si falla | Siempre el HTML más nuevo si hay internet |
| Imágenes | Caché primero, máximo 60 | Pesan y casi no cambian |
| Noticias y eventos (`data/noticias.json`) | **Stale-while-revalidate** | Se muestran al instante y se actualizan en segundo plano; si llegó algo nuevo aparece «Hay noticias nuevas» |
| Publicar, comentar, contacto, trámites | **Cola + Background Sync** | No se pierde nada de lo escrito sin internet |
| Pagos (`/api/`) | **Solo red** | Un cobro no se puede guardar para después: sin conexión aparece «Necesitas conexión para pagar» |

**Cómo probarlo:** DevTools → **Network → Offline**, publica algo en el Blog y escribe a un departamento. Verás la etiqueta «Pendiente de enviar» y el indicador en el encabezado. En **Application → IndexedDB → utsc-portal → cola** están las acciones. Quita Offline y en un momento se envían solas.

## Cuentas de usuario

- Pantallas de **Iniciar sesión** y **Crear cuenta** (nombre, matrícula, carrera, cuatrimestre, grupo, correo `@utsc.edu.mx` y contraseña).
- Las cuentas se guardan en el navegador con **IndexedDB** (`js/cuentas.js`). La contraseña no se guarda: se guarda un hash **PBKDF2** con sal aleatoria.
- Los datos de cada alumno (publicaciones, pagos, trámites, viajes) se guardan por separado en IndexedDB (desde la semana 4).
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
data/noticias.json      noticias y eventos (stale-while-revalidate)
js/iconos.js            función I() para los iconos
js/datos.js             catálogo y datos de ejemplo
js/bd.js                base IndexedDB: cuentas, estado y cola
js/cuentas.js           cuentas de usuario (hash de contraseña)
js/nucleo.js            guardado, utilidades, modales, avisos
js/contenido.js         descarga de noticias y eventos
js/sync.js              cola de envío y sincronización
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
