import { useState } from 'react'
import Navbar from './components/Navbar'
import Dashboard from './components/Dashboard'
import RdvList from './components/RdvList'
import Stats from './components/Stats'

export default function App() {
  const [page, setPage] = useState('dashboard')

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: '#0D1B2A' }}>
      <Navbar currentPage={page} onNavigate={setPage} />
      <main style={{
        flex: 1,
        marginLeft: '240px',
        padding: '32px',
        minHeight: '100vh',
        overflowX: 'hidden'
      }}>
        {page === 'dashboard' && <Dashboard />}
        {page === 'rdv'       && <RdvList />}
        {page === 'stats'     && <Stats />}
      </main>
    </div>
  )
}
