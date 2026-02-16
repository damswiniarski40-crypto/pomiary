import { useState, useMemo, useEffect } from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
  Filler
);

/* ============================
   Kolory per tryb
   ============================ */

const THEME = {
  male: {
    line: '#3b82f6',
    lineRgb: '59, 130, 246',
    point: '#60a5fa',
    grid: 'rgba(59, 130, 246, 0.1)',
    text: '#94a3b8',
    cardBg: '#1a1f35',
    border: '#1e3a5f',
  },
  female: {
    line: '#8b5cf6',
    lineRgb: '139, 92, 246',
    point: '#a78bfa',
    grid: 'rgba(139, 92, 246, 0.1)',
    text: '#6b6394',
    cardBg: '#ffffff',
    border: '#d8d0f0',
  },
};

/* ============================
   Obliczanie statystyk
   ============================ */

function computeStats(entries, fieldKey) {
  // Entries posortowane newest-first — odwracamy do chronologicznego
  const sorted = [...entries].reverse();
  const values = sorted
    .map((e) => ({ date: e.date, val: e[fieldKey] }))
    .filter((v) => v.val != null);

  if (values.length < 2) return null;

  // Zmiany między kolejnymi wpisami
  const changes = [];
  for (let i = 1; i < values.length; i++) {
    const diff = +(values[i].val - values[i - 1].val).toFixed(1);
    const daysBetween =
      (new Date(values[i].date) - new Date(values[i - 1].date)) /
      (1000 * 60 * 60 * 24);
    changes.push({ diff, daysBetween });
  }

  // Średnia zmiana tygodniowa (ważona czasem)
  let totalWeightedDiff = 0;
  let totalDays = 0;
  for (const c of changes) {
    if (c.daysBetween > 0) {
      totalWeightedDiff += c.diff;
      totalDays += c.daysBetween;
    }
  }
  const avgWeeklyChange =
    totalDays > 0 ? +((totalWeightedDiff / totalDays) * 7).toFixed(1) : 0;

  // Największy spadek i wzrost
  const diffs = changes.map((c) => c.diff);
  const maxDrop = Math.min(...diffs);
  const maxRise = Math.max(...diffs);

  return {
    avgWeeklyChange,
    maxDrop: maxDrop < 0 ? maxDrop : 0,
    maxRise: maxRise > 0 ? maxRise : 0,
  };
}

/* ============================
   Komponent główny
   ============================ */

export default function ProgressCharts({ entries, fields, mode }) {
  const [selectedField, setSelectedField] = useState(fields[0]?.key || '');

  // Resetuj wybór gdy zmienią się pola (zmiana trybu)
  const fieldKeys = fields.map((f) => f.key).join(',');
  useEffect(() => {
    if (!fields.find((f) => f.key === selectedField)) {
      setSelectedField(fields[0]?.key || '');
    }
  }, [fieldKeys]);

  const theme = THEME[mode];
  const currentField = fields.find((f) => f.key === selectedField);

  // Dane wykresu — chronologicznie (oldest first)
  const chartEntries = useMemo(() => {
    return [...entries].reverse().filter((e) => e[selectedField] != null);
  }, [entries, selectedField]);

  const stats = useMemo(() => {
    return computeStats(entries, selectedField);
  }, [entries, selectedField]);

  if (entries.length === 0) return null;

  const labels = chartEntries.map((e) => {
    const [y, m, d] = e.date.split('-');
    return `${d}.${m}`;
  });

  const dataValues = chartEntries.map((e) => e[selectedField]);

  const chartData = {
    labels,
    datasets: [
      {
        label: currentField?.label || selectedField,
        data: dataValues,
        borderColor: theme.line,
        backgroundColor: `rgba(${theme.lineRgb}, 0.1)`,
        pointBackgroundColor: theme.point,
        pointBorderColor: theme.line,
        pointRadius: 5,
        pointHoverRadius: 7,
        borderWidth: 2.5,
        tension: 0.3,
        fill: true,
      },
    ],
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
      intersect: false,
      mode: 'index',
    },
    plugins: {
      legend: {
        display: false,
      },
      tooltip: {
        backgroundColor:
          mode === 'male' ? 'rgba(10, 14, 26, 0.95)' : 'rgba(255,255,255,0.95)',
        titleColor: mode === 'male' ? '#f1f5f9' : '#1e1b3a',
        bodyColor: mode === 'male' ? '#94a3b8' : '#6b6394',
        borderColor: theme.line,
        borderWidth: 1,
        padding: 10,
        cornerRadius: 8,
        bodyFont: { size: 13 },
        callbacks: {
          label: (ctx) =>
            `${currentField?.label}: ${ctx.parsed.y} ${currentField?.unit || ''}`,
        },
      },
    },
    scales: {
      x: {
        grid: { color: theme.grid },
        ticks: { color: theme.text, font: { size: 11 } },
      },
      y: {
        grid: { color: theme.grid },
        ticks: {
          color: theme.text,
          font: { size: 11 },
          callback: (val) => `${val} ${currentField?.unit || ''}`,
        },
      },
    },
  };

  return (
    <div className="progress-section">
      <h2 className="section-title">Analiza postępu</h2>

      {/* Wybór pomiaru */}
      <div className="field-selector">
        {fields.map((f) => (
          <button
            key={f.key}
            className={`field-btn ${selectedField === f.key ? 'active' : ''}`}
            onClick={() => setSelectedField(f.key)}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Wykres */}
      <div className="chart-container">
        {chartEntries.length >= 2 ? (
          <Line data={chartData} options={chartOptions} />
        ) : (
          <p className="chart-empty">
            Potrzeba min. 2 wpisów z wartością „{currentField?.label}" aby
            wyświetlić wykres.
          </p>
        )}
      </div>

      {/* Statystyki */}
      {stats && (
        <div className="stats-grid">
          <div className="stat-card">
            <span className="stat-label">Śr. zmiana / tydzień</span>
            <span
              className={`stat-value ${
                stats.avgWeeklyChange < 0
                  ? 'stat-down'
                  : stats.avgWeeklyChange > 0
                  ? 'stat-up'
                  : ''
              }`}
            >
              {stats.avgWeeklyChange > 0 ? '+' : ''}
              {stats.avgWeeklyChange} {currentField?.unit}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Największy spadek</span>
            <span className="stat-value stat-down">
              {stats.maxDrop !== 0 ? stats.maxDrop : '—'}{' '}
              {stats.maxDrop !== 0 ? currentField?.unit : ''}
            </span>
          </div>
          <div className="stat-card">
            <span className="stat-label">Największy wzrost</span>
            <span className="stat-value stat-up">
              {stats.maxRise !== 0 ? `+${stats.maxRise}` : '—'}{' '}
              {stats.maxRise !== 0 ? currentField?.unit : ''}
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
