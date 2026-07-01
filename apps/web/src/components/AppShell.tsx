import {
  BookOpenCheck,
  CircleCheck,
  KeyRound,
  LayoutDashboard,
  LogOut,
  Save,
  ShieldCheck,
  UserRound,
  UsersRound,
  X,
} from 'lucide-react';
import { FormEvent, ReactNode, useState } from 'react';
import { api } from '../lib/api';
import { User, UserRole } from '../types';
import { Brand } from './Brand';

const roleCopy: Record<
  UserRole,
  { label: string; area: string; icon: typeof UserRound }
> = {
  STUDENT: { label: 'Alumno', area: 'Mi espacio académico', icon: BookOpenCheck },
  TEACHER: { label: 'Docente', area: 'Gestión de grupos', icon: UserRound },
  ADMIN: { label: 'Administrativo', area: 'Control institucional', icon: ShieldCheck },
};

interface AppShellProps {
  user: User;
  token: string;
  onLogout: () => void;
  adminView?: 'dashboard' | 'users';
  onAdminViewChange?: (view: 'dashboard' | 'users') => void;
  children: ReactNode;
}

const initialPasswordForm = {
  currentPassword: '',
  newPassword: '',
  confirmPassword: '',
};

export function AppShell({
  user,
  token,
  onLogout,
  adminView = 'dashboard',
  onAdminViewChange,
  children,
}: AppShellProps) {
  const config = roleCopy[user.role];
  const RoleIcon = config.icon;
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState(initialPasswordForm);
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');
  const [passwordSuccess, setPasswordSuccess] = useState('');

  function openPasswordModal() {
    setPasswordForm(initialPasswordForm);
    setPasswordError('');
    setPasswordSuccess('');
    setShowPasswordModal(true);
  }

  function closePasswordModal() {
    setShowPasswordModal(false);
    setPasswordForm(initialPasswordForm);
    setPasswordError('');
    setPasswordSuccess('');
  }

  async function submitPasswordChange(event: FormEvent) {
    event.preventDefault();
    setPasswordError('');
    setPasswordSuccess('');

    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('La confirmación no coincide con la nueva contraseña.');
      return;
    }

    setSavingPassword(true);
    try {
      const response = await api.changePassword(
        {
          currentPassword: passwordForm.currentPassword,
          newPassword: passwordForm.newPassword,
        },
        token,
      );
      setPasswordForm(initialPasswordForm);
      setPasswordSuccess(response.message);
    } catch (requestError) {
      setPasswordError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cambiar la contraseña',
      );
    } finally {
      setSavingPassword(false);
    }
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Brand light />
        <div className="sidebar__context">
          <span>PERFIL ACTUAL</span>
          <div>
            <RoleIcon size={18} />
            <p>
              <strong>{config.label}</strong>
              <small>{config.area}</small>
            </p>
          </div>
        </div>
        <nav className="sidebar__nav">
          <button
            className={`sidebar__link ${
              adminView === 'dashboard' ? 'sidebar__link--active' : ''
            }`}
            onClick={() => onAdminViewChange?.('dashboard')}
          >
            <LayoutDashboard size={19} />
            Panel principal
          </button>
          {user.role === 'ADMIN' && (
            <button
              className={`sidebar__link ${
                adminView === 'users' ? 'sidebar__link--active' : ''
              }`}
              onClick={() => onAdminViewChange?.('users')}
            >
              <UsersRound size={19} />
              Gestión de usuarios
            </button>
          )}
          <button className="sidebar__link" onClick={openPasswordModal}>
            <KeyRound size={19} />
            Cambiar contraseña
          </button>
        </nav>
        <button className="sidebar__logout" onClick={onLogout}>
          <LogOut size={18} />
          Cerrar sesión
        </button>
      </aside>

      <main className="main-content">
        <header className="topbar">
          <Brand compact />
          <div className="topbar__actions">
            <div className="topbar__user">
              <div className="avatar">
                {user.firstName.charAt(0)}
                {user.lastName.charAt(0)}
              </div>
              <div>
                <strong>
                  {user.firstName} {user.lastName}
                </strong>
                <span>{config.label}</span>
              </div>
            </div>
            <button
              className="topbar__password"
              onClick={openPasswordModal}
              aria-label="Cambiar contraseña"
              title="Cambiar contraseña"
            >
              <KeyRound size={18} />
            </button>
            <button
              className="topbar__logout"
              onClick={onLogout}
              aria-label="Cerrar sesión"
              title="Cerrar sesión"
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>
        {user.role === 'ADMIN' && (
          <nav className="mobile-admin-nav">
            <button
              className={adminView === 'dashboard' ? 'is-active' : ''}
              onClick={() => onAdminViewChange?.('dashboard')}
            >
              <LayoutDashboard size={17} />
              Panel
            </button>
            <button
              className={adminView === 'users' ? 'is-active' : ''}
              onClick={() => onAdminViewChange?.('users')}
            >
              <UsersRound size={17} />
              Gestión de usuarios
            </button>
          </nav>
        )}
        <div className="page-content">{children}</div>
      </main>

      {showPasswordModal && (
        <div className="modal-backdrop" onMouseDown={closePasswordModal}>
          <form
            className="modal-card"
            onSubmit={submitPasswordChange}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">SEGURIDAD</span>
                <h2>Cambiar contraseña</h2>
              </div>
              <button type="button" onClick={closePasswordModal}>
                <X size={20} />
              </button>
            </div>

            <label className="field">
              <span>Contraseña actual</span>
              <input
                type="password"
                value={passwordForm.currentPassword}
                onChange={(event) =>
                  setPasswordForm({
                    ...passwordForm,
                    currentPassword: event.target.value,
                  })
                }
                autoComplete="current-password"
                required
              />
            </label>
            <label className="field">
              <span>Nueva contraseña</span>
              <input
                type="password"
                value={passwordForm.newPassword}
                onChange={(event) =>
                  setPasswordForm({
                    ...passwordForm,
                    newPassword: event.target.value,
                  })
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>
            <label className="field">
              <span>Confirmar nueva contraseña</span>
              <input
                type="password"
                value={passwordForm.confirmPassword}
                onChange={(event) =>
                  setPasswordForm({
                    ...passwordForm,
                    confirmPassword: event.target.value,
                  })
                }
                autoComplete="new-password"
                minLength={8}
                required
              />
            </label>

            {passwordError && <div className="form-error">{passwordError}</div>}
            {passwordSuccess && (
              <div className="alert alert--success">
                <CircleCheck size={18} />
                {passwordSuccess}
              </div>
            )}

            <div className="modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closePasswordModal}
              >
                Cancelar
              </button>
              <button
                className="button button--primary"
                disabled={savingPassword}
              >
                <Save size={17} />
                {savingPassword ? 'Guardando...' : 'Guardar contraseña'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
