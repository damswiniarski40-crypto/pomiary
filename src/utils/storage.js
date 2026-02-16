const KEYS = {
  male: 'pomiary_male',
  female: 'pomiary_female',
};

const PENDING_DELETE_KEYS = {
  male: 'pomiary_pending_deletes_male',
  female: 'pomiary_pending_deletes_female',
};

/* ============================
   Wpisy pomiarowe
   ============================ */

export function loadEntries(mode) {
  const raw = localStorage.getItem(KEYS[mode]);
  if (!raw) return [];
  try {
    const entries = JSON.parse(raw);
    if (!Array.isArray(entries)) return [];
    // Zawsze sortuj po dacie — najnowsze na górze
    return entries.sort((a, b) => new Date(b.date) - new Date(a.date));
  } catch {
    return [];
  }
}

export function saveEntries(mode, entries) {
  localStorage.setItem(KEYS[mode], JSON.stringify(entries));
}

/* ============================
   Kolejka pending deletes (offline)
   ============================ */

export function loadPendingDeletes(mode) {
  try {
    return JSON.parse(localStorage.getItem(PENDING_DELETE_KEYS[mode])) || [];
  } catch {
    return [];
  }
}

export function addPendingDelete(mode, id) {
  const deletes = loadPendingDeletes(mode);
  if (!deletes.includes(id)) {
    deletes.push(id);
    localStorage.setItem(PENDING_DELETE_KEYS[mode], JSON.stringify(deletes));
  }
}

export function clearPendingDeletes(mode) {
  localStorage.removeItem(PENDING_DELETE_KEYS[mode]);
}
