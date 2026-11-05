import { Route, Routes } from 'react-router'

import Layout from './components/Layout'
import RoomGuard from './components/RoomGuard'
import { KENANGAN, VLOG } from './lib/content'
import { Login, Register } from './pages/Auth'
import Biodata from './pages/Biodata'
import { ContentDetail, ContentRoom } from './pages/ContentRoom'
import Landing from './pages/Landing'
import LearningItemPage from './pages/learning/LearningItem'
import LearningRoom from './pages/learning/LearningRoom'
import ReviewPage from './pages/learning/Review'
import NotFound from './pages/NotFound'

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Landing />} />
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="biodata" element={<Biodata />} />
        <Route element={<RoomGuard room="learning" />}>
          <Route path="learning" element={<LearningRoom />} />
          <Route path="learning/review" element={<ReviewPage />} />
          <Route path="learning/:id" element={<LearningItemPage />} />
        </Route>
        <Route element={<RoomGuard room="vlog" />}>
          <Route path="vlog" element={<ContentRoom key="vlog" config={VLOG} />} />
          <Route path="vlog/:id" element={<ContentDetail key="vlog" config={VLOG} />} />
        </Route>
        <Route element={<RoomGuard room="kenangan" />}>
          <Route path="kenangan" element={<ContentRoom key="kenangan" config={KENANGAN} />} />
          <Route path="kenangan/:id" element={<ContentDetail key="kenangan" config={KENANGAN} />} />
        </Route>
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  )
}
