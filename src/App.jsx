import { Routes, Route } from 'react-router-dom'
import Encabezado from './components/Encabezado'
import BarraModulos from './components/BarraModulos'
import Pie from './components/Pie'
import Inicio from './pages/Inicio'
import EnConstruccion from './pages/EnConstruccion'

export default function App() {
  return (
    <>
      <Encabezado />
      <BarraModulos />
      <main>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/blog" element={<EnConstruccion titulo="Blog estudiantil" />} />
          <Route path="/noticias" element={<EnConstruccion titulo="Noticias" />} />
          <Route path="/directorio" element={<EnConstruccion titulo="Directorio" />} />
          <Route path="/contacto" element={<EnConstruccion titulo="Contacto" />} />
        </Routes>
      </main>
      <Pie />
    </>
  )
}
