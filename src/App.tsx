import { Routes, Route } from 'react-router-dom'
import { Layout } from './components/Layout'
import Home from './pages/Home'
import Admin from './pages/Admin'
import Catalog from './pages/Catalog'
import Reader from './pages/Reader'

function App() {
  return (
    <Routes>
      <Route path="/read/:id/:chapter" element={<Reader />} />
      <Route path="/read" element={<Reader />} />
      <Route element={<Layout />}>
        <Route path="/" element={<Home />} />
        <Route path="/catalog" element={<Catalog />} />
        <Route path="/admin/*" element={<Admin />} />
      </Route>
    </Routes>
  )
}

export default App
