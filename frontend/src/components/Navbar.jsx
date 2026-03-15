import { LayoutDashboard, CalendarDays, BarChart3, Zap } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'rdv',       label: 'Rendez-vous',     icon: CalendarDays },
  { id: 'stats',     label: 'Statistiques',    icon: BarChart3 },
]

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0,
      height: '100vh', width: '240px',
      background: '#1E293B',
      borderRight: '1px solid #334155',
      display: 'flex', flexDirection: 'column',
      zIndex: 200, overflow: 'hidden'
    }}>
      {/* Logo */}
      <div style={{
        padding: '28px 24px 24px',
        borderBottom: '1px solid #334155'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{
            background: '#3B82F6',
            borderRadius: '8px',
            padding: '6px',
            display: 'flex'
          }}>
            <Zap size={18} color="#fff" />
          </div>
          <div>
            <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: '16px', letterSpacing: '-0.02em' }}>
              ONRBAT
            </div>
            <div style={{ color: '#475569', fontSize: '11px', marginTop: '1px' }}>
              Gestion des RDV
            </div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <div style={{ color: '#475569', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px 8px' }}>
          Navigation
        </div>
        {navItems.map(item => {
          const Icon = item.icon
          const active = currentPage === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                width: '100%', padding: '10px 12px',
                borderRadius: '8px', border: 'none',
                background: active ? 'rgba(59,130,246,0.15)' : 'transparent',
                color: active ? '#3B82F6' : '#94A3B8',
                fontSize: '14px', fontWeight: active ? 600 : 400,
                cursor: 'pointer', marginBottom: '2px',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                borderLeft: active ? '2px solid #3B82F6' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.05)'; e.currentTarget.style.color = '#CBD5E1' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#94A3B8' } }}
            >
              <Icon size={17} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #334155' }}>
        <div style={{ color: '#334155', fontSize: '11px' }}>Rénovation Énergétique</div>
        <div style={{ color: '#1E3A5F', fontSize: '10px', marginTop: '2px' }}>v1.0.0</div>
      </div>
    </aside>
  )
}
