-- ============================================================================
--  PORTAL UNIVERSITARIO UTSC · Script 04: SEGURIDAD (RLS)   (PostgreSQL / SUPABASE)
--  Requiere pg_01_esquema_supabase.sql, pg_02_datos_supabase.sql y pg_03_vistas_y_consultas.sql.
--  Pegar COMPLETO en Supabase → SQL Editor → RUN.
--
--  ¿QUÉ HACE Y POR QUÉ?
--  En Supabase, la "anon key" y la "authenticated key" viajan en el navegador: cualquiera
--  las puede ver con F12. Lo único que impide que un extraño lea o modifique la base con esa
--  llave es Row Level Security (RLS). Sin RLS + políticas, exponer el esquema al API = abrir
--  TODA la base (incluidos los password_hash). Este script cierra eso.
--
--  DOS FASES (este script deja la base lista para las dos):
--   FASE A — PROTECCIÓN INMEDIATA (aplica HOY, aunque todavía no uses Supabase Auth):
--     · Activa RLS en TODAS las tablas de utsc_portal  → sin política, nadie ve nada (deny-by-default).
--     · Le quita a anon/authenticated todo permiso sobre el esquema.
--     · Bloquea a nivel de COLUMNA la lectura de password_hash (RLS es por fila, no por columna).
--     · service_role (Edge Functions del servidor) NO se ve afectado: ignora RLS por diseño.
--     Resultado: mientras el cliente hable con la base por Edge Functions, la llave pública no sirve.
--
--   FASE B — POLÍTICAS POR USUARIO (se "encienden" solas cuando migres a Supabase Auth):
--     · Cada usuario se identifica por auth.email() (el correo con el que inició sesión en Supabase Auth)
--       emparejado con usuarios.correo. Sin Supabase Auth, auth.email() es NULL → las políticas
--       de dueño no dejan ver nada (lo cual es seguro). Con Supabase Auth, empiezan a funcionar.
--     · Importante: para que esto funcione, en la migración cada alumno debe existir en Supabase Auth
--       con el MISMO correo que su fila de utsc_portal.usuarios.
--
--  Es idempotente: se puede correr varias veces sin error.
-- ============================================================================

SET search_path TO utsc_portal, public;

-- ----------------------------------------------------------------------------
-- 0. Comprobación: el esquema debe existir.
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regnamespace('utsc_portal') IS NULL THEN
    RAISE EXCEPTION 'No existe el esquema utsc_portal. Corre primero pg_01, pg_02 y pg_03.';
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. FASE A — Activar RLS en TODAS las tablas del esquema (deny-by-default).
--    Con RLS activo y sin política, ni anon ni authenticated ven una sola fila.
-- ----------------------------------------------------------------------------
DO $$
DECLARE t text;
BEGIN
  FOR t IN
    SELECT tablename FROM pg_tables WHERE schemaname = 'utsc_portal'
  LOOP
    -- ENABLE (no FORCE): el dueño de la tabla (rol postgres del editor SQL) sigue viendo
    -- todo para mantenimiento; anon y authenticated NO son dueños, así que sí quedan sujetos.
    EXECUTE format('ALTER TABLE utsc_portal.%I ENABLE ROW LEVEL SECURITY;', t);
  END LOOP;
END $$;

-- ----------------------------------------------------------------------------
-- 2. FASE A — Quitar permisos al rol público y a anon; dar lo mínimo a authenticated.
--    (RLS decide las FILAS; estos GRANT deciden qué OPERACIONES puede intentar el rol.
--     Para ver una fila hacen falta las dos cosas: el GRANT y una política que la permita.)
-- ----------------------------------------------------------------------------
-- El rol anónimo (sin iniciar sesión) no toca utsc_portal en absoluto.
REVOKE ALL ON ALL TABLES    IN SCHEMA utsc_portal FROM anon, public;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA utsc_portal FROM anon, public;
REVOKE ALL ON ALL FUNCTIONS IN SCHEMA utsc_portal FROM anon, public;
REVOKE USAGE ON SCHEMA utsc_portal FROM anon, public;

-- El rol autenticado puede USAR el esquema y las operaciones básicas; RLS limita las filas.
GRANT USAGE ON SCHEMA utsc_portal TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA utsc_portal TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA utsc_portal TO authenticated;

