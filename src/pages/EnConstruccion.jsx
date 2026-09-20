export default function EnConstruccion({ titulo }) {
  return (
    <section className="seccion">
      <div className="contenedor panel" style={{ textAlign: 'center', padding: '64px 24px' }}>
        <h2 className="titulo-seccion">{titulo}</h2>
        <p style={{ color: 'var(--texto-suave)' }}>
          Esta sección se construye en las siguientes entregas del proyecto.
        </p>
      </div>
    </section>
  )
}
