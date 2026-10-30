-- =====================================================================
-- Pruebas de seguridad (RLS) de supabase/blog.sql con PostgreSQL local.
-- NO se corre en Supabase: es para revisar las reglas en tu computadora.
--
--   createdb pruebas_blog
--   psql -d pruebas_blog -f supabase/pruebas/emulacion-supabase.sql \
--        -f supabase/autenticacion.sql -f supabase/blog.sql
--   psql -d pruebas_blog -f supabase/pruebas/blog-rls.sql
--
-- Al final imprime una tabla con "pasa" / "FALLA" por prueba (39 pruebas).
-- =====================================================================
\set ON_ERROR_STOP 1
CREATE OR REPLACE FUNCTION pg_temp.como(uid text, rol text DEFAULT '') RETURNS void LANGUAGE plpgsql AS $$
BEGIN
  PERFORM set_config('request.jwt.claims', json_build_object('sub', uid, 'role','authenticated', 'app_metadata', CASE WHEN rol='' THEN '{}'::json ELSE json_build_object('rol', rol) END)::text, false);
END $$;
-- Ejecuta sql y regresa 'OK' o el error
CREATE OR REPLACE FUNCTION pg_temp.intenta(sql text) RETURNS text LANGUAGE plpgsql AS $$
DECLARE n int;
BEGIN EXECUTE sql; GET DIAGNOSTICS n = ROW_COUNT; RETURN 'OK filas=' || n;
EXCEPTION WHEN OTHERS THEN RETURN 'ERROR ' || SQLSTATE; END $$;
CREATE OR REPLACE FUNCTION pg_temp.valor(sql text) RETURNS text LANGUAGE plpgsql VOLATILE AS $$
DECLARE v text; BEGIN EXECUTE sql INTO v; RETURN v; END $$;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA pg_temp TO authenticated, anon;
CREATE TEMP TABLE r (n serial, prueba text, esperado text, obtenido text);
GRANT ALL ON r TO authenticated, anon; GRANT ALL ON SEQUENCE r_n_seq TO authenticated, anon;

