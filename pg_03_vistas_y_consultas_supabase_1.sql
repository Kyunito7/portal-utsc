-- =====================================================================
--  PORTAL UNIVERSITARIO UTSC  ·  Script 03: VISTAS Y CONSULTAS  (PostgreSQL / SUPABASE)
--  Requiere pg_01_esquema_supabase.sql y pg_02_datos_supabase.sql.
--  Pegar en Supabase → SQL Editor → RUN.
--  Se puede volver a correr (CREATE OR REPLACE / DROP ... IF EXISTS).
--  NOTA: Supabase muestra solo el resultado de la ÚLTIMA consulta del script.
--  Para ver cada SELECT de la Parte B: selecciona (con el mouse) solo esa
--  consulta y presiona Run (o Ctrl+Enter).
-- =====================================================================

SET search_path TO utsc_portal, public;

-- Verificación: el esquema debe ser el de pg_01_esquema_supabase.sql
DO $chk$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns
                  WHERE table_schema = 'utsc_portal' AND table_name = 'prestamos'
                    AND column_name = 'fecha_vencimiento') THEN
    RAISE EXCEPTION 'El esquema utsc_portal es VIEJO o no existe. Corre primero pg_01_esquema_supabase.sql y luego pg_02_datos_supabase.sql, y despues este script.';
  END IF;
END
$chk$;

-- =====================================================================
-- PARTE A. VISTAS
-- =====================================================================

-- Directorio de alumnos (respeta la privacidad: matrícula y carrera solo si el alumno lo permite)
CREATE OR REPLACE VIEW v_directorio_alumnos AS
SELECT a.usuario_id,
       CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
       u.correo,
       CASE WHEN aj.mostrar_matricula THEN a.matricula END AS matricula_visible,
       g.clave                                       AS grupo,
       g.semestre,
       CASE WHEN aj.mostrar_carrera THEN c.clave END AS carrera_visible,
       a.matricula, c.clave AS carrera, c.nombre AS carrera_nombre
  FROM alumnos a
  JOIN usuarios u         ON u.id = a.usuario_id
  JOIN carreras c         ON c.id = a.carrera_id
  JOIN ajustes_usuario aj ON aj.usuario_id = a.usuario_id
  LEFT JOIN grupos g      ON g.id = a.grupo_id
 WHERE u.activo AND a.estatus = 'activo';

-- Directorio de docentes con las materias que imparten
CREATE OR REPLACE VIEW v_directorio_docentes AS
SELECT d.usuario_id,
       CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
       u.correo, d.area, d.cubiculo, d.horario_asesoria,
       STRING_AGG(m.nombre, ', ' ORDER BY m.semestre, m.nombre) AS materias
  FROM docentes d
  JOIN usuarios u ON u.id = d.usuario_id
  LEFT JOIN docente_materia dm ON dm.docente_id = d.usuario_id
  LEFT JOIN materias m         ON m.id = dm.materia_id
 WHERE u.activo
 GROUP BY d.usuario_id, u.nombre, u.apellido_paterno, u.apellido_materno, u.correo,
          d.area, d.cubiculo, d.horario_asesoria;

-- Kárdex detallado (una fila por materia cursada)
CREATE OR REPLACE VIEW v_kardex AS
SELECT i.alumno_id, a.matricula,
       m.semestre, p.nombre AS periodo, m.clave, m.nombre AS materia,
       m.creditos, i.calificacion, i.estado
  FROM inscripciones i
  JOIN alumnos a  ON a.usuario_id = i.alumno_id
  JOIN materias m ON m.id = i.materia_id
  JOIN periodos p ON p.id = i.periodo_id;

