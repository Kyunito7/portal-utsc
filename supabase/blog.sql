-- =====================================================================
-- PORTAL UTSC · Blog estudiantil compartido y moderación en Supabase
-- Pegar COMPLETO en Supabase → SQL Editor → New query → RUN.
-- Requisito: haber corrido antes supabase/autenticacion.sql.
-- Se puede volver a correr sin perder datos.
--
-- Qué hace:
-- 1. Tablas del blog en el esquema public (el que Supabase expone a la API):
--    blog_publicaciones, blog_comentarios, blog_reacciones (me gusta),
--    blog_reportes, blog_avisos (notificaciones entre usuarios) y blog_bitacora.
-- 2. Seguridad por filas (RLS):
--    - Lo aprobado lo ve cualquier alumno con sesión; lo que está en revisión
--      o rechazado solo su autor y los moderadores.
--    - Cada quien publica, comenta, da me gusta y reporta solo a su nombre.
--    - Solo los moderadores cambian el estado de moderación, y solo esas columnas.
--    - Nadie sin sesión (anon) puede leer ni escribir nada.
-- 3. Con 3 reportes una publicación aprobada se oculta sola (trigger).
-- 4. El rol de moderador se lee de app_metadata (lo asigna el panel de Supabase).
-- =====================================================================

-- ---------- ¿Quien hace la petición es moderador? ----------
CREATE OR REPLACE FUNCTION public.es_moderador() RETURNS boolean
LANGUAGE sql STABLE SET search_path = '' AS $$
  SELECT coalesce((auth.jwt() -> 'app_metadata' ->> 'rol') IN ('Moderador', 'Admin'), false)
$$;

-- ---------- 1. Tablas ----------
CREATE TABLE IF NOT EXISTS public.blog_publicaciones (
  id                 text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{2,40}$'),
  autor_id           uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  autor              text NOT NULL CHECK (char_length(autor) BETWEEN 1 AND 100),
  matricula          text CHECK (matricula ~ '^[0-9]{4,8}$'),
  cat                text NOT NULL CHECK (cat IN ('Académico', 'Vida universitaria', 'Recursos', 'Eventos', 'Deportes', 'Tecnología')),
  titulo             text NOT NULL CHECK (char_length(titulo) BETWEEN 5 AND 120),
  texto              text NOT NULL CHECK (char_length(texto) BETWEEN 10 AND 2000),
  -- Imagen ya reducida por el portal (máx. 1200 px, JPEG). Solo se aceptan imágenes en base64.
  imagen             text CHECK (imagen IS NULL OR (char_length(imagen) <= 1500000
                                 AND imagen ~ '^data:image/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$')),
  imagen_alt         text CHECK (char_length(imagen_alt) <= 200),
  creado             timestamptz NOT NULL DEFAULT now(),
  mod_estado         text NOT NULL DEFAULT 'aprobado' CHECK (mod_estado IN ('aprobado', 'revision', 'rechazado')),
  mod_motivos        text[] NOT NULL DEFAULT '{}',
  mod_prioridad      text NOT NULL DEFAULT 'normal' CHECK (mod_prioridad IN ('normal', 'alta')),
  mod_por            text CHECK (char_length(mod_por) <= 100),
  mod_nota           text CHECK (char_length(mod_nota) <= 300),
  mod_t              timestamptz,
  reportes_revisados boolean NOT NULL DEFAULT false
);
CREATE INDEX IF NOT EXISTS blog_publicaciones_creado ON public.blog_publicaciones (creado DESC);
CREATE INDEX IF NOT EXISTS blog_publicaciones_autor ON public.blog_publicaciones (autor_id);

CREATE TABLE IF NOT EXISTS public.blog_comentarios (
  id             text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{2,40}$'),
  publicacion_id text NOT NULL REFERENCES public.blog_publicaciones(id) ON DELETE CASCADE,
  autor_id       uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  autor          text NOT NULL CHECK (char_length(autor) BETWEEN 1 AND 100),
  txt            text NOT NULL CHECK (char_length(txt) BETWEEN 1 AND 300),
  creado         timestamptz NOT NULL DEFAULT now(),
  mod_estado     text NOT NULL DEFAULT 'aprobado' CHECK (mod_estado IN ('aprobado', 'revision', 'rechazado')),
  mod_motivos    text[] NOT NULL DEFAULT '{}',
  mod_prioridad  text NOT NULL DEFAULT 'normal' CHECK (mod_prioridad IN ('normal', 'alta')),
  mod_por        text CHECK (char_length(mod_por) <= 100),
  mod_nota       text CHECK (char_length(mod_nota) <= 300),
  mod_t          timestamptz
);
CREATE INDEX IF NOT EXISTS blog_comentarios_pub ON public.blog_comentarios (publicacion_id);

CREATE TABLE IF NOT EXISTS public.blog_reacciones (
  publicacion_id text NOT NULL REFERENCES public.blog_publicaciones(id) ON DELETE CASCADE,
  usuario_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  creado         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publicacion_id, usuario_id)
);