SET ROLE authenticated;
SELECT pg_temp.como('11111111-1111-1111-1111-111111111111');
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Ana publica aprobado','OK filas=1', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor,cat,titulo,texto) VALUES ('p1','Ana','Académico','Hola mundo','Texto de prueba largo')$$)),
 ('Ana publica en revisión','OK filas=1', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor,cat,titulo,texto,mod_estado,mod_motivos) VALUES ('p2','Ana','Académico','Dudoso aqui','Texto con algo dudoso','revision','{Groserías}')$$)),
 ('Ana publica a nombre de Beto','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor_id,autor,cat,titulo,texto) VALUES ('p3','22222222-2222-2222-2222-222222222222','Beto','Académico','Suplantar','Texto de suplantación')$$)),
 ('Ana publica ya rechazado','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor,cat,titulo,texto,mod_estado) VALUES ('p4','Ana','Académico','Rechazo x','Texto cualquiera aqui','rechazado')$$)),
 ('Imagen con atributos inyectados','ERROR 23514', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor,cat,titulo,texto,imagen) VALUES ('p5','Ana','Académico','Imagen mala','Texto cualquiera aqui','data:image/png;base64,AAA" onerror="alert(1)')$$)),
 ('Imagen válida','OK filas=1', pg_temp.intenta($$INSERT INTO blog_publicaciones(id,autor,cat,titulo,texto,imagen) VALUES ('p6','Ana','Recursos','Foto buena','Texto cualquiera aqui','data:image/jpeg;base64,/9j/4AAQSkZJRg==')$$)),
 ('Ana ve su post en revisión','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_publicaciones WHERE id='p2'$q$));

SELECT pg_temp.como('22222222-2222-2222-2222-222222222222');
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Beto NO ve el post en revisión de Ana','0', pg_temp.valor($q$SELECT count(*)::text FROM blog_publicaciones WHERE id='p2'$q$)),
 ('Beto ve el aprobado','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_publicaciones WHERE id='p1'$q$)),
 ('Beto intenta aprobar (no es moderador)','OK filas=0', pg_temp.intenta($$UPDATE blog_publicaciones SET mod_estado='aprobado' WHERE id='p2'$$)),
 ('Beto intenta cambiar el texto de Ana','ERROR 42501', pg_temp.intenta($$UPDATE blog_publicaciones SET texto='hackeado hackeado' WHERE id='p1'$$)),
 ('Beto intenta borrar el post de Ana','OK filas=0', pg_temp.intenta($$DELETE FROM blog_publicaciones WHERE id='p1'$$)),
 ('Beto comenta en aprobado','OK filas=1', pg_temp.intenta($$INSERT INTO blog_comentarios(id,publicacion_id,autor,txt) VALUES ('c1','p1','Beto','Buen post')$$)),
 ('Beto comenta en post en revisión','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_comentarios(id,publicacion_id,autor,txt) VALUES ('c2','p2','Beto','Comentario')$$)),
 ('Beto da me gusta','OK filas=1', pg_temp.intenta($$INSERT INTO blog_reacciones(publicacion_id) VALUES ('p1')$$)),
 ('Beto da me gusta repetido (ignorado)','OK filas=0', pg_temp.intenta($$INSERT INTO blog_reacciones(publicacion_id) VALUES ('p1') ON CONFLICT DO NOTHING$$)),
 ('Beto da me gusta a nombre de Ana','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_reacciones(publicacion_id,usuario_id) VALUES ('p1','11111111-1111-1111-1111-111111111111')$$)),
 ('Beto reporta','OK filas=1', pg_temp.intenta($$INSERT INTO blog_reportes(publicacion_id,motivo) VALUES ('p1','Otro')$$)),
 ('Beto avisa a moderadores','OK filas=1', pg_temp.intenta($$INSERT INTO blog_avisos(id,para,txt,ir) VALUES ('av1','rol:Moderador','Reportaron algo','moderacion')$$)),
 ('Beto manda aviso directo a Ana (spam)','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_avisos(id,para,txt) VALUES ('av2','11111111-1111-1111-1111-111111111111','spam')$$)),
 ('Beto escribe en bitácora','ERROR 42501', pg_temp.intenta($$INSERT INTO blog_bitacora(por,accion) VALUES ('Beto','Aprobó')$$)),
 ('Beto no ve avisos de moderadores','0', pg_temp.valor($q$SELECT count(*)::text FROM blog_avisos$q$));

SELECT pg_temp.como('33333333-3333-3333-3333-333333333333');
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Caro reporta','OK filas=1', pg_temp.intenta($$INSERT INTO blog_reportes(publicacion_id,motivo) VALUES ('p1','Spam o publicidad')$$)),
 ('Caro no ve el reporte de Beto','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_reportes$q$));

SELECT pg_temp.como('99999999-9999-9999-9999-999999999999','Moderador');
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Moderador ve el post en revisión','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_publicaciones WHERE id='p2'$q$)),
 ('Moderador reporta (3er reporte)','OK filas=1', pg_temp.intenta($$INSERT INTO blog_reportes(publicacion_id,motivo) VALUES ('p1','Otro')$$)),
 ('Con 3 reportes p1 queda en revisión','revision', pg_temp.valor($q$SELECT mod_estado FROM blog_publicaciones WHERE id='p1'$q$)),
 ('Moderador aprueba p2','OK filas=1', pg_temp.intenta($$UPDATE blog_publicaciones SET mod_estado='aprobado', mod_por='Mod', mod_t=now() WHERE id='p2'$$)),
 ('Moderador intenta cambiar texto','ERROR 42501', pg_temp.intenta($$UPDATE blog_publicaciones SET texto='otro texto del moderador' WHERE id='p2'$$)),
 ('Moderador avisa a Ana','OK filas=1', pg_temp.intenta($$INSERT INTO blog_avisos(id,para,txt,ir) VALUES ('av3','11111111-1111-1111-1111-111111111111','Tu publicación fue aprobada','blog')$$)),
 ('Moderador escribe en bitácora','OK filas=1', pg_temp.intenta($$INSERT INTO blog_bitacora(por,accion,titulo,autor) VALUES ('Mod','Aprobó','Dudoso aqui','Ana')$$)),
 ('Moderador ve avisos de rol','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_avisos WHERE para='rol:Moderador'$q$)),
 ('Moderador ve los 3 reportes','3', pg_temp.valor($q$SELECT count(*)::text FROM blog_reportes$q$));

SELECT pg_temp.como('11111111-1111-1111-1111-111111111111');
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Ana ve su aviso','1', pg_temp.valor($q$SELECT count(*)::text FROM blog_avisos$q$)),
 ('Ana no ve quién la reportó','0', pg_temp.valor($q$SELECT count(*)::text FROM blog_reportes$q$)),
 ('Ana borra su post (con comentarios)','OK filas=1', pg_temp.intenta($$DELETE FROM blog_publicaciones WHERE id='p1'$$));

SET ROLE anon;
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Sin sesión no se lee nada','ERROR 42501', pg_temp.intenta($$SELECT * FROM blog_publicaciones$$));
RESET ROLE;
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Comentario borrado en cascada','0', pg_temp.valor($q$SELECT count(*)::text FROM blog_comentarios WHERE id='c1'$q$));
DELETE FROM auth.users WHERE id='11111111-1111-1111-1111-111111111111';
INSERT INTO r(prueba,esperado,obtenido) VALUES
 ('Al borrar la cuenta se borran sus posts','0', pg_temp.valor($q$SELECT count(*)::text FROM blog_publicaciones WHERE autor_id='11111111-1111-1111-1111-111111111111'$q$));
SELECT n, CASE WHEN esperado = obtenido THEN 'pasa' ELSE 'FALLA' END AS resultado, prueba, esperado, obtenido FROM r ORDER BY n;
SELECT count(*) FILTER (WHERE esperado = obtenido) AS pasan, count(*) AS total FROM r;