-- RESUMEN ACADÉMICO por alumno (para Inicio y Kárdex)
--   promedio ponderado = Σ(calificación × créditos) / Σ(créditos), solo materias ya calificadas
--   avance = créditos aprobados / créditos totales de la carrera (120)
CREATE OR REPLACE VIEW v_resumen_academico AS
SELECT a.usuario_id AS alumno_id,
       a.matricula,
       CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
       c.clave AS carrera,
       g.clave AS grupo,
       g.semestre,
       ROUND(SUM(CASE WHEN i.calificacion IS NOT NULL THEN i.calificacion * m.creditos END)
             / NULLIF(SUM(CASE WHEN i.calificacion IS NOT NULL THEN m.creditos END), 0), 2) AS promedio_ponderado,
       COALESCE(SUM(CASE WHEN i.estado = 'aprobada' THEN m.creditos END), 0) AS creditos_aprobados,
       COALESCE(SUM(CASE WHEN i.estado = 'en_curso' THEN m.creditos END), 0) AS creditos_en_curso,
       COUNT(CASE WHEN i.estado = 'reprobada' THEN 1 END)                    AS materias_reprobadas,
       c.creditos_totales,
       ROUND(COALESCE(SUM(CASE WHEN i.estado = 'aprobada' THEN m.creditos END), 0) * 100.0
             / c.creditos_totales, 1) AS porcentaje_avance
  FROM alumnos a
  JOIN usuarios u ON u.id = a.usuario_id
  JOIN carreras c ON c.id = a.carrera_id
  LEFT JOIN grupos g        ON g.id = a.grupo_id
  LEFT JOIN inscripciones i ON i.alumno_id = a.usuario_id
  LEFT JOIN materias m      ON m.id = i.materia_id
 GROUP BY a.usuario_id, a.matricula, u.nombre, u.apellido_paterno, u.apellido_materno,
          c.clave, g.clave, g.semestre, c.creditos_totales;

-- ADEUDO ACTUAL por alumno (para Pagos e Inicio)
CREATE OR REPLACE VIEW v_adeudo_alumno AS
SELECT a.usuario_id AS alumno_id,
       a.matricula,
       CONCAT_WS(' ', u.nombre, u.apellido_paterno, u.apellido_materno) AS nombre_completo,
       COUNT(c.id)                         AS cargos_pendientes,
       COALESCE(SUM(c.monto), 0.00)        AS adeudo_total,
       COALESCE(SUM(CASE WHEN c.fecha_vencimiento < CURRENT_DATE THEN c.monto END), 0.00) AS adeudo_vencido,
       MIN(c.fecha_vencimiento)            AS proximo_vencimiento
  FROM alumnos a
  JOIN usuarios u    ON u.id = a.usuario_id
  LEFT JOIN cargos c ON c.alumno_id = a.usuario_id AND c.estado = 'pendiente'
 GROUP BY a.usuario_id, a.matricula, u.nombre, u.apellido_paterno, u.apellido_materno;

-- Historial de pagos (Pagos > Historial)
CREATE OR REPLACE VIEW v_historial_pagos AS
SELECT c.alumno_id, p.id AS pago_id, c.concepto, p.monto, p.metodo,
       p.referencia, p.tarjeta_ultimos4, p.estado, p.pagado_en
  FROM pagos p
  JOIN cargos c ON c.id = p.cargo_id;

