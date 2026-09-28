// src/components/TarjetaPublicacion.jsx
// Elisa Berenice Ovalle Sánchez — feat/elisa-blog

import { useState } from 'react'

const ESTADO_ESTILO = {
  publicado:   { label: 'Publicado',   color: '#2aa88b', fondo: '#e6f7f3' },
  en_revision: { label: 'En revisión', color: '#d97706', fondo: '#fef3c7' },
  rechazado:   { label: 'Rechazado',   color: '#dc2626', fondo: '#fee2e2' },
}

export default function TarjetaPublicacion({ pub }) {
  const {
    titulo = '',
    autor = 'Alumno',
    iniciales = 'A',
    fecha = '',
    etiqueta = '',
    texto = '',
    imagen = null,
    likes: likesIniciales = 0,
    estado = 'publicado',
    razonRechazo = '',
  } = pub || {}

  const [likes, setLikes] = useState(likesIniciales)
  const [likeado, setLikeado] = useState(false)
  const [abierto, setAbierto] = useState(false)

  const cfg = ESTADO_ESTILO[estado] ?? ESTADO_ESTILO.publicado

  return (
    <article className="publicacion tp-card">
      {/* Avatar + meta */}
      <div className="avatar">{iniciales}</div>

      <div className="tp-cuerpo">
        <div className="tp-cabecera">
          <div>
            <h3 style={{ fontFamily: 'Inter, sans-serif', fontSize: 16, fontWeight: 600, margin: '0 0 4px' }}>
              {titulo}
            </h3>
            <div className="meta">
              <span>{autor}</span>
              <span className="mono">{fecha}</span>
              {etiqueta && <span className="etiqueta">{etiqueta}</span>}
            </div>
          </div>
          <span
            className="tp-estado"
            style={{ color: cfg.color, background: cfg.fondo }}
          >
            {cfg.label}
          </span>
        </div>

        {/* Texto del post */}
        {texto && <p className="tp-texto">{texto}</p>}

        {/* Imagen adjunta */}
        {imagen && (
          <div className="tp-imagen-wrap">
            <img src={imagen} alt="Imagen de la publicación" className="tp-imagen" />
          </div>
        )}

        {/* Razón de rechazo del moderador IA */}
        {estado === 'rechazado' && razonRechazo && (
          <div className="tp-rechazo">
            <span>🤖</span>
            <p><strong>Moderador IA:</strong> {razonRechazo}</p>
          </div>
        )}

        {/* Acciones */}
        <div className="tp-acciones">
          <button
            className={`tp-btn${likeado ? ' tp-btn--like' : ''}`}
            onClick={() => { setLikes(n => likeado ? n - 1 : n + 1); setLikeado(v => !v) }}
          >
            {likeado ? '❤️' : '🤍'} {likes}
          </button>
          <button
            className="tp-btn"
            onClick={() => setAbierto(v => !v)}
          >
            💬 Comentar
          </button>
        </div>

        {abierto && (
          <div className="tp-comentarios">
            <p style={{ margin: 0, fontSize: 13, color: 'var(--texto-suave)', textAlign: 'center', padding: '8px 0' }}>
              Los comentarios estarán disponibles cuando la API esté lista. 🔧
            </p>
          </div>
        )}
      </div>

      <style>{`
        .tp-card { display: flex; gap: 14px; padding: 18px 0; border-bottom: 1px solid var(--borde); align-items: flex-start; }
        .tp-card:last-of-type { border-bottom: 0; }
        .tp-cuerpo { flex: 1; min-width: 0; }
        .tp-cabecera { display: flex; justify-content: space-between; align-items: flex-start; gap: 8px; flex-wrap: wrap; }
        .tp-estado { font-size: 11px; font-weight: 600; padding: 3px 10px; border-radius: 999px; white-space: nowrap; flex-shrink: 0; }
        .tp-texto { margin: 10px 0 0; font-size: 15px; line-height: 1.55; color: var(--texto); }
        .tp-imagen-wrap { margin-top: 12px; border-radius: 10px; overflow: hidden; max-height: 300px; }
        .tp-imagen { width: 100%; height: 100%; object-fit: cover; display: block; }
        .tp-rechazo { display: flex; gap: 8px; align-items: flex-start; background: #fef2f2; border-left: 3px solid #dc2626; padding: 8px 12px; border-radius: 0 8px 8px 0; font-size: 13px; color: #7f1d1d; margin-top: 10px; }
        .tp-rechazo p { margin: 0; }
        .tp-acciones { display: flex; gap: 6px; margin-top: 12px; padding-top: 10px; border-top: 1px solid var(--borde); }
        .tp-btn { background: none; border: none; padding: 6px 12px; border-radius: 8px; font-size: 13px; font-family: inherit; cursor: pointer; color: var(--texto-suave); transition: background .15s; }
        .tp-btn:hover { background: var(--crema); color: var(--texto); }
        .tp-btn--like { color: #dc2626; }
        .tp-comentarios { margin-top: 8px; background: var(--crema); border-radius: 8px; padding: 4px 12px; }
      `}</style>
    </article>
  )
}
