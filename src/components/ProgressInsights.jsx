import { useState, useEffect, useMemo } from 'react';
import {
  calculateWeeklyAverage,
  calculateTrendSlope,
  estimateGoalDate,
  detectPlateau,
  assessRate,
  analyzeWaist,
} from '../utils/analytics';

const GOAL_KEYS = { male: 'goal_weight_male', female: 'goal_weight_female' };
const WAIST_KEY = { male: 'brzuch', female: 'talia' };
const WAIST_LABEL = { male: 'Brzuch', female: 'Talia' };

const STATUS_ICON = {
  ok: { symbol: '\u2713', cls: 'ins-ok' },       // ✓
  warning: { symbol: '\u26A0', cls: 'ins-warn' }, // ⚠
  stop: { symbol: '\u26D4', cls: 'ins-danger' },  // ⛔
  danger: { symbol: '\u26D4', cls: 'ins-danger' },
};

export default function ProgressInsights({ entries, mode }) {
  // --- Waga docelowa z localStorage ---
  const [goalWeight, setGoalWeight] = useState('');
  const [goalSaved, setGoalSaved] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(GOAL_KEYS[mode]);
    setGoalWeight(stored ?? '');
    setGoalSaved(false);
  }, [mode]);

  const handleGoalChange = (e) => {
    setGoalWeight(e.target.value);
    setGoalSaved(false);
  };

  const handleGoalSave = () => {
    const val = parseFloat(goalWeight);
    if (goalWeight === '' || goalWeight == null) {
      localStorage.removeItem(GOAL_KEYS[mode]);
    } else if (!isNaN(val) && val > 0) {
      localStorage.setItem(GOAL_KEYS[mode], String(val));
    }
    setGoalSaved(true);
    setTimeout(() => setGoalSaved(false), 2000);
  };

  // --- Obliczenia ---
  const goalNum = goalWeight !== '' ? parseFloat(goalWeight) : null;

  const weeklyAvg = useMemo(
    () => calculateWeeklyAverage(entries, 'waga'),
    [entries]
  );

  const slopePerDay = useMemo(
    () => calculateTrendSlope(entries, 'waga'),
    [entries]
  );
  const slopePerWeek = slopePerDay != null ? +(slopePerDay * 7).toFixed(2) : null;

  const rateAssessment = useMemo(() => assessRate(weeklyAvg), [weeklyAvg]);

  const goalEstimate = useMemo(
    () => estimateGoalDate(entries, goalNum),
    [entries, goalNum]
  );

  const plateau = useMemo(() => detectPlateau(entries), [entries]);

  const waistKey = WAIST_KEY[mode];
  const waistAnalysis = useMemo(
    () => analyzeWaist(entries, waistKey),
    [entries, waistKey]
  );

  // Bieżąca waga
  const currentWeight = entries.find((e) => e.waga != null)?.waga ?? null;

  // Min 2 wpisy z wagą żeby cokolwiek pokazać
  const hasData = entries.filter((e) => e.waga != null).length >= 2;

  if (entries.length === 0) return null;

  return (
    <div className="insights-panel">
      <h2 className="section-title">Analiza postępu</h2>

      {/* --- Cel wagowy --- */}
      <div className="insights-goal">
        <label className="insights-goal-label">Waga docelowa (kg)</label>
        <div className="insights-goal-row">
          <input
            type="number"
            step="0.1"
            min="30"
            className="form-input insights-goal-input"
            placeholder="np. 75"
            value={goalWeight}
            onChange={handleGoalChange}
          />
          <button className="insights-goal-btn" onClick={handleGoalSave}>
            {goalSaved ? 'Zapisano' : 'Zapisz cel'}
          </button>
        </div>
      </div>

      {!hasData && (
        <p className="insights-empty">
          Dodaj minimum 2 wpisy z wagą, aby zobaczyć analizę.
        </p>
      )}

      {hasData && (
        <>
          {/* --- Karty KPI --- */}
          <div className="insights-grid">
            {/* Aktualna waga */}
            <InsightCard
              label="Aktualna waga"
              value={currentWeight != null ? `${currentWeight} kg` : '—'}
            />

            {/* Średnia zmiana / tydzień */}
            <InsightCard
              label="Śr. zmiana / tydzień"
              value={weeklyAvg != null ? `${weeklyAvg > 0 ? '+' : ''}${weeklyAvg} kg` : '—'}
              valueClass={weeklyAvg != null ? (weeklyAvg < 0 ? 'ins-ok' : weeklyAvg > 0 ? 'ins-danger' : '') : ''}
            />

            {/* Tempo regresji */}
            <InsightCard
              label="Tempo (regresja)"
              value={slopePerWeek != null ? `${slopePerWeek > 0 ? '+' : ''}${slopePerWeek} kg/tydz.` : '—'}
              valueClass={slopePerWeek != null ? (slopePerWeek < 0 ? 'ins-ok' : 'ins-danger') : ''}
            />

            {/* Prognoza celu */}
            {goalNum != null && goalNum > 0 && (
              <InsightCard
                label={`Cel: ${goalNum} kg`}
                value={
                  currentWeight != null && currentWeight <= goalNum
                    ? 'Cel osiągnięty!'
                    : goalEstimate
                    ? `~${formatDate(goalEstimate.date)} (~${goalEstimate.weeks} tyg.)`
                    : 'Brak danych do prognozy'
                }
                valueClass={
                  currentWeight != null && currentWeight <= goalNum
                    ? 'ins-ok'
                    : goalEstimate
                    ? 'ins-ok'
                    : 'ins-warn'
                }
              />
            )}
          </div>

          {/* --- Status badges --- */}
          <div className="insights-badges">
            {/* Ocena tempa */}
            {rateAssessment && (
              <StatusBadge
                icon={STATUS_ICON[rateAssessment.icon] || STATUS_ICON.ok}
                label={rateAssessment.label}
              />
            )}

            {/* Plateau */}
            {plateau && (
              <StatusBadge
                icon={STATUS_ICON.warning}
                label="Wykryto plateau — waga stoi w miejscu od dłuższego czasu"
              />
            )}
          </div>

          {/* --- Analiza brzucha/talii --- */}
          {waistAnalysis && (
            <div className="insights-waist">
              <h3 className="insights-subtitle">
                {WAIST_LABEL[mode]} — wskaźnik utraty tłuszczu
              </h3>
              <div className="insights-grid insights-grid-sm">
                <InsightCard
                  label={`Zmiana ${WAIST_LABEL[mode].toLowerCase()} / tydz.`}
                  value={`${waistAnalysis.weeklyChange > 0 ? '+' : ''}${waistAnalysis.weeklyChange} cm`}
                  valueClass={waistAnalysis.weeklyChange <= 0 ? 'ins-ok' : 'ins-danger'}
                />
                <InsightCard
                  label="Łączna zmiana"
                  value={`${waistAnalysis.totalChange > 0 ? '+' : ''}${waistAnalysis.totalChange} cm`}
                  valueClass={waistAnalysis.totalChange <= 0 ? 'ins-ok' : 'ins-danger'}
                />
              </div>
              <StatusBadge
                icon={STATUS_ICON[waistAnalysis.verdict.status] || STATUS_ICON.ok}
                label={waistAnalysis.verdict.text}
              />
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* --- Podkomponenty --- */

function InsightCard({ label, value, valueClass = '' }) {
  return (
    <div className="insight-card">
      <span className="insight-label">{label}</span>
      <span className={`insight-value ${valueClass}`}>{value}</span>
    </div>
  );
}

function StatusBadge({ icon, label }) {
  return (
    <div className={`ins-badge ${icon.cls}`}>
      <span className="ins-badge-icon">{icon.symbol}</span>
      <span className="ins-badge-text">{label}</span>
    </div>
  );
}

function formatDate(date) {
  const d = new Date(date);
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(d.getDate())}.${pad(d.getMonth() + 1)}.${d.getFullYear()}`;
}
