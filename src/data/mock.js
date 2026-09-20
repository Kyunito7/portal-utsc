// Datos de prueba para maquetar la interfaz.
// En la entrega 4 estos datos se leeran desde IndexedDB y desde la API.

export const usuario = {
  nombre: 'Juan Manuel',
  iniciales: 'JM',
  matricula: '27254',
  grupo: 'DSM04AV',
  carrera: 'Ing. Desarrollo de Software Multiplataforma',
  promedio: '9.2',
  creditos: 72,
  semestre: '4'
}

export const modulos = [
  { id: 'blog', nombre: 'Blog Estudiantil', detalle: 'Muro de publicaciones', icono: '📝', activo: true },
  { id: 'kardex', nombre: 'Kárdex', detalle: 'Historial académico', icono: '📋', activo: false },
  { id: 'horarios', nombre: 'Horarios', detalle: 'Mis clases', icono: '📅', activo: false },
  { id: 'pagos', nombre: 'Pagos', detalle: 'Estado de cuenta', icono: '💳', activo: false },
  { id: 'tramites', nombre: 'Trámites', detalle: 'Solicitudes en línea', icono: '📄', activo: false },
  { id: 'biblioteca', nombre: 'Biblioteca', detalle: 'Recursos digitales', icono: '📚', activo: false },
  { id: 'driver', nombre: 'DriverUTSC', detalle: 'Transporte universitario', icono: '🚗', activo: false }
]

export const publicaciones = [
  { id: 1, titulo: 'Ganamos el hackathon inter-universitario HackNL 2026', autor: 'Elisa', iniciales: 'EB', fecha: 'Hace 2 horas', etiqueta: 'Vida universitaria' },
  { id: 2, titulo: 'Repositorio de ejercicios de Bases de Datos — 40 ejercicios SQL', autor: 'Juan', iniciales: 'JF', fecha: 'Ayer', etiqueta: 'Recursos' }
]

export const avisos = [
  { tipo: 'Académico', texto: 'Entrega de proyecto de Redes Neuronales: 28 de septiembre.' },
  { tipo: 'Institucional', texto: 'La caja estará cerrada el 20 de septiembre por inventario.' },
  { tipo: 'Trámites', texto: 'Tu constancia de estudios (TRM-2026-1847) está lista para descarga.' }
]

export const eventos = [
  { dia: '25', mes: 'Sep', titulo: 'Conferencia: Ciberseguridad en apps modernas', lugar: 'Aula Magna' },
  { dia: '30', mes: 'Sep', titulo: 'Exposición de proyectos finales DSM', lugar: 'Edificio B' },
  { dia: '10', mes: 'Oct', titulo: 'Convocatoria Servicio Social 2026-B', lugar: 'Servicios Escolares' },
  { dia: '15', mes: 'Oct', titulo: 'Inicio del período de exámenes finales', lugar: 'UTSC' }
]
