/* Datos del Portal UTSC.
   CATALOGO: información fija de la universidad (no cambia con el uso).
   crearEstadoInicial(): datos del alumno que sí cambian (publicaciones, pagos, trámites...).
   Todo es de ejemplo; cuando exista un servidor, estos datos vendrán de la API. */
window.App = window.App || {};

(function () {
  const HORA = 3600 * 1000;
  const DIA = 24 * HORA;

  // Fecha a medianoche, desplazada n días desde hoy (para que los ejemplos siempre se vean vigentes).
  function enDias(n) {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    d.setDate(d.getDate() + n);
    return d.toISOString();
  }

  App.CATALOGO = {
    universidad: {
      nombre: "Universidad Tecnológica de Santa Catarina",
      siglas: "UTSC",
      ciudad: "Santa Catarina, Nuevo León",
      direccion: "Av. Universidad 2004, Santa Catarina, NL",
      telefono: "81-2222-3300",
      correo: "portal@utsc.edu.mx",
      dominio: "@utsc.edu.mx",
      periodo: "Ago-Dic 2026",
      inicioPeriodo: "2026-08-31",
      finPeriodo: "2026-12-11",
      creditosCarrera: 120,
      version: "v1.1"
    },

    carreras: [
      { clave: "DSM", nombre: "Ing. Desarrollo de Software Multiplataforma" },
      { clave: "ISC", nombre: "Ing. en Sistemas Computacionales" },
      { clave: "IIA", nombre: "Ing. Industrial y Administración" },
      { clave: "IGE", nombre: "Ing. en Gestión Empresarial" }
    ],

    modulos: [
      { id: "blog", nombre: "Blog Estudiantil", ico: "notebook-pen", desc: "Muro de publicaciones" },
      { id: "kardex", nombre: "Kárdex", ico: "clipboard-list", desc: "Historial académico" },
      { id: "horarios", nombre: "Horarios", ico: "calendar-days", desc: "Mis clases" },
      { id: "pagos", nombre: "Pagos", ico: "credit-card", desc: "Estado de cuenta" },
      { id: "tramites", nombre: "Trámites", ico: "file-text", desc: "Solicitudes en línea" },
      { id: "biblioteca", nombre: "Biblioteca", ico: "library", desc: "Recursos digitales" },
      { id: "driver", nombre: "DriverUTSC", ico: "car", desc: "Transporte universitario" }
    ],

    categoriasBlog: ["Académico", "Vida universitaria", "Recursos", "Eventos", "Deportes", "Tecnología"],

    // Kárdex: semestres cursados. La calificación null = materia en curso.
    kardex: [
      { num: 1, periodo: "Ene-Jun 2025", materias: [
        ["Fundamentos de Programación", 5, 10], ["Cálculo Diferencial", 5, 9], ["Arquitectura de Computadoras", 4, 9],
        ["Inglés I", 3, 9], ["Metodología de la Programación", 5, 10], ["Educación Física I", 2, 10]] },
      { num: 2, periodo: "Ago-Dic 2025", materias: [
        ["Programación Orientada a Objetos", 5, 9], ["Cálculo Integral", 5, 8], ["Bases de Datos", 4, 9],
        ["Inglés II", 3, 10], ["Desarrollo Web", 5, 10], ["Educación Física II", 2, 9]] },
      { num: 3, periodo: "Ene-Jun 2026", materias: [
        ["Estructuras de Datos", 5, 9], ["Probabilidad y Estadística", 5, 9], ["Bases de Datos Avanzadas", 4, 10],
        ["Inglés III", 3, 9], ["Redes de Computadoras", 5, 9], ["Educación Física III", 2, 10]] },
      { num: 4, periodo: "Ago-Dic 2026", actual: true, materias: [
        ["Desarrollo Multiplataforma", 5, null], ["Redes Neuronales", 5, null], ["Seguridad Informática", 4, null],
        ["Inglés IV", 3, null], ["Gestión de Proyectos de TI", 4, null], ["Educación Física IV", 2, null]] }
    ],

    // Horario: dia 0 = lunes. inicio en horas, duración en horas.
    horario: [
      { materia: "Desarrollo Multiplataforma", color: "#3b82f6", dia: 0, inicio: 7, dur: 2, aula: "Aula B-204", docente: "Mtro. Fernando Aguirre Cruz" },
      { materia: "Desarrollo Multiplataforma", color: "#3b82f6", dia: 2, inicio: 7, dur: 2, aula: "Aula B-204", docente: "Mtro. Fernando Aguirre Cruz" },
      { materia: "Redes Neuronales", color: "#8b5cf6", dia: 1, inicio: 9, dur: 2, aula: "Lab C-101", docente: "Dra. Laura Beatriz Soto Mendoza" },
      { materia: "Redes Neuronales", color: "#8b5cf6", dia: 3, inicio: 9, dur: 2, aula: "Lab C-101", docente: "Dra. Laura Beatriz Soto Mendoza" },
      { materia: "Seguridad Informática", color: "#ef4444", dia: 0, inicio: 11, dur: 2, aula: "Edificio C-301", docente: "Dr. Héctor Morales Ibarra" },
      { materia: "Seguridad Informática", color: "#ef4444", dia: 3, inicio: 11, dur: 2, aula: "Edificio C-301", docente: "Dr. Héctor Morales Ibarra" },
      { materia: "Inglés IV", color: "#10b981", dia: 2, inicio: 9, dur: 2, aula: "Aula A-110", docente: "Mtra. Claudia Pérez Garza" },
      { materia: "Inglés IV", color: "#10b981", dia: 3, inicio: 7, dur: 2, aula: "Aula A-110", docente: "Mtra. Claudia Pérez Garza" },
      { materia: "Gestión de Proyectos de TI", color: "#e8781c", dia: 1, inicio: 11, dur: 2, aula: "Aula B-108", docente: "Ing. Samuel Torres Bravo" },
      { materia: "Gestión de Proyectos de TI", color: "#e8781c", dia: 4, inicio: 9, dur: 2, aula: "Aula B-108", docente: "Ing. Samuel Torres Bravo" },
      { materia: "Educación Física IV", color: "#13a597", dia: 4, inicio: 7, dur: 2, aula: "Cancha Principal", docente: "Lic. Óscar Garza" }
    ],

    noticias: [
      { id: "n1", destacada: true, cat: "Institucional", fecha: "2026-09-17", min: 3, ico: "handshake", grad: ["#3c5a7a", "#1b1f2e"],
        titulo: "UTSC firma convenio de colaboración con el Tecnológico de Monterrey",
        resumen: "El convenio permitirá a los alumnos de la UTSC acceder a laboratorios especializados y programas de movilidad estudiantil durante el ciclo 2026-2027.",
        cuerpo: ["La Universidad Tecnológica de Santa Catarina firmó un convenio bilateral con el Instituto Tecnológico y de Estudios Superiores de Monterrey que abre la puerta a intercambios académicos, uso compartido de laboratorios de IoT y realidad virtual, y co-dirección de proyectos de tesis.",
          "El rector Dr. Arturo Medina Garza destacó que este acuerdo es el resultado de dos años de colaboración entre ambas instituciones y beneficiará a más de 1,200 alumnos de ingeniería.",
          "Las primeras convocatorias de movilidad se publicarán en noviembre en la sección de Noticias del portal."] },
      { id: "n2", cat: "Tecnología", fecha: "2026-09-15", min: 2, ico: "glasses", grad: ["#6d5df6", "#2a3050"],
        titulo: "Nuevo laboratorio de realidad virtual para Ingeniería en Software",
        resumen: "La sala cuenta con 12 estaciones equipadas con visores Meta Quest Pro y software de desarrollo XR, disponible para todas las carreras.",
        cuerpo: ["El nuevo laboratorio XR, ubicado en el Edificio C, cuenta con 12 estaciones de trabajo con visores Meta Quest Pro, equipos con tarjeta gráfica dedicada y licencias de Unity y Unreal Engine.",
          "Los alumnos pueden reservar horario a través de Laboratorios de Cómputo de lunes a viernes de 8:00 a 18:00."] },
      { id: "n3", cat: "Deportes", fecha: "2026-09-14", min: 2, ico: "trophy", grad: ["#e5384c", "#7a1f2b"],
        titulo: "UTSC campeón estatal de ajedrez universitario por tercer año consecutivo",
        resumen: "El equipo representativo de ajedrez de la UTSC obtuvo el primer lugar en el Torneo Estatal de Universidades celebrado en Monterrey.",
        cuerpo: ["El equipo, integrado por cinco alumnos de DSM, ISC e IIA, ganó 18 de sus 20 partidas en el Torneo Estatal de Universidades.",
          "Con este resultado, la UTSC representará a Nuevo León en el nacional universitario que se celebrará en marzo."] },
      { id: "n4", cat: "Académico", fecha: "2026-09-12", min: 1, ico: "graduation-cap", grad: ["#18a058", "#0d5a33"],
        titulo: "Convocatoria abierta: Becas de excelencia académica 2026-B",
        resumen: "Alumnos con promedio igual o superior a 9.0 y sin adeudos pueden solicitar la beca de excelencia que cubre hasta el 50% de la reinscripción.",
        cuerpo: ["La beca de excelencia cubre hasta el 50% de la reinscripción del siguiente cuatrimestre.",
          "Requisitos: promedio general igual o superior a 9.0, no tener adeudos y estar inscrito en el periodo actual. Las solicitudes se reciben en Servicios Escolares hasta el 30 de octubre."] },
      { id: "n5", cat: "Cultura", fecha: "2026-09-10", min: 2, ico: "camera", grad: ["#b45cd6", "#4a2370"],
        titulo: "Exposición fotográfica 'Campus Vivo' abierta hasta el 30 de octubre",
        resumen: "La exposición reúne 60 fotografías tomadas por alumnos de todas las carreras que documentan la vida en el campus.",
        cuerpo: ["La muestra está en el vestíbulo de la Biblioteca y puede visitarse de lunes a viernes de 8:00 a 19:00.",
          "Las tres fotografías con más votos de la comunidad se imprimirán en gran formato para la entrada principal."] },
      { id: "n6", cat: "Tecnología", fecha: "2026-09-08", min: 2, ico: "bot", grad: ["#2f6fe0", "#1b2f66"],
        titulo: "Conferencia internacional: IA en la industria 4.0, transmisión en vivo",
        resumen: "El Dr. Guillermo Fuentes del MIT ofrecerá una conferencia sobre automatización inteligente en manufactura.",
        cuerpo: ["La conferencia se transmitirá en vivo desde el Aula Magna y por Moodle UTSC.",
          "Los alumnos que asistan recibirán constancia de 2 horas de formación complementaria."] },
      { id: "n7", cat: "Institucional", fecha: "2026-09-05", min: 1, ico: "landmark", grad: ["#e8781c", "#8a3f08"],
        titulo: "Calendario de reinscripciones para el periodo Ene-Jun 2027",
        resumen: "Servicios Escolares publicó las fechas de reinscripción por carrera y semestre.",
        cuerpo: ["La reinscripción se realizará del 1 al 12 de diciembre a través del módulo de Pagos del portal.",
          "Recuerda no tener adeudos de biblioteca ni de caja para poder reinscribirte."] }
    ],

    eventos: [
      { fecha: "2026-10-14", titulo: "Conferencia: Ciberseguridad en apps modernas", lugar: "Aula Magna" },
      { fecha: "2026-10-23", titulo: "Exposición de proyectos finales DSM", lugar: "Vestíbulo Edificio B" },
      { fecha: "2026-11-06", titulo: "Feria de empleo y prácticas profesionales", lugar: "Explanada principal" },
      { fecha: "2026-11-20", titulo: "Torneo interno de fútbol rápido", lugar: "Cancha Principal" }
    ],

    alumnos: [
      ["Juan Manuel Flores Fernández", "27254", "DSM04AV", "DSM", 4],
      ["Elisa Berenice Ovalle Sánchez", "27239", "DSM04AV", "DSM", 4],
      ["Juan Francisco Sánchez Pérez", "26790", "DSM04AV", "DSM", 4],
      ["José Antonio Prado Segura", "27144", "DSM04AV", "DSM", 4],
      ["María Fernanda Quiroga Reyes", "26512", "ISC03BV", "ISC", 3],
      ["Diego Armando Ríos Contreras", "24812", "ISC05AV", "ISC", 5],
      ["Ana Sofía López Hernández", "27102", "IIA04AV", "IIA", 4],
      ["Carlos Eduardo Ramírez Treviño", "25438", "DSM05BV", "DSM", 5],
      ["Daniela Martínez Garza", "27380", "IGE04AV", "IGE", 4],
      ["Luis Alberto Morales Soto", "25891", "DSM05AV", "DSM", 5],
      ["Paola Alejandra Vega Núñez", "27601", "ISC04BV", "ISC", 4],
      ["Rodrigo Iván Castillo Luna", "26234", "IIA03AV", "IIA", 3]
    ],

    docentes: [
      { nombre: "Dra. Laura Beatriz Soto Mendoza", materia: "Inteligencia Artificial", area: "Ing. Software y Sistemas", cubiculo: "Edificio A — 204", asesoria: "Lun-Vie 10:00-12:00" },
      { nombre: "Mtro. Fernando Aguirre Cruz", materia: "Desarrollo Web", area: "Ing. Software y Sistemas", cubiculo: "Edificio A — 206", asesoria: "Mar-Jue 9:00-11:00" },
      { nombre: "Ing. Rocío Estrada Villanueva", materia: "Bases de Datos", area: "Matemáticas e Informática", cubiculo: "Edificio B — 102", asesoria: "Lun-Vie 8:00-10:00" },
      { nombre: "Dr. Héctor Morales Ibarra", materia: "Seguridad Informática", area: "Redes y Comunicaciones", cubiculo: "Edificio C — 301", asesoria: "Mié-Vie 13:00-15:00" },
      { nombre: "Mtra. Claudia Pérez Garza", materia: "Inglés y Comunicación", area: "Humanidades", cubiculo: "Edificio A — 110", asesoria: "Lun-Mié 12:00-14:00" },
      { nombre: "Ing. Samuel Torres Bravo", materia: "Gestión de Proyectos", area: "Ing. Industrial", cubiculo: "Edificio B — 108", asesoria: "Mar-Vie 15:00-17:00" }
    ],

    // Una sola fuente para Directorio y Contacto (antes los datos no coincidían).
    departamentos: [
      { id: "atencion", nombre: "Atención a Alumnos", ico: "graduation-cap", resp: "Lic. Mónica Treviño Ruiz", lugar: "Edificio A — Planta Baja", tel: "81-2222-3301", correo: "atencion.alumnos@utsc.edu.mx", horario: "Lun-Vie 8:00-17:00", contacto: true },
      { id: "escolares", nombre: "Servicios Escolares", ico: "clipboard-list", resp: "Lic. Gabriela Ruiz Salinas", lugar: "Edificio A — 102", tel: "81-2222-3305", correo: "escolares@utsc.edu.mx", horario: "Lun-Vie 8:00-15:00", contacto: true },
      { id: "caja", nombre: "Caja y Pagos", ico: "credit-card", resp: "C.P. Mario Medina López", lugar: "Edificio A — 105", tel: "81-2222-3310", correo: "caja@utsc.edu.mx", horario: "Lun-Vie 9:00-15:00", contacto: true },
      { id: "dsm", nombre: "Coordinación DSM", ico: "laptop", resp: "Dra. Laura Beatriz Soto", lugar: "Edificio A — 201", tel: "81-2222-3320", correo: "coord.dsm@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "isc", nombre: "Coordinación ISC", ico: "monitor", resp: "Dr. Héctor Morales Ibarra", lugar: "Edificio C — 300", tel: "81-2222-3321", correo: "coord.isc@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "iia", nombre: "Coordinación IIA", ico: "factory", resp: "Ing. Samuel Torres Bravo", lugar: "Edificio B — 200", tel: "81-2222-3322", correo: "coord.iia@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "ige", nombre: "Coordinación IGE", ico: "chart-column", resp: "Mtra. Silvia Cantú Leal", lugar: "Edificio B — 201", tel: "81-2222-3323", correo: "coord.ige@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "biblioteca", nombre: "Biblioteca", ico: "library", resp: "Lic. Patricia Alvarado", lugar: "Edificio D — Planta Baja", tel: "81-2222-3330", correo: "biblioteca@utsc.edu.mx", horario: "Lun-Vie 8:00-19:00" },
      { id: "labs", nombre: "Laboratorios de Cómputo", ico: "flask-conical", resp: "Ing. Roberto Sánchez", lugar: "Edificio C — Planta Baja", tel: "81-2222-3340", correo: "laboratorios@utsc.edu.mx", horario: "Lun-Vie 8:00-18:00" },
      { id: "vinculacion", nombre: "Vinculación y Servicio Social", ico: "handshake", resp: "Lic. Norma Flores", lugar: "Edificio B — 103", tel: "81-2222-3350", correo: "vinculacion@utsc.edu.mx", horario: "Lun-Vie 9:00-16:00" },
      { id: "rh", nombre: "Recursos Humanos", ico: "users-round", resp: "Lic. Andrés Guerra", lugar: "Edificio A — 301", tel: "81-2222-3360", correo: "rh@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "direccion", nombre: "Dirección General", ico: "landmark", resp: "Dr. Arturo Medina Garza", lugar: "Edificio A — 400", tel: "81-2222-3300", correo: "direccion@utsc.edu.mx", horario: "Lun-Vie 9:00-17:00" },
      { id: "soporte", nombre: "Soporte Técnico Portal", ico: "wrench", resp: "Ing. Karla Villarreal", lugar: "Edificio C — 001", tel: "81-2222-3399", correo: "soporte.portal@utsc.edu.mx", horario: "Lun-Vie 8:00-18:00", contacto: true }
    ],

    tramites: [
      { id: "constancia", nombre: "Constancia de estudios", ico: "file-text", desc: "Documento oficial que acredita tu inscripción actual en la UTSC.", tiempo: "24-48 hrs hábiles", costo: 0, pideDestino: true },
      { id: "carta", nombre: "Carta de presentación", ico: "clipboard-list", desc: "Carta institucional para prácticas profesionales, servicio social o vinculación.", tiempo: "2-3 días hábiles", costo: 0, pideDestino: true },
      { id: "calificaciones", nombre: "Constancia de calificaciones", ico: "graduation-cap", desc: "Historial académico oficial con calificaciones por semestre.", tiempo: "24 hrs hábiles", costo: 0 },
      { id: "kardex", nombre: "Kárdex certificado", ico: "circle-check", desc: "Kárdex con firma y sello de Servicios Escolares para trámites externos.", tiempo: "3-5 días hábiles", costo: 150 },
      { id: "credencial", nombre: "Reposición de credencial", ico: "refresh-cw", desc: "Nueva credencial institucional por pérdida o daño.", tiempo: "5 días hábiles", costo: 200 },
      { id: "baja", nombre: "Baja temporal", ico: "circle-pause", desc: "Suspende tus estudios por uno o dos cuatrimestres sin perder tu matrícula.", tiempo: "5-7 días hábiles", costo: 0 }
    ],

    recursos: [
      { nombre: "IEEE Xplore", ico: "microscope", desc: "Artículos de ingeniería e informática", url: "https://ieeexplore.ieee.org" },
      { nombre: "SpringerLink", ico: "book-marked", desc: "Revistas científicas y libros digitales", url: "https://link.springer.com" },
      { nombre: "O'Reilly Learning", ico: "book-text", desc: "Cursos y libros de tecnología", url: "https://www.oreilly.com" },
      { nombre: "Moodle UTSC", ico: "graduation-cap", desc: "Plataforma educativa institucional", url: "https://moodle.org" },
      { nombre: "Google Scholar", ico: "scroll-text", desc: "Artículos académicos gratuitos", url: "https://scholar.google.com" },
      { nombre: "Redalyc", ico: "globe", desc: "Publicaciones científicas latinoamericanas", url: "https://www.redalyc.org" }
    ],

    categoriasLibro: ["Programación", "IA", "Redes", "Bases de Datos", "Ingeniería", "Matemáticas", "Seguridad"],
    coloresLibro: { "Programación": "#3b82f6", "IA": "#8b5cf6", "Redes": "#10b981", "Bases de Datos": "#ef4444", "Ingeniería": "#f59e0b", "Matemáticas": "#0ea5e9", "Seguridad": "#1b1f2e" }
  };

  App.crearEstadoInicial = function () {
    const ahora = Date.now();
    return {
      version: 2,
      usuario: {
        nombre: "Juan Manuel",
        apellidos: "Flores Fernández",
        matricula: "27254",
        grupo: "DSM04AV",
        carrera: "DSM",
        semestre: 4,
        correo: "27254@utsc.edu.mx",
        telefono: "81-1234-5678",
        bio: "Alumno de DSM. Me interesa el desarrollo móvil y la IA.",
        rol: "Alumno",
        password: "utsc2026"
      },
      cuentasExtra: [],
      ajustes: {
        notifBlog: true, notifComentarios: true, notifModeracion: true, notifInstitucional: true,
        visibilidad: "Toda la comunidad", mostrarCarrera: true, mostrarMatricula: false
      },
      actividad: [
        { t: ahora - 2 * HORA, txt: "Publicaste «Resumen del parcial de Redes Neuronales» en el blog" },
        { t: ahora - 3 * DIA, txt: "Solicitaste una Constancia de calificaciones" },
        { t: ahora - 5 * DIA, txt: "Iniciaste sesión desde un navegador nuevo" }
      ],
      notificaciones: [
        { id: "a1", mod: "Trámites", txt: "Tu constancia de estudios (TRM-2026-1847) está lista para descarga.", t: ahora - 10 * 60 * 1000, leida: false, ir: "tramites" },
        { id: "a2", mod: "Blog", txt: "Elisa Berenice comentó tu publicación sobre Redes Neuronales.", t: ahora - 2 * HORA, leida: false, ir: "blog" },
        { id: "a3", mod: "Pagos", txt: "Tienes un pago pendiente: Reinscripción 4° Semestre, vence el 30 Oct.", t: ahora - DIA, leida: false, ir: "pagos" },
        { id: "a4", mod: "Noticias", txt: "Nueva noticia: UTSC firma convenio con el Tec de Monterrey.", t: ahora - 2 * DIA, leida: true, ir: "noticias" },
        { id: "a5", mod: "Blog", txt: "Tu publicación recibió 34 reacciones esta semana.", t: ahora - 3 * DIA, leida: true, ir: "blog" }
      ],
      posts: [
        { id: "p1", autor: "Juan Manuel Flores Fernández", matricula: "27254", propio: true, cat: "Académico", t: ahora - 2 * HORA,
          titulo: "Resumen del parcial de Redes Neuronales",
          texto: "Comparto mis apuntes del tercer parcial. Cubrimos backpropagation, funciones de activación y optimización con Adam. Si alguien quiere el PDF me escribe. Mucho ánimo para el examen del viernes. #RedesNeuronales #ExamenFinal",
          portada: { ico: "brain", grad: ["#2a3050", "#8b5cf6"] }, likes: 34, liked: false, reportado: false,
          comentarios: [
            { autor: "Elisa Berenice Ovalle Sánchez", txt: "¡Gracias! Me sirvió mucho la parte de Adam.", t: ahora - 90 * 60 * 1000 },
            { autor: "José Antonio Prado Segura", txt: "¿Incluye los ejercicios de la tarea 3?", t: ahora - 60 * 60 * 1000 }
          ] },
        { id: "p2", autor: "Elisa Berenice Ovalle Sánchez", matricula: "27239", cat: "Vida universitaria", t: ahora - 5 * HORA,
          titulo: "Ganamos el hackathon inter-universitario HackNL 2026",
          texto: "Nuestro equipo de DSM04AV ganó el primer lugar con una app para reportar baches en Santa Catarina. Gracias a todos los que nos apoyaron. #HackNL2026 #UTSC2026",
          portada: { ico: "trophy", grad: ["#e8781c", "#1b1f2e"] }, likes: 58, liked: false, reportado: false,
          comentarios: [{ autor: "Juan Manuel Flores Fernández", txt: "¡Felicidades, equipo!", t: ahora - 4 * HORA }] },
        { id: "p3", autor: "Juan Francisco Sánchez Pérez", matricula: "26790", cat: "Recursos", t: ahora - 26 * HORA,
          titulo: "Repositorio de ejercicios de Bases de Datos: 40 ejercicios SQL",
          texto: "Armé una lista de 40 ejercicios de SQL con soluciones, desde SELECT básicos hasta subconsultas y JOINs. Ideal para repasar antes del examen. #ExamenFinal",
          portada: null, likes: 21, liked: false, reportado: false, comentarios: [] },
        { id: "p4", autor: "María Fernanda Quiroga Reyes", matricula: "26512", cat: "Eventos", t: ahora - 2 * DIA,
          titulo: "Inscripciones abiertas al servicio social de verano",
          texto: "Vinculación ya publicó las plazas de servicio social. Hay lugares en el DIF y en el municipio. #ServicioSocial",
          portada: null, likes: 12, liked: false, reportado: false, comentarios: [] }
      ],
      cargos: [
        { id: "c1", concepto: "Reinscripción 4° Semestre", monto: 1800, vence: "2026-10-30" },
        { id: "c2", concepto: "Seguro escolar 2026-B", monto: 450, vence: "2026-11-15" },
        { id: "c3", concepto: "Credencial institucional", monto: 200, vence: "2026-10-31" }
      ],
      historialPagos: [
        { concepto: "Seguro escolar 2026-A", fecha: "2026-01-12", monto: 450, ref: "REF-2026-001821" },
        { concepto: "Reinscripción 3° Semestre", fecha: "2026-01-12", monto: 1800, ref: "REF-2026-001547" },
        { concepto: "Seguro escolar 2025-B", fecha: "2025-08-11", monto: 450, ref: "REF-2025-004102" },
        { concepto: "Reinscripción 2° Semestre", fecha: "2025-08-11", monto: 1800, ref: "REF-2025-004821" },
        { concepto: "Inscripción 1° Semestre", fecha: "2025-01-10", monto: 1800, ref: "REF-2025-000341" }
      ],
      solicitudes: [
        { folio: "TRM-2026-1985", tramite: "calificaciones", fecha: "2026-09-17", estado: 0, nota: "Tu solicitud fue recibida y está en cola de procesamiento." },
        { folio: "TRM-2026-1923", tramite: "carta", fecha: "2026-09-15", estado: 1, nota: "En revisión por la coordinación académica.", destino: "Grupo Industrial Monterrey" },
        { folio: "TRM-2026-1847", tramite: "constancia", fecha: "2026-09-12", estado: 2, nota: "Disponible para descarga en el portal.", destino: "IMSS" }
      ],
      libros: [
        { id: "b1", titulo: "Clean Code", autor: "Robert C. Martin", ed: "1a ed. 2008", cat: "Programación", isbn: "978-0132350884", total: 4, disp: 3 },
        { id: "b2", titulo: "Inteligencia Artificial: Un enfoque moderno", autor: "Russell & Norvig", ed: "4a ed. 2021", cat: "IA", isbn: "978-8490356401", total: 3, disp: 1 },
        { id: "b3", titulo: "Redes de Computadoras", autor: "Andrew Tanenbaum", ed: "5a ed. 2010", cat: "Redes", isbn: "978-6074420654", total: 3, disp: 2 },
        { id: "b4", titulo: "El Programador Pragmático", autor: "Hunt & Thomas", ed: "20a aniv. 2019", cat: "Programación", isbn: "978-8441545700", total: 2, disp: 1 },
        { id: "b5", titulo: "Fundamentos de Bases de Datos", autor: "Silberschatz, Korth y Sudarshan", ed: "6a ed. 2020", cat: "Bases de Datos", isbn: "978-8448190330", total: 5, disp: 4 },
        { id: "b6", titulo: "Ingeniería de Software", autor: "Ian Sommerville", ed: "9a ed. 2011", cat: "Ingeniería", isbn: "978-6073206037", total: 3, disp: 0 },
        { id: "b7", titulo: "Design Patterns", autor: "Gamma, Helm, Johnson y Vlissides", ed: "1a ed. 1994", cat: "Programación", isbn: "978-0201633610", total: 2, disp: 2 },
        { id: "b8", titulo: "JavaScript: The Good Parts", autor: "Douglas Crockford", ed: "1a ed. 2008", cat: "Programación", isbn: "978-0596517748", total: 2, disp: 1 },
        { id: "b9", titulo: "Matemáticas Discretas", autor: "Kenneth Rosen", ed: "7a ed. 2012", cat: "Matemáticas", isbn: "978-8448173579", total: 4, disp: 3 },
        { id: "b10", titulo: "Seguridad en Redes", autor: "William Stallings", ed: "4a ed. 2017", cat: "Seguridad", isbn: "978-8490354025", total: 2, disp: 2 }
      ],
      prestamos: [
        { libro: "b8", tipo: "prestamo", vence: enDias(5), renovado: false }
      ],
      viajes: [
        { id: "v1", conductor: "María Fernanda Quiroga Reyes", matricula: "26512", carrera: "ISC", rating: 4.9, sentido: "ida", lugar: "Guadalupe (Metro Aztlán)", hora: "06:45", dias: [0, 1, 2, 3, 4], asientos: 3, ocupados: 1, precio: 20, vehiculo: "Nissan Versa gris 2021", notas: "Salgo puntual. Paso por Av. Las Torres antes de tomar la carretera. Música tranquila." },
        { id: "v2", conductor: "Diego Armando Ríos Contreras", matricula: "24812", carrera: "ISC", rating: 4.7, sentido: "ida", lugar: "San Pedro (Plaza Fiesta)", hora: "06:30", dias: [0, 2, 4], asientos: 4, ocupados: 2, precio: 25, vehiculo: "Mazda 3 blanco 2019", notas: "Punto de encuentro en la entrada de Plaza Fiesta, frente al banco." },
        { id: "v3", conductor: "Carlos Eduardo Ramírez Treviño", matricula: "25438", carrera: "DSM", rating: 4.8, sentido: "regreso", lugar: "Monterrey Centro (Macroplaza)", hora: "14:15", dias: [0, 1, 2, 3], asientos: 3, ocupados: 1, precio: 30, vehiculo: "Honda City azul 2020", notas: "Salgo del estacionamiento B al terminar clases." },
        { id: "v4", conductor: "Daniela Martínez Garza", matricula: "27380", carrera: "IGE", rating: 5.0, sentido: "ida", lugar: "García (Plaza Real)", hora: "06:50", dias: [1, 3], asientos: 2, ocupados: 0, precio: 15, vehiculo: "Kia Rio rojo 2022", notas: "Solo dos lugares atrás. Espero máximo 5 minutos." },
        { id: "v5", conductor: "Luis Alberto Morales Soto", matricula: "25891", carrera: "DSM", rating: 4.6, sentido: "ida", lugar: "Santa Catarina (La Fama)", hora: "07:10", dias: [5], asientos: 3, ocupados: 2, precio: 10, vehiculo: "Chevrolet Aveo gris 2018", notas: "Solo sábados, para las clases de inglés sabatino." }
      ],
      reservasViaje: []
    };
  };
})();
