-- =====================================================================
--  PORTAL UNIVERSITARIO UTSC  ·  Script 02: DATOS DE PRUEBA  (PostgreSQL / SUPABASE)
--  Requiere haber ejecutado pg_01_esquema_supabase.sql.
--  Pegar COMPLETO en Supabase → SQL Editor → RUN.
--  Se puede volver a correr: primero vacía todas las tablas (TRUNCATE).
--  Contraseña de prueba de TODOS los usuarios: utsc2026  (guardada como hash bcrypt)
-- =====================================================================

SET search_path TO utsc_portal, public;

-- ---------- Función auxiliar: acomoda los contadores (id) después de
-- insertar filas con id manual. Se borra al final del script. ----------
CREATE FUNCTION fn_reset_secuencias() RETURNS void LANGUAGE plpgsql AS $$
DECLARE r RECORD;
BEGIN
  FOR r IN
    SELECT c.table_name, c.column_name
      FROM information_schema.columns c
     WHERE c.table_schema = 'utsc_portal' AND c.is_identity = 'YES'
  LOOP
    EXECUTE format(
      'SELECT setval(pg_get_serial_sequence(%L, %L), COALESCE((SELECT MAX(%I) FROM utsc_portal.%I), 0) + 1, false)',
      'utsc_portal.' || r.table_name, r.column_name, r.column_name, r.table_name);
  END LOOP;
END $$;

-- ---------- Vaciar tablas (permite re-ejecutar este script) ----------
TRUNCATE TABLE
  reservas_viaje, ruta_dias, rutas_driver, recursos_digitales, prestamos, libros, categorias_libro,
  pagos, cargos, solicitudes_tramite, tramites_catalogo, actividad, notificaciones, avisos, eventos,
  noticias, categorias_noticia, reportes, comentarios, reacciones, publicacion_hashtag, hashtags,
  publicaciones, categorias_blog, mensajes_contacto, departamentos, horario_clases, inscripciones,
  docente_materia, materias, docentes, alumnos, grupos, ajustes_usuario, usuarios, periodos, carreras
  RESTART IDENTITY CASCADE;

-- (El hash bcrypt de "utsc2026" ya viene escrito en cada usuario.
--  En la app real cada usuario tendrá su propio hash generado con bcrypt.)

-- =====================================================================
-- CARRERAS Y PERIODOS
-- =====================================================================
INSERT INTO carreras (id, clave, nombre, creditos_totales) VALUES
 (1, 'DSM', 'Ingeniería en Desarrollo de Software Multiplataforma', 120),
 (2, 'ISC', 'Ingeniería en Sistemas Computacionales', 120),
 (3, 'IIA', 'Ingeniería Industrial y Administración', 120),
 (4, 'IGE', 'Ingeniería en Gestión Empresarial', 120);

INSERT INTO periodos (id, nombre, fecha_inicio, fecha_fin, es_actual) VALUES
 (1, 'Ene-Jun 2025', '2025-01-13', '2025-06-27', FALSE),
 (2, 'Ago-Dic 2025', '2025-08-25', '2025-12-12', FALSE),
 (3, 'Ene-Jun 2026', '2026-01-12', '2026-06-26', FALSE),
 (4, 'Ago-Dic 2026', '2026-08-24', '2026-12-11', TRUE);

INSERT INTO grupos (id, clave, carrera_id, periodo_id, semestre, turno) VALUES
 (1, 'DSM04AV', 1, 4, 4, 'vespertino'),
 (2, 'ISC03BV', 2, 4, 3, 'vespertino'),
 (3, 'ISC05AV', 2, 4, 5, 'vespertino'),
 (4, 'IIA04AV', 3, 4, 4, 'vespertino'),
 (5, 'IGE04AV', 4, 4, 4, 'vespertino');

