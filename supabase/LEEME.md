# Inicio de sesión real con Supabase

El portal tiene dos modos (se elige en `js/config.js`):

| | Modo demostración | Modo real (Supabase) |
|---|---|---|
| Cuándo | `config.js` vacío (como viene) | `config.js` con tu URL y llave |
| Cuentas | solo en este navegador | en Supabase, sirven en cualquier dispositivo |
| Correo | no se verifica | llega un enlace para confirmarlo |
| Olvidé mi contraseña | no hay | llega un enlace por correo |
| Cuentas de prueba | sí (`demo@utsc.edu.mx`) | no |

## Qué protege

- **La contraseña nunca se guarda en el navegador ni en el código.** Viaja cifrada (HTTPS) y Supabase la guarda con bcrypt.
- **Correo confirmado:** no puedes entrar hasta abrir el enlace que llega a tu correo.
- **Contraseña robusta:** mínimo 10 caracteres, letras y números, una mayúscula o un símbolo, sin palabras comunes («password», «utsc»…), sin secuencias («1234», «abcd») y sin tu nombre, matrícula o correo. Hay un medidor que lo muestra al escribir.
- **Contraseñas filtradas:** se revisa contra la base de *Have I Been Pwned* sin enviar la contraseña (solo los primeros 5 caracteres de su huella SHA-1).
- **No revela quién tiene cuenta:** si el correo no existe o la contraseña está mal, el aviso es el mismo («Correo o contraseña incorrectos»). Lo mismo al recuperar la contraseña.
- **Límite de intentos:** después de 5 fallos hay que esperar (30 s, 1 min, 2 min… hasta 15 min). Supabase además limita los intentos en su servidor.
- **Enlaces seguros (PKCE):** el enlace del correo solo funciona en el navegador donde se pidió, y se borra de la dirección al usarlo.
- **Sesión que caduca sola:** el token dura poco y se renueva mientras usas el portal. Al cambiar la contraseña se cierra la sesión en los demás dispositivos, y en Configuración hay «Cerrar sesión en todos mis dispositivos».
- **El rol de moderador no se puede falsificar:** se lee de `app_metadata`, que solo se cambia desde el panel de Supabase.
- **CSP (Política de Seguridad de Contenido)** en `index.html`: el navegador solo ejecuta scripts del propio sitio, así un script inyectado no podría robar la sesión.

## Pasos para activarlo (una sola vez)

1. Entra a <https://supabase.com>, crea una cuenta gratis y un **New project** (o usa el que ya tiene el equipo para la base de datos).
2. **SQL Editor → New query**, pega todo `supabase/autenticacion.sql` y presiona **Run**. Después, en otra *New query*, pega todo `supabase/blog.sql` y presiona **Run** (crea el blog compartido; al final deben salir 6 tablas con `rls = true`).
3. **Authentication → Sign In / Providers → Email**: deja activado **Confirm email**. Si aparece, pon **Minimum password length = 10** y **Password requirements = Letters and digits**.
4. **Authentication → URL Configuration**:
   - **Site URL**: `http://localhost:3000`
   - **Redirect URLs** → *Add URL*: `http://localhost:*/**` (y después la dirección donde publiquen el portal, por ejemplo `https://kyunito7.github.io/portal-utsc/**`).
5. **Project Settings → API Keys**: copia la **Project URL** y la llave **publishable** (o *anon public*) y pégalas en `js/config.js`:

   ```js
   supabaseUrl: "https://TU-PROYECTO.supabase.co",
   supabaseKey: "sb_publishable_xxxxxxxx",
   ```

   Esas dos llaves son públicas a propósito. **Nunca** pongas la llave `secret` / `service_role`.
6. Abre el portal (`python3 -m http.server 8000`), crea una cuenta con tu correo real y abre el enlace que te llega.
7. **Authentication → Emails → SMTP Settings**: conecta un correo (sección de abajo). Sin esto, solo el equipo recibe el enlace de confirmación.

## Importante sobre los correos

El servidor de correo que trae Supabase gratis es solo para pruebas: manda **muy pocos correos por hora** y solo a los correos del equipo del proyecto en Supabase. Para que les lleguen a todos los alumnos, en **Authentication → Emails → SMTP Settings** conecten un servicio de correo (por ejemplo Resend o Brevo, que tienen plan gratis).

También pueden traducir los correos en **Authentication → Emails → Templates** (por ejemplo «Confirma tu cuenta del Portal UTSC»).

## Hacer moderador a alguien

Al final de `supabase/autenticacion.sql` hay un `UPDATE` comentado: cámbiale el correo, córrelo solo esa parte y que esa persona vuelva a iniciar sesión.

## Pruebas

`npm test` incluye `tests/e2e/nube.spec.js`, que prueba el modo real con un Supabase simulado (registro, correo sin confirmar, contraseña filtrada, recuperación, enlace caducado y que el rol no se pueda falsificar).

## Para la evaluación (cuenta de prueba)

Aunque Supabase esté activado, la pantalla de inicio sigue teniendo **«Entrar con la cuenta de prueba»** y **«Entrar como moderador de prueba»**. Esas cuentas usan el modo demostración (sus datos se guardan solo en ese navegador), así la maestra puede revisar todo el portal sin registrarse. Al cerrar sesión se regresa al modo real.

Para que la maestra pruebe el **blog compartido real**, créenle una cuenta (Authentication → Users → *Add user* → *Create new user*, con *Auto Confirm User*) y, si quieren que vea el panel, háganla moderadora con el `UPDATE` de `autenticacion.sql`.

## Blog compartido (`supabase/blog.sql`)

| Tabla | Qué guarda | Quién puede |
|---|---|---|
| `blog_publicaciones` | publicaciones, imagen y estado de moderación | ver lo aprobado (o lo propio); publicar a su nombre; solo moderadores cambian el estado |
| `blog_comentarios` | comentarios | igual que las publicaciones; solo en publicaciones aprobadas |
| `blog_reacciones` | me gusta | cada quien pone o quita el suyo |
| `blog_reportes` | reportes (con 3 se oculta sola) | cada quien reporta a su nombre; solo él y los moderadores lo ven |
| `blog_avisos` | avisos entre usuarios | un alumno solo avisa a los moderadores; los moderadores a cualquiera |
| `blog_bitacora` | decisiones de moderación | solo moderadores |

Las reglas se probaron con 39 pruebas en PostgreSQL local (`supabase/pruebas/blog-rls.sql`; las instrucciones están al inicio del archivo).

## Moderación con IA (opcional)

`supabase/functions/moderar/index.ts` revisa el texto **y la imagen** de cada publicación con IA. La clave de la IA se guarda en los secretos de Supabase, nunca en el portal.

1. Consigue una clave de API de Anthropic (<https://console.anthropic.com>; tiene costo por uso, muy bajo para un blog escolar).
2. Desde la carpeta del proyecto:

   ```bash
   npx supabase login
   npx supabase link --project-ref TU-PROYECTO
   npx supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
   npx supabase functions deploy moderar
   ```

3. En `js/config.js` cambia `moderacionIA: false` a `true` y sube `VERSION` en `sw.js`.

Si la función falla o tarda más de 8 segundos, decide el filtro local (`js/moderacion.js`), y la IA nunca puede aprobar algo que el filtro bloquearía. Sin IA, toda publicación con imagen pasa a revisión de un moderador.
