import { findPreviousEntry, calculateChange } from '../utils/comparison';

const FOCUS_KEY = { male: 'brzuch', female: 'talia' };
const FOCUS_LABEL = { male: 'Brzuch', female: 'Talia' };

export default function DashboardHero({ entries, mode }) {
  if (entries.length === 0) return null;

  const latest = entries[0];
  const prev = findPreviousEntry(entries, 0);

  const weight = latest.waga;
  const weightChange = calculateChange(weight, prev?.waga);

  const focusKey = FOCUS_KEY[mode];
  const focusVal = latest[focusKey];
  const focusChange = calculateChange(focusVal, prev?.[focusKey]);

  const formatDate = (iso) => {
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  };

  return (
    <div className="hero-card">
      <div className="hero-header">
        <span className="hero-label">Ostatni pomiar</span>
        <span className="hero-date">{formatDate(latest.date)}</span>
      </div>

      <div className="hero-metrics">
        {/* Weight — primary */}
        <div className="hero-metric hero-metric-primary">
          <span className="hero-metric-label">Waga</span>
          <div className="hero-metric-row">
            <span className="hero-metric-value">
              {weight != null ? weight : '—'}
            </span>
            {weight != null && <span className="hero-metric-unit">kg</span>}
            {weightChange && (
              <span className={`hero-change ${weightChange.direction === 'up' ? 'up' : weightChange.direction === 'down' ? 'down' : 'neutral'}`}>
                {weightChange.direction === 'up' ? '↑' : weightChange.direction === 'down' ? '↓' : '='}{' '}
                {weightChange.diff !== 0 && (weightChange.diff > 0 ? '+' : '')}{weightChange.diff !== 0 ? weightChange.diff : ''}
              </span>
            )}
          </div>
        </div>

        {/* Focus measurement — secondary */}
        <div className="hero-metric hero-metric-secondary">
          <span className="hero-metric-label">{FOCUS_LABEL[mode]}</span>
          <div className="hero-metric-row">
            <span className="hero-metric-value-sm">
              {focusVal != null ? focusVal : '—'}
            </span>
            {focusVal != null && <span className="hero-metric-unit">cm</span>}
            {focusChange && (
              <span className={`hero-change ${focusChange.direction === 'up' ? 'up' : focusChange.direction === 'down' ? 'down' : 'neutral'}`}>
                {focusChange.direction === 'up' ? '↑' : focusChange.direction === 'down' ? '↓' : '='}{' '}
                {focusChange.diff !== 0 && (focusChange.diff > 0 ? '+' : '')}{focusChange.diff !== 0 ? focusChange.diff : ''}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