CREATE TABLE IF NOT EXISTS public.blog_reportes (
  publicacion_id text NOT NULL REFERENCES public.blog_publicaciones(id) ON DELETE CASCADE,
  usuario_id     uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  motivo         text NOT NULL CHECK (motivo IN ('Lenguaje ofensivo', 'Acoso o amenazas', 'Spam o publicidad',
                   'Información falsa o deshonestidad académica', 'Contenido inapropiado', 'Otro')),
  creado         timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (publicacion_id, usuario_id)
);

-- para = id (uuid) de quien lo recibe, o 'rol:Moderador' para todos los moderadores.
CREATE TABLE IF NOT EXISTS public.blog_avisos (
  id      text PRIMARY KEY CHECK (id ~ '^[A-Za-z0-9_-]{2,40}$'),
  de_id   uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  para    text NOT NULL CHECK (para = 'rol:Moderador' OR para ~ '^[0-9a-f-]{36}$'),
  modulo  text NOT NULL DEFAULT 'Moderación' CHECK (char_length(modulo) <= 40),
  txt     text NOT NULL CHECK (char_length(txt) BETWEEN 1 AND 400),
  ir      text CHECK (ir IN ('blog', 'moderacion')),
  creado  timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS blog_avisos_para ON public.blog_avisos (para, creado);

CREATE TABLE IF NOT EXISTS public.blog_bitacora (
  id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  moderador_id  uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  por           text NOT NULL CHECK (char_length(por) <= 100),
  accion        text NOT NULL CHECK (accion IN ('Aprobó', 'Rechazó')),
  titulo        text CHECK (char_length(titulo) <= 200),
  autor         text CHECK (char_length(autor) <= 100),
  motivo        text CHECK (char_length(motivo) <= 300),
  creado        timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2. Permisos: anon nada; authenticated solo lo necesario ----------
REVOKE ALL ON public.blog_publicaciones, public.blog_comentarios, public.blog_reacciones,
              public.blog_reportes, public.blog_avisos, public.blog_bitacora FROM anon, public;
REVOKE ALL ON public.blog_publicaciones, public.blog_comentarios, public.blog_reacciones,
              public.blog_reportes, public.blog_avisos, public.blog_bitacora FROM authenticated;
GRANT SELECT, INSERT, DELETE ON public.blog_publicaciones, public.blog_comentarios TO authenticated;
-- Los moderadores solo pueden cambiar las columnas de moderación (nunca el texto de un alumno).
GRANT UPDATE (mod_estado, mod_motivos, mod_prioridad, mod_por, mod_nota, mod_t, reportes_revisados)
  ON public.blog_publicaciones TO authenticated;
GRANT UPDATE (mod_estado, mod_motivos, mod_prioridad, mod_por, mod_nota, mod_t)
  ON public.blog_comentarios TO authenticated;
GRANT SELECT, INSERT, DELETE ON public.blog_reacciones TO authenticated;
GRANT SELECT, INSERT ON public.blog_reportes, public.blog_avisos, public.blog_bitacora TO authenticated;

ALTER TABLE public.blog_publicaciones ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_comentarios   ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reacciones    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_reportes      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_avisos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blog_bitacora      ENABLE ROW LEVEL SECURITY;

-- ---------- 3. Políticas ----------
-- Publicaciones
DROP POLICY IF EXISTS "ver publicaciones" ON public.blog_publicaciones;
CREATE POLICY "ver publicaciones" ON public.blog_publicaciones FOR SELECT TO authenticated
  USING (mod_estado = 'aprobado' OR autor_id = (SELECT auth.uid()) OR (SELECT public.es_moderador()));
DROP POLICY IF EXISTS "publicar a mi nombre" ON public.blog_publicaciones;
CREATE POLICY "publicar a mi nombre" ON public.blog_publicaciones FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND mod_estado IN ('aprobado', 'revision')
              AND mod_nota IS NULL AND reportes_revisados = false);
DROP POLICY IF EXISTS "moderar publicaciones" ON public.blog_publicaciones;
CREATE POLICY "moderar publicaciones" ON public.blog_publicaciones FOR UPDATE TO authenticated
  USING ((SELECT public.es_moderador())) WITH CHECK ((SELECT public.es_moderador()));
DROP POLICY IF EXISTS "borrar mis publicaciones" ON public.blog_publicaciones;
CREATE POLICY "borrar mis publicaciones" ON public.blog_publicaciones FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (SELECT public.es_moderador()));

-- Comentarios (solo en publicaciones aprobadas)
DROP POLICY IF EXISTS "ver comentarios" ON public.blog_comentarios;
CREATE POLICY "ver comentarios" ON public.blog_comentarios FOR SELECT TO authenticated
  USING (mod_estado = 'aprobado' OR autor_id = (SELECT auth.uid()) OR (SELECT public.es_moderador()));
DROP POLICY IF EXISTS "comentar a mi nombre" ON public.blog_comentarios;
CREATE POLICY "comentar a mi nombre" ON public.blog_comentarios FOR INSERT TO authenticated
  WITH CHECK (autor_id = (SELECT auth.uid()) AND mod_estado IN ('aprobado', 'revision') AND mod_nota IS NULL
              AND EXISTS (SELECT 1 FROM public.blog_publicaciones p WHERE p.id = publicacion_id AND p.mod_estado = 'aprobado'));
