import { useMemo } from 'react';
import { calculateWeeklyAverage, calculateTrendSlope } from '../utils/analytics';

export default function StatsCards({ entries }) {
  const weeklyAvg = useMemo(
    () => calculateWeeklyAverage(entries, 'waga'),
    [entries]
  );

  const slopePerDay = useMemo(
    () => calculateTrendSlope(entries, 'waga'),
    [entries]
  );

  // Biggest single drop between consecutive entries
  const biggestDrop = useMemo(() => {
    if (entries.length < 2) return null;
    const sorted = [...entries].reverse();
    let maxDrop = 0;
    for (let i = 1; i < sorted.length; i++) {
      const curr = sorted[i].waga;
      const prev = sorted[i - 1].waga;
      if (curr != null && prev != null) {
        const diff = curr - prev;
        if (diff < maxDrop) maxDrop = diff;
      }
    }
    return maxDrop < 0 ? +maxDrop.toFixed(1) : null;
  }, [entries]);

  const hasData = entries.filter((e) => e.waga != null).length >= 2;
  if (!hasData) return null;

  const trendDir = slopePerDay == null ? 'neutral'
    : slopePerDay < -0.001 ? 'down'
    : slopePerDay > 0.001 ? 'up'
    : 'neutral';

  const trendLabel = trendDir === 'down' ? 'Spadkowy'
    : trendDir === 'up' ? 'Wzrostowy'
    : 'Stabilny';

  const trendSymbol = trendDir === 'down' ? '↓'
    : trendDir === 'up' ? '↑'
    : '=';

  return (
    <div className="dash-stats">
      <div className="dash-stat-card">
        <span className="dash-stat-label">Zmiana / tydzień</span>
        <span className={`dash-stat-value ${weeklyAvg != null ? (weeklyAvg < 0 ? 'val-down' : weeklyAvg > 0 ? 'val-up' : '') : ''}`}>
          {weeklyAvg != null ? `${weeklyAvg > 0 ? '+' : ''}${weeklyAvg} kg` : '—'}
        </span>
      </div>

      <div className="dash-stat-card">
        <span className="dash-stat-label">Największy spadek</span>
        <span className="dash-stat-value val-down">
          {biggestDrop != null ? `${biggestDrop} kg` : '—'}
        </span>
      </div>

      <div className="dash-stat-card">
        <span className="dash-stat-label">Trend</span>
        <span className={`dash-stat-value ${trendDir === 'down' ? 'val-down' : trendDir === 'up' ? 'val-up' : ''}`}>
          {trendSymbol} {trendLabel}
        </span>
      </div>
    </div>
  );
}
