import {
  Check,
  CircleCheck,
  Clipboard,
  CalendarPlus,
  Download,
  FolderTree,
  GraduationCap,
  KeyRound,
  Pencil,
  Save,
  Search,
  ShieldCheck,
  Trash2,
  UserPlus,
  UsersRound,
  X,
} from 'lucide-react';
import { FormEvent, useEffect, useState } from 'react';
import { api } from '../lib/api';
import { downloadTranscript } from '../lib/pdf';
import { AcademicStructure, AdminTranscript, AdminUser } from '../types';

interface AdminUserManagementProps {
  token: string;
}

interface CreatedAccount {
  user: AdminUser;
  credentials: {
    username: string;
    password: string;
  };
  email?: {
    delivered: boolean;
    error?: string;
  };
}

const initialForm = {
  username: '',
  firstName: '',
  lastName: '',
  email: '',
  role: 'STUDENT' as 'STUDENT' | 'TEACHER',
  careerId: '',
  cohortId: '',
};

const initialCohortForm = {
  careerName: '',
  cohortName: '',
  startsAt: '',
};

export function AdminUserManagement({
  token,
}: AdminUserManagementProps) {
  const [form, setForm] = useState(initialForm);
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [academicStructure, setAcademicStructure] = useState<AcademicStructure>({
    careers: [],
  });
  const [createdAccount, setCreatedAccount] =
    useState<CreatedAccount | null>(null);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [editingCareerId, setEditingCareerId] = useState('');
  const [deletingUser, setDeletingUser] = useState<AdminUser | null>(null);
  const [query, setQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'STUDENT' | 'TEACHER'>(
    'ALL',
  );
  const [statusFilter, setStatusFilter] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [careerFilter, setCareerFilter] = useState('ALL');
  const [cohortFilter, setCohortFilter] = useState('ALL');
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [cohortForm, setCohortForm] = useState(initialCohortForm);
  const [savingCohort, setSavingCohort] = useState(false);
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(false);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [savingUser, setSavingUser] = useState(false);
  const [downloadingTranscriptId, setDownloadingTranscriptId] = useState('');
  const [deleting, setDeleting] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([
      api.get<{ users: AdminUser[] }>('/admin/users', token),
      api.get<AcademicStructure>('/admin/academic-structure', token),
    ])
      .then(([userResponse, structureResponse]) => {
        setUsers(userResponse.users);
        setAcademicStructure(structureResponse);
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar los usuarios',
        ),
      )
      .finally(() => setLoadingUsers(false));
  }, [token]);

  async function createAccount(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    setCreatedAccount(null);

    try {
      const { careerId: _careerId, ...accountForm } = form;
      const response = await api.post<CreatedAccount>(
        '/admin/users',
        form.role === 'STUDENT'
          ? accountForm
          : { ...accountForm, cohortId: undefined },
        token,
      );
      setCreatedAccount(response);
      setUsers((current) => [response.user, ...current]);
      setForm((current) => ({
        ...initialForm,
        role: current.role,
      }));
      setSuccess(
        response.email?.delivered
          ? 'La cuenta fue creada y enviamos las credenciales al correo registrado.'
          : 'La cuenta fue creada. Configura SMTP para que las credenciales lleguen por correo.',
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible crear la cuenta',
      );
    } finally {
      setLoading(false);
    }
  }

  async function createCohort(event: FormEvent) {
    event.preventDefault();
    setSavingCohort(true);
    setError('');
    try {
      const created = await api.post<{
        id: string;
        name: string;
        startsAt: string;
        career: { id: string; name: string };
      }>('/admin/cohorts', cohortForm, token);
      const structure = await api.get<AcademicStructure>(
        '/admin/academic-structure',
        token,
      );
      setAcademicStructure(structure);
      setForm((current) =>
        current.role === 'STUDENT'
          ? { ...current, careerId: created.career.id, cohortId: created.id }
          : current,
      );
      setCohortForm(initialCohortForm);
      setShowCohortModal(false);
      setSuccess('La carrera y su generación quedaron disponibles.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible crear la generación',
      );
    } finally {
      setSavingCohort(false);
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    if (!editingUser) return;
    setSavingUser(true);
    setError('');

    try {
      const updated = await api.patch<AdminUser>(
        `/admin/users/${editingUser.id}`,
        {
          username: editingUser.username,
          firstName: editingUser.firstName,
          lastName: editingUser.lastName,
          email: editingUser.email,
          role: editingUser.role,
          active: editingUser.active,
          cohortId:
            editingUser.role === 'STUDENT'
              ? editingUser.cohort?.id
              : undefined,
        },
        token,
      );
      if (editingUser.role === 'STUDENT') {
        await api.patch(
          `/admin/users/${editingUser.id}/payment`,
          {
            status:
              editingUser.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          },
          token,
        );
      }
      const savedUser = {
        ...updated,
        paymentStatus: editingUser.paymentStatus,
      };
      setUsers((current) =>
        current.map((user) => (user.id === savedUser.id ? savedUser : user)),
      );
      closeEditingUser();
      setSuccess('Los datos y permisos del usuario fueron actualizados.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible actualizar el usuario',
      );
    } finally {
      setSavingUser(false);
    }
  }

  async function deleteUser() {
    if (!deletingUser) return;
    setDeleting(true);
    setError('');
    setSuccess('');

    try {
      await api.delete(`/admin/users/${deletingUser.id}`, token);
      setUsers((current) =>
        current.filter((user) => user.id !== deletingUser.id),
      );
      setDeletingUser(null);
      setSuccess('La cuenta fue eliminada correctamente.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible eliminar el usuario',
      );
      setDeletingUser(null);
    } finally {
      setDeleting(false);
    }
  }

  async function copyCredentials() {
    if (!createdAccount) return;
    const role =
      createdAccount.user.role === 'STUDENT' ? 'Alumno' : 'Docente';
    const credentials = [
      'Instituto Universitario Esparta',
      `Perfil: ${role}`,
      `Nombre: ${createdAccount.user.firstName} ${createdAccount.user.lastName}`,
      `Usuario: ${createdAccount.credentials.username}`,
      `Correo: ${createdAccount.user.email}`,
      `Contraseña inicial: ${createdAccount.credentials.password}`,
    ].join('\n');

    try {
      await navigator.clipboard.writeText(credentials);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setError(
        'No fue posible copiar automáticamente. Las credenciales siguen visibles.',
      );
    }
  }

  async function downloadStudentTranscript(account: AdminUser) {
    setDownloadingTranscriptId(account.id);
    setError('');

    try {
      const transcript = await api.get<AdminTranscript>(
        `/admin/users/${account.id}/transcript`,
        token,
      );
      if (!transcript.history.length) {
        setError('Este alumno todavía no tiene materias finalizadas para kárdex.');
        return;
      }
      await downloadTranscript(
        transcript.user,
        transcript.history,
        transcript.generalAverage,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible descargar el kárdex',
      );
    } finally {
      setDownloadingTranscriptId('');
    }
  }

  function startEditingUser(account: AdminUser) {
    setEditingUser({ ...account });
    setEditingCareerId(account.cohort?.career.id ?? '');
  }

  function closeEditingUser() {
    setEditingUser(null);
    setEditingCareerId('');
  }

  const filteredUsers = users.filter((user) => {
    const normalizedQuery = query.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      `${user.firstName} ${user.lastName}`
        .toLowerCase()
        .includes(normalizedQuery) ||
      user.email.toLowerCase().includes(normalizedQuery) ||
      user.username?.toLowerCase().includes(normalizedQuery);
    const matchesRole = roleFilter === 'ALL' || user.role === roleFilter;
    const matchesStatus =
      statusFilter === 'ALL' ||
      (statusFilter === 'ACTIVE' && user.active) ||
      (statusFilter === 'INACTIVE' && !user.active);
    const matchesCareer =
      careerFilter === 'ALL' || user.cohort?.career.id === careerFilter;
    const matchesCohort =
      cohortFilter === 'ALL' || user.cohort?.id === cohortFilter;
    return (
      matchesQuery &&
      matchesRole &&
      matchesStatus &&
      matchesCareer &&
      matchesCohort
    );
  });
  const hasDirectoryFilters =
    query.trim() !== '' ||
    roleFilter !== 'ALL' ||
    statusFilter !== 'ALL' ||
    careerFilter !== 'ALL' ||
    cohortFilter !== 'ALL';

  const availableCohorts = academicStructure.careers.flatMap((career) =>
    career.cohorts.map((cohort) => ({ ...cohort, career })),
  );
  const filteredCohorts =
    careerFilter === 'ALL'
      ? availableCohorts
      : availableCohorts.filter((cohort) => cohort.career.id === careerFilter);
  const selectedFormCareer = academicStructure.careers.find(
    (career) => career.id === form.careerId,
  );
  const formCohorts = selectedFormCareer?.cohorts ?? [];
  const selectedEditingCareer = academicStructure.careers.find(
    (career) => career.id === editingCareerId,
  );
  const editingCohorts = selectedEditingCareer?.cohorts ?? [];

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">GESTIÓN DE USUARIOS</span>
          <h1>Altas y directorio</h1>
          <p>
            Crea, consulta, modifica y elimina cuentas de alumnos y docentes.
          </p>
        </div>
        <div className="admin-access">
          <ShieldCheck size={20} />
          <span>
            <small>Institución</small>
            <strong>Universitario Esparta</strong>
          </span>
        </div>
      </section>

      {error && <div className="alert alert--error">{error}</div>}
      {success && (
        <div className="alert alert--success">
          <CircleCheck size={18} />
          {success}
          <button onClick={() => setSuccess('')} aria-label="Cerrar aviso">
            <X size={16} />
          </button>
        </div>
      )}

      <section className="user-management-layout">
        <form className="user-create-card" onSubmit={createAccount}>
          <div className="user-create-card__heading">
            <span className="stat-card__icon stat-card__icon--blue">
              <UserPlus size={22} />
            </span>
            <div>
              <h2>Crear nueva cuenta</h2>
              <p>
                Escribe la matrícula o usuario; la contraseña inicial sí se
                genera automáticamente.
              </p>
            </div>
          </div>

          <div className="account-role-selector">
            <button
              type="button"
              className={form.role === 'STUDENT' ? 'is-selected' : ''}
              onClick={() => setForm({ ...form, role: 'STUDENT' })}
            >
              <GraduationCap size={20} />
              <span>
                <strong>Alumno</strong>
                <small>Matrícula capturada manualmente</small>
              </span>
            </button>
            <button
              type="button"
              className={form.role === 'TEACHER' ? 'is-selected' : ''}
              onClick={() => setForm({ ...form, role: 'TEACHER' })}
            >
              <UsersRound size={20} />
              <span>
                <strong>Docente</strong>
                <small>Usuario capturado manualmente</small>
              </span>
            </button>
          </div>

          <label className="field">
            <span>{form.role === 'STUDENT' ? 'Matrícula' : 'Usuario'}</span>
            <input
              value={form.username}
              onChange={(event) =>
                setForm({ ...form, username: event.target.value })
              }
              placeholder={
                form.role === 'STUDENT' ? 'Ej. ESP-2026-0142' : 'Ej. MTRO-RUIZ'
              }
              required
            />
          </label>

          <div className="modal-form-grid">
            <label className="field">
              <span>Nombre</span>
              <input
                value={form.firstName}
                onChange={(event) =>
                  setForm({ ...form, firstName: event.target.value })
                }
                placeholder="Nombre"
                required
              />
            </label>
            <label className="field">
              <span>Apellidos</span>
              <input
                value={form.lastName}
                onChange={(event) =>
                  setForm({ ...form, lastName: event.target.value })
                }
                placeholder="Apellidos"
                required
              />
            </label>
          </div>

          <label className="field">
            <span>Correo electrónico</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) =>
                setForm({ ...form, email: event.target.value })
              }
              placeholder="nombre@esparta.edu.mx"
              required
            />
          </label>

          {form.role === 'STUDENT' && (
            <div className="academic-assignment-field academic-assignment-field--split">
              <label className="field">
                <span>Carrera</span>
                <select
                  value={form.careerId}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      careerId: event.target.value,
                      cohortId: '',
                    })
                  }
                  required
                >
                  <option value="">Selecciona una carrera</option>
                  {academicStructure.careers.map((career) => (
                    <option value={career.id} key={career.id}>
                      {career.name}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Generación</span>
                <select
                  value={form.cohortId}
                  onChange={(event) =>
                    setForm({ ...form, cohortId: event.target.value })
                  }
                  disabled={!form.careerId}
                  required
                >
                  <option value="">
                    {form.careerId
                      ? 'Selecciona una generación'
                      : 'Primero selecciona carrera'}
                  </option>
                  {formCohorts.map((cohort) => (
                    <option value={cohort.id} key={cohort.id}>
                      {cohort.name}
                    </option>
                  ))}
                </select>
              </label>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setShowCohortModal(true)}
              >
                <CalendarPlus size={17} />
                Nueva carrera y generación
              </button>
            </div>
          )}

          <div className="generated-user-hint">
            <KeyRound size={18} />
            <div>
              <strong>
                {form.role === 'STUDENT'
                  ? 'La matrícula será también el usuario'
                  : 'El usuario será el que escribiste'}
              </strong>
              <p>
                También podrá iniciar sesión con el correo electrónico
                registrado.
              </p>
            </div>
          </div>

          <button
            className="button button--primary button--wide"
            disabled={loading}
          >
            <UserPlus size={18} />
            {loading ? 'Creando cuenta...' : 'Crear cuenta y enviar credenciales'}
          </button>
        </form>

        <section className="credential-panel">
          {createdAccount ? (
            <>
              <div className="credential-panel__success">
                <span>
                  <Check size={24} />
                </span>
                <div>
                  <strong>Cuenta creada correctamente</strong>
                  <p>
                    El sistema intenta enviar las credenciales al correo
                    registrado. La contraseña solo se muestra en este momento.
                  </p>
                </div>
              </div>

              <div
                className={`credential-email-status ${
                  createdAccount.email?.delivered
                    ? 'credential-email-status--sent'
                    : ''
                }`}
              >
                {createdAccount.email?.delivered
                  ? 'Credenciales enviadas al correo registrado.'
                  : createdAccount.email?.error
                    ? `La cuenta se creó, pero no fue posible enviar el correo: ${createdAccount.email.error}`
                    : 'La cuenta se creó. Configura SMTP para enviar credenciales por correo; por ahora entrégalas manualmente.'}
              </div>

              <div className="credential-card">
                <div className="credential-card__brand">
                  <img
                    src="/instituto-esparta.jpg"
                    alt="Instituto Universitario Esparta"
                  />
                </div>
                <div className="credential-card__person">
                  <span>
                    {createdAccount.user.firstName.charAt(0)}
                    {createdAccount.user.lastName.charAt(0)}
                  </span>
                  <div>
                    <strong>
                      {createdAccount.user.firstName}{' '}
                      {createdAccount.user.lastName}
                    </strong>
                    <small>
                      {createdAccount.user.role === 'STUDENT'
                        ? 'Alumno'
                        : 'Docente'}
                    </small>
                  </div>
                </div>
                <dl className="credential-list">
                  <div>
                    <dt>
                      {createdAccount.user.role === 'STUDENT'
                        ? 'Matrícula / usuario'
                        : 'Usuario'}
                    </dt>
                    <dd>{createdAccount.credentials.username}</dd>
                  </div>
                  <div>
                    <dt>Contraseña inicial</dt>
                    <dd>{createdAccount.credentials.password}</dd>
                  </div>
                  <div>
                    <dt>Correo vinculado</dt>
                    <dd>{createdAccount.user.email}</dd>
                  </div>
                </dl>
              </div>

              <button
                className="button button--secondary button--wide"
                onClick={copyCredentials}
              >
                {copied ? <Check size={17} /> : <Clipboard size={17} />}
                {copied ? 'Credenciales copiadas' : 'Copiar credenciales'}
              </button>
            </>
          ) : (
            <div className="credential-empty">
              <span>
                <KeyRound size={30} />
              </span>
              <strong>Las credenciales aparecerán aquí</strong>
              <p>
                Al crear una cuenta podrás consultar el usuario, matrícula,
                correo y contraseña inicial.
              </p>
            </div>
          )}
        </section>
      </section>

      <section className="data-card user-directory-card">
        <div className="data-card__header">
          <div>
            <h2>Directorio de usuarios</h2>
            <p>Busca una cuenta para modificar sus datos, pago o acceso.</p>
          </div>
          <span className="directory-count">{filteredUsers.length} usuarios</span>
        </div>
        <div className="academic-structure-browser">
          <div className="academic-structure-browser__heading">
            <div>
              <FolderTree size={18} />
              <span>
                <strong>Carreras y generaciones</strong>
                <small>Selecciona una generación para ver a sus alumnos.</small>
              </span>
            </div>
            <button
              className="button button--secondary"
              onClick={() => setShowCohortModal(true)}
            >
              <CalendarPlus size={16} />
              Nueva carrera y generación
            </button>
          </div>
          <div className="career-browser-grid">
            {academicStructure.careers.map((career) => (
              <article key={career.id}>
                <button
                  className="career-browser-title"
                  onClick={() => {
                    setRoleFilter('STUDENT');
                    setCareerFilter(career.id);
                    setCohortFilter('ALL');
                  }}
                >
                  <GraduationCap size={17} />
                  <span>
                    <strong>{career.name}</strong>
                    <small>{career.cohorts.length} generaciones</small>
                  </span>
                </button>
                <div className="cohort-chip-list">
                  {career.cohorts.map((cohort) => (
                    <button
                      key={cohort.id}
                      className={cohortFilter === cohort.id ? 'is-selected' : ''}
                      onClick={() => {
                        setRoleFilter('STUDENT');
                        setCareerFilter(career.id);
                        setCohortFilter(cohort.id);
                      }}
                    >
                      <span>{cohort.name}</span>
                      <strong>{cohort.studentCount}</strong>
                    </button>
                  ))}
                </div>
              </article>
            ))}
            {!academicStructure.careers.length && (
              <div className="directory-empty">
                Crea la primera carrera y generación para organizar alumnos.
              </div>
            )}
          </div>
        </div>
        <div className="directory-toolbar directory-toolbar--page">
          <label>
            <Search size={17} />
            <input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder="Buscar por nombre, matrícula, usuario o correo"
            />
          </label>
          <select
            value={roleFilter}
            onChange={(event) =>
              setRoleFilter(
                event.target.value as 'ALL' | 'STUDENT' | 'TEACHER',
              )
            }
          >
            <option value="ALL">Alumnos y docentes</option>
            <option value="STUDENT">Solo alumnos</option>
            <option value="TEACHER">Solo docentes</option>
          </select>
          <select
            value={statusFilter}
            onChange={(event) =>
              setStatusFilter(
                event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE',
              )
            }
          >
            <option value="ALL">Todos los accesos</option>
            <option value="ACTIVE">Activos</option>
            <option value="INACTIVE">Inactivos</option>
          </select>
          <select
            value={careerFilter}
            onChange={(event) => {
              setCareerFilter(event.target.value);
              setCohortFilter('ALL');
              if (event.target.value !== 'ALL') setRoleFilter('STUDENT');
            }}
            aria-label="Filtrar por carrera"
          >
            <option value="ALL">Todas las carreras</option>
            {academicStructure.careers.map((career) => (
              <option key={career.id} value={career.id}>
                {career.name}
              </option>
            ))}
          </select>
          <select
            value={cohortFilter}
            onChange={(event) => {
              setCohortFilter(event.target.value);
              if (event.target.value !== 'ALL') setRoleFilter('STUDENT');
            }}
            aria-label="Filtrar por generación"
          >
            <option value="ALL">Todas las generaciones</option>
            {filteredCohorts.map((cohort) => (
              <option key={cohort.id} value={cohort.id}>
                {cohort.career.name} · {cohort.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            className="button button--secondary directory-toolbar__clear"
            onClick={() => {
              setQuery('');
              setRoleFilter('ALL');
              setStatusFilter('ALL');
              setCareerFilter('ALL');
              setCohortFilter('ALL');
            }}
            disabled={!hasDirectoryFilters}
          >
            <X size={17} />
            Limpiar
          </button>
        </div>

        {loadingUsers ? (
          <div className="directory-empty">Cargando usuarios...</div>
        ) : filteredUsers.length ? (
          <div className="directory-list directory-list--page">
            {filteredUsers.map((account) => (
              <article key={account.id}>
                <div className="student-cell">
                  <span>
                    {account.firstName.charAt(0)}
                    {account.lastName.charAt(0)}
                  </span>
                  <div>
                    <strong>
                      {account.firstName} {account.lastName}
                    </strong>
                    <small>
                      {account.username} · {account.email}
                    </small>
                    {account.cohort && (
                      <small className="academic-user-meta">
                        {account.cohort.career.name} · {account.cohort.name}
                      </small>
                    )}
                  </div>
                </div>
                <span
                  className={`role-badge ${
                    account.role === 'STUDENT'
                      ? 'role-student'
                      : 'role-teacher'
                  }`}
                >
                  {account.role === 'STUDENT' ? 'Alumno' : 'Docente'}
                </span>
                <span
                  className={`status-dot ${
                    account.active ? 'status-dot--active' : ''
                  }`}
                >
                  {account.active ? 'Activo' : 'Inactivo'}
                </span>
                <div className="directory-actions">
                  {account.role === 'STUDENT' && (
                    <button
                      className="icon-button"
                      onClick={() => void downloadStudentTranscript(account)}
                      disabled={downloadingTranscriptId === account.id}
                      title="Descargar kárdex"
                    >
                      <Download size={17} />
                    </button>
                  )}
                  <button
                    className="icon-button"
                    onClick={() => startEditingUser(account)}
                    title="Editar usuario"
                  >
                    <Pencil size={17} />
                  </button>
                  <button
                    className="icon-button icon-button--danger"
                    onClick={() => setDeletingUser(account)}
                    title="Eliminar usuario"
                  >
                    <Trash2 size={17} />
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="directory-empty">
            No hay usuarios que coincidan con los filtros.
          </div>
        )}
      </section>

      {editingUser && (
        <div className="modal-backdrop" onMouseDown={closeEditingUser}>
          <form
            className="modal-card"
            onSubmit={saveUser}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">MODIFICAR USUARIO</span>
                <h2>Datos, pago y acceso</h2>
              </div>
              <button type="button" onClick={closeEditingUser}>
                <X size={20} />
              </button>
            </div>
            <label className="field">
              <span>
                {editingUser.role === 'STUDENT' ? 'Matrícula' : 'Usuario'}
              </span>
              <input
                value={editingUser.username ?? ''}
                onChange={(event) =>
                  setEditingUser({
                    ...editingUser,
                    username: event.target.value,
                  })
                }
                required
              />
            </label>
            <div className="modal-form-grid">
              <label className="field">
                <span>Nombre</span>
                <input
                  value={editingUser.firstName}
                  onChange={(event) =>
                    setEditingUser({
                      ...editingUser,
                      firstName: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Apellidos</span>
                <input
                  value={editingUser.lastName}
                  onChange={(event) =>
                    setEditingUser({
                      ...editingUser,
                      lastName: event.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>
            <label className="field">
              <span>Correo electrónico</span>
              <input
                type="email"
                value={editingUser.email}
                onChange={(event) =>
                  setEditingUser({ ...editingUser, email: event.target.value })
                }
                required
              />
            </label>
            {editingUser.role === 'STUDENT' && (
              <div className="modal-form-grid">
                <label className="field">
                  <span>Carrera</span>
                  <select
                    value={editingCareerId}
                    onChange={(event) => {
                      setEditingCareerId(event.target.value);
                      setEditingUser({ ...editingUser, cohort: null });
                    }}
                    required
                  >
                    <option value="">Selecciona una carrera</option>
                    {academicStructure.careers.map((career) => (
                      <option value={career.id} key={career.id}>
                        {career.name}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="field">
                  <span>Generación</span>
                  <select
                    value={editingUser.cohort?.id ?? ''}
                    onChange={(event) => {
                      const selected = editingCohorts.find(
                        (cohort) => cohort.id === event.target.value,
                      );
                      if (!selected || !selectedEditingCareer) {
                        setEditingUser({ ...editingUser, cohort: null });
                        return;
                      }
                      setEditingUser({
                        ...editingUser,
                        cohort: {
                          id: selected.id,
                          name: selected.name,
                          startsAt: selected.startsAt,
                          career: {
                            id: selectedEditingCareer.id,
                            name: selectedEditingCareer.name,
                          },
                        },
                      });
                    }}
                    disabled={!editingCareerId}
                    required
                  >
                    <option value="">
                      {editingCareerId
                        ? 'Selecciona una generación'
                        : 'Primero selecciona carrera'}
                    </option>
                    {editingCohorts.map((cohort) => (
                      <option value={cohort.id} key={cohort.id}>
                        {cohort.name}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
            <label className="toggle-row">
              <span>
                <strong>Acceso activo</strong>
                <small>Permite iniciar sesión en la plataforma.</small>
              </span>
              <input
                type="checkbox"
                checked={editingUser.active}
                onChange={(event) =>
                  setEditingUser({
                    ...editingUser,
                    active: event.target.checked,
                  })
                }
              />
            </label>
            {editingUser.role === 'STUDENT' && (
              <label className="toggle-row">
                <span>
                  <strong>Pago al corriente</strong>
                  <small>
                    Habilita las calificaciones de sus materias inscritas.
                  </small>
                </span>
                <input
                  type="checkbox"
                  checked={editingUser.paymentStatus === 'PAID'}
                  onChange={(event) =>
                    setEditingUser({
                      ...editingUser,
                      paymentStatus: event.target.checked ? 'PAID' : 'PENDING',
                    })
                  }
                />
              </label>
            )}
            <div className="modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={closeEditingUser}
              >
                Cancelar
              </button>
              <button className="button button--primary" disabled={savingUser}>
                <Save size={17} />
                {savingUser ? 'Guardando...' : 'Guardar cambios'}
              </button>
            </div>
          </form>
        </div>
      )}

      {showCohortModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowCohortModal(false)}
        >
          <form
            className="modal-card"
            onSubmit={createCohort}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">ESTRUCTURA ACADÉMICA</span>
                <h2>Nueva carrera y generación</h2>
              </div>
              <button type="button" onClick={() => setShowCohortModal(false)}>
                <X size={20} />
              </button>
            </div>
            <div className="academic-structure-help">
              Si la carrera ya existe, escribe exactamente el mismo nombre y
              solo se añadirá la nueva generación.
            </div>
            <label className="field">
              <span>Nombre de la carrera</span>
              <input
                value={cohortForm.careerName}
                onChange={(event) =>
                  setCohortForm({
                    ...cohortForm,
                    careerName: event.target.value,
                  })
                }
                placeholder="Ej. Derecho"
                required
              />
            </label>
            <label className="field">
              <span>Nombre de la generación</span>
              <input
                value={cohortForm.cohortName}
                onChange={(event) =>
                  setCohortForm({
                    ...cohortForm,
                    cohortName: event.target.value,
                  })
                }
                placeholder="Ej. Septiembre 2026"
                required
              />
            </label>
            <label className="field">
              <span>Fecha de ingreso</span>
              <input
                type="date"
                value={cohortForm.startsAt}
                onChange={(event) =>
                  setCohortForm({ ...cohortForm, startsAt: event.target.value })
                }
                required
              />
            </label>
            <div className="modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setShowCohortModal(false)}
              >
                Cancelar
              </button>
              <button
                className="button button--primary"
                disabled={savingCohort}
              >
                <CalendarPlus size={17} />
                {savingCohort ? 'Guardando...' : 'Guardar generación'}
              </button>
            </div>
          </form>
        </div>
      )}

      {deletingUser && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setDeletingUser(null)}
        >
          <section
            className="modal-card delete-confirmation"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <span className="delete-confirmation__icon">
              <Trash2 size={24} />
            </span>
            <h2>Eliminar usuario</h2>
            <p>
              Se eliminará la cuenta de {deletingUser.firstName}{' '}
              {deletingUser.lastName}. Esta acción no se puede deshacer.
            </p>
            {deletingUser.role === 'TEACHER' && (
              <div className="delete-confirmation__notice">
                Si este docente está asignado a una materia, primero cambia el
                maestro responsable desde Materias y después elimínalo.
              </div>
            )}
            <div className="modal-actions">
              <button
                className="button button--secondary"
                onClick={() => setDeletingUser(null)}
              >
                Cancelar
              </button>
              <button
                className="button button--danger"
                onClick={() => void deleteUser()}
                disabled={deleting}
              >
                <Trash2 size={17} />
                {deleting ? 'Eliminando...' : 'Eliminar cuenta'}
              </button>
            </div>
          </section>
        </div>
      )}
    </>
  );
}
