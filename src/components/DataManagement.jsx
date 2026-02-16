import { useState, useRef } from 'react';
import { exportBackup, importBackup } from '../utils/backup';

export default function DataManagement({ onImportComplete }) {
  const [message, setMessage] = useState(null); // { type: 'success'|'error', text }
  const fileRef = useRef(null);

  const showMessage = (type, text) => {
    setMessage({ type, text });
    setTimeout(() => setMessage(null), 5000);
  };

  const handleExport = () => {
    exportBackup();
    showMessage('success', 'Backup wyeksportowany.');
  };

  const handleImportClick = () => {
    fileRef.current?.click();
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset inputa, żeby ten sam plik mógł być wybrany ponownie
    e.target.value = '';

    if (!file.name.endsWith('.json')) {
      showMessage('error', 'Wybierz plik .json.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (ev) => {
      const content = ev.target?.result;
      if (typeof content !== 'string') {
        showMessage('error', 'Nie udało się odczytać pliku.');
        return;
      }

      // Potwierdzenie przed nadpisaniem
      const confirmed = window.confirm(
        'Import nadpisze istniejące dane. Czy kontynuować?'
      );
      if (!confirmed) return;

      const result = importBackup(content);
      if (result.ok) {
        const { male, female } = result.counts;
        showMessage(
          'success',
          `Zaimportowano: ${male} wpisów (mężczyzna), ${female} wpisów (kobieta).`
        );
        onImportComplete();
      } else {
        showMessage('error', result.message);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="data-mgmt">
      <h2 className="section-title">Zarządzanie danymi</h2>

      <div className="data-mgmt-actions">
        <button className="data-btn export" onClick={handleExport}>
          Eksportuj dane (.json)
        </button>
        <button className="data-btn import" onClick={handleImportClick}>
          Importuj dane
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json"
          onChange={handleFileChange}
          hidden
        />
      </div>

      {message && (
        <div className={`data-msg ${message.type}`} role="alert">
          {message.text}
        </div>
      )}
    </div>
  );
}
