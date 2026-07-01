import {
  BookOpen,
  Check,
  ClipboardCheck,
  Download,
  Save,
  Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingState } from '../components/LoadingState';
import { api } from '../lib/api';
import { downloadOfferingReport } from '../lib/pdf';
import { TeacherOffering, User } from '../types';

interface TeacherDashboardProps {
  token: string;
  user: User;
}

type GradeDraft = {
  finalGrade: number | '';
};

function draftFromOfferings(offerings: TeacherOffering[]) {
  return offerings.reduce<Record<string, GradeDraft>>((drafts, offering) => {
    offering.students.forEach((student) => {
      drafts[student.enrollmentId] = {
        finalGrade: student.grades.finalGrade ?? '',
      };
    });
    return drafts;
  }, {});
}

export function TeacherDashboard({ token, user }: TeacherDashboardProps) {
  const [offerings, setOfferings] = useState<TeacherOffering[]>([]);
  const [selectedId, setSelectedId] = useState('');
  const [drafts, setDrafts] = useState<Record<string, GradeDraft>>({});
  const [savingId, setSavingId] = useState('');
  const [savedId, setSavedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<{ offerings: TeacherOffering[] }>('/teacher/dashboard', token)
      .then((response) => {
        setOfferings(response.offerings);
        setSelectedId(response.offerings[0]?.id || '');
        setDrafts(draftFromOfferings(response.offerings));
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar tus grupos',
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <LoadingState label="Cargando tus grupos y alumnos" />;
  }

  const selectedOffering =
    offerings.find((offering) => offering.id === selectedId) || offerings[0];
  const totalStudents = new Set(
    offerings.flatMap((offering) =>
      offering.students.map((student) => student.student.id),
    ),
  ).size;

  function updateDraft(
    enrollmentId: string,
    field: keyof GradeDraft,
    value: string,
  ) {
    const parsedValue = value === '' ? '' : Number(value);
    setDrafts((current) => ({
      ...current,
      [enrollmentId]: {
        ...current[enrollmentId],
        [field]: parsedValue,
      },
    }));
  }

  async function saveGrade(enrollmentId: string) {
    const draft = drafts[enrollmentId];
    if (!draft) return;

    setSavingId(enrollmentId);
    setSavedId('');
    setError('');

    const payload = Object.fromEntries(
      Object.entries(draft).filter(([, value]) => value !== ''),
    );

    try {
      const saved = await api.patch<TeacherOffering['students'][number]['grades']>(
        `/teacher/enrollments/${enrollmentId}/grade`,
        payload,
        token,
      );
      setOfferings((current) =>
        current.map((offering) => ({
          ...offering,
          students: offering.students.map((student) =>
            student.enrollmentId === enrollmentId
              ? { ...student, grades: saved }
              : student,
          ),
        })),
      );
      setSavedId(enrollmentId);
      window.setTimeout(() => setSavedId(''), 1800);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible guardar la calificación',
      );
    } finally {
      setSavingId('');
    }
  }

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">PANEL DOCENTE</span>
          <h1>Hola, {user.firstName}</h1>
          <p>Administra las materias mensuales que tienes vigentes.</p>
        </div>
        <div className="period-pill">
          <ClipboardCheck size={18} />
          <span>
            <small>Periodo actual</small>
            <strong>
              {selectedOffering
                ? new Intl.DateTimeFormat('es-MX', {
                    month: 'long',
                    year: 'numeric',
                    timeZone: 'UTC',
                  }).format(new Date(selectedOffering.startsAt))
                : 'Sin materia vigente'}
            </strong>
          </span>
        </div>
      </section>

      {error && <div className="alert alert--error">{error}</div>}

      <section className="stats-grid stats-grid--teacher">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--blue">
            <BookOpen size={22} />
          </span>
          <div>
            <span>Materias activas</span>
            <strong>{offerings.length}</strong>
            <small>Durante el mes actual</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--green">
            <Users size={22} />
          </span>
          <div>
            <span>Alumnos distintos</span>
            <strong>{totalStudents}</strong>
            <small>En todos tus grupos</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--purple">
            <ClipboardCheck size={22} />
          </span>
          <div>
            <span>Capturas registradas</span>
            <strong>
              {offerings.reduce(
                (total, offering) =>
                  total +
                  offering.students.filter(
                    (student) => student.grades.finalGrade !== null,
                  ).length,
                0,
              )}
            </strong>
            <small>Alumnos con evaluación</small>
          </div>
        </article>
      </section>

      <section className="section-heading">
        <div>
          <h2>Mis grupos</h2>
          <p>Selecciona una materia vigente para revisar su lista.</p>
        </div>
      </section>

      <div className="offering-tabs">
        {offerings.map((offering) => (
          <button
            key={offering.id}
            className={offering.id === selectedOffering?.id ? 'is-active' : ''}
            onClick={() => setSelectedId(offering.id)}
          >
            <span>{offering.course.code}</span>
            <strong>{offering.course.name}</strong>
            <small>
              Grupo {offering.section} · {offering.students.length} alumnos ·{' '}
              {new Date(offering.endsAt).toLocaleDateString('es-MX', {
                day: 'numeric',
                month: 'short',
                timeZone: 'UTC',
              })}
            </small>
          </button>
        ))}
      </div>

      {selectedOffering && (
        <section className="data-card">
          <div className="data-card__header">
            <div>
              <span className="course-code">{selectedOffering.course.code}</span>
              <h2>{selectedOffering.course.name}</h2>
              <p>
                Grupo {selectedOffering.section} · {selectedOffering.term}
              </p>
            </div>
            <div className="data-card__actions">
              <span className="student-count">
                <Users size={17} />
                {selectedOffering.students.length} alumnos
              </span>
              <button
                className="button button--secondary"
                onClick={() =>
                  void downloadOfferingReport({
                    ...selectedOffering,
                    teacher: {
                      name: `${user.firstName} ${user.lastName}`,
                    },
                  })
                }
              >
                <Download size={17} />
                Descargar lista
              </button>
            </div>
          </div>

          <div className="table-scroll">
            <table className="grade-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Calificación final</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {selectedOffering.students.map((student) => {
                  const draft = drafts[student.enrollmentId];
                  return (
                    <tr key={student.enrollmentId}>
                      <td>
                        <div className="student-cell">
                          <span>{student.student.name.charAt(0)}</span>
                          <div>
                            <strong>{student.student.name}</strong>
                            <small>{student.student.email}</small>
                          </div>
                        </div>
                      </td>
                      <td>
                        <input
                          className="grade-input"
                          type="number"
                          min="0"
                          max="100"
                          value={draft?.finalGrade ?? ''}
                          onChange={(event) =>
                            updateDraft(
                              student.enrollmentId,
                              'finalGrade',
                              event.target.value,
                            )
                          }
                          aria-label={`Calificación final de ${student.student.name}`}
                        />
                      </td>
                      <td>
                        <button
                          className={`icon-button ${
                            savedId === student.enrollmentId
                              ? 'icon-button--saved'
                              : ''
                          }`}
                          onClick={() => saveGrade(student.enrollmentId)}
                          disabled={savingId === student.enrollmentId}
                          title="Guardar calificaciones"
                        >
                          {savedId === student.enrollmentId ? (
                            <Check size={18} />
                          ) : (
                            <Save size={18} />
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {!selectedOffering && (
        <div className="academic-empty-state">
          <BookOpen size={28} />
          <strong>No tienes materias vigentes este mes</strong>
          <p>Las nuevas asignaciones de administración aparecerán aquí.</p>
        </div>
      )}
    </>
  );
}
