const STORAGE_KEYS = {
  male: 'pomiary_male',
  female: 'pomiary_female',
};

/**
 * Eksportuje dane obu trybów do pliku JSON.
 * Struktura: { version, exportedAt, data: { male: [...], female: [...] } }
 */
export function exportBackup() {
  const backup = {
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      male: readKey(STORAGE_KEYS.male),
      female: readKey(STORAGE_KEYS.female),
    },
  };

  const json = JSON.stringify(backup, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const date = new Date().toISOString().slice(0, 10);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pomiary-backup-${date}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

/**
 * Waliduje i importuje dane z pliku JSON.
 * Zwraca { ok, message, counts? } — counts to ile wpisów zaimportowano.
 */
export function importBackup(fileContent) {
  let parsed;
  try {
    parsed = JSON.parse(fileContent);
  } catch {
    return { ok: false, message: 'Nieprawidłowy format pliku JSON.' };
  }

  // Sprawdź strukturę
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, message: 'Plik nie zawiera prawidłowych danych.' };
  }

  if (!parsed.data || typeof parsed.data !== 'object') {
    return { ok: false, message: 'Brak sekcji "data" w pliku backupu.' };
  }

  const { male, female } = parsed.data;

  if (male !== undefined && !Array.isArray(male)) {
    return { ok: false, message: 'Dane trybu męskiego mają nieprawidłowy format.' };
  }
  if (female !== undefined && !Array.isArray(female)) {
    return { ok: false, message: 'Dane trybu kobiecego mają nieprawidłowy format.' };
  }

  // Waliduj poszczególne wpisy
  const validMale = validateEntries(male || []);
  const validFemale = validateEntries(female || []);

  if (validMale.invalid > 0 || validFemale.invalid > 0) {
    return {
      ok: false,
      message: `Odrzucono nieprawidłowe wpisy: ${validMale.invalid} (mężczyzna), ${validFemale.invalid} (kobieta).`,
    };
  }

  // Zapisz do localStorage (nadpisz nawet gdy puste — backup mógł celowo usunąć dane)
  if (parsed.data.male !== undefined) {
    localStorage.setItem(STORAGE_KEYS.male, JSON.stringify(validMale.entries));
  }
  if (parsed.data.female !== undefined) {
    localStorage.setItem(STORAGE_KEYS.female, JSON.stringify(validFemale.entries));
  }

  return {
    ok: true,
    message: 'Import zakończony pomyślnie.',
    counts: {
      male: validMale.entries.length,
      female: validFemale.entries.length,
    },
  };
}

/** Czyta klucz z localStorage, zwraca tablicę lub [] */
function readKey(key) {
  try {
    return JSON.parse(localStorage.getItem(key)) || [];
  } catch {
    return [];
  }
}

/** Waliduje tablicę wpisów — każdy musi mieć id i date */
function validateEntries(entries) {
  let invalid = 0;
  const valid = [];

  for (const entry of entries) {
    if (
      entry &&
      typeof entry === 'object' &&
      typeof entry.id === 'string' &&
      typeof entry.date === 'string' &&
      /^\d{4}-\d{2}-\d{2}$/.test(entry.date)
    ) {
      valid.push(entry);
    } else {
      invalid++;
    }
  }

  return { entries: valid, invalid };
}
