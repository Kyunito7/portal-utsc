# Portal Universitario UTSC

Aplicación Web Progresiva (PWA) que simula el portal estudiantil de la Universidad Tecnológica de Santa Catarina. Los módulos institucionales se muestran bloqueados y el desarrollo se concentra en el **blog estudiantil**, con funcionamiento sin conexión y moderación de contenido con inteligencia artificial.

Proyecto escolar — Ingeniería en Desarrollo de Software Multiplataforma, grupo DSM04AV.

## Equipo

| Integrante | Rol |
|---|---|
| Juan Manuel Flores Fernández | Líder de proyecto y backend |
| Elisa Berenice Ovalle Sánchez | Interfaz |
| Juan Francisco Sánchez Pérez | Diseño (Figma) |
| [Tony] | Base de datos |

## Requisitos

- Node.js 18 o superior
- npm

## Cómo ejecutarlo

```bash
git clone https://github.com/Kyunito7/portal-utsc.git
cd portal-utsc
npm install
npm run dev
```

El portal queda en `http://localhost:5173`.

Para probar las funciones de PWA hay que generar la versión de producción:

```bash
npm run build
npm run preview
```

## Estructura

```
src/
  components/   Encabezado, barra de módulos y pie (app shell)
  pages/        Vistas del portal
  data/         Datos de prueba mientras no existe la API
  styles/       Estilos globales y variables de color
public/icons/   Iconos del manifiesto (pendientes)
docs/           Documentación entregable
```

## Ramas

- `main` — versiones entregadas al docente, una etiqueta por entrega.
- `develop` — integración del trabajo del equipo.
- `feature/nombre-de-la-funcion` — trabajo individual.

Flujo de trabajo:

```bash
git checkout develop
git pull origin develop
git checkout -b feature/muro-publicaciones
# ...trabajar y hacer commits...
git push origin feature/muro-publicaciones
```

Después se abre un pull request hacia `develop` para revisión.

## Avance por entrega

- [x] Propuesta y alcance (21–25 sep)
- [ ] App shell y base web (5–9 oct)
- [ ] Service worker y caché (19–23 oct)
- [ ] Datos offline y estrategias (2–6 nov)
- [ ] Capacidades avanzadas y rendimiento (16–20 nov)
- [ ] Entrega final y presentación (1–4 dic)
