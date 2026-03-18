export default function KpiCard({ title, value, subtitle, icon: Icon, color = '#00B4D8', trend }) {
  return (
    <div style={{
      background: '#112240',
      borderRadius: '12px',
      padding: '20px 24px',
      border: '1px solid #1E3A5F',
      flex: 1,
      minWidth: '180px',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: '80px', height: '80px',
        background: `${color}08`,
        borderRadius: '0 0 0 100%'
      }} />

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1 }}>
          <p style={{ color: '#64748B', fontSize: '12px', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
            {title}
          </p>
          <p style={{ color: '#F1F5F9', fontSize: '28px', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em' }}>
            {value}
          </p>
          {subtitle && (
            <p style={{ color: '#64748B', fontSize: '12px', marginTop: '6px' }}>
              {subtitle}
            </p>
          )}
          {trend != null && (
            <p style={{
              color: trend >= 0 ? '#22C55E' : '#EF4444',
              fontSize: '12px', marginTop: '6px', fontWeight: 500
            }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend)}% vs mois dernier
            </p>
          )}
        </div>
        {Icon && (
          <div style={{
            background: `${color}20`,
            borderRadius: '10px',
            padding: '10px',
            color,
            flexShrink: 0
          }}>
            <Icon size={22} />
          </div>
        )}
      </div>
    </div>
  )
}
