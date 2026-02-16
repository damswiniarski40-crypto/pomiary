/**
 * Moduł analizy trendu redukcji.
 * Entries wchodzą posortowane newest-first — wewnętrznie odwracamy na chronologiczne.
 */

const DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Średnia zmiana wartości na tydzień.
 * Oblicza sumaryczną zmianę podzieloną przez łączny czas w tygodniach.
 */
export function calculateWeeklyAverage(entries, key) {
  const pts = toChronological(entries, key);
  if (pts.length < 2) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const weeks = (last.day - first.day) / 7;
  if (weeks <= 0) return null;

  return +((last.val - first.val) / weeks).toFixed(2);
}

/**
 * Regresja liniowa — nachylenie prostej (zmiana per dzień).
 * Zwraca slope w jednostkach/dzień.
 */
export function calculateTrendSlope(entries, key) {
  const pts = toChronological(entries, key);
  if (pts.length < 2) return null;

  const n = pts.length;
  let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
  for (const p of pts) {
    sumX += p.day;
    sumY += p.val;
    sumXY += p.day * p.val;
    sumX2 += p.day * p.day;
  }
  const denom = n * sumX2 - sumX * sumX;
  if (denom === 0) return 0;

  const slope = (n * sumXY - sumX * sumY) / denom;
  return slope; // jednostka / dzień
}

/**
 * Przewidywana data osiągnięcia celu.
 * @returns {{ date: Date, weeks: number } | null}
 */
export function estimateGoalDate(entries, goalWeight) {
  if (goalWeight == null) return null;

  const pts = toChronological(entries, 'waga');
  if (pts.length < 2) return null;

  const slopePerDay = calculateTrendSlope(entries, 'waga');
  if (slopePerDay == null || slopePerDay >= 0) return null; // brak spadku

  const currentWeight = pts[pts.length - 1].val;
  if (currentWeight <= goalWeight) return { date: new Date(), weeks: 0 };

  const remaining = goalWeight - currentWeight; // ujemna wartość
  const daysNeeded = remaining / slopePerDay;   // slope ujemny, remaining ujemne → dni dodatnie
  if (daysNeeded <= 0 || daysNeeded > 365 * 3) return null; // max 3 lata

  const lastDate = new Date(pts[pts.length - 1].dateMs);
  const targetDate = new Date(lastDate.getTime() + daysNeeded * DAY_MS);
  const weeks = +(daysNeeded / 7).toFixed(1);

  return { date: targetDate, weeks };
}

/**
 * Wykrywa plateau — brak istotnej zmiany wagi w ciągu ostatnich N wpisów.
 * Plateau = zmiana < 0.3 kg w ciągu min. 3 wpisów rozłożonych na >= 14 dni.
 */
export function detectPlateau(entries) {
  const pts = toChronological(entries, 'waga');
  if (pts.length < 3) return false;

  // Ostatnie 3+ wpisy
  const recent = pts.slice(-Math.min(pts.length, 5));
  const span = recent[recent.length - 1].day - recent[0].day;
  if (span < 14) return false; // za mało czasu

  const vals = recent.map((p) => p.val);
  const min = Math.min(...vals);
  const max = Math.max(...vals);

  return (max - min) < 0.3;
}

/**
 * Ocena tempa redukcji wagi (kg/tydzień).
 * Zwraca { status, label, icon }
 */
export function assessRate(weeklyRate) {
  if (weeklyRate == null) return null;

  const abs = Math.abs(weeklyRate);

  if (weeklyRate >= 0) {
    return { status: 'danger', label: 'Brak progresu', icon: 'stop' };
  }
  if (abs > 1.0) {
    return { status: 'warning', label: 'Tempo zbyt szybkie (ryzyko utraty mięśni)', icon: 'warning' };
  }
  if (abs >= 0.2) {
    return { status: 'ok', label: 'Tempo optymalne', icon: 'ok' };
  }
  return { status: 'warning', label: 'Tempo bardzo wolne', icon: 'warning' };
}

/**
 * Analiza obwodu brzucha/talii jako wskaźnika utraty tłuszczu.
 * Zwraca { weeklyChange, totalChange, verdict }
 */
export function analyzeWaist(entries, key) {
  const pts = toChronological(entries, key);
  if (pts.length < 2) return null;

  const first = pts[0];
  const last = pts[pts.length - 1];
  const weeks = (last.day - first.day) / 7;
  if (weeks <= 0) return null;

  const totalChange = +(last.val - first.val).toFixed(1);
  const weeklyChange = +(totalChange / weeks).toFixed(2);

  let verdict;
  if (totalChange < -2) {
    verdict = { status: 'ok', text: 'Wyraźna redukcja tkanki tłuszczowej' };
  } else if (totalChange < 0) {
    verdict = { status: 'ok', text: 'Stopniowa redukcja tkanki tłuszczowej' };
  } else if (totalChange === 0) {
    verdict = { status: 'warning', text: 'Brak zmian obwodu' };
  } else {
    verdict = { status: 'danger', text: 'Obwód rośnie — zweryfikuj dietę' };
  }

  return { weeklyChange, totalChange, verdict };
}

/* --- Helpers --- */

/** Konwertuje entries (newest-first) na posortowane chronologicznie punkty { day, val, dateMs } */
function toChronological(entries, key) {
  const filtered = entries
    .filter((e) => e[key] != null)
    .map((e) => ({ dateMs: new Date(e.date).getTime(), val: e[key] }));

  if (filtered.length === 0) return [];

  filtered.sort((a, b) => a.dateMs - b.dateMs);

  const baseMs = filtered[0].dateMs;
  return filtered.map((p) => ({
    ...p,
    day: (p.dateMs - baseMs) / DAY_MS,
  }));
}
