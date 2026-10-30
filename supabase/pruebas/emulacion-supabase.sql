-- Emulación mínima de Supabase para probar los scripts en un PostgreSQL local (ver blog-rls.sql).
-- Crea los roles anon/authenticated, el esquema auth con auth.users, auth.uid() y auth.jwt()
-- (leídos de request.jwt.claims, igual que Supabase) y cuatro usuarios de prueba.
CREATE ROLE anon NOLOGIN; CREATE ROLE authenticated NOLOGIN; CREATE ROLE service_role NOLOGIN BYPASSRLS;
CREATE SCHEMA auth;
CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb DEFAULT '{}', raw_app_meta_data jsonb DEFAULT '{}');
CREATE FUNCTION auth.jwt() RETURNS jsonb LANGUAGE sql STABLE AS $$ SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb $$;
CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT nullif(auth.jwt() ->> 'sub', '')::uuid $$;
GRANT USAGE ON SCHEMA auth TO anon, authenticated; GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated;
GRANT USAGE ON SCHEMA public TO anon, authenticated;
INSERT INTO auth.users (id, email, raw_app_meta_data) VALUES
 ('11111111-1111-1111-1111-111111111111','ana@x.com','{}'),
 ('22222222-2222-2222-2222-222222222222','beto@x.com','{}'),
 ('33333333-3333-3333-3333-333333333333','caro@x.com','{}'),
 ('99999999-9999-9999-9999-999999999999','mod@x.com','{"rol":"Moderador"}');
