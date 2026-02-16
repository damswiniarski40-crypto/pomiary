import { useState, useEffect } from 'react';

export default function MeasurementForm({ fields, onSubmit }) {
  const today = () => new Date().toISOString().split('T')[0];

  const buildEmpty = () => ({
    date: today(),
    ...Object.fromEntries(fields.map((f) => [f.key, ''])),
  });

  const [formData, setFormData] = useState(buildEmpty);
  const [errors, setErrors] = useState({});

  // Reset przy zmianie trybu
  useEffect(() => {
    setFormData(buildEmpty());
    setErrors({});
  }, [fields]);

  const handleChange = (key, value) => {
    setFormData((prev) => ({ ...prev, [key]: value }));
    // Wyczyść błąd pola przy edycji
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = () => {
    const newErrors = {};
    if (!formData.date) {
      newErrors.date = 'Data jest wymagana';
    }
    fields.forEach((f) => {
      const val = formData[f.key];
      if (val !== '' && val !== undefined) {
        const num = parseFloat(val);
        if (isNaN(num) || num < 0) {
          newErrors[f.key] = 'Podaj poprawną liczbę';
        }
      }
    });
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validate()) {
      onSubmit(formData);
      setFormData(buildEmpty());
      setErrors({});
    }
  };

  return (
    <form className="measurement-form" onSubmit={handleSubmit}>
      <h2 className="form-title">Nowy pomiar</h2>
      <div className="form-grid">
        {/* Pole daty */}
        <div className="form-group">
          <label className="form-label" htmlFor="date">Data *</label>
          <input
            id="date"
            type="date"
            className={`form-input ${errors.date ? 'error' : ''}`}
            value={formData.date}
            onChange={(e) => handleChange('date', e.target.value)}
            required
          />
          {errors.date && <span className="error-msg">{errors.date}</span>}
        </div>

        {/* Pola pomiarowe */}
        {fields.map((f) => (
          <div className="form-group" key={f.key}>
            <label className="form-label" htmlFor={f.key}>{f.label}</label>
            <input
              id={f.key}
              type="number"
              step="0.1"
              min="0"
              className={`form-input ${errors[f.key] ? 'error' : ''}`}
              placeholder={f.unit}
              value={formData[f.key] ?? ''}
              onChange={(e) => handleChange(f.key, e.target.value)}
            />
            {errors[f.key] && <span className="error-msg">{errors[f.key]}</span>}
          </div>
        ))}

        {/* Przycisk */}
        <div className="form-actions">
          <button type="submit" className="btn-submit">
            Dodaj pomiar
          </button>
        </div>
      </div>
    </form>
  );
}
