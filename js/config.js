/* Configuración del inicio de sesión (Supabase Auth).

   ¿Qué es esto?
   - Si dejas los dos valores vacíos, el portal funciona en MODO DEMOSTRACIÓN:
     las cuentas se guardan solo en este navegador y hay cuentas de prueba.
   - Si pones los datos de tu proyecto de Supabase, el portal usa cuentas REALES:
     se registra con un correo de verdad, llega un enlace para confirmarlo,
     y la contraseña la guarda Supabase cifrada (nunca el navegador ni este código).

   ¿De dónde salen?
   Supabase → tu proyecto → Project Settings → API Keys (o "Data API"):
   - supabaseUrl  = "Project URL", por ejemplo "https://abcdxyz.supabase.co"
   - supabaseKey  = la llave "publishable" (empieza con sb_publishable_) o la "anon public".

   Esas dos SÍ se pueden subir a GitHub: son públicas a propósito.
   NUNCA pongas aquí la llave "secret" ni la "service_role": esa da acceso total.

   Guía completa paso a paso: supabase/LEEME.md */
window.App = window.App || {};
App.config = {
  supabaseUrl: "https://kguecngeowhmkiygmetp.supabase.co",
  supabaseKey: "sb_publishable_38hP84hdz-k1XF3NkLa-hw_vDSgkDxa",

  // true = solo se aceptan correos que terminan en @utsc.edu.mx
  // false = cualquier correo real (Gmail, Outlook, etc.); igual se tiene que confirmar.
  soloCorreoInstitucional: false
};
