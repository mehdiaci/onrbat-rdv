import { LayoutDashboard, CalendarDays, BarChart3, Euro } from 'lucide-react'

const navItems = [
  { id: 'dashboard', label: 'Tableau de bord', icon: LayoutDashboard },
  { id: 'rdv',       label: 'Rendez-vous',     icon: CalendarDays },
  { id: 'charges',   label: 'Charges',          icon: Euro },
  { id: 'stats',     label: 'Statistiques',    icon: BarChart3 },
]

// Logo CTI stylisé (Capital Talent Invest)
function CtiLogo() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px', padding: '24px 20px 20px' }}>
      {/* Logo 40x40 */}
      <div style={{ position: 'relative', width: '48px', height: '48px' }}>
        {/* Fond dégradé */}
        <div style={{
          width: '48px', height: '48px',
          borderRadius: '12px',
          background: 'linear-gradient(135deg, #0077B6 0%, #00B4D8 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          boxShadow: '0 4px 16px rgba(0,180,216,0.35)',
        }}>
          <span style={{
            color: '#fff',
            fontWeight: 900,
            fontSize: '15px',
            letterSpacing: '0.08em',
            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          }}>CTI</span>
        </div>
        {/* Point vert fluo accent */}
        <div style={{
          position: 'absolute', bottom: '-2px', right: '-2px',
          width: '12px', height: '12px',
          background: '#39FF14',
          borderRadius: '3px',
          boxShadow: '0 0 8px rgba(57,255,20,0.8)',
          border: '2px solid #0A1628',
        }} />
      </div>
      {/* Nom */}
      <div style={{ textAlign: 'center' }}>
        <div style={{ color: '#F1F5F9', fontWeight: 800, fontSize: '13px', letterSpacing: '0.02em', lineHeight: 1.2 }}>
          Capital Talent
        </div>
        <div style={{ color: '#00B4D8', fontWeight: 700, fontSize: '12px', letterSpacing: '0.04em' }}>
          Invest
        </div>
      </div>
    </div>
  )
}

export default function Navbar({ currentPage, onNavigate }) {
  return (
    <aside style={{
      position: 'fixed', left: 0, top: 0,
      height: '100vh', width: '240px',
      background: '#0A1628',
      borderRight: '1px solid #1E3A5F',
      display: 'flex', flexDirection: 'column',
      zIndex: 200, overflow: 'hidden'
    }}>
      {/* Logo CTI */}
      <div style={{ borderBottom: '1px solid #1E3A5F' }}>
        <CtiLogo />
      </div>

      {/* Nav */}
      <nav style={{ padding: '16px 12px', flex: 1 }}>
        <div style={{ color: '#1E3A5F', fontSize: '10px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px 10px' }}>
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
                background: active ? 'rgba(0,180,216,0.12)' : 'transparent',
                color: active ? '#00B4D8' : '#64748B',
                fontSize: '14px', fontWeight: active ? 600 : 400,
                cursor: 'pointer', marginBottom: '2px',
                transition: 'all 0.15s ease',
                textAlign: 'left',
                borderLeft: active ? '2px solid #00B4D8' : '2px solid transparent',
              }}
              onMouseEnter={e => { if (!active) { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.color = '#94A3B8' } }}
              onMouseLeave={e => { if (!active) { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = '#64748B' } }}
            >
              <Icon size={17} />
              {item.label}
            </button>
          )
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: '16px 24px', borderTop: '1px solid #1E3A5F' }}>
        <div style={{ color: '#1E3A5F', fontSize: '11px' }}>Rénovation Énergétique</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '4px' }}>
          <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#39FF14', boxShadow: '0 0 4px #39FF14' }} />
          <span style={{ color: '#1E3A5F', fontSize: '10px' }}>v1.1.0</span>
        </div>
      </div>
    </aside>
  )
}
