import {
  BadgeCheck,
  BookOpen,
  CalendarDays,
  GraduationCap,
  History,
  LockKeyhole,
  TrendingUp,
  WalletCards,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { LoadingState } from '../components/LoadingState';
import { api } from '../lib/api';
import { StudentCourse, User } from '../types';

interface StudentDashboardProps {
  token: string;
  user: User;
}

interface StudentData {
  currentCourses: StudentCourse[];
  history: StudentCourse[];
}

function formatCourseDates(course: StudentCourse) {
  const formatter = new Intl.DateTimeFormat('es-MX', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
  return `${formatter.format(new Date(course.startsAt))} al ${formatter.format(
    new Date(course.endsAt),
  )}`;
}

function CourseCard({
  item,
  index,
  historical = false,
}: {
  item: StudentCourse;
  index: number;
  historical?: boolean;
}) {
  return (
    <article
      className={`course-card ${historical ? 'course-card--history' : ''}`}
      key={item.enrollmentId}
    >
      <div className={`course-card__accent accent-${(index % 3) + 1}`} />
      <div className="course-card__header">
        <span className="course-code">{item.course.code}</span>
        <span className="course-credits">
          {historical ? 'Finalizada' : 'En curso'}
        </span>
      </div>
      <h3>{item.course.name}</h3>
      <p className="course-teacher">
        <GraduationCap size={17} />
        {item.teacher} · Grupo {item.section}
      </p>
      <p className="course-dates">
        <CalendarDays size={15} />
        {formatCourseDates(item)}
      </p>

      {item.canViewGrades && item.grades ? (
        <>
          <div className="grade-summary">
            <div>
              <span>Calificación final</span>
              <strong>{item.grades.finalGrade ?? '—'}</strong>
            </div>
            <span
              className={`grade-badge ${
                (item.grades.finalGrade ?? 0) >= 70
                  ? 'grade-badge--good'
                  : 'grade-badge--warning'
              }`}
            >
              {(item.grades.finalGrade ?? 0) >= 70 ? 'Aprobatoria' : 'En riesgo'}
            </span>
          </div>
        </>
      ) : (
        <div className="grades-locked">
          <span>
            <LockKeyhole size={22} />
          </span>
          <div>
            <strong>Calificaciones no disponibles</strong>
            <p>Se requiere pago confirmado para consultar resultados.</p>
          </div>
        </div>
      )}
    </article>
  );
}

export function StudentDashboard({ token, user }: StudentDashboardProps) {
  const [data, setData] = useState<StudentData>({
    currentCourses: [],
    history: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .get<StudentData>('/student/dashboard', token)
      .then(setData)
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar tus materias',
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  if (loading) {
    return <LoadingState label="Preparando tu información académica" />;
  }

  const allCourses = [...data.currentCourses, ...data.history];
  const visibleGrades = data.history
    .map((course) => course.grades?.finalGrade)
    .filter((grade): grade is number => grade !== null && grade !== undefined);
  const generalAverage = visibleGrades.length
    ? (
        visibleGrades.reduce((total, grade) => total + grade, 0) /
        visibleGrades.length
      ).toFixed(1)
    : '—';
  const payment = allCourses[0]?.payment;
  const paymentIsCurrent = payment?.status === 'PAID';

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">PANEL DEL ALUMNO</span>
          <h1>Hola, {user.firstName}</h1>
          <p>Consulta tu materia del mes y el historial de cursos anteriores.</p>
        </div>
        <div className="period-pill">
          <CalendarDays size={18} />
          <span>
            <small>Mes académico</small>
            <strong>
              {data.currentCourses[0]
                ? new Intl.DateTimeFormat('es-MX', {
                  month: 'long',
                  year: 'numeric',
                  timeZone: 'UTC',
                }).format(new Date(data.currentCourses[0].startsAt))
                : 'Sin materia vigente'}
            </strong>
          </span>
        </div>
      </section>

      {error && <div className="alert alert--error">{error}</div>}

      <section className="stats-grid">
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--blue">
            <BookOpen size={22} />
          </span>
          <div>
            <span>Materias en curso</span>
            <strong>{data.currentCourses.length}</strong>
            <small>Vigentes este mes</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--green">
            <TrendingUp size={22} />
          </span>
          <div>
            <span>Promedio general</span>
            <strong>{generalAverage}</strong>
            <small>Materias cursadas</small>
          </div>
        </article>
        <article className="stat-card">
          <span className="stat-card__icon stat-card__icon--amber">
            <WalletCards size={22} />
          </span>
          <div>
            <span>Estado de cuenta</span>
            <strong className="stat-card__status">
              {paymentIsCurrent ? 'Al corriente' : 'Pago pendiente'}
            </strong>
            <small>
              {payment
                ? `$${payment.amount.toLocaleString('es-MX')} MXN`
                : 'Sin registro'}
            </small>
          </div>
        </article>
      </section>

      <section
        className={`payment-banner ${
          paymentIsCurrent ? 'payment-banner--paid' : 'payment-banner--pending'
        }`}
      >
        <span>
          {paymentIsCurrent ? <BadgeCheck size={24} /> : <LockKeyhole size={24} />}
        </span>
        <div>
          <strong>
            {paymentIsCurrent
              ? 'Tu pago está confirmado'
              : 'Tus calificaciones están protegidas'}
          </strong>
          <p>
            {paymentIsCurrent
              ? 'Puedes consultar las calificaciones de la materia actual y tu historial.'
              : 'Cuando administración confirme tu pago, se habilitarán tus resultados actuales e históricos.'}
          </p>
        </div>
      </section>

      <section className="section-heading">
        <div>
          <h2>Materia en curso</h2>
          <p>La materia asignada para el mes actual.</p>
        </div>
        <span>{data.currentCourses.length} vigentes</span>
      </section>

      {data.currentCourses.length ? (
        <div className="course-grid course-grid--current">
          {data.currentCourses.map((item, index) => (
            <CourseCard item={item} index={index} key={item.enrollmentId} />
          ))}
        </div>
      ) : (
        <div className="academic-empty-state">
          <BookOpen size={28} />
          <strong>No tienes una materia en curso</strong>
          <p>Cuando administración te asigne el siguiente curso aparecerá aquí.</p>
        </div>
      )}

      <section className="section-heading history-heading">
        <div>
          <h2>Historial académico</h2>
          <p>Materias finalizadas y calificaciones obtenidas.</p>
        </div>
        <span>
          <History size={15} />
          {data.history.length} materias
        </span>
      </section>

      {data.history.length ? (
        <div className="course-grid">
          {data.history.map((item, index) => (
            <CourseCard
              item={item}
              index={index}
              historical
              key={item.enrollmentId}
            />
          ))}
        </div>
      ) : (
        <div className="academic-empty-state">
          <History size={28} />
          <strong>Aún no tienes materias históricas</strong>
          <p>Los cursos aparecerán aquí al concluir su periodo mensual.</p>
        </div>
      )}
    </>
  );
}