-- =====================================================================
-- USUARIOS (el trigger crea automáticamente su fila en ajustes_usuario)
-- 1 = admin · 2..8 = alumnos · 9..14 = docentes
-- =====================================================================
INSERT INTO usuarios (id, correo, password_hash, rol, nombre, apellido_paterno, apellido_materno, telefono, sobre_mi) VALUES
 (1,  'admin.portal@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'admin',   'Administrador', 'Portal', 'UTSC', NULL, NULL),
 (2,  '27254@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Juan Manuel',    'Flores',   'Fernández', '81 1234 5678',
      'Estudiante de DSM. Me gusta el desarrollo móvil con Flutter y la inteligencia artificial.'),
 (3,  '27239@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Elisa Berenice', 'Ovalle',   'Sánchez',   '81 2345 6789', 'Diseño UX y frontend.'),
 (4,  '26790@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Juan Francisco', 'Sánchez',  'Pérez',     NULL, NULL),
 (5,  '26512@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'María Fernanda', 'Quiroga',  'Reyes',     NULL, 'Me encantan los hackathones.'),
 (6,  '24812@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Diego Armando',  'Ríos',     'Contreras', '81 3456 7890', NULL),
 (7,  '27102@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Ana Sofía',      'López',    'Hernández', NULL, NULL),
 (8,  '27380@utsc.edu.mx', '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'alumno', 'Daniela',        'Martínez', 'Garza',     NULL, NULL),
 (9,  'roberto.garza@utsc.edu.mx',     '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Roberto Carlos',   'Garza',      'Treviño',  '81 2222 3404', NULL),
 (10, 'laura.villarreal@utsc.edu.mx',  '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Laura Patricia',   'Villarreal', 'Leal',     '81 2222 3404', NULL),
 (11, 'hector.cantu@utsc.edu.mx',      '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Héctor Javier',    'Cantú',      'Salinas',  '81 2222 3404', NULL),
 (12, 'karen.moreno@utsc.edu.mx',      '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Karen Elizabeth',  'Moreno',     'Guerra',   NULL, NULL),
 (13, 'oscar.rodriguez@utsc.edu.mx',   '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Óscar Alberto',    'Rodríguez',  'Elizondo', NULL, NULL),
 (14, 'miguel.trevino@utsc.edu.mx',    '$2b$10$7OpCRWS6KkJzra1qFp5DZu86Kj2WwdFfpATywDwxgWHrtcsKmLW1q', 'docente', 'Miguel Ángel',     'Treviño',    'Garza',    NULL, NULL);

INSERT INTO alumnos (usuario_id, matricula, carrera_id, grupo_id, fecha_ingreso) VALUES
 (2, '27254', 1, 1, '2025-01-13'),
 (3, '27239', 1, 1, '2025-01-13'),
 (4, '26790', 1, 1, '2025-01-13'),
 (5, '26512', 2, 2, '2025-08-25'),
 (6, '24812', 2, 3, '2024-08-26'),
 (7, '27102', 3, 4, '2025-01-13'),
 (8, '27380', 4, 5, '2025-01-13');

INSERT INTO docentes (usuario_id, numero_empleado, area, cubiculo, horario_asesoria) VALUES
 (9,  'EMP-1045', 'Desarrollo de Software', 'Edificio D, cubículo 12', 'Lun y Mié 12:00-13:30'),
 (10, 'EMP-1102', 'Inteligencia Artificial', 'Edificio D, cubículo 14', 'Mar y Jue 12:30-13:30'),
 (11, 'EMP-0987', 'Redes y Seguridad',       'Edificio C, cubículo 03', 'Vie 12:00-14:00'),
 (12, 'EMP-1210', 'Idiomas',                 'Centro de Idiomas, cubículo 2', 'Lun a Jue 13:00-14:00'),
 (13, 'EMP-0876', 'Gestión de TI',           'Edificio D, cubículo 09', 'Mié 12:00-14:00'),
 (14, 'EMP-0754', 'Deportes',                'Gimnasio, oficina 1', 'Sáb 11:00-12:00');

-- Ajustes personalizados (las filas ya existen gracias al trigger)
UPDATE ajustes_usuario SET mostrar_matricula = TRUE, notif_correo = TRUE WHERE usuario_id = 2;
UPDATE ajustes_usuario SET privacidad_publicaciones = 'mi_carrera', mostrar_carrera = FALSE WHERE usuario_id = 6;

-- =====================================================================
-- MATERIAS DSM (ids 1-6 = 1°, 7-12 = 2°, 13-18 = 3°, 19-24 = 4°)
-- Semestres 1 a 3: 24 créditos cada uno · 4° semestre: 23 créditos
-- =====================================================================
INSERT INTO materias (id, clave, nombre, creditos, carrera_id, semestre) VALUES
 (1,  'DSM-101', 'Fundamentos de Programación',          5, 1, 1),
 (2,  'DSM-102', 'Matemáticas para Ingeniería I',        5, 1, 1),
 (3,  'DSM-103', 'Fundamentos de Redes',                 4, 1, 1),
 (4,  'DSM-104', 'Inglés I',                             3, 1, 1),
 (5,  'DSM-105', 'Introducción a las Tecnologías de la Información', 4, 1, 1),
 (6,  'DSM-106', 'Educación Física I',                   3, 1, 1),
 (7,  'DSM-201', 'Programación Orientada a Objetos',     5, 1, 2),
 (8,  'DSM-202', 'Matemáticas para Ingeniería II',       5, 1, 2),
 (9,  'DSM-203', 'Bases de Datos',                       4, 1, 2),
 (10, 'DSM-204', 'Inglés II',                            3, 1, 2),
 (11, 'DSM-205', 'Sistemas Operativos',                  4, 1, 2),
 (12, 'DSM-206', 'Educación Física II',                  3, 1, 2),
 (13, 'DSM-301', 'Desarrollo Web',                       5, 1, 3),
 (14, 'DSM-302', 'Estructuras de Datos',                 5, 1, 3),
 (15, 'DSM-303', 'Bases de Datos Avanzadas',             4, 1, 3),
 (16, 'DSM-304', 'Inglés III',                           3, 1, 3),
 (17, 'DSM-305', 'Probabilidad y Estadística',           4, 1, 3),
 (18, 'DSM-306', 'Educación Física III',                 3, 1, 3),
 (19, 'DSM-401', 'Desarrollo Multiplataforma',           5, 1, 4),
 (20, 'DSM-402', 'Redes Neuronales',                     5, 1, 4),
 (21, 'DSM-403', 'Seguridad Informática',                4, 1, 4),
 (22, 'DSM-404', 'Inglés IV',                            3, 1, 4),
 (23, 'DSM-405', 'Gestión de Proyectos de TI',           4, 1, 4),
 (24, 'DSM-406', 'Educación Física IV',                  2, 1, 4);

INSERT INTO docente_materia (docente_id, materia_id) VALUES
 (9, 19), (9, 13), (9, 7),
 (10, 20), (10, 17),
 (11, 21), (11, 3),
 (12, 22), (12, 16),
 (13, 23), (13, 5),
 (14, 24), (14, 18);

-- =====================================================================
-- KÁRDEX (inscripciones). El estado se calcula solo.
-- =====================================================================
-- Juan Manuel (id 2): semestres 1-3 aprobados + 4° en curso
INSERT INTO inscripciones (alumno_id, materia_id, periodo_id, calificacion) VALUES
 (2, 1, 1, 9.20), (2, 2, 1, 8.50), (2, 3, 1, 9.00), (2, 4, 1, 10.00), (2, 5, 1, 8.80), (2, 6, 1, 10.00),
 (2, 7, 2, 8.70), (2, 8, 2, 8.00), (2, 9, 2, 9.50), (2, 10, 2, 9.60), (2, 11, 2, 8.90), (2, 12, 2, 10.00),
 (2, 13, 3, 9.40), (2, 14, 3, 8.60), (2, 15, 3, 9.10), (2, 16, 3, 9.80), (2, 17, 3, 8.30), (2, 18, 3, 10.00),
 (2, 19, 4, NULL), (2, 20, 4, NULL), (2, 21, 4, NULL), (2, 22, 4, NULL), (2, 23, 4, NULL), (2, 24, 4, NULL);

-- Elisa (3): semestres 1-3 con calificaciones de 8 a 10 (generadas) + 4° en curso
-- (en PostgreSQL se divide entre 10.0 para conservar los decimales)
INSERT INTO inscripciones (alumno_id, materia_id, periodo_id, calificacion)
SELECT 3, m.id, m.semestre, ROUND(8 + MOD(m.id * 7 + 3, 21) / 10.0, 1)
  FROM materias m WHERE m.carrera_id = 1 AND m.semestre <= 3;

-- Juan Francisco (4): igual, pero reprobó Matemáticas II (6.5) y la recursó en Ene-Jun 2026
INSERT INTO inscripciones (alumno_id, materia_id, periodo_id, calificacion)
SELECT 4, m.id, m.semestre, ROUND(8 + MOD(m.id * 5 + 1, 21) / 10.0, 1)
  FROM materias m WHERE m.carrera_id = 1 AND m.semestre <= 3 AND m.id <> 8;
INSERT INTO inscripciones (alumno_id, materia_id, periodo_id, calificacion) VALUES
 (4, 8, 2, 6.50),
 (4, 8, 3, 8.40);

-- 4° semestre en curso (Ago-Dic 2026) para Elisa y Juan Francisco
INSERT INTO inscripciones (alumno_id, materia_id, periodo_id, calificacion)
SELECT a.usuario_id, m.id, 4, NULL
  FROM alumnos a JOIN materias m ON m.carrera_id = 1 AND m.semestre = 4
 WHERE a.usuario_id IN (3, 4);

-- =====================================================================
-- HORARIO DEL GRUPO DSM04AV (vespertino)
-- =====================================================================
INSERT INTO horario_clases (grupo_id, materia_id, docente_id, dia, hora_inicio, hora_fin, aula) VALUES
 (1, 19, 9,  'lunes',     '14:00', '15:40', 'LC-3'),
 (1, 20, 10, 'lunes',     '15:40', '17:20', 'A-204'),
 (1, 22, 12, 'lunes',     '17:40', '19:20', 'CI-2'),
 (1, 21, 11, 'martes',    '14:00', '15:40', 'LC-1'),
 (1, 23, 13, 'martes',    '15:40', '17:20', 'A-108'),
 (1, 19, 9,  'martes',    '17:40', '19:20', 'LC-3'),
 (1, 20, 10, 'miercoles', '14:00', '15:40', 'A-204'),
 (1, 22, 12, 'miercoles', '15:40', '17:20', 'CI-2'),
 (1, 21, 11, 'miercoles', '17:40', '19:20', 'LC-1'),
 (1, 19, 9,  'jueves',    '14:00', '15:40', 'LC-3'),
 (1, 23, 13, 'jueves',    '15:40', '17:20', 'A-108'),
 (1, 20, 10, 'jueves',    '17:40', '19:20', 'LC-2'),
 (1, 22, 12, 'viernes',   '14:00', '15:40', 'CI-2'),
 (1, 21, 11, 'viernes',   '15:40', '17:20', 'LC-1'),
 (1, 24, 14, 'sabado',    '09:00', '10:40', 'Gimnasio');

-- =====================================================================
-- DEPARTAMENTOS Y CONTACTO
-- =====================================================================
INSERT INTO departamentos (id, nombre, responsable, ubicacion, telefono, correo, horario) VALUES
 (1,  'Atención a Alumnos',            'Lic. Patricia Hinojosa Garza',   'Edificio A, planta baja',  '81-2222-3301', 'atencion.alumnos@utsc.edu.mx',  'Lun-Vie 8:00-20:00'),
 (2,  'Servicios Escolares',           'Lic. Jorge Alberto Salazar Ruiz','Edificio A, ventanillas 1-4', '81-2222-3302', 'servicios.escolares@utsc.edu.mx', 'Lun-Vie 8:00-19:00'),
 (3,  'Caja y Pagos',                  'C.P. Mónica Elizondo Cavazos',   'Edificio A, ventanilla 5', '81-2222-3303', 'caja@utsc.edu.mx',              'Lun-Vie 8:30-17:00'),
 (4,  'Coordinación DSM',              'M.C. Ricardo Peña Villarreal',   'Edificio D, planta alta',  '81-2222-3304', 'coordinacion.dsm@utsc.edu.mx',  'Lun-Vie 9:00-19:00'),
 (5,  'Coordinación ISC',              'M.C. Gabriela Torres Medina',    'Edificio C, planta alta',  '81-2222-3305', 'coordinacion.isc@utsc.edu.mx',  'Lun-Vie 9:00-19:00'),
 (6,  'Coordinación IIA',              'Ing. Alejandro Cárdenas Leal',   'Edificio B, planta alta',  '81-2222-3306', 'coordinacion.iia@utsc.edu.mx',  'Lun-Vie 9:00-19:00'),
 (7,  'Coordinación IGE',              'Mtra. Verónica Saldaña Ortiz',   'Edificio B, planta baja',  '81-2222-3307', 'coordinacion.ige@utsc.edu.mx',  'Lun-Vie 9:00-19:00'),
 (8,  'Biblioteca',                    'Lic. Fernando Garza Montemayor', 'Edificio de Biblioteca',   '81-2222-3308', 'biblioteca@utsc.edu.mx',        'Lun-Vie 7:30-21:00, Sáb 8:00-14:00'),
 (9,  'Laboratorios de Cómputo',       'Ing. Raúl Esparza Domínguez',    'Edificio D, LC-1 a LC-4',  '81-2222-3309', 'laboratorios@utsc.edu.mx',      'Lun-Vie 7:00-21:30'),
 (10, 'Vinculación y Servicio Social', 'Lic. Claudia Benavides Rocha',   'Edificio A, primer piso',  '81-2222-3310', 'vinculacion@utsc.edu.mx',       'Lun-Vie 9:00-18:00'),
 (11, 'Recursos Humanos',              'Lic. Sergio Lozano Quintanilla', 'Edificio A, primer piso',  '81-2222-3311', 'rh@utsc.edu.mx',                'Lun-Vie 8:00-16:00'),
 (12, 'Dirección General',             'Dr. Arturo Villarreal Garza',    'Edificio A, segundo piso', '81-2222-3312', 'direccion@utsc.edu.mx',         'Lun-Vie 9:00-17:00'),
 (13, 'Soporte Técnico Portal',        'Ing. Luis Enrique Mata Solís',   'Edificio D, planta baja',  '81-2222-3313', 'soporte.portal@utsc.edu.mx',    'Lun-Vie 8:00-20:00');

-- Los folios CTO-2026-000N vienen escritos (el trigger solo genera uno si el folio va vacío)
INSERT INTO mensajes_contacto
(folio, alumno_id, departamento_id, asunto, mensaje, estado, respuesta, respondido_en, created_at)
VALUES
('CTO-2026-0001', 2, 2, 'Duda sobre constancia de estudios',
'Buen día, ¿la constancia de estudios incluye el promedio general?',
'respondido',
'Hola Juan, la constancia de estudios no incluye promedio; para eso solicita la constancia de calificaciones.',
'2026-09-23 10:15:00', '2026-09-22 18:40:00');

INSERT INTO mensajes_contacto
(folio, alumno_id, departamento_id, asunto, mensaje, estado, respuesta, respondido_en, created_at)
VALUES
('CTO-2026-0002', 2, 13, 'No carga mi horario en el portal',
'Al entrar a Horarios aparece la pantalla en blanco desde el celular.',
'pendiente', NULL, NULL, '2026-10-02 20:05:00');

INSERT INTO mensajes_contacto
(folio, alumno_id, departamento_id, asunto, mensaje, estado, respuesta, respondido_en, created_at)
VALUES
('CTO-2026-0003', 5, 10, 'Información de servicio social',
'¿Desde qué semestre puedo iniciar mi servicio social?',
'pendiente', NULL, NULL, '2026-10-03 12:30:00');

-- =====================================================================
-- BLOG ESTUDIANTIL
-- =====================================================================
INSERT INTO categorias_blog (id, nombre) VALUES
 (1, 'Académico'), (2, 'Vida universitaria'), (3, 'Recursos'), (4, 'Eventos'), (5, 'Deportes'), (6, 'Tecnología');

INSERT INTO publicaciones (id, autor_id, categoria_id, titulo, contenido, imagen_url, created_at, deleted_at) VALUES
 (1, 2, 1, 'Guía para sobrevivir a Redes Neuronales',
     'Les comparto mis apuntes y los videos que me ayudaron a entender backpropagation. Lo más importante: practicar con datasets pequeños antes del proyecto final.',
     NULL, '2026-09-28 19:30:00', NULL),
 (2, 3, 5, '¡Inscripciones abiertas para el torneo de fútbol rápido!',
     'Buscamos equipos mixtos de 7 personas. Las inscripciones cierran el 15 de octubre en el gimnasio.',
     'https://portal.utsc.edu.mx/img/blog/torneo-futbol.jpg', '2026-09-30 13:10:00', NULL),
 (3, 6, 6, 'Recursos gratis para aprender Flutter',
     'Armé una lista con cursos gratuitos, la documentación oficial y repositorios de ejemplo para quienes van a llevar Desarrollo Multiplataforma.',
     NULL, '2026-10-01 21:45:00', NULL),
 (4, 5, 4, 'Hackathon UTSC 2026: ¿quién arma equipo?',
     'El hackathon será el 7 de noviembre. Busco 2 personas de DSM para el área de frontend y móvil.',
     'https://portal.utsc.edu.mx/img/blog/hackathon.jpg', '2026-10-03 09:20:00', NULL),
 (5, 8, 2, 'Venta de apuntes',
     'Publicación eliminada por la autora.', NULL, '2026-09-20 11:00:00', '2026-09-21 08:00:00');

INSERT INTO hashtags (id, nombre) VALUES
 (1, 'redesneuronales'), (2, 'dsm'), (3, 'tips'), (4, 'deportes'), (5, 'utsc'), (6, 'flutter'), (7, 'hackathon');

INSERT INTO publicacion_hashtag (publicacion_id, hashtag_id) VALUES
 (1, 1), (1, 2), (1, 3),
 (2, 4), (2, 5),
 (3, 6), (3, 2),
 (4, 7), (4, 5);

-- Me gusta (el trigger genera notificaciones para el autor)
INSERT INTO reacciones (publicacion_id, usuario_id) VALUES
 (1, 3), (1, 4), (1, 5), (1, 6), (1, 8),
 (2, 2), (2, 4), (2, 7),
 (3, 2), (3, 3), (3, 4), (3, 5), (3, 7), (3, 8),
 (4, 2), (4, 6);

INSERT INTO comentarios (publicacion_id, usuario_id, contenido, created_at) VALUES
 (1, 3, '¡Gracias Juan! Justo me estaba atorando con el descenso de gradiente.', '2026-09-28 20:02:00'),
 (1, 4, '¿Puedes subir también el notebook de la práctica 3?', '2026-09-28 21:15:00'),
 (1, 2, 'Claro, mañana lo subo al grupo.', '2026-09-28 21:40:00'),
 (2, 7, '¿Pueden participar alumnos de IIA?', '2026-09-30 14:00:00'),
 (2, 3, 'Sí, es abierto para todas las carreras.', '2026-09-30 14:22:00'),
 (3, 2, 'Muy buena lista, le agregaría el canal oficial de Flutter en YouTube.', '2026-10-02 08:10:00'),
 (4, 2, 'Me interesa, te mando mensaje.', '2026-10-03 10:05:00'),
 (4, 3, 'Yo también me apunto para UI.', '2026-10-03 11:30:00');

INSERT INTO reportes (publicacion_id, usuario_id, motivo, detalle, estado) VALUES
 (5, 4, 'spam', 'Venta de material no permitido.', 'revisado');

-- =====================================================================
-- NOTICIAS, EVENTOS Y AVISOS
-- =====================================================================
INSERT INTO categorias_noticia (id, nombre) VALUES
 (1, 'Institucional'), (2, 'Académico'), (3, 'Vinculación'), (4, 'Deportes'), (5, 'Cultura');

INSERT INTO noticias (categoria_id, autor_id, titulo, resumen, cuerpo, fecha_publicacion, minutos_lectura, destacada) VALUES
 (1, 1, 'La UTSC inaugura nuevo laboratorio de cómputo',
     'El laboratorio LC-4 cuenta con 40 equipos para cursos de desarrollo de software y ciencia de datos.',
     'La Universidad Tecnológica de Santa Catarina inauguró el laboratorio LC-4, equipado con 40 computadoras de alto rendimiento que darán servicio a las carreras de DSM e ISC...',
     '2026-09-29 09:00:00', 4, TRUE),
 (2, 1, 'Calendario de evaluaciones del segundo parcial',
     'Las evaluaciones del segundo parcial se aplicarán del 19 al 24 de octubre.',
     'Servicios Escolares informa que el periodo de evaluaciones del segundo parcial será del 19 al 24 de octubre de 2026. Consulta con tu docente las fechas específicas...',
     '2026-10-01 08:30:00', 2, FALSE),
 (3, 1, 'Feria de empleo y estadías 2026',
     'Más de 30 empresas de la región ofrecerán vacantes y plazas de estadía.',
     'El área de Vinculación invita a la Feria de Empleo y Estadías que se realizará en la explanada principal con empresas del sector automotriz, manufactura y tecnología...',
     '2026-09-25 10:00:00', 3, FALSE),
 (4, 1, 'Halcones UTSC, campeones regionales de básquetbol',
     'El equipo varonil ganó el torneo regional y avanza a la etapa nacional.',
     'El equipo representativo de básquetbol varonil se coronó en el torneo regional de Universidades Tecnológicas celebrado en Monterrey...',
     '2026-09-22 17:00:00', 2, FALSE),
 (5, 1, 'Festival de Día de Muertos en el campus',
     'Concurso de altares y catrinas el 30 de octubre.',
     'La coordinación de Cultura invita a todos los grupos a participar en el concurso de altares de muertos y en el desfile de catrinas...',
     '2026-10-02 12:00:00', 3, FALSE);

INSERT INTO eventos (titulo, descripcion, lugar, fecha_inicio, fecha_fin, departamento_id) VALUES
 ('Feria de Empleo y Estadías 2026', 'Empresas de la región con vacantes y estadías.', 'Explanada principal', '2026-10-14 09:00:00', '2026-10-14 15:00:00', 10),
 ('Conferencia: IA generativa en la industria', 'Ponencia para alumnos de DSM e ISC.', 'Auditorio', '2026-10-21 16:00:00', '2026-10-21 18:00:00', 4),
 ('Festival de Día de Muertos', 'Concurso de altares y desfile de catrinas.', 'Explanada principal', '2026-10-30 12:00:00', '2026-10-30 18:00:00', 1),
 ('Hackathon UTSC 2026', '24 horas de desarrollo de soluciones para la comunidad.', 'Edificio D, laboratorios', '2026-11-07 09:00:00', '2026-11-08 09:00:00', 4);

INSERT INTO avisos (titulo, contenido, prioridad, departamento_id, vigente_desde, vigente_hasta) VALUES
 ('Fecha límite de reinscripción', 'El pago de reinscripción vence el 30 de octubre. Evita recargos.', 'importante', 3, '2026-10-01', '2026-10-30'),
 ('Mantenimiento del portal', 'El portal estará fuera de servicio el sábado 10 de octubre de 22:00 a 23:59.', 'normal', 13, '2026-10-04', '2026-10-10'),
 ('Suspensión de clases', 'No habrá clases el 2 de noviembre por Día de Muertos.', 'normal', 12, '2026-10-20', '2026-11-02');

-- =====================================================================
-- TRÁMITES Y PAGOS
-- =====================================================================
INSERT INTO tramites_catalogo (id, nombre, descripcion, costo, dias_habiles, requisitos) VALUES
 (1, 'Constancia de estudios',        'Constancia de alumno inscrito.',                     0.00, 2, 'Estar inscrito en el periodo actual'),
 (2, 'Carta de presentación',         'Carta para estadía o servicio social.',              0.00, 3, 'Datos de la empresa'),
 (3, 'Constancia de calificaciones',  'Calificaciones del periodo solicitado.',             0.00, 3, NULL),
 (4, 'Kárdex certificado',            'Historial académico con firma y sello.',           150.00, 5, 'Pago del trámite'),
 (5, 'Reposición de credencial',      'Nueva credencial por pérdida o daño.',             200.00, 5, 'Pago del trámite y fotografía'),
 (6, 'Baja temporal',                 'Suspensión temporal de estudios.',                   0.00, 10, 'No tener adeudos; entrevista con coordinación');

-- Cargos de Juan: 3 pendientes (ids 1-3) y 5 ya pagados (ids 4-8). Cargo 9 de Elisa.
INSERT INTO cargos (id, alumno_id, concepto, monto, fecha_vencimiento, periodo_id, created_at) VALUES
 (1, 2, 'Reinscripción 4° Semestre',     1800.00, '2026-10-30', 4, '2026-08-10 09:00:00'),
 (2, 2, 'Seguro escolar 2026-B',          450.00, '2026-10-30', 4, '2026-08-10 09:00:00'),
 (3, 2, 'Credencial institucional',       200.00, '2026-10-16', 4, '2026-09-01 09:00:00'),
 (4, 2, 'Inscripción 1° Semestre',       2100.00, '2025-01-10', 1, '2024-12-02 09:00:00'),
 (5, 2, 'Reinscripción 2° Semestre',     1800.00, '2025-08-22', 2, '2025-07-14 09:00:00'),
 (6, 2, 'Seguro escolar 2025-B',          450.00, '2025-08-22', 2, '2025-07-14 09:00:00'),
 (7, 2, 'Reinscripción 3° Semestre',     1800.00, '2026-01-09', 3, '2025-12-01 09:00:00'),
 (8, 2, 'Seguro escolar 2026-A',          450.00, '2026-01-09', 3, '2025-12-01 09:00:00'),
 (9, 3, 'Reinscripción 4° Semestre',     1800.00, '2026-10-30', 4, '2026-08-10 09:00:00');

-- Como los cargos se insertaron con id manual, se acomodan los contadores
-- para que los cargos automáticos (trámites con costo) no choquen.
SELECT fn_reset_secuencias();

-- Historial de 5 pagos de Juan (el trigger marca cada cargo como "pagado")
INSERT INTO pagos (cargo_id, metodo, referencia, monto, tarjeta_ultimos4, estado, pagado_en, created_at) VALUES
 (4, 'tarjeta', 'TARJETA-20250108-0001', 2100.00, '4821', 'completado', '2025-01-08 11:24:00', '2025-01-08 11:24:00'),
 (5, 'spei',    'SPEI-20250818-0001',    1800.00, NULL,   'completado', '2025-08-18 16:02:00', '2025-08-18 09:10:00'),
 (6, 'oxxo',    'OXXO-20250820-0001',     450.00, NULL,   'completado', '2025-08-20 19:45:00', '2025-08-19 12:00:00'),
 (7, 'tarjeta', 'TARJETA-20260105-0001', 1800.00, '4821', 'completado', '2026-01-05 10:31:00', '2026-01-05 10:31:00'),
 (8, 'spei',    'SPEI-20260107-0001',     450.00, NULL,   'completado', '2026-01-07 13:12:00', '2026-01-07 08:45:00');

-- Solicitudes de trámite (folio TRM-2026-000N; si el trámite cuesta, el trigger genera el cargo)
INSERT INTO solicitudes_tramite (folio, alumno_id, tramite_id, estado, observaciones, created_at)
VALUES ('TRM-2026-0001', 2, 1, 'completado', 'Entregada en ventanilla', '2026-09-10 10:00:00');

INSERT INTO solicitudes_tramite (folio, alumno_id, tramite_id, estado, observaciones, created_at)
VALUES ('TRM-2026-0002', 6, 5, 'completado', 'Credencial extraviada', '2026-09-15 08:20:00');

INSERT INTO solicitudes_tramite (folio, alumno_id, tramite_id, estado, observaciones, created_at)
VALUES ('TRM-2026-0003', 2, 2, 'en_proceso', 'Estadía en empresa de software', '2026-09-29 12:15:00');

INSERT INTO solicitudes_tramite (folio, alumno_id, tramite_id, estado, observaciones, created_at)
VALUES ('TRM-2026-0004', 7, 4, 'pendiente', NULL, '2026-10-01 09:40:00');

-- Diego (6) ya pagó su reposición de credencial (cargo generado por el trigger)
-- (Igual que en tu script original, este pago queda COMENTADO. Para activarlo,
--  quita los -- de las líneas del bloque DO.)
-- DO $$
-- DECLARE v_cargo INT; v_monto NUMERIC;
-- BEGIN
--   SELECT c.id, c.monto INTO v_cargo, v_monto
--     FROM cargos c JOIN solicitudes_tramite s ON s.id = c.solicitud_id
--    WHERE s.alumno_id = 6 AND s.tramite_id = 5
--    LIMIT 1;
--   INSERT INTO pagos (cargo_id, metodo, referencia, monto, tarjeta_ultimos4, estado, pagado_en, created_at)
--   VALUES (v_cargo, 'tarjeta', 'TARJETA-20260915-0001', v_monto, '9013',
--           'completado', '2026-09-15 08:35:00', '2026-09-15 08:35:00');
-- END $$;

-- =====================================================================
-- BIBLIOTECA
-- (ISBN de referencia para pruebas; verifícalos si se usarán en producción)
-- =====================================================================
INSERT INTO categorias_libro (id, nombre) VALUES
 (1, 'Programación'), (2, 'Redes'), (3, 'Inteligencia Artificial'), (4, 'Bases de Datos'),
 (5, 'Ingeniería de Software'), (6, 'Sistemas Operativos'), (7, 'Algoritmos');

-- Se insertan con disponibles = totales; los triggers de préstamos los descuentan.
INSERT INTO libros (id, isbn, titulo, autor, editorial, edicion, anio, categoria_id, ejemplares_totales, ejemplares_disponibles) VALUES
 (1,  '978-0132350884', 'Clean Code', 'Robert C. Martin', 'Prentice Hall', '1a', 2008, 1, 4, 4),
 (2,  '978-6073208178', 'Redes de Computadoras', 'Andrew S. Tanenbaum, David J. Wetherall', 'Pearson', '5a', 2012, 2, 3, 3),
 (3,  '978-8420540030', 'Inteligencia Artificial: Un Enfoque Moderno', 'Stuart Russell, Peter Norvig', 'Pearson', '2a', 2004, 3, 3, 3),
 (4,  '978-0135957059', 'The Pragmatic Programmer', 'David Thomas, Andrew Hunt', 'Addison-Wesley', '20th Anniversary', 2019, 1, 2, 2),
 (5,  '978-0201633610', 'Design Patterns', 'Erich Gamma, Richard Helm, Ralph Johnson, John Vlissides', 'Addison-Wesley', '1a', 1994, 5, 2, 2),
 (6,  '978-8448146443', 'Fundamentos de Bases de Datos', 'Abraham Silberschatz, Henry F. Korth, S. Sudarshan', 'McGraw-Hill', '5a', 2006, 4, 3, 3),
 (7,  '978-6073206037', 'Ingeniería de Software', 'Ian Sommerville', 'Pearson', '9a', 2011, 5, 2, 2),
 (8,  '978-6074420463', 'Sistemas Operativos Modernos', 'Andrew S. Tanenbaum', 'Pearson', '3a', 2009, 6, 2, 2),
 (9,  '978-0262035613', 'Deep Learning', 'Ian Goodfellow, Yoshua Bengio, Aaron Courville', 'MIT Press', '1a', 2016, 3, 1, 1),
 (10, '978-0262033848', 'Introduction to Algorithms', 'Thomas H. Cormen, Charles E. Leiserson, Ronald L. Rivest, Clifford Stein', 'MIT Press', '3a', 2009, 7, 2, 2);

-- Juan: 2 préstamos + 1 reserva = 3 activos (el máximo)
INSERT INTO prestamos (alumno_id, libro_id, tipo, fecha_inicio) VALUES
 (2, 1, 'prestamo', '2026-09-15'),
 (2, 2, 'prestamo', '2026-09-28'),
 (2, 3, 'reserva',  '2026-10-03'),
 (3, 1, 'prestamo', '2026-09-30'),
 (6, 9, 'prestamo', '2026-09-25'),
 (5, 10, 'prestamo', '2026-08-31');

-- Juan renueva Clean Code (el trigger suma 15 días al vencimiento)
UPDATE prestamos SET renovaciones = renovaciones + 1 WHERE alumno_id = 2 AND libro_id = 1 AND estado = 'activo';

-- María Fernanda devuelve "Introduction to Algorithms" (el trigger regresa el ejemplar)
UPDATE prestamos SET estado = 'devuelto', fecha_devolucion = '2026-09-14' WHERE alumno_id = 5 AND libro_id = 10;

INSERT INTO recursos_digitales (nombre, descripcion, url, tipo, acceso) VALUES
 ('IEEE Xplore', 'Artículos y estándares de ingeniería eléctrica, electrónica y computación.', 'https://ieeexplore.ieee.org', 'base_datos', 'campus'),
 ('SpringerLink', 'Libros y revistas científicas de Springer.', 'https://link.springer.com', 'libros_electronicos', 'campus'),
 ('ScienceDirect', 'Revistas y libros de Elsevier.', 'https://www.sciencedirect.com', 'revistas', 'campus'),
 ('EBSCOhost', 'Bases de datos académicas multidisciplinarias.', 'https://search.ebscohost.com', 'base_datos', 'remoto'),
 ('e-Libro', 'Biblioteca digital de libros en español.', 'https://elibro.net', 'libros_electronicos', 'remoto'),
 ('Google Académico', 'Buscador de literatura académica.', 'https://scholar.google.com', 'buscador', 'libre');

-- =====================================================================
-- DriverUTSC
-- =====================================================================
INSERT INTO rutas_driver (id, conductor_id, sentido, lugar, hora_salida, asientos, precio, vehiculo, notas, deleted_at) VALUES
 (1, 6, 'hacia_utsc', 'Cumbres 4° Sector, Monterrey (OXXO Paseo de los Leones)', '12:45', 3, 40.00, 'Nissan Versa gris', 'Salgo puntual, espero 5 minutos máximo.', NULL),
 (2, 4, 'desde_utsc', 'Centro de Santa Catarina (Plaza Principal)', '19:30', 4, 0.00, 'Chevrolet Aveo blanco', 'Gratis, solo cooperen con buena música.', NULL),
 (3, 7, 'hacia_utsc', 'García, N.L. (Col. Valle de Lincoln)', '12:30', 2, 30.00, 'Kia Rio rojo', NULL, NULL),
 (4, 2, 'desde_utsc', 'Estación Metro Talleres, Monterrey', '19:30', 3, 25.00, 'Mazda 2 azul', 'Paso por Av. Díaz Ordaz.', NULL),
 (5, 8, 'hacia_utsc', 'Guadalupe (Expo Guadalupe)', '12:15', 4, 50.00, 'Volkswagen Jetta negro', 'Sin comida dentro del auto, por favor.', NULL),
 (6, 5, 'desde_utsc', 'San Nicolás de los Garza (Plaza Fiesta Anáhuac)', '19:30', 3, 45.00, 'Toyota Yaris plata', 'Ruta dada de baja.', '2026-09-26 18:00:00');

INSERT INTO ruta_dias (ruta_id, dia) VALUES
 (1, 'lunes'), (1, 'martes'), (1, 'miercoles'), (1, 'jueves'), (1, 'viernes'),
 (2, 'lunes'), (2, 'martes'), (2, 'miercoles'), (2, 'jueves'),
 (3, 'lunes'), (3, 'miercoles'), (3, 'viernes'),
 (4, 'lunes'), (4, 'martes'), (4, 'miercoles'), (4, 'jueves'), (4, 'viernes'),
 (5, 'martes'), (5, 'jueves'), (5, 'sabado'),
 (6, 'lunes'), (6, 'viernes');

-- Reservas (la ruta 3 queda LLENA: 2 de 2)
INSERT INTO reservas_viaje (ruta_id, pasajero_id, created_at) VALUES
 (1, 3, '2026-09-20 10:00:00'),
 (1, 5, '2026-09-21 11:00:00'),
 (2, 3, '2026-09-22 09:00:00'),
 (2, 8, '2026-09-22 09:30:00'),
 (2, 6, '2026-09-23 15:00:00'),
 (3, 2, '2026-09-24 08:00:00'),
 (3, 8, '2026-09-24 08:30:00'),
 (4, 3, '2026-09-25 19:00:00'),
 (4, 4, '2026-09-25 19:10:00'),
 (5, 7, '2026-09-26 12:00:00');

-- Juan Francisco cancela su lugar en la ruta de Juan (el trigger registra cancelada_en)
UPDATE reservas_viaje SET estado = 'cancelada' WHERE ruta_id = 4 AND pasajero_id = 4;

-- =====================================================================
-- NOTIFICACIONES Y BITÁCORA (además de las que generaron los triggers)
-- =====================================================================
INSERT INTO notificaciones (usuario_id, titulo, mensaje, modulo, enlace, leida, created_at) VALUES
 (2, 'Pago próximo a vencer', 'Tu Credencial institucional ($200.00) vence el 16 de octubre.', 'pagos', '/pagos', FALSE, '2026-10-03 08:00:00'),
 (2, 'Préstamo por vencer', 'Redes de Computadoras debe devolverse el 13 de octubre.', 'biblioteca', '/biblioteca/prestamos', FALSE, '2026-10-04 08:00:00'),
 (2, 'Nueva noticia destacada', 'La UTSC inaugura nuevo laboratorio de cómputo.', 'noticias', '/noticias', TRUE, '2026-09-29 09:05:00'),
 (2, 'Reserva confirmada', 'Tu lugar en la ruta de Ana Sofía (García) está confirmado.', 'driver', '/driver/reservas', TRUE, '2026-09-24 08:01:00'),
 (2, 'Mensaje respondido', 'Servicios Escolares respondió tu mensaje CTO-2026-0001.', 'contacto', '/contacto', TRUE, '2026-09-23 10:16:00');

INSERT INTO actividad (usuario_id, modulo, accion, descripcion, ip, created_at) VALUES
 (2, 'sesion',     'inicio_sesion',   'Inicio de sesión desde navegador web', '189.203.10.25', '2026-10-04 07:55:00'),
 (2, 'blog',       'publicar',        'Publicó "Guía para sobrevivir a Redes Neuronales"', '189.203.10.25', '2026-09-28 19:30:00'),
 (2, 'tramites',   'solicitar',       'Solicitó Carta de presentación', '189.203.10.25', '2026-09-29 12:15:00'),
 (2, 'biblioteca', 'reservar',        'Reservó "Inteligencia Artificial: Un Enfoque Moderno"', '189.203.10.25', '2026-10-03 18:20:00'),
 (2, 'perfil',     'cambiar_password','Cambio de contraseña', '189.203.10.25', '2026-09-05 21:00:00'),
 (2, 'driver',     'publicar_ruta',   'Publicó la ruta a Metro Talleres', '189.203.10.25', '2026-09-18 20:40:00');

-- Se acomodan todos los contadores y se borra la función auxiliar
SELECT fn_reset_secuencias();
DROP FUNCTION fn_reset_secuencias();

-- Fin del script 02.
SELECT 'Datos de prueba cargados correctamente' AS resultado;
