import { useState, useEffect, useRef } from 'react';
import { loadEntries, saveEntries, addPendingDelete } from './utils/storage';
import { isSupabaseConfigured } from './services/supabaseClient';
import {
  upsertMeasurement,
  deleteMeasurement as deleteRemote,
  toSupabase,
} from './services/measurementsApi';
import { useAuth } from './hooks/useAuth';
import { useSync } from './hooks/useSync';
import AuthScreen from './components/AuthScreen';
import ModeToggle from './components/ModeToggle';
import DashboardHero from './components/DashboardHero';
import StatsCards from './components/StatsCards';
import MeasurementForm from './components/MeasurementForm';
import MeasurementTable from './components/MeasurementTable';
import ProgressCharts from './components/ProgressCharts';
import { exportPDF } from './utils/pdfExport';
import UpdatePrompt from './components/UpdatePrompt';
import DataManagement from './components/DataManagement';
import ProgressInsights from './components/ProgressInsights';

/* ============================
   Definicje pól pomiarowych
   ============================ */

const MALE_FIELDS = [
  { key: 'waga', label: 'Waga', unit: 'kg' },
  { key: 'klatka', label: 'Klatka piersiowa', unit: 'cm' },
  { key: 'brzuch', label: 'Brzuch', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'udo', label: 'Udo', unit: 'cm' },
  { key: 'lydka', label: 'Łydka', unit: 'cm' },
];

const FEMALE_FIELDS = [
  { key: 'waga', label: 'Waga', unit: 'kg' },
  { key: 'udo_gora', label: 'Udo (góra)', unit: 'cm' },
  { key: 'udo_dol', label: 'Udo (dół)', unit: 'cm' },
  { key: 'talia', label: 'Talia', unit: 'cm' },
  { key: 'biust', label: 'Biust', unit: 'cm' },
  { key: 'pod_biustem', label: 'Pod biustem', unit: 'cm' },
  { key: 'biceps', label: 'Biceps', unit: 'cm' },
  { key: 'lydka', label: 'Łydka', unit: 'cm' },
  { key: 'posladki', label: 'Pośladki', unit: 'cm' },
  { key: 'pod_pepkiem', label: '3 cm pod pępkiem', unit: 'cm' },
];

/* ============================
   Komponent główny
   ============================ */

