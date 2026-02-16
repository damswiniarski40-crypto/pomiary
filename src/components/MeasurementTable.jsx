import { useState } from 'react';
import { findPreviousEntry, findWeeklyEntry } from '../utils/comparison';
import ChangeIndicator from './ChangeIndicator';

export default function MeasurementTable({ entries, fields, onDelete, onEdit }) {
  const [editCell, setEditCell] = useState(null); // { id, key }
  const [editValue, setEditValue] = useState('');

  const startEdit = (entryId, key, currentValue) => {
    setEditCell({ id: entryId, key });
    setEditValue(currentValue != null ? String(currentValue) : '');
  };

  const commitEdit = (entryId, key) => {
    if (key === 'date') {
      // Data — waliduj format YYYY-MM-DD
      if (/^\d{4}-\d{2}-\d{2}$/.test(editValue) && !isNaN(new Date(editValue).getTime())) {
        onEdit(entryId, key, editValue);
      }
      setEditCell(null);
      return;
    }
    const parsed = editValue.trim() === '' ? null : parseFloat(editValue);
    if (editValue.trim() !== '' && (isNaN(parsed) || parsed < 0)) {
      cancelEdit();
      return;
    }
    onEdit(entryId, key, parsed);
    setEditCell(null);
  };

  const cancelEdit = () => {
    setEditCell(null);
    setEditValue('');
  };

  const handleKeyDown = (e, entryId, key) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      commitEdit(entryId, key);
    } else if (e.key === 'Escape') {
      cancelEdit();
    }
  };

  const isEditing = (entryId, key) =>
    editCell && editCell.id === entryId && editCell.key === key;

  if (entries.length === 0) {
    return (
      <div className="table-section">
        <h2 className="table-title">Historia pomiarów</h2>
        <p className="empty-state">
          Brak pomiarów. Dodaj pierwszy wpis powyżej.
        </p>
      </div>
    );
  }

  return (
    <div className="table-section">
      <h2 className="table-title">Historia pomiarów ({entries.length})</h2>
      <div className="table-wrapper">
        <table className="measurement-table">
          <thead>
            <tr>
              <th>Data</th>
              {fields.map((f) => (
                <th key={f.key}>{f.label}</th>
              ))}
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry, index) => {
              const prev = findPreviousEntry(entries, index);
              const weekly = findWeeklyEntry(entries, entry);

              return (
                <tr key={entry.id} className="entry-row">
                  {/* Data — edytowalna */}
                  <td className="td-date" data-label="Data">
                    {isEditing(entry.id, 'date') ? (
                      <input
                        type="date"
                        className="edit-input edit-input-date"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={() => commitEdit(entry.id, 'date')}
                        onKeyDown={(e) => handleKeyDown(e, entry.id, 'date')}
                        autoFocus
                      />
                    ) : (
                      <span
                        className="editable"
                        onClick={() => startEdit(entry.id, 'date', entry.date)}
                        title="Kliknij aby edytować"
                      >
                        {formatDate(entry.date)}
                      </span>
                    )}
                  </td>

                  {/* Pola pomiarowe — edytowalne */}
                  {fields.map((f) => (
                    <td key={f.key} className="td-value" data-label={f.label}>
                      <div>
                        {isEditing(entry.id, f.key) ? (
                          <input
                            type="number"
                            step="0.1"
                            min="0"
                            className="edit-input"
                            value={editValue}
                            onChange={(e) => setEditValue(e.target.value)}
                            onBlur={() => commitEdit(entry.id, f.key)}
                            onKeyDown={(e) => handleKeyDown(e, entry.id, f.key)}
                            autoFocus
                          />
                        ) : (
                          <>
                            <span
                              className="editable"
                              onClick={() => startEdit(entry.id, f.key, entry[f.key])}
                              title="Kliknij aby edytować"
                            >
                              {entry[f.key] != null ? (
                                <>
                                  <span className="value-main">{entry[f.key]}</span>
                                  <span className="value-unit">{f.unit}</span>
                                </>
                              ) : (
                                <span className="value-main value-empty">—</span>
                              )}
                            </span>
                            {prev && (
                              <ChangeIndicator
                                current={entry[f.key]}
                                previous={prev[f.key]}
                              />
                            )}
                          </>
                        )}
                      </div>
                      {!isEditing(entry.id, f.key) && weekly && (
                        <div className="weekly-diff">
                          <span className="weekly-label">tyg.</span>
                          <ChangeIndicator
                            current={entry[f.key]}
                            previous={weekly[f.key]}
                          />
                        </div>
                      )}
                    </td>
                  ))}

                  <td className="td-actions">
                    <button
                      className="btn-delete"
                      onClick={() => onDelete(entry.id)}
                      title="Usuń wpis"
                    >
                      ×
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Formatuje datę ISO na polski format dd.MM.yyyy */
function formatDate(isoDate) {
  const [y, m, d] = isoDate.split('-');
  return `${d}.${m}.${y}`;
}
