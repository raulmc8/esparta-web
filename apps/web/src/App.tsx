import { useState } from 'react';
import { AppShell } from './components/AppShell';
import { AdminDashboard } from './pages/AdminDashboard';
import { AdminUserManagement } from './pages/AdminUserManagement';
import { LoginPage } from './pages/LoginPage';
import { StudentDashboard } from './pages/StudentDashboard';
import { TeacherDashboard } from './pages/TeacherDashboard';
import { Session } from './types';

const SESSION_KEY = 'esparta-session';

function readSession(): Session | null {
  try {
    const stored = window.localStorage.getItem(SESSION_KEY);
    return stored ? (JSON.parse(stored) as Session) : null;
  } catch {
    return null;
  }
}

export default function App() {
  const [session, setSession] = useState<Session | null>(readSession);
  const [adminView, setAdminView] = useState<'dashboard' | 'users'>(
    'dashboard',
  );

  function handleLogin(nextSession: Session) {
    window.localStorage.setItem(SESSION_KEY, JSON.stringify(nextSession));
    setSession(nextSession);
  }

  function handleLogout() {
    window.localStorage.removeItem(SESSION_KEY);
    setSession(null);
    setAdminView('dashboard');
  }

  if (!session) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <AppShell
      user={session.user}
      token={session.accessToken}
      onLogout={handleLogout}
      adminView={adminView}
      onAdminViewChange={setAdminView}
    >
      {session.user.role === 'STUDENT' && (
        <StudentDashboard token={session.accessToken} user={session.user} />
      )}
      {session.user.role === 'TEACHER' && (
        <TeacherDashboard token={session.accessToken} user={session.user} />
      )}
      {session.user.role === 'ADMIN' && adminView === 'dashboard' && (
        <AdminDashboard token={session.accessToken} user={session.user} />
      )}
      {session.user.role === 'ADMIN' && adminView === 'users' && (
        <AdminUserManagement token={session.accessToken} />
      )}
    </AppShell>
  );
}
