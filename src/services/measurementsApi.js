import { supabase } from './supabaseClient';

/* ============================
   Konwersje local <-> Supabase
   ============================ */

/**
 * Zamienia wpis lokalny na format Supabase.
 * Pola pomiarowe trafiają do kolumny JSONB "data".
 */
export function toSupabase(entry, userId, mode) {
  const { id, date, pending_sync, ...fieldValues } = entry;
  return { id, user_id: userId, mode, date, data: fieldValues };
}

/** Zamienia wiersz Supabase na format lokalny (płaski). */
export function toLocal(row) {
  return { id: row.id, date: row.date, ...(row.data || {}) };
}

/* ============================
   Operacje CRUD
   ============================ */

/** Pobiera wszystkie pomiary użytkownika dla danego trybu. */
export async function fetchMeasurements(userId, mode) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from('measurements')
    .select('*')
    .eq('user_id', userId)
    .eq('mode', mode)
    .order('date', { ascending: false });

  if (error) {
    console.error('[Supabase] fetch error:', error.message);
    return null;
  }
  return data.map(toLocal);
}

/** Wstawia lub aktualizuje jeden pomiar (upsert po id). */
export async function upsertMeasurement(supaEntry) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('measurements')
    .upsert(supaEntry, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase] upsert error:', error.message);
    return false;
  }
  return true;
}

/** Wstawia wiele pomiarów naraz (batch upsert). */
export async function batchUpsert(entries) {
  if (!supabase || entries.length === 0) return true;
  const { error } = await supabase
    .from('measurements')
    .upsert(entries, { onConflict: 'id' });

  if (error) {
    console.error('[Supabase] batch upsert error:', error.message);
    return false;
  }
  return true;
}

/** Usuwa pomiar po id. */
export async function deleteMeasurement(id) {
  if (!supabase) return false;
  const { error } = await supabase
    .from('measurements')
    .delete()
    .eq('id', id);

  if (error) {
    console.error('[Supabase] delete error:', error.message);
    return false;
  }
  return true;
}
