import { Route, Routes } from 'react-router'

import Layout from './components/Layout'
import { Login, Register } from './pages/Auth'
import Biodata from './pages/Biodata'
import Landing from './pages/Landing'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="biodata" element={<Biodata />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