-- service_role (Edge Functions / backend) mantiene acceso total; ignora RLS por diseño.
GRANT USAGE ON SCHEMA utsc_portal TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA utsc_portal TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA utsc_portal TO service_role;

-- ----------------------------------------------------------------------------
-- 3. FASE A — Proteger password_hash a nivel de COLUMNA.
--    RLS es por fila; esto impide que authenticated/anon lean la columna aunque
--    una política les deje ver la fila. Las contraseñas solo las toca service_role.
-- ----------------------------------------------------------------------------
REVOKE SELECT (password_hash), UPDATE (password_hash) ON utsc_portal.usuarios FROM authenticated, anon;

-- ----------------------------------------------------------------------------
-- 4. Funciones de ayuda: quién es el usuario actual y si es staff.
--    Usan auth.email() de Supabase Auth. SECURITY DEFINER para poder leer usuarios
--    sin quedar atrapadas en las políticas (evita recursión de RLS).
-- ----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION utsc_portal.uid_actual()
RETURNS integer
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = utsc_portal, public AS $$
  SELECT id FROM utsc_portal.usuarios WHERE correo = auth.email() LIMIT 1;
$$;

CREATE OR REPLACE FUNCTION utsc_portal.es_staff()
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = utsc_portal, public AS $$
  SELECT COALESCE(
    (SELECT rol IN ('admin','docente') FROM utsc_portal.usuarios WHERE correo = auth.email()),
    false);
$$;

-- Solo el servidor ejecuta estas ayudas; el cliente no las llama directamente.
REVOKE ALL ON FUNCTION utsc_portal.uid_actual() FROM public, anon;
REVOKE ALL ON FUNCTION utsc_portal.es_staff()  FROM public, anon;
GRANT EXECUTE ON FUNCTION utsc_portal.uid_actual() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION utsc_portal.es_staff()  TO authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 5. Perfil público: una vista con SOLO los campos que otros alumnos pueden ver
--    (para mostrar el autor de una publicación, su nombre y foto). Nunca el correo,
--    teléfono ni el hash. El cliente lee de aquí, no de la tabla usuarios.
-- ----------------------------------------------------------------------------
CREATE OR REPLACE VIEW utsc_portal.perfiles_publicos
WITH (security_invoker = true) AS
  SELECT id, nombre, apellido_paterno, apellido_materno, foto_url, sobre_mi, rol
  FROM utsc_portal.usuarios
  WHERE activo;
-- La vista necesita su propia política en la tabla base; la damos abajo (SELECT de perfiles).
GRANT SELECT ON utsc_portal.perfiles_publicos TO authenticated;

-- ============================================================================
--  FASE B — POLÍTICAS POR TABLA
--  Se borran antes de crearse (DROP POLICY IF EXISTS) para que el script sea repetible.
-- ============================================================================

-- ---------- 6. usuarios ----------
-- Cada quien lee/edita SU fila; el staff lee todas. Nadie crea ni borra usuarios desde
-- el cliente (eso lo hace el registro por Edge Function con service_role).
DROP POLICY IF EXISTS usuarios_sel ON utsc_portal.usuarios;
CREATE POLICY usuarios_sel ON utsc_portal.usuarios FOR SELECT TO authenticated
  USING (correo = auth.email() OR utsc_portal.es_staff());
DROP POLICY IF EXISTS usuarios_upd ON utsc_portal.usuarios;
CREATE POLICY usuarios_upd ON utsc_portal.usuarios FOR UPDATE TO authenticated
  USING (correo = auth.email())
  WITH CHECK (correo = auth.email());

-- ---------- 7. Catálogos y contenido público: SOLO LECTURA para autenticados ----------
-- Son datos de referencia compartidos (carreras, materias, noticias, eventos, biblioteca…).
-- Escribirlos queda para el staff/servidor.
DO $$
DECLARE t text;
  catalogos text[] := ARRAY[
    'carreras','periodos','grupos','materias','docentes','docente_materia',
    'departamentos','categorias_blog','hashtags','publicacion_hashtag',
    'categorias_noticia','noticias','eventos','avisos','categorias_libro',
    'libros','recursos_digitales','rutas_driver','ruta_dias','tramites_catalogo',
    'horario_clases'
  ];
