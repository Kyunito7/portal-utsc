import { Link } from 'react-router-dom'
import { usuario, modulos, publicaciones, avisos, eventos } from '../data/mock'

export default function Inicio() {
  return (
    <>
      <section className="portada">
        <div className="contenedor">
          <div className="etiqueta-estado mono">● PORTAL ACTIVO — AGO-DIC 2026</div>
          <h1>
            Universidad Tecnológica
            <span className="acento">Santa Catarina</span>
          </h1>
          <p>Tu espacio institucional para compartir conocimiento, conectar con compañeros y acceder a los servicios académicos de la UTSC.</p>
          <div className="acciones">
            <Link to="/blog" className="boton boton-primario">✏️ Publicar en el blog</Link>
            <Link to="/noticias" className="boton boton-secundario">📰 Ver noticias</Link>
          </div>
        </div>
      </section>

      <div className="contenedor">
        <div className="tarjeta-estudiante">
          <div className="quien">
            <div className="avatar-grande">{usuario.iniciales}</div>
            <div>
              <small>Bienvenido de vuelta,</small>
              <h2>{usuario.nombre}</h2>
              <small className="mono">{usuario.matricula} · {usuario.grupo} · {usuario.carrera}</small>
            </div>
          </div>
          <div className="indicadores">
            <div className="indicador"><b>{usuario.promedio}</b><span>Promedio</span></div>
            <div className="indicador"><b>{usuario.creditos}</b><span>Créditos</span></div>
            <div className="indicador"><b>{usuario.semestre}°</b><span>Semestre</span></div>
          </div>
        </div>
      </div>

      <section className="seccion">
        <div className="contenedor">
          <h2 className="titulo-seccion">Acceso rápido</h2>
          <div className="rejilla-accesos">
            {modulos.map((m) => (
              <div key={m.id} className="acceso">
                <span className="icono" aria-hidden="true">{m.icono}</span>
                <b>{m.nombre}</b>
                <span>{m.detalle}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="seccion" style={{ paddingTop: 0 }}>
        <div className="contenedor columnas">
          <div className="panel">
            <div className="panel-cabecera">
              <h2>Últimas publicaciones</h2>
              <Link to="/blog" className="enlace-verde">Ver todo</Link>
            </div>

            {publicaciones.map((p) => (
              <article key={p.id} className="publicacion">
                <div className="avatar">{p.iniciales}</div>
                <div>
                  <h3>{p.titulo}</h3>
                  <div className="meta">
                    <span>{p.autor}</span>
                    <span className="mono">{p.fecha}</span>
                    <span className="etiqueta">{p.etiqueta}</span>
                  </div>
                </div>
              </article>
            ))}

            <button className="boton-publicar">✏️ Publicar en el blog</button>
          </div>

          <div>
            <div className="panel">
              <h2 style={{ fontSize: 22, marginBottom: 18 }}>Avisos importantes</h2>
              {avisos.map((a) => (
                <div key={a.texto} className="aviso">
                  <b>{a.tipo}</b>
                  <p>{a.texto}</p>
                </div>
              ))}
            </div>

            <div className="panel" style={{ marginTop: 24 }}>
              <div className="panel-cabecera">
                <h2>Próximos eventos</h2>
                <span className="enlace-verde">Ver más</span>
              </div>
              {eventos.map((e) => (
                <article key={e.titulo} className="evento">
                  <div className="fecha-evento">{e.dia}<br />{e.mes}</div>
                  <div>
                    <h3>{e.titulo}</h3>
                    <span>{e.lugar}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </div>
      </section>
    </>
  )
}
