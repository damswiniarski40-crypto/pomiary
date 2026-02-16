import { useState } from 'react';

export default function AuthScreen({ onSignIn, onSignUp }) {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);

  const switchTab = (login) => {
    setIsLogin(login);
    setError('');
    setSuccess('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setLoading(true);

    try {
      if (isLogin) {
        await onSignIn(email, password);
      } else {
        await onSignUp(email, password);
        setSuccess('Konto utworzone! Sprawdź email, aby potwierdzić rejestrację.');
        setEmail('');
        setPassword('');
      }
    } catch (err) {
      setError(err.message || 'Wystąpił błąd. Spróbuj ponownie.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h1 className="auth-title">Pomiary</h1>
        <p className="auth-subtitle">Monitor obwodów ciała</p>

        <div className="auth-tabs">
          <button
            className={`auth-tab ${isLogin ? 'active' : ''}`}
            onClick={() => switchTab(true)}
          >
            Logowanie
          </button>
          <button
            className={`auth-tab ${!isLogin ? 'active' : ''}`}
            onClick={() => switchTab(false)}
          >
            Rejestracja
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="auth-email">
              Email
            </label>
            <input
              id="auth-email"
              type="email"
              className="form-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              placeholder="jan@example.com"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="auth-password">
              Hasło
            </label>
            <input
              id="auth-password"
              type="password"
              className="form-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete={isLogin ? 'current-password' : 'new-password'}
              placeholder={isLogin ? 'Twoje hasło' : 'Min. 6 znaków'}
            />
          </div>

          {error && <div className="auth-msg auth-error">{error}</div>}
          {success && <div className="auth-msg auth-success">{success}</div>}

          <button type="submit" className="btn-submit" disabled={loading}>
            {loading
              ? 'Proszę czekać...'
              : isLogin
              ? 'Zaloguj się'
              : 'Utwórz konto'}
          </button>
        </form>
      </div>
    </div>
  );
}