BEGIN
  FOREACH t IN ARRAY catalogos LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_sel ON utsc_portal.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_sel ON utsc_portal.%I FOR SELECT TO authenticated USING (true);', t, t);
  END LOOP;
END $$;

-- ---------- 8. Blog: publicaciones, comentarios, reacciones ----------
-- Lectura pública entre alumnos; escritura solo de lo propio (o staff).
DROP POLICY IF EXISTS pub_sel ON utsc_portal.publicaciones;
CREATE POLICY pub_sel ON utsc_portal.publicaciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS pub_ins ON utsc_portal.publicaciones;
CREATE POLICY pub_ins ON utsc_portal.publicaciones FOR INSERT TO authenticated
  WITH CHECK (autor_id = utsc_portal.uid_actual());
DROP POLICY IF EXISTS pub_mod ON utsc_portal.publicaciones;
CREATE POLICY pub_mod ON utsc_portal.publicaciones FOR UPDATE TO authenticated
  USING (autor_id = utsc_portal.uid_actual() OR utsc_portal.es_staff())
  WITH CHECK (autor_id = utsc_portal.uid_actual() OR utsc_portal.es_staff());
DROP POLICY IF EXISTS pub_del ON utsc_portal.publicaciones;
CREATE POLICY pub_del ON utsc_portal.publicaciones FOR DELETE TO authenticated
  USING (autor_id = utsc_portal.uid_actual() OR utsc_portal.es_staff());

DROP POLICY IF EXISTS com_sel ON utsc_portal.comentarios;
CREATE POLICY com_sel ON utsc_portal.comentarios FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS com_ins ON utsc_portal.comentarios;
CREATE POLICY com_ins ON utsc_portal.comentarios FOR INSERT TO authenticated
  WITH CHECK (usuario_id = utsc_portal.uid_actual());
DROP POLICY IF EXISTS com_del ON utsc_portal.comentarios;
CREATE POLICY com_del ON utsc_portal.comentarios FOR DELETE TO authenticated
  USING (usuario_id = utsc_portal.uid_actual() OR utsc_portal.es_staff());

DROP POLICY IF EXISTS rea_sel ON utsc_portal.reacciones;
CREATE POLICY rea_sel ON utsc_portal.reacciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS rea_ins ON utsc_portal.reacciones;
CREATE POLICY rea_ins ON utsc_portal.reacciones FOR INSERT TO authenticated
  WITH CHECK (usuario_id = utsc_portal.uid_actual());
DROP POLICY IF EXISTS rea_del ON utsc_portal.reacciones;
CREATE POLICY rea_del ON utsc_portal.reacciones FOR DELETE TO authenticated
  USING (usuario_id = utsc_portal.uid_actual());

-- ---------- 9. Reportes: los ve su autor y el staff; cualquiera reporta ----------
DROP POLICY IF EXISTS rep_sel ON utsc_portal.reportes;
CREATE POLICY rep_sel ON utsc_portal.reportes FOR SELECT TO authenticated
  USING (usuario_id = utsc_portal.uid_actual() OR utsc_portal.es_staff());
DROP POLICY IF EXISTS rep_ins ON utsc_portal.reportes;
CREATE POLICY rep_ins ON utsc_portal.reportes FOR INSERT TO authenticated
  WITH CHECK (usuario_id = utsc_portal.uid_actual());
DROP POLICY IF EXISTS rep_upd ON utsc_portal.reportes;
CREATE POLICY rep_upd ON utsc_portal.reportes FOR UPDATE TO authenticated
  USING (utsc_portal.es_staff()) WITH CHECK (utsc_portal.es_staff());

-- ---------- 10. Datos privados ligados al usuario (usuario_id) ----------
-- Cada quien ve y escribe SOLO lo suyo; el staff puede leer.
DO $$
DECLARE t text;
  propias_usuario text[] := ARRAY['ajustes_usuario','notificaciones','actividad'];
