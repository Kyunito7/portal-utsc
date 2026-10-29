-- =====================================================================
-- PORTAL UTSC · Inicio de sesión con Supabase Auth
-- Pegar COMPLETO en Supabase → SQL Editor → New query → RUN.
-- Se puede volver a correr sin problema.
--
-- Qué hace:
-- 1. Tabla public.perfiles: los datos del alumno (nombre, matrícula, carrera…)
--    ligados a su cuenta de Supabase Auth. Las contraseñas NO están aquí:
--    Supabase las guarda cifradas (bcrypt) en auth.users y nadie las puede leer.
-- 2. Seguridad por filas (RLS): cada quien solo puede ver SU perfil.
-- 3. La matrícula es única: no se pueden crear dos cuentas con la misma.
-- 4. eliminar_mi_cuenta(): el alumno puede borrar su propia cuenta (y solo la suya).
-- =====================================================================

-- ---------- 1. Perfiles ----------
CREATE TABLE IF NOT EXISTS public.perfiles (
  id         uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  correo     text NOT NULL,
  nombre     text NOT NULL DEFAULT '' CHECK (char_length(nombre) <= 40),
  apellidos  text NOT NULL DEFAULT '' CHECK (char_length(apellidos) <= 60),
  matricula  text UNIQUE CHECK (matricula ~ '^[0-9]{4,8}$'),
  carrera    text CHECK (carrera IN ('DSM', 'ISC', 'IIA', 'IGE')),
  semestre   smallint CHECK (semestre BETWEEN 1 AND 12),
  grupo      text CHECK (char_length(grupo) <= 10),
  rol        text NOT NULL DEFAULT 'Alumno' CHECK (rol IN ('Alumno', 'Moderador', 'Docente', 'Admin')),
  creado     timestamptz NOT NULL DEFAULT now()
);

-- ---------- 2. Seguridad por filas ----------
ALTER TABLE public.perfiles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "cada quien ve su perfil" ON public.perfiles;
CREATE POLICY "cada quien ve su perfil" ON public.perfiles
  FOR SELECT TO authenticated USING ((SELECT auth.uid()) = id);
-- No hay políticas de INSERT/UPDATE/DELETE a propósito: nadie puede escribir
-- directo en la tabla desde el navegador. Solo los triggers de abajo la llenan,
-- así nadie puede ponerse rol de Moderador por su cuenta.

-- ---------- 3. Al registrarse o editar su perfil, se copia a perfiles ----------
CREATE OR REPLACE FUNCTION public.fn_perfil_desde_auth()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
DECLARE m jsonb := COALESCE(NEW.raw_user_meta_data, '{}'::jsonb);
BEGIN
  INSERT INTO public.perfiles (id, correo, nombre, apellidos, matricula, carrera, semestre, grupo, rol)
  VALUES (NEW.id, NEW.email,
          COALESCE(left(m->>'nombre', 40), ''), COALESCE(left(m->>'apellidos', 60), ''),
          NULLIF(m->>'matricula', ''), NULLIF(m->>'carrera', ''),
          NULLIF(m->>'semestre', '')::smallint, upper(left(NULLIF(m->>'grupo', ''), 10)),
          COALESCE(NEW.raw_app_meta_data->>'rol', 'Alumno'))
  ON CONFLICT (id) DO UPDATE SET
    correo = EXCLUDED.correo, nombre = EXCLUDED.nombre, apellidos = EXCLUDED.apellidos,
    matricula = EXCLUDED.matricula, carrera = EXCLUDED.carrera, semestre = EXCLUDED.semestre,
    grupo = EXCLUDED.grupo, rol = EXCLUDED.rol;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_perfil_alta ON auth.users;
CREATE TRIGGER trg_perfil_alta AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_perfil_desde_auth();
DROP TRIGGER IF EXISTS trg_perfil_cambio ON auth.users;
CREATE TRIGGER trg_perfil_cambio AFTER UPDATE OF email, raw_user_meta_data, raw_app_meta_data ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.fn_perfil_desde_auth();
REVOKE EXECUTE ON FUNCTION public.fn_perfil_desde_auth() FROM PUBLIC, anon, authenticated;

-- ---------- 4. Borrar mi propia cuenta ----------
CREATE OR REPLACE FUNCTION public.eliminar_mi_cuenta()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = '' AS $$
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Necesitas iniciar sesión'; END IF;
  DELETE FROM auth.users WHERE id = auth.uid();   -- el perfil se borra solo (ON DELETE CASCADE)
END $$;
REVOKE EXECUTE ON FUNCTION public.eliminar_mi_cuenta() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.eliminar_mi_cuenta() TO authenticated;

-- =====================================================================
-- EXTRA: hacer moderador a alguien (cámbiale el correo y corre SOLO estas líneas).
-- El rol se guarda en app_metadata, que el alumno no puede modificar desde el portal.
-- Esa persona tiene que cerrar sesión y volver a entrar para que se aplique.
-- =====================================================================
-- UPDATE auth.users
--   SET raw_app_meta_data = raw_app_meta_data || '{"rol": "Moderador"}'
--   WHERE email = 'correo-del-moderador@gmail.com';