export default function App() {
  const { user, loading: authLoading, signIn, signUp, signOut } = useAuth();
  const { isOnline, isSyncing, syncAndFetch } = useSync();

  const [mode, setMode] = useState('male');
  const [entries, setEntries] = useState([]);
  const [formOpen, setFormOpen] = useState(false);
  const [dataLoading, setDataLoading] = useState(false);
  const formContentRef = useRef(null);

  const fields = mode === 'male' ? MALE_FIELDS : FEMALE_FIELDS;
  const useCloud = isSupabaseConfigured() && !!user;

  /* --- Ładowanie danych ---
   * Online + zalogowany → sync pending + fetch z Supabase
   * Offline lub brak usera → localStorage
   */
  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (useCloud && isOnline) {
        setDataLoading(true);
        const fresh = await syncAndFetch(user.id, mode);
        if (!cancelled) {
          setEntries(fresh || loadEntries(mode));
          setDataLoading(false);
        }
      } else {
        setEntries(loadEntries(mode));
      }
    }

    if (!authLoading) load();
    return () => { cancelled = true; };
  }, [mode, user, authLoading, isOnline, useCloud, syncAndFetch]);

  // Zamknij formularz przy zmianie trybu
  useEffect(() => { setFormOpen(false); }, [mode]);

  /* --- Dodawanie wpisu --- */
  const handleAddEntry = async (formData) => {
    const newEntry = {
      id: crypto.randomUUID(),
      date: formData.date,
    };
    fields.forEach((f) => {
      const val = formData[f.key];
      newEntry[f.key] = val !== '' && val != null ? parseFloat(val) : null;
    });

    // Sync do Supabase (jeśli online + zalogowany)
    let synced = false;
    if (useCloud && isOnline) {
      synced = await upsertMeasurement(toSupabase(newEntry, user.id, mode));
    }
    if (useCloud && !synced) {
      newEntry.pending_sync = true;
    }

    const updated = [newEntry, ...entries];
    updated.sort((a, b) => new Date(b.date) - new Date(a.date));
    setEntries(updated);
    saveEntries(mode, updated);
    setFormOpen(false);
  };

  /* --- Edycja wpisu --- */
  const handleEditEntry = async (entryId, key, value) => {
    let updated = entries.map((e) =>
      e.id !== entryId ? e : { ...e, [key]: value }
    );
    updated.sort((a, b) => new Date(b.date) - new Date(a.date));

    let synced = false;
    if (useCloud && isOnline) {
      const entry = updated.find((e) => e.id === entryId);
      if (entry) {
        synced = await upsertMeasurement(toSupabase(entry, user.id, mode));
      }
    }
    if (useCloud && !synced) {
      updated = updated.map((e) =>
        e.id === entryId ? { ...e, pending_sync: true } : e
      );
    }

    setEntries(updated);
    saveEntries(mode, updated);
  };

  /* --- Usuwanie wpisu --- */
  const handleDeleteEntry = async (entryId) => {
    if (!window.confirm('Czy na pewno chcesz usunąć ten wpis?')) return;

    if (useCloud && isOnline) {
      await deleteRemote(entryId);
    } else if (useCloud) {
      addPendingDelete(mode, entryId);
    }

    const updated = entries.filter((e) => e.id !== entryId);
    setEntries(updated);
    saveEntries(mode, updated);
  };

  /* --- Ekran ładowania autoryzacji --- */
  if (authLoading) {
    return (
      <div className="auth-container">
        <div className="data-loader">
          <div className="loader-spinner" />
        </div>
      </div>
    );
  }

  /* --- Ekran logowania (jeśli Supabase skonfigurowany, ale brak usera) --- */
  if (isSupabaseConfigured() && !user) {
    return <AuthScreen onSignIn={signIn} onSignUp={signUp} />;
  }

  /* --- Dashboard --- */
  const title = mode === 'male' ? 'Pomiary — Mężczyzna' : 'Pomiary — Kobieta';

  return (
    <div className={`app-container theme-${mode}`}>
      <UpdatePrompt />
      <div className="app-inner">
        {/* Pasek użytkownika */}
        {user && (
          <div className="user-bar">
            <div className="sync-indicator">
              <span
                className={`sync-dot ${
                  isSyncing ? 'syncing' : isOnline ? 'online' : 'offline'
                }`}
              />
              <span>
                {isSyncing
                  ? 'Synchronizacja...'
                  : isOnline
                  ? 'Online'
                  : 'Offline'}
              </span>
            </div>
            <button className="btn-logout" onClick={signOut}>
              Wyloguj
            </button>
          </div>
        )}

        <h1 className="app-title">{title}</h1>
        <ModeToggle mode={mode} onToggle={setMode} />

        {dataLoading ? (
          <div className="data-loader">
            <div className="loader-spinner" />
            <span>Ładowanie danych...</span>
          </div>
        ) : (
          <>
            {/* HERO */}
            <DashboardHero entries={entries} mode={mode} />

            {/* STATS */}
            <StatsCards entries={entries} />

            {/* FORMULARZ (zwijany) */}
            <div className="form-collapse-panel">
              <button
                className={`form-collapse-trigger ${formOpen ? 'open' : ''}`}
                onClick={() => setFormOpen((v) => !v)}
              >
                <span className="form-collapse-icon">
                  {formOpen ? '\u2212' : '+'}
                </span>
                Dodaj pomiar
              </button>
              <div
                className="form-collapse-body"
                ref={formContentRef}
                style={{
                  maxHeight: formOpen
                    ? `${formContentRef.current?.scrollHeight ?? 600}px`
                    : '0px',
                }}
              >
                <div className="form-collapse-inner">
                  <MeasurementForm fields={fields} onSubmit={handleAddEntry} />
                </div>
              </div>
            </div>

            {/* EXPORT */}
            {entries.length > 0 && (
              <div className="export-bar">
                <button
                  className="btn-export"
                  onClick={() => exportPDF({ entries, fields, mode })}
                >
                  Eksportuj raport PDF
                </button>
              </div>
            )}

            {/* HISTORIA */}
            <MeasurementTable
              entries={entries}
              fields={fields}
              onEdit={handleEditEntry}
              onDelete={handleDeleteEntry}
            />

            {/* WYKRESY */}
            <ProgressCharts entries={entries} fields={fields} mode={mode} />

            {/* INSIGHTS */}
            <ProgressInsights entries={entries} mode={mode} />

            {/* ZARZĄDZANIE DANYMI */}
            <DataManagement
              onImportComplete={() => setEntries(loadEntries(mode))}
            />
          </>
        )}
      </div>
    </div>
  );
}
