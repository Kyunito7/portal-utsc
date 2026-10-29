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
2. **SQL Editor → New query**, pega todo `supabase/autenticacion.sql` y presiona **Run**.
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
6. Abre el portal (`npx serve .`), crea una cuenta con tu correo real y abre el enlace que te llega.

## Importante sobre los correos

El servidor de correo que trae Supabase gratis es solo para pruebas: manda **muy pocos correos por hora** y solo a los correos del equipo del proyecto en Supabase. Para que les lleguen a todos los alumnos, en **Authentication → Emails → SMTP Settings** conecten un servicio de correo (por ejemplo Resend o Brevo, que tienen plan gratis).

También pueden traducir los correos en **Authentication → Emails → Templates** (por ejemplo «Confirma tu cuenta del Portal UTSC»).

## Hacer moderador a alguien

Al final de `supabase/autenticacion.sql` hay un `UPDATE` comentado: cámbiale el correo, córrelo solo esa parte y que esa persona vuelva a iniciar sesión.

## Pruebas

`npm test` incluye `tests/e2e/nube.spec.js`, que prueba el modo real con un Supabase simulado (registro, correo sin confirmar, contraseña filtrada, recuperación, enlace caducado y que el rol no se pueda falsificar).
