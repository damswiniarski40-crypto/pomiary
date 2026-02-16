import { useState, useEffect, useCallback, useRef } from 'react';
import {
  loadEntries,
  saveEntries,
  loadPendingDeletes,
  clearPendingDeletes,
} from '../utils/storage';
import {
  fetchMeasurements,
  batchUpsert,
  deleteMeasurement,
  toSupabase,
} from '../services/measurementsApi';

/**
 * Hook wykrywający stan sieci i synchronizujący dane z Supabase.
 *
 * syncAndFetch(userId, mode):
 *   1. Pushuje pending wpisy z localStorage do Supabase
 *   2. Realizuje pending deletes
 *   3. Pobiera świeże dane z Supabase
 *   4. Zapisuje je w localStorage
 *   5. Zwraca tablicę wpisów (lub null przy błędzie)
 */
export function useSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [isSyncing, setIsSyncing] = useState(false);
  const lockRef = useRef(false);

  useEffect(() => {
    const goOnline = () => setIsOnline(true);
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  const syncAndFetch = useCallback(async (userId, mode) => {
    if (!userId || lockRef.current) return null;
    lockRef.current = true;
    setIsSyncing(true);

    try {
      // 1. Push pending entries
      const local = loadEntries(mode);
      const pending = local.filter((e) => e.pending_sync);

      if (pending.length > 0) {
        const supaEntries = pending.map((e) => {
          const { pending_sync, ...rest } = e;
          return toSupabase(rest, userId, mode);
        });
        const ok = await batchUpsert(supaEntries);
        if (ok) {
          const cleaned = local.map(({ pending_sync, ...rest }) => rest);
          saveEntries(mode, cleaned);
        }
      }

      // 2. Process pending deletes
      const pendingDeletes = loadPendingDeletes(mode);
      if (pendingDeletes.length > 0) {
        for (const id of pendingDeletes) {
          await deleteMeasurement(id);
        }
        clearPendingDeletes(mode);
      }

      // 3. Fetch fresh from Supabase
      const remote = await fetchMeasurements(userId, mode);
      if (remote) {
        saveEntries(mode, remote);
        return remote;
      }

      // Fallback: localStorage
      return loadEntries(mode);
    } catch (err) {
      console.error('[Sync] error:', err);
      return loadEntries(mode);
    } finally {
      setIsSyncing(false);
      lockRef.current = false;
    }
  }, []);

  return { isOnline, isSyncing, syncAndFetch };
}