-- LUGARES LIBRES por ruta de DriverUTSC (solo rutas no borradas)
-- (los días salen en orden de la semana: lunes, martes, ...)
CREATE OR REPLACE VIEW v_rutas_lugares AS
SELECT r.id AS ruta_id,
       r.conductor_id,
       u.nombre || ' ' || u.apellido_paterno AS conductor,
       r.sentido, r.lugar, r.hora_salida,
       (SELECT STRING_AGG(d.dia, ', ' ORDER BY
                 ARRAY_POSITION(ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'], d.dia))
          FROM ruta_dias d WHERE d.ruta_id = r.id)                        AS dias,
       r.asientos,
       (SELECT COUNT(*) FROM reservas_viaje rv
         WHERE rv.ruta_id = r.id AND rv.estado = 'activa')                AS lugares_ocupados,
       r.asientos - (SELECT COUNT(*) FROM reservas_viaje rv
                      WHERE rv.ruta_id = r.id AND rv.estado = 'activa')   AS lugares_libres,
       r.precio, r.vehiculo, r.notas
  FROM rutas_driver r
  JOIN usuarios u ON u.id = r.conductor_id
 WHERE r.deleted_at IS NULL;

-- Publicaciones visibles con número de likes, comentarios y hashtags (Blog)
CREATE OR REPLACE VIEW v_publicaciones_resumen AS
SELECT p.id AS publicacion_id, p.titulo,
       u.nombre || ' ' || u.apellido_paterno AS autor,
       p.autor_id, cb.nombre AS categoria, p.imagen_url, p.created_at,
       (SELECT COUNT(*) FROM reacciones r WHERE r.publicacion_id = p.id) AS likes,
       (SELECT COUNT(*) FROM comentarios c
         WHERE c.publicacion_id = p.id AND c.deleted_at IS NULL)           AS comentarios,
       (SELECT STRING_AGG('#' || h.nombre, ' ' ORDER BY h.nombre)
          FROM publicacion_hashtag ph JOIN hashtags h ON h.id = ph.hashtag_id
         WHERE ph.publicacion_id = p.id)                                  AS hashtags
  FROM publicaciones p
  JOIN usuarios u         ON u.id = p.autor_id
  JOIN categorias_blog cb ON cb.id = p.categoria_id
 WHERE p.deleted_at IS NULL;

-- Disponibilidad de libros (Biblioteca)
CREATE OR REPLACE VIEW v_libros_disponibilidad AS
SELECT l.id AS libro_id, l.titulo, l.autor, l.edicion, cl.nombre AS categoria, l.isbn,
       l.ejemplares_totales, l.ejemplares_disponibles,
       l.ejemplares_totales - l.ejemplares_disponibles AS ejemplares_en_uso,
       CASE WHEN l.ejemplares_disponibles > 0 THEN 'Disponible' ELSE 'Agotado' END AS estatus
  FROM libros l
  JOIN categorias_libro cl ON cl.id = l.categoria_id;

-- Préstamos y reservas activos con días restantes (Biblioteca > Mis préstamos)
CREATE OR REPLACE VIEW v_prestamos_activos AS
SELECT pr.id AS prestamo_id, pr.alumno_id, a.matricula, l.titulo, pr.tipo,
       pr.fecha_inicio, pr.fecha_vencimiento, pr.renovaciones,
       (pr.tipo = 'prestamo' AND pr.renovaciones = 0)   AS puede_renovar,
       (pr.fecha_vencimiento - CURRENT_DATE)            AS dias_restantes,
       (pr.fecha_vencimiento < CURRENT_DATE)            AS vencido
  FROM prestamos pr
  JOIN alumnos a ON a.usuario_id = pr.alumno_id
  JOIN libros l  ON l.id = pr.libro_id
 WHERE pr.estado = 'activo';

-- Horario semanal de cada alumno según su grupo (Horarios)
CREATE OR REPLACE VIEW v_horario_alumno AS
SELECT a.usuario_id AS alumno_id, a.matricula, g.clave AS grupo,
       h.dia, h.hora_inicio, h.hora_fin, m.nombre AS materia, h.aula,
       u.nombre || ' ' || u.apellido_paterno AS docente
  FROM alumnos a
  JOIN grupos g         ON g.id = a.grupo_id
  JOIN horario_clases h ON h.grupo_id = g.id
  JOIN materias m       ON m.id = h.materia_id
  JOIN usuarios u       ON u.id = h.docente_id;

-- Solicitudes de trámite con costo y estado del cargo generado (Trámites)
CREATE OR REPLACE VIEW v_solicitudes_tramite AS
SELECT s.id AS solicitud_id, s.folio, s.alumno_id, a.matricula, t.nombre AS tramite,
       t.costo, s.estado, s.created_at, c.id AS cargo_id, c.estado AS estado_cargo
  FROM solicitudes_tramite s
  JOIN alumnos a           ON a.usuario_id = s.alumno_id
  JOIN tramites_catalogo t ON t.id = s.tramite_id
  LEFT JOIN cargos c       ON c.solicitud_id = s.id;

-- =====================================================================
-- PARTE B. CONSULTAS DE VERIFICACIÓN (alumno principal: Juan, matrícula 27254)
-- =====================================================================

-- B1. Login: buscar la cuenta por correo (la app compara la contraseña con bcrypt)
SELECT id, correo, rol, LEFT(password_hash, 7) AS algoritmo_hash, CHAR_LENGTH(password_hash) AS largo_hash
  FROM usuarios WHERE correo = '27254@utsc.edu.mx' AND activo;

-- B2. Kárdex completo de Juan (24 materias: 18 aprobadas + 6 en curso)
SELECT semestre, periodo, clave, materia, creditos, calificacion, estado
  FROM v_kardex WHERE matricula = '27254'
 ORDER BY semestre, clave;

-- B3. Resumen académico de Juan (esperado: promedio 9.09, 72 créditos, 60.0 % de avance)
SELECT * FROM v_resumen_academico WHERE matricula = '27254';

-- B4. Resumen académico de todos los alumnos
SELECT matricula, nombre_completo, carrera, grupo, semestre,
       promedio_ponderado, creditos_aprobados, materias_reprobadas, porcentaje_avance
  FROM v_resumen_academico ORDER BY carrera, matricula;

-- B5. Adeudo de Juan (esperado: 3 cargos, $2,450.00)
SELECT * FROM v_adeudo_alumno WHERE matricula = '27254';

-- B6. Detalle de cargos pendientes de Juan
SELECT c.id, c.concepto, c.monto, c.fecha_vencimiento
  FROM cargos c JOIN alumnos a ON a.usuario_id = c.alumno_id
 WHERE a.matricula = '27254' AND c.estado = 'pendiente'
 ORDER BY c.fecha_vencimiento;

-- B7. Historial de pagos de Juan (5 pagos)
SELECT h.concepto, h.monto, h.metodo, h.referencia, h.tarjeta_ultimos4, h.pagado_en
  FROM v_historial_pagos h JOIN alumnos a ON a.usuario_id = h.alumno_id
 WHERE a.matricula = '27254' ORDER BY h.pagado_en DESC;

-- B8. Publicaciones del blog con likes y comentarios (la publicación borrada no aparece)
SELECT publicacion_id, titulo, autor, categoria, likes, comentarios, hashtags, created_at
  FROM v_publicaciones_resumen ORDER BY created_at DESC;

-- B9. Libros disponibles (Deep Learning aparece Agotado)
SELECT titulo, autor, edicion, categoria, ejemplares_totales, ejemplares_disponibles, estatus
  FROM v_libros_disponibilidad ORDER BY estatus DESC, titulo;

-- B10. Préstamos y reservas activos de Juan (3 = el máximo permitido)
SELECT titulo, tipo, fecha_inicio, fecha_vencimiento, renovaciones, puede_renovar, dias_restantes
  FROM v_prestamos_activos WHERE matricula = '27254';

-- B11. Rutas de DriverUTSC con lugares libres (la ruta de García está llena; la ruta borrada no aparece)
SELECT ruta_id, conductor, sentido, lugar, dias, hora_salida, asientos,
       lugares_ocupados, lugares_libres, precio, vehiculo
  FROM v_rutas_lugares ORDER BY ruta_id;

-- B12. Horario de Juan (lunes a sábado)
SELECT dia, hora_inicio, hora_fin, materia, aula, docente
  FROM v_horario_alumno WHERE matricula = '27254'
 ORDER BY ARRAY_POSITION(ARRAY['lunes','martes','miercoles','jueves','viernes','sabado'], dia), hora_inicio;

-- B13. Trámites con folio (el Kárdex certificado de Ana Sofía generó un cargo de $150 automáticamente)
SELECT folio, matricula, tramite, costo, estado, cargo_id, estado_cargo
  FROM v_solicitudes_tramite ORDER BY folio;

-- B14. Mensajes de contacto con folio
SELECT m.folio, a.matricula, d.nombre AS departamento, m.asunto, m.estado, m.created_at
  FROM mensajes_contacto m
  JOIN alumnos a       ON a.usuario_id = m.alumno_id
  JOIN departamentos d ON d.id = m.departamento_id
 ORDER BY m.folio;

-- B15. Notificaciones no leídas de Juan (incluye las creadas por triggers del blog)
SELECT titulo, mensaje, modulo, enlace, created_at
  FROM notificaciones WHERE usuario_id = 2 AND leida = FALSE
 ORDER BY created_at DESC;

-- B16. Inicio: noticia destacada, próximos eventos y avisos vigentes
SELECT titulo, resumen, minutos_lectura FROM noticias WHERE destacada;
SELECT titulo, lugar, fecha_inicio FROM eventos WHERE fecha_inicio >= '2026-10-01' ORDER BY fecha_inicio LIMIT 4;
SELECT titulo, prioridad, vigente_hasta FROM avisos ORDER BY vigente_desde;

-- B17. Directorio
SELECT nombre_completo, matricula_visible, grupo, carrera_visible FROM v_directorio_alumnos ORDER BY nombre_completo;
SELECT nombre_completo, area, materias, cubiculo, horario_asesoria FROM v_directorio_docentes ORDER BY nombre_completo;
SELECT nombre, responsable, ubicacion, telefono, correo, horario FROM departamentos ORDER BY id;

-- =====================================================================
-- PARTE C. PRUEBAS DE REGLAS (intentos que DEBEN fallar)
-- La función ejecuta cada intento dentro de su propio bloque, atrapa el error
-- y deshace cualquier cambio, así que NO modifica los datos y el script no se detiene.
-- Resultado esperado: todas las filas dicen "RECHAZADO (correcto)".
-- =====================================================================

DROP FUNCTION IF EXISTS sp_probar_reglas();

CREATE FUNCTION sp_probar_reglas()
RETURNS TABLE (num INT, prueba TEXT, resultado TEXT, mensaje TEXT)
LANGUAGE plpgsql SET search_path = utsc_portal, public AS $f$
DECLARE
  v_juan  INT;
  v_elisa INT;
  t       RECORD;
BEGIN
  SELECT usuario_id INTO v_juan  FROM alumnos WHERE matricula = '27254';
  SELECT usuario_id INTO v_elisa FROM alumnos WHERE matricula = '27239';

  FOR t IN
    SELECT * FROM (VALUES
      -- 1. Like duplicado
      (1, 'Like duplicado',
          format('INSERT INTO reacciones (publicacion_id, usuario_id) VALUES (3, %s)', v_juan)),
      -- 2. Calificación de 11
      (2, 'Calificación de 11',
          format('UPDATE inscripciones SET calificacion = 11 WHERE alumno_id = %s AND materia_id = 19', v_juan)),
      -- 3. Reserva en ruta sin lugares (ruta 3 está llena)
      (3, 'Reserva sin lugares',
          format('INSERT INTO reservas_viaje (ruta_id, pasajero_id) VALUES (3, %s)', v_elisa)),
      -- 4. Reservar su propia ruta (ruta 4 es de Juan)
      (4, 'Reservar su propia ruta',
          format('INSERT INTO reservas_viaje (ruta_id, pasajero_id) VALUES (4, %s)', v_juan)),
      -- 5. Reservar dos veces la misma ruta (Elisa ya está en la ruta 1)
      (5, 'Reserva duplicada en la misma ruta',
          format('INSERT INTO reservas_viaje (ruta_id, pasajero_id) VALUES (1, %s)', v_elisa)),
      -- 6. Ruta con precio de $150
      (6, 'Ruta con precio de $150',
          format('INSERT INTO rutas_driver (conductor_id, sentido, lugar, hora_salida, asientos, precio, vehiculo) VALUES (%s, ''hacia_utsc'', ''Monterrey Centro'', ''12:00'', 3, 150.00, ''Mazda 2 azul'')', v_juan)),
      -- 7. Ruta con 5 asientos
      (7, 'Ruta con 5 asientos',
          format('INSERT INTO rutas_driver (conductor_id, sentido, lugar, hora_salida, asientos, precio, vehiculo) VALUES (%s, ''hacia_utsc'', ''Monterrey Centro'', ''12:00'', 5, 20.00, ''Mazda 2 azul'')', v_juan)),
      -- 8. Correo no institucional
      (8, 'Correo que no es @utsc.edu.mx',
          'INSERT INTO usuarios (correo, password_hash, nombre, apellido_paterno) VALUES (''juan@gmail.com'', ''$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q'', ''Prueba'', ''Correo'')'),
      -- 9. Correo duplicado
      (9, 'Correo duplicado',
          'INSERT INTO usuarios (correo, password_hash, nombre, apellido_paterno) VALUES (''27254@utsc.edu.mx'', ''$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q'', ''Prueba'', ''Duplicado'')'),
      -- 10. Contraseña en texto plano
      (10, 'Contraseña en texto plano',
          'INSERT INTO usuarios (correo, password_hash, nombre, apellido_paterno) VALUES (''99999@utsc.edu.mx'', ''utsc2026'', ''Prueba'', ''Texto plano'')'),
      -- 11. Segunda solicitud activa del mismo trámite (Juan ya tiene Carta de presentación en proceso)
      (11, 'Trámite activo duplicado',
          format('INSERT INTO solicitudes_tramite (alumno_id, tramite_id) VALUES (%s, 2)', v_juan)),
      -- 12. Cuarto préstamo activo (Juan ya tiene 3)
      (12, '4.º préstamo activo',
          format('INSERT INTO prestamos (alumno_id, libro_id, tipo) VALUES (%s, 4, ''prestamo'')', v_juan)),
      -- 13. Segunda renovación (Clean Code de Juan ya se renovó)
      (13, 'Segunda renovación',
          format('UPDATE prestamos SET renovaciones = renovaciones + 1 WHERE alumno_id = %s AND libro_id = 1 AND estado = ''activo''', v_juan)),
      -- 14. Préstamo de un libro agotado (Deep Learning)
      (14, 'Préstamo de libro agotado',
          format('INSERT INTO prestamos (alumno_id, libro_id, tipo) VALUES (%s, 9, ''prestamo'')', v_elisa)),
      -- 15. Ejemplares disponibles mayores al total
      (15, 'Disponibles > total',
          'UPDATE libros SET ejemplares_disponibles = ejemplares_totales + 1 WHERE id = 4'),
      -- 16. Pagar un cargo que ya está pagado
      (16, 'Pagar un cargo ya pagado',
          'INSERT INTO pagos (cargo_id, metodo, monto, estado) VALUES (4, ''spei'', 2100.00, ''completado'')'),
      -- 17. Segunda noticia destacada
      (17, 'Dos noticias destacadas',
          'UPDATE noticias SET destacada = TRUE WHERE id = 2')
    ) AS x(n, nombre, sentencia)
    ORDER BY x.n
  LOOP
    num    := t.n;
    prueba := t.nombre;
    BEGIN
      EXECUTE t.sentencia;
      -- Si llegó aquí, la regla NO funcionó: se deshace el cambio con un error propio
      RAISE EXCEPTION 'deshacer_prueba' USING ERRCODE = 'UT001';
    EXCEPTION WHEN OTHERS THEN
      IF SQLSTATE = 'UT001' THEN
        resultado := 'ACEPTADO (ERROR)';
        mensaje   := NULL;
      ELSE
        resultado := 'RECHAZADO (correcto)';
        mensaje   := SQLSTATE || ': ' || SQLERRM;
      END IF;
    END;
    RETURN NEXT;
  END LOOP;
END $f$;

-- C1. Ejecutar las pruebas (debe mostrar 17 filas "RECHAZADO (correcto)")
SELECT * FROM sp_probar_reglas();

-- C2. Comprobar que las pruebas no cambiaron nada (esperado: 16 likes, Juan sigue con $2,450.00)
SELECT (SELECT COUNT(*) FROM reacciones) AS total_likes,
       (SELECT adeudo_total FROM v_adeudo_alumno WHERE matricula = '27254') AS adeudo_juan;

-- =====================================================================
-- PARTE D. (OPCIONAL) LOS MISMOS INTENTOS "A MANO"
-- Están comentados para que el script no se detenga. Para ver el error real:
-- quita el "-- " de UNA línea, selecciónala y presiona Run.
-- =====================================================================
-- INSERT INTO reacciones (publicacion_id, usuario_id) VALUES (3, 2);                          -- llave duplicada (reacciones_pkey)
-- UPDATE inscripciones SET calificacion = 11 WHERE alumno_id = 2 AND materia_id = 19;         -- viola ck_inscripciones_calif
-- INSERT INTO reservas_viaje (ruta_id, pasajero_id) VALUES (3, 3);                            -- No hay lugares disponibles en esta ruta
-- INSERT INTO reservas_viaje (ruta_id, pasajero_id) VALUES (4, 2);                            -- No puedes reservar un lugar en tu propia ruta
-- INSERT INTO prestamos (alumno_id, libro_id, tipo) VALUES (2, 4, 'prestamo');                -- Límite alcanzado: máximo 3...
