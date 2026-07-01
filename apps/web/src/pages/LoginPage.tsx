import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  Mail,
  ShieldCheck,
  Sparkles,
  UserCog,
} from 'lucide-react';
import { FormEvent, useState } from 'react';
import { api } from '../lib/api';
import { Session, UserRole } from '../types';
import { Brand } from '../components/Brand';

const demoAccounts: Array<{
  role: UserRole;
  label: string;
  identifier: string;
  icon: typeof BookOpen;
}> = [
  {
    role: 'STUDENT',
    label: 'Alumno',
    identifier: 'ESP-2026-0001',
    icon: BookOpen,
  },
  {
    role: 'TEACHER',
    label: 'Docente',
    identifier: 'DOC-2026-0001',
    icon: UserCog,
  },
  {
    role: 'ADMIN',
    label: 'Administrativo',
    identifier: 'ADMIN-ESPARTA',
    icon: ShieldCheck,
  },
];

type LoginMode = 'login' | 'forgot' | 'reset';

export function LoginPage({ onLogin }: { onLogin: (session: Session) => void }) {
  const initialResetToken =
    new URLSearchParams(window.location.search).get('resetToken') ?? '';
  const [mode, setMode] = useState<LoginMode>(
    initialResetToken ? 'reset' : 'login',
  );
  const [identifier, setIdentifier] = useState('ESP-2026-0001');
  const [password, setPassword] = useState('Demo123!');
  const [forgotIdentifier, setForgotIdentifier] = useState('');
  const [resetToken, setResetToken] = useState(initialResetToken);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      onLogin(await api.login(identifier, password));
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : 'No fue posible iniciar sesión',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleForgotPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    try {
      const response = await api.requestPasswordReset(
        forgotIdentifier || identifier,
      );
      if (response.resetToken) {
        setResetToken(response.resetToken);
        setMode('reset');
        setNotice(
          'SMTP aún no está configurado; por ahora puedes definir la nueva contraseña desde esta pantalla de prueba.',
        );
      } else {
        setNotice(response.message);
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible solicitar la recuperación',
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setNotice('');

    if (newPassword !== confirmPassword) {
      setLoading(false);
      setError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    try {
      const response = await api.resetPassword(resetToken, newPassword);
      setMode('login');
      setPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setResetToken('');
      window.history.replaceState(null, '', window.location.pathname);
      setNotice(`${response.message}. Ya puedes iniciar sesión.`);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible restablecer la contraseña',
      );
    } finally {
      setLoading(false);
    }
  }

  function selectDemo(demoIdentifier: string) {
    setIdentifier(demoIdentifier);
    setPassword('Demo123!');
    setError('');
    setNotice('');
  }

  function showLogin() {
    setMode('login');
    setError('');
  }

  function showForgotPassword() {
    setForgotIdentifier(identifier);
    setMode('forgot');
    setError('');
    setNotice('');
  }

  return (
    <div className="login-page">
      <section className="login-story">
        <Brand light />
        <div className="login-story__content">
          <span className="eyebrow eyebrow--light">
            <Sparkles size={16} />
            INSTITUTO UNIVERSITARIO ESPARTA
          </span>
          <h1>Disciplina, conocimiento y futuro.</h1>
          <p>
            Un portal académico para la comunidad del Instituto Universitario
            Esparta.
          </p>
          <ul className="feature-list">
            <li>
              <CheckCircle2 size={20} />
              Calificaciones protegidas por estatus de pago
            </li>
            <li>
              <CheckCircle2 size={20} />
              Gestión de grupos y evaluaciones en tiempo real
            </li>
            <li>
              <CheckCircle2 size={20} />
              Control administrativo centralizado
            </li>
          </ul>
        </div>
        <p className="login-story__footer">
          Instituto Universitario Esparta · Ciclo 2026
        </p>
      </section>

      <section className="login-panel">
        <div className="login-card">
          <div className="login-card__heading">
            <span className="eyebrow">PORTAL UNIVERSITARIO</span>
            <h2>
              {mode === 'login' && 'Bienvenido de vuelta'}
              {mode === 'forgot' && 'Recuperar contraseña'}
              {mode === 'reset' && 'Nueva contraseña'}
            </h2>
            <p>
              {mode === 'login' &&
                'Ingresa tus datos institucionales para continuar.'}
              {mode === 'forgot' &&
                'Escribe tu matrícula, usuario o correo para recibir el enlace.'}
              {mode === 'reset' &&
                'Define una contraseña nueva para volver a entrar al portal.'}
            </p>
          </div>

          {mode === 'login' && (
            <form onSubmit={handleSubmit}>
              <label className="field">
                <span>Usuario, matrícula o correo</span>
                <input
                  type="text"
                  value={identifier}
                  onChange={(event) => setIdentifier(event.target.value)}
                  placeholder="ESP-2026-0001"
                  autoComplete="username"
                  required
                />
              </label>

              <label className="field">
                <span>Contraseña</span>
                <div className="password-field">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    autoComplete="current-password"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((visible) => !visible)}
                    aria-label={
                      showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'
                    }
                  >
                    {showPassword ? <EyeOff size={19} /> : <Eye size={19} />}
                  </button>
                </div>
              </label>

              <button
                type="button"
                className="login-switch-button"
                onClick={showForgotPassword}
              >
                ¿Olvidaste tu contraseña?
              </button>

              {notice && <div className="alert alert--success">{notice}</div>}
              {error && <div className="form-error">{error}</div>}

              <button className="button button--primary button--wide" disabled={loading}>
                {loading ? (
                  <span className="spinner spinner--light" />
                ) : (
                  <>
                    Iniciar sesión
                    <ArrowRight size={18} />
                  </>
                )}
              </button>
            </form>
          )}

          {mode === 'forgot' && (
            <form onSubmit={handleForgotPassword}>
              <label className="field">
                <span>Usuario, matrícula o correo</span>
                <input
                  type="text"
                  value={forgotIdentifier}
                  onChange={(event) => setForgotIdentifier(event.target.value)}
                  placeholder="ESP-2026-0001 o nombre@esparta.edu.mx"
                  autoComplete="username"
                  required
                />
              </label>

              {notice && <div className="alert alert--success">{notice}</div>}
              {error && <div className="form-error">{error}</div>}

              <button className="button button--primary button--wide" disabled={loading}>
                {loading ? (
                  <span className="spinner spinner--light" />
                ) : (
                  <>
                    Enviar enlace
                    <Mail size={18} />
                  </>
                )}
              </button>
              <button
                type="button"
                className="login-back-button"
                onClick={showLogin}
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {mode === 'reset' && (
            <form onSubmit={handleResetPassword}>
              {!initialResetToken && (
                <label className="field">
                  <span>Token de recuperación</span>
                  <input
                    value={resetToken}
                    onChange={(event) => setResetToken(event.target.value)}
                    placeholder="Pega aquí el token del correo"
                    required
                  />
                </label>
              )}
              <label className="field">
                <span>Nueva contraseña</span>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(event) => setNewPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>
              <label className="field">
                <span>Confirmar nueva contraseña</span>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(event) => setConfirmPassword(event.target.value)}
                  autoComplete="new-password"
                  minLength={8}
                  required
                />
              </label>

              {notice && <div className="alert alert--success">{notice}</div>}
              {error && <div className="form-error">{error}</div>}

              <button className="button button--primary button--wide" disabled={loading}>
                {loading ? (
                  <span className="spinner spinner--light" />
                ) : (
                  <>
                    Guardar contraseña
                    <KeyRound size={18} />
                  </>
                )}
              </button>
              <button
                type="button"
                className="login-back-button"
                onClick={showLogin}
              >
                <ArrowLeft size={16} />
                Volver al inicio de sesión
              </button>
            </form>
          )}

          {mode === 'login' && (
            <div className="demo-access">
            <div className="demo-access__label">
              <span />
              Acceso rápido de demostración
              <span />
            </div>
            <div className="demo-grid">
              {demoAccounts.map((account) => {
                const Icon = account.icon;
                return (
                  <button
                    key={account.role}
                    type="button"
                    className={
                      identifier === account.identifier ? 'is-selected' : ''
                    }
                    onClick={() => selectDemo(account.identifier)}
                  >
                    <Icon size={18} />
                    <span>
                      <strong>{account.label}</strong>
                      <small>Usar cuenta demo</small>
                    </span>
                  </button>
                );
              })}
            </div>
            <p className="demo-hint">
              <LockKeyhole size={14} />
              Contraseña para todas las cuentas: <code>Demo123!</code>
            </p>
          </div>
          )}
        </div>
      </section>
    </div>
  );
}
