import React from 'react'
import { Outlet } from 'react-router-dom'
import Header from './Header.jsx'

export default function Layout({ headerChildren }) {
  return (
    <div className="min-h-screen bg-white text-gray-900 dark:bg-gray-900 dark:text-gray-100">
      <Header>{headerChildren}</Header>
      <div>
        <Outlet />
      </div>
    </div>
  )
}
