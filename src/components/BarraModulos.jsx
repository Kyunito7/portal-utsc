import { Link } from 'react-router-dom'
import { modulos } from '../data/mock'

export default function BarraModulos() {
  return (
    <div className="barra-modulos">
      <div className="contenedor">
        {modulos.map((m) =>
          m.activo ? (
            <Link key={m.id} to="/blog" className="pastilla">
              <span aria-hidden="true">{m.icono}</span>
              {m.nombre}
            </Link>
          ) : (
            <button key={m.id} className="pastilla" disabled title="Módulo no disponible en esta versión">
              <span aria-hidden="true">{m.icono}</span>
              {m.nombre}
            </button>
          )
        )}
      </div>
    </div>
  )
}