DROP POLICY IF EXISTS "moderar comentarios" ON public.blog_comentarios;
CREATE POLICY "moderar comentarios" ON public.blog_comentarios FOR UPDATE TO authenticated
  USING ((SELECT public.es_moderador())) WITH CHECK ((SELECT public.es_moderador()));
DROP POLICY IF EXISTS "borrar mis comentarios" ON public.blog_comentarios;
CREATE POLICY "borrar mis comentarios" ON public.blog_comentarios FOR DELETE TO authenticated
  USING (autor_id = (SELECT auth.uid()) OR (SELECT public.es_moderador()));

-- Me gusta: se ven todos (para contarlos); cada quien pone o quita el suyo.
DROP POLICY IF EXISTS "ver me gusta" ON public.blog_reacciones;
CREATE POLICY "ver me gusta" ON public.blog_reacciones FOR SELECT TO authenticated USING (true);
DROP POLICY IF EXISTS "mi me gusta" ON public.blog_reacciones;
CREATE POLICY "mi me gusta" ON public.blog_reacciones FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()));
DROP POLICY IF EXISTS "quitar mi me gusta" ON public.blog_reacciones;
CREATE POLICY "quitar mi me gusta" ON public.blog_reacciones FOR DELETE TO authenticated
  USING (usuario_id = (SELECT auth.uid()));

-- Reportes: quien reporta queda en secreto; solo él y los moderadores ven el reporte.
DROP POLICY IF EXISTS "ver reportes" ON public.blog_reportes;
CREATE POLICY "ver reportes" ON public.blog_reportes FOR SELECT TO authenticated
  USING (usuario_id = (SELECT auth.uid()) OR (SELECT public.es_moderador()));
DROP POLICY IF EXISTS "reportar a mi nombre" ON public.blog_reportes;
CREATE POLICY "reportar a mi nombre" ON public.blog_reportes FOR INSERT TO authenticated
  WITH CHECK (usuario_id = (SELECT auth.uid()));

-- Avisos: un alumno solo puede avisar a los moderadores; los moderadores avisan a cualquiera.
DROP POLICY IF EXISTS "ver mis avisos" ON public.blog_avisos;
CREATE POLICY "ver mis avisos" ON public.blog_avisos FOR SELECT TO authenticated
  USING (para = (SELECT auth.uid())::text OR (para = 'rol:Moderador' AND (SELECT public.es_moderador())));
DROP POLICY IF EXISTS "enviar avisos" ON public.blog_avisos;
CREATE POLICY "enviar avisos" ON public.blog_avisos FOR INSERT TO authenticated
  WITH CHECK (de_id = (SELECT auth.uid()) AND (para = 'rol:Moderador' OR (SELECT public.es_moderador())));

-- Bitácora: solo moderadores.
DROP POLICY IF EXISTS "bitacora de moderadores" ON public.blog_bitacora;
CREATE POLICY "bitacora de moderadores" ON public.blog_bitacora FOR SELECT TO authenticated
  USING ((SELECT public.es_moderador()));
DROP POLICY IF EXISTS "registrar en bitacora" ON public.blog_bitacora;
CREATE POLICY "registrar en bitacora" ON public.blog_bitacora FOR INSERT TO authenticated
  WITH CHECK ((SELECT public.es_moderador()) AND moderador_id = (SELECT auth.uid()));

-- ---------- 4. Con 3 reportes, la publicación se oculta sola ----------
CREATE OR REPLACE FUNCTION public.fn_blog_reporte() RETURNS trigger
LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE total int;
BEGIN
  SELECT count(*) INTO total FROM public.blog_reportes WHERE publicacion_id = NEW.publicacion_id;
  UPDATE public.blog_publicaciones SET reportes_revisados = false WHERE id = NEW.publicacion_id;
  IF total >= 3 THEN
    UPDATE public.blog_publicaciones
       SET mod_estado = 'revision', mod_motivos = ARRAY['Recibió ' || total || ' reportes'],
           mod_por = 'Reportes de la comunidad', mod_t = now()
     WHERE id = NEW.publicacion_id AND mod_estado = 'aprobado';
  END IF;
  RETURN NEW;
END $$;
REVOKE EXECUTE ON FUNCTION public.fn_blog_reporte() FROM PUBLIC, anon, authenticated;
DROP TRIGGER IF EXISTS trg_blog_reporte ON public.blog_reportes;
CREATE TRIGGER trg_blog_reporte AFTER INSERT ON public.blog_reportes
  FOR EACH ROW EXECUTE FUNCTION public.fn_blog_reporte();

-- =====================================================================
-- Revisión rápida: las 6 tablas deben salir con rls = true.
-- =====================================================================
SELECT tablename, rowsecurity AS rls FROM pg_tables
 WHERE schemaname = 'public' AND tablename LIKE 'blog\_%' ORDER BY tablename;
