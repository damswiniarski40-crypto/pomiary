/**
 * Znajduje poprzedni wpis (chronologicznie wcześniejszy).
 * Entries posortowane newest-first, więc poprzedni to index + 1.
 */
export function findPreviousEntry(entries, currentIndex) {
  return entries[currentIndex + 1] || null;
}

/**
 * Znajduje wpis z ~7 dni wstecz (tolerancja ±2 dni, czyli 5–9 dni).
 * Jeśli kilka pasuje — wybiera najbliższy do dokładnie 7 dni.
 */
export function findWeeklyEntry(entries, currentEntry) {
  const currentMs = new Date(currentEntry.date).getTime();
  const targetMs = currentMs - 7 * 24 * 60 * 60 * 1000;
  const toleranceMs = 2 * 24 * 60 * 60 * 1000;

  let best = null;
  let bestDist = Infinity;

  for (const entry of entries) {
    if (entry.id === currentEntry.id) continue;
    const entryMs = new Date(entry.date).getTime();
    // Szukaj tylko wpisów STARSZYCH niż bieżący
    if (entryMs >= currentMs) continue;
    const dist = Math.abs(entryMs - targetMs);
    if (dist <= toleranceMs && dist < bestDist) {
      best = entry;
      bestDist = dist;
    }
  }
  return best;
}

/**
 * Oblicza różnicę między bieżącą a poprzednią wartością.
 * Zwraca { diff, direction } lub null jeśli brak danych.
 */
export function calculateChange(current, previous) {
  if (current == null || previous == null) return null;
  const diff = +(current - previous).toFixed(1);
  if (diff === 0) return { diff: 0, direction: 'same' };
  return {
    diff,
    direction: diff > 0 ? 'up' : 'down',
  };
}
