import { modulos } from '../data/mock'

export default function Pie() {
  return (
    <footer className="pie">
      <div className="contenedor pie-rejilla">
        <div>
          <div className="marca">
            <div className="marca-icono">&lt;/&gt;</div>
            <div className="marca-nombre" style={{ color: '#fff' }}>UTSC</div>
          </div>
          <p>Universidad Tecnológica de Santa Catarina. Ingeniería en Desarrollo de Software Multiplataforma.</p>
          <p className="mono" style={{ fontSize: 13 }}>Grupo DSM04AV · v0.1 · Sep 2026</p>
        </div>

        <div>
          <h3>Módulos</h3>
          <ul>
            {modulos.map((m) => (
              <li key={m.id}>
                <span aria-hidden="true">{m.icono}</span> {m.nombre}
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h3>Contacto</h3>
          <ul>
            <li>Av. Universidad 2004, Santa Catarina, NL</li>
            <li>81-2222-3300</li>
            <li>portal@utsc.edu.mx</li>
          </ul>
        </div>
      </div>
      <div className="contenedor pie-legal">
        © 2026 Universidad Tecnológica de Santa Catarina. Proyecto escolar.
      </div>
    </footer>
  )
}
