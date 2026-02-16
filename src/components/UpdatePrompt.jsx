import { useState, useEffect, useCallback } from 'react';
import { useRegisterSW } from 'virtual:pwa-register/react';

export default function UpdatePrompt() {
  const [dismissed, setDismissed] = useState(false);

  const {
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(swUrl, registration) {
      // Sprawdzaj aktualizacje co 60 minut
      if (registration) {
        setInterval(() => registration.update(), 60 * 60 * 1000);
      }
    },
  });

  const handleUpdate = useCallback(() => {
    updateServiceWorker(true);
  }, [updateServiceWorker]);

  const handleDismiss = useCallback(() => {
    setDismissed(true);
  }, []);

  // Pokaż ponownie gdy pojawi się kolejna aktualizacja
  useEffect(() => {
    if (needRefresh) setDismissed(false);
  }, [needRefresh]);

  if (!needRefresh || dismissed) return null;

  return (
    <div className="update-toast" role="alert">
      <p className="update-toast-msg">Dostępna jest nowa wersja aplikacji</p>
      <div className="update-toast-actions">
        <button className="update-btn primary" onClick={handleUpdate}>
          Odśwież teraz
        </button>
        <button className="update-btn secondary" onClick={handleDismiss}>
          Później
        </button>
      </div>
    </div>
  );
}
