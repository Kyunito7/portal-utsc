import { NavLink } from 'react-router-dom'
import { usuario } from '../data/mock'

const enlaces = [
  { a: '/', texto: 'Inicio' },
  { a: '/blog', texto: 'Blog' },
  { a: '/noticias', texto: 'Noticias' },
  { a: '/directorio', texto: 'Directorio' },
  { a: '/contacto', texto: 'Contacto' }
]

export default function Encabezado() {
  return (
    <header className="encabezado">
      <div className="contenedor">
        <div className="marca">
          <div className="marca-icono">&lt;/&gt;</div>
          <div>
            <div className="marca-nombre">UTSC</div>
            <div className="marca-sub">Portal Universitario</div>
          </div>
        </div>

        <nav className="nav-principal">
          {enlaces.map((e) => (
            <NavLink key={e.a} to={e.a} end className={({ isActive }) => (isActive ? 'activo' : undefined)}>
              {e.texto}
            </NavLink>
          ))}
        </nav>

        <div className="perfil">
          <button className="campana" aria-label="Notificaciones">
            🔔<span>3</span>
          </button>
          <div className="perfil-chip">
            <div className="avatar">{usuario.iniciales}</div>
            <div className="perfil-datos">
              {usuario.nombre.split(' ')[0]}
              <small className="mono">{usuario.matricula}</small>
            </div>
          </div>
        </div>
      </div>
    </header>
  )
}
