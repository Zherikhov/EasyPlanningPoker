import React from 'react'
import { Routes, Route, Navigate } from 'react-router-dom'
import Login from './pages/Login.jsx'
import Register from './pages/Register.jsx'
import Boards from './pages/Boards.jsx'
import BoardDetails from './pages/BoardDetails.jsx'
import Estimate from './pages/Estimate.jsx'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/boards" element={<Boards />} />
      <Route path="/boards/:id" element={<BoardDetails />} />
      <Route path="/boards/:id/estimate" element={<Estimate />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  )
}
