export default function ModeToggle({ mode, onToggle }) {
  return (
    <div className="mode-toggle">
      <div className="toggle-group">
        <button
          className={`toggle-btn ${mode === 'male' ? 'active' : ''}`}
          onClick={() => onToggle('male')}
        >
          Mężczyzna
        </button>
        <button
          className={`toggle-btn ${mode === 'female' ? 'active' : ''}`}
          onClick={() => onToggle('female')}
        >
          Kobieta
        </button>
      </div>
    </div>
  );
}