BEGIN
  FOREACH t IN ARRAY propias_usuario LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I_own ON utsc_portal.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_own ON utsc_portal.%I FOR ALL TO authenticated
         USING (usuario_id = utsc_portal.uid_actual() OR utsc_portal.es_staff())
         WITH CHECK (usuario_id = utsc_portal.uid_actual());', t, t);
  END LOOP;
END $$;

-- ---------- 11. Datos privados ligados al alumno (alumno_id = usuarios.id) ----------
DO $$
DECLARE t text;
  propias_alumno text[] := ARRAY[
    'alumnos','inscripciones','solicitudes_tramite','cargos','prestamos','mensajes_contacto'
  ];
  col  text;
BEGIN
  FOREACH t IN ARRAY propias_alumno LOOP
    -- alumnos usa usuario_id como PK; el resto usa alumno_id.
    col := CASE WHEN t = 'alumnos' THEN 'usuario_id' ELSE 'alumno_id' END;
    EXECUTE format('DROP POLICY IF EXISTS %I_own ON utsc_portal.%I;', t, t);
    EXECUTE format(
      'CREATE POLICY %I_own ON utsc_portal.%I FOR ALL TO authenticated
         USING (%I = utsc_portal.uid_actual() OR utsc_portal.es_staff())
         WITH CHECK (%I = utsc_portal.uid_actual());', t, t, col, col);
  END LOOP;
END $$;

-- ---------- 12. Pagos: el dueño es indirecto (pagos.cargo_id → cargos.alumno_id) ----------
DROP POLICY IF EXISTS pagos_own ON utsc_portal.pagos;
CREATE POLICY pagos_own ON utsc_portal.pagos FOR ALL TO authenticated
  USING (
    utsc_portal.es_staff() OR EXISTS (
      SELECT 1 FROM utsc_portal.cargos c
      WHERE c.id = pagos.cargo_id AND c.alumno_id = utsc_portal.uid_actual()))
  WITH CHECK (EXISTS (
      SELECT 1 FROM utsc_portal.cargos c
      WHERE c.id = pagos.cargo_id AND c.alumno_id = utsc_portal.uid_actual()));

-- ---------- 13. DriverUTSC: reservas de viaje (pasajero o conductor de la ruta) ----------
DROP POLICY IF EXISTS viaje_own ON utsc_portal.reservas_viaje;
CREATE POLICY viaje_own ON utsc_portal.reservas_viaje FOR ALL TO authenticated
  USING (
    pasajero_id = utsc_portal.uid_actual() OR utsc_portal.es_staff() OR EXISTS (
      SELECT 1 FROM utsc_portal.rutas_driver r
      WHERE r.id = reservas_viaje.ruta_id AND r.conductor_id = utsc_portal.uid_actual()))
  WITH CHECK (pasajero_id = utsc_portal.uid_actual());

-- ============================================================================
--  14. Verificación: qué tablas quedaron SIN ninguna política (quedarían cerradas
--      por completo para el cliente). Es normal que algunas internas no tengan;
--      revisa que las que el cliente necesita sí aparezcan con política arriba.
-- ============================================================================
SELECT t.tablename AS tabla_sin_politica
FROM pg_tables t
LEFT JOIN pg_policies p ON p.schemaname = t.schemaname AND p.tablename = t.tablename
WHERE t.schemaname = 'utsc_portal' AND p.policyname IS NULL
ORDER BY t.tablename;

-- ============================================================================
--  NOTA FINAL — sobre el inicio de sesión (los "dos sistemas de contraseña"):
--  Hoy el front usa PBKDF2 (local) y esta base guarda bcrypt en usuarios.password_hash.
--  Verificar contraseñas por tu cuenta es frágil. Lo recomendado para la entrega con
--  Supabase (PR #8) es usar SUPABASE AUTH:
--    1) Registrar a cada usuario en Supabase Auth (auth.users) con su correo @utsc.edu.mx.
--    2) Dejar que Supabase Auth guarde y verifique la contraseña (ya lo hace de forma segura).
--    3) usuarios.password_hash deja de usarse para login; esta tabla solo guarda el PERFIL.
--    4) Las políticas de arriba ya quedan funcionando porque emparejan auth.email() = correo.
--  Mientras tanto, este script ya protege la base: con la llave pública no se puede leer nada.
-- ============================================================================
