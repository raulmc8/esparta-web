import {
  BookOpen,
  BookPlus,
  CalendarDays,
  CalendarPlus,
  Check,
  CircleCheck,
  Download,
  Eye,
  EyeOff,
  Pencil,
  Plus,
  ReceiptText,
  Save,
  Search,
  UserCog,
  UserPlus,
  Users,
  WalletCards,
  GraduationCap,
  X,
  Trash2,
} from 'lucide-react';
import { FormEvent, useEffect, useRef, useState } from 'react';
import { LoadingState } from '../components/LoadingState';
import { api } from '../lib/api';
import { downloadOfferingReport, downloadTranscript } from '../lib/pdf';
import {
  AdminOffering,
  AdminPayment,
  AdminTranscript,
  AdminUser,
  AcademicStructure,
  PaymentStatus,
  User,
} from '../types';

interface AdminDashboardProps {
  token: string;
  user: User;
}

interface AdminData {
  metrics: {
    students: number;
    teachers: number;
    activeCourses: number;
    enrollments: number;
    collected: number;
    pendingPayments: number;
    careers: number;
  };
  teachers: AdminUser[];
  offerings: AdminOffering[];
  payments: AdminPayment[];
  paymentStudents: { id: string; name: string; email: string }[];
  terms: { id: string; name: string; startsAt: string; endsAt: string }[];
}

interface CourseForm {
  courseCode: string;
  courseName: string;
  section: string;
  teacherId: string;
  startsAt: string;
  endsAt: string;
  careerId: string;
  cohortId: string;
  quadrimester: number;
}

const paymentLabels: Record<PaymentStatus, string> = {
  PAID: 'Pagado',
  PENDING: 'Pendiente',
  OVERDUE: 'Vencido',
};

const stageLabels = {
  ACTIVE: 'En curso',
  UPCOMING: 'Próxima',
  COMPLETED: 'Finalizada',
};

function formatDateInput(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getMonthlyDefaults(): CourseForm {
  const now = new Date();
  const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
  const lastDay = new Date(now.getFullYear(), now.getMonth() + 1, 0);
  const month = new Intl.DateTimeFormat('es-MX', { month: 'short' })
    .format(now)
    .replace('.', '')
    .toUpperCase();

  return {
    courseCode: '',
    courseName: '',
    section: `${month}-01`,
    teacherId: '',
    startsAt: formatDateInput(firstDay),
    endsAt: formatDateInput(lastDay),
    careerId: '',
    cohortId: '',
    quadrimester: 1,
  };
}

const initialCohortForm = {
  careerName: '',
  cohortName: '',
  startsAt: '',
};

export function AdminDashboard({ token, user }: AdminDashboardProps) {
  const [data, setData] = useState<AdminData | null>(null);
  const [activeTab, setActiveTab] = useState<
    'students' | 'offerings' | 'payments'
  >('students');
  const [studentQuery, setStudentQuery] = useState('');
  const [studentResults, setStudentResults] = useState<AdminUser[]>([]);
  const [hasSearchedStudents, setHasSearchedStudents] = useState(false);
  const [searchingStudents, setSearchingStudents] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [directoryRole, setDirectoryRole] = useState<
    'STUDENT' | 'TEACHER' | null
  >(null);
  const [directoryUsers, setDirectoryUsers] = useState<AdminUser[]>([]);
  const [directoryQuery, setDirectoryQuery] = useState('');
  const [directoryStatus, setDirectoryStatus] = useState<
    'ALL' | 'ACTIVE' | 'INACTIVE'
  >('ALL');
  const [directoryLoading, setDirectoryLoading] = useState(false);
  const [showOfferingModal, setShowOfferingModal] = useState(false);
  const [showCohortModal, setShowCohortModal] = useState(false);
  const [showCareersModal, setShowCareersModal] = useState(false);
  const [careers, setCareers] = useState<AcademicStructure['careers']>([]);
  const [editingCareerId, setEditingCareerId] = useState('');
  const [careerName, setCareerName] = useState('');
  const [loadingCareers, setLoadingCareers] = useState(false);
  const [savingCareer, setSavingCareer] = useState('');
  const [editingCohortId, setEditingCohortId] = useState('');
  const [cohortEditName, setCohortEditName] = useState('');
  const [cohortEditStartsAt, setCohortEditStartsAt] = useState('');
  const [selectedOffering, setSelectedOffering] =
    useState<AdminOffering | null>(null);
  const [courseForm, setCourseForm] = useState<CourseForm>(
    getMonthlyDefaults,
  );
  const [cohortForm, setCohortForm] = useState(initialCohortForm);
  const [assignmentQuery, setAssignmentQuery] = useState('');
  const [assignmentResults, setAssignmentResults] = useState<AdminUser[]>([]);
  const [selectedStudents, setSelectedStudents] = useState<AdminUser[]>([]);
  const [creatingOffering, setCreatingOffering] = useState(false);
  const [savingCohort, setSavingCohort] = useState(false);
  const [savingPayment, setSavingPayment] = useState('');
  const [savedPayment, setSavedPayment] = useState('');
  const [paymentQuery, setPaymentQuery] = useState('');
  const [offeringQuery, setOfferingQuery] = useState('');
  const [offeringYear, setOfferingYear] = useState('ALL');
  const [offeringMonth, setOfferingMonth] = useState('ALL');
  const [offeringCareer, setOfferingCareer] = useState('ALL');
  const [offeringCohort, setOfferingCohort] = useState('ALL');
  const [offeringQuadrimester, setOfferingQuadrimester] = useState('ALL');
  const [paymentStudentId, setPaymentStudentId] = useState('');
  const [newPaymentStudentId, setNewPaymentStudentId] = useState('');
  const [newPaymentPeriod, setNewPaymentPeriod] = useState(formatDateInput(new Date()).slice(0, 7));
  const [showPaymentHistory, setShowPaymentHistory] = useState(false);
  const [assignmentCareerId, setAssignmentCareerId] = useState('');
  const [assignmentCohortId, setAssignmentCohortId] = useState('');
  const [bulkCandidates, setBulkCandidates] = useState<AdminUser[]>([]);
  const [bulkSelectedIds, setBulkSelectedIds] = useState<string[]>([]);
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [pendingPaymentIds, setPendingPaymentIds] = useState<string[]>([]);
  const [offeringStudentQuery, setOfferingStudentQuery] = useState('');
  const [offeringStudentResults, setOfferingStudentResults] = useState<AdminUser[]>([]);
  const [focusOfferingStudentSearch, setFocusOfferingStudentSearch] =
    useState(false);
  const [savingOffering, setSavingOffering] = useState(false);
  const [savingEnrollment, setSavingEnrollment] = useState('');
  const [downloadingTranscriptId, setDownloadingTranscriptId] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const offeringStudentSearchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    api
      .get<AdminData>('/admin/dashboard', token)
      .then((response) => {
        setData(response);
        setCourseForm((current) => ({
          ...current,
          teacherId: current.teacherId || response.teachers[0]?.id || '',
        }));
      })
      .catch((requestError) =>
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'No fue posible cargar la administración',
        ),
      )
      .finally(() => setLoading(false));
  }, [token]);

  useEffect(() => {
    api.get<AcademicStructure>('/admin/academic-structure', token)
      .then((response) => setCareers(response.careers))
      .catch(() => undefined);
  }, [token]);

  useEffect(() => {
    if (!selectedOffering || !focusOfferingStudentSearch) return;

    window.setTimeout(() => offeringStudentSearchRef.current?.focus(), 0);
    setFocusOfferingStudentSearch(false);
  }, [focusOfferingStudentSearch, selectedOffering]);

  if (loading || !data) {
    return <LoadingState label="Cargando el control institucional" />;
  }

  async function refreshDashboard() {
    const response = await api.get<AdminData>('/admin/dashboard', token);
    setData(response);
    setSelectedOffering((current) =>
      current
        ? response.offerings.find((offering) => offering.id === current.id) ?? null
        : null,
    );
    return response;
  }

  async function searchStudents(
    event: FormEvent | undefined,
    context: 'main' | 'assignment',
  ) {
    event?.preventDefault();
    const query = context === 'main' ? studentQuery : assignmentQuery;
    if (query.trim().length < 2) {
      setError('Escribe al menos dos caracteres para buscar.');
      return;
    }

    setError('');
    if (context === 'main') {
      setSearchingStudents(true);
      setHasSearchedStudents(true);
    }

    try {
      const response = await api.get<{ students: AdminUser[] }>(
        `/admin/students/search?q=${encodeURIComponent(query.trim())}`,
        token,
      );
      if (context === 'main') {
        setStudentResults(response.students);
      } else {
        setAssignmentResults(
          response.students.filter(
            (student) =>
              student.active &&
              !selectedStudents.some((selected) => selected.id === student.id),
          ),
        );
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible realizar la búsqueda',
      );
    } finally {
      setSearchingStudents(false);
    }
  }

  async function saveUser(event: FormEvent) {
    event.preventDefault();
    if (!editingUser) return;

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
        },
        token,
      );
      if (
        editingUser.role === 'STUDENT' &&
        editingUser.paymentStatus !== null
      ) {
        await api.patch(
          `/admin/users/${editingUser.id}/payment`,
          {
            status:
              editingUser.paymentStatus === 'PAID' ? 'PAID' : 'PENDING',
          },
          token,
        );
      }
      const updatedUser = {
        ...updated,
        paymentStatus: editingUser.paymentStatus,
      };
      setStudentResults((current) =>
        current.map((student) =>
          student.id === updated.id ? updatedUser : student,
        ),
      );
      setDirectoryUsers((current) =>
        current.map((directoryUser) =>
          directoryUser.id === updated.id ? updatedUser : directoryUser,
        ),
      );
      await refreshDashboard();
      setEditingUser(null);
      setSuccess('La información del usuario fue actualizada.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible actualizar el usuario',
      );
    }
  }

  async function openDirectory(role: 'STUDENT' | 'TEACHER') {
    setDirectoryRole(role);
    setDirectoryQuery('');
    setDirectoryStatus('ALL');
    setDirectoryLoading(true);
    setError('');
    try {
      const response = await api.get<{ users: AdminUser[] }>(
        `/admin/users?role=${role}`,
        token,
      );
      setDirectoryUsers(response.users);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cargar el directorio',
      );
      setDirectoryRole(null);
    } finally {
      setDirectoryLoading(false);
    }
  }

  async function createCohort(event: FormEvent) {
    event.preventDefault();
    setSavingCohort(true);
    setError('');
    setSuccess('');

    try {
      await api.post('/admin/cohorts', cohortForm, token);
      setCohortForm(initialCohortForm);
      setShowCohortModal(false);
      setSuccess(
        'La carrera y su generación quedaron disponibles para registrar alumnos.',
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible crear la carrera y generación',
      );
    } finally {
      setSavingCohort(false);
    }
  }

  async function openCareersManagement() {
    setShowCareersModal(true);
    setLoadingCareers(true);
    setEditingCareerId('');
    setEditingCohortId('');
    setError('');
    try {
      const response = await api.get<AcademicStructure>(
        '/admin/academic-structure',
        token,
      );
      setCareers(response.careers);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible cargar las carreras',
      );
    } finally {
      setLoadingCareers(false);
    }
  }

  async function saveCareer(careerId: string) {
    if (careerName.trim().length < 3) {
      setError('El nombre de la carrera debe tener al menos 3 caracteres.');
      return;
    }
    setSavingCareer(careerId);
    setError('');
    try {
      await api.patch(`/admin/careers/${careerId}`, { name: careerName }, token);
      setCareers((current) =>
        current.map((career) =>
          career.id === careerId ? { ...career, name: careerName.trim() } : career,
        ),
      );
      setEditingCareerId('');
      setSuccess('La carrera fue actualizada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la carrera');
    } finally {
      setSavingCareer('');
    }
  }

  async function deleteCareer(careerId: string, name: string) {
    if (!window.confirm(`¿Eliminar la carrera “${name}”? Sus generaciones dejarán de estar disponibles para nuevos registros.`)) return;
    setSavingCareer(careerId);
    setError('');
    try {
      await api.delete(`/admin/careers/${careerId}`, token);
      setCareers((current) => current.filter((career) => career.id !== careerId));
      await refreshDashboard();
      setSuccess('La carrera fue eliminada de las opciones disponibles.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible eliminar la carrera');
    } finally {
      setSavingCareer('');
    }
  }

  async function saveCohort(careerId: string, cohortId: string) {
    if (cohortEditName.trim().length < 3 || !cohortEditStartsAt) {
      setError('Completa el nombre de la generación y la fecha de ingreso.');
      return;
    }
    setSavingCareer(cohortId);
    setError('');
    try {
      const updated = await api.patch<{ id: string; name: string; startsAt: string }>(
        `/admin/cohorts/${cohortId}`,
        { name: cohortEditName, startsAt: cohortEditStartsAt },
        token,
      );
      setCareers((current) =>
        current.map((career) =>
          career.id === careerId
            ? {
                ...career,
                cohorts: career.cohorts.map((cohort) =>
                  cohort.id === cohortId ? { ...cohort, ...updated } : cohort,
                ),
              }
            : career,
        ),
      );
      setEditingCohortId('');
      setSuccess('La generación y su fecha de ingreso fueron actualizadas.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la generación');
    } finally {
      setSavingCareer('');
    }
  }

  async function deleteCohort(careerId: string, cohortId: string, name: string) {
    if (!window.confirm(`¿Eliminar la generación “${name}”? Los alumnos conservarán sus datos históricos.`)) return;
    setSavingCareer(cohortId);
    setError('');
    try {
      await api.delete(`/admin/cohorts/${cohortId}`, token);
      setCareers((current) => current.map((career) => career.id === careerId
        ? { ...career, cohorts: career.cohorts.filter((cohort) => cohort.id !== cohortId) }
        : career));
      setSuccess('La generación fue eliminada de las opciones disponibles.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible eliminar la generación');
    } finally {
      setSavingCareer('');
    }
  }

  async function createOffering(event: FormEvent) {
    event.preventDefault();
    if (!selectedStudents.length) {
      setError('Selecciona al menos un alumno para la materia.');
      return;
    }
    if (!courseForm.careerId || courseForm.quadrimester < 1 || courseForm.quadrimester > 9) {
      setError('Selecciona la carrera y un cuatrimestre del 1 al 9.');
      return;
    }

    setCreatingOffering(true);
    setError('');
    try {
      await api.post(
        '/admin/offerings',
        {
          ...courseForm,
          studentIds: selectedStudents.map((student) => student.id),
        },
        token,
      );
      const refreshed = await refreshDashboard();
      setCourseForm({
        ...getMonthlyDefaults(),
        teacherId: refreshed.teachers[0]?.id || '',
      });
      setSelectedStudents([]);
      setAssignmentResults([]);
      setAssignmentQuery('');
      setShowOfferingModal(false);
      setActiveTab('offerings');
      setSuccess('La materia mensual y sus inscripciones fueron creadas.');
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible crear la materia',
      );
    } finally {
      setCreatingOffering(false);
    }
  }

  async function savePayment(payment: AdminPayment) {
    setSavingPayment(payment.id);
    setError('');
    try {
      await api.patch(
        `/admin/payments/${payment.id}`,
        {
          status: payment.status,
          amount: Number(payment.amount),
          paidAt: payment.paidAt?.slice(0, 10) || null,
          termId: payment.termId,
        },
        token,
      );
      await refreshDashboard();
      if (payment.status !== 'PENDING') {
        setPendingPaymentIds((current) =>
          current.filter((paymentId) => paymentId !== payment.id),
        );
      }
      setSavedPayment(payment.id);
      window.setTimeout(() => setSavedPayment(''), 1800);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'No fue posible guardar el pago',
      );
    } finally {
      setSavingPayment('');
    }
  }

  async function createPaymentRecord() {
    if (!newPaymentStudentId || !newPaymentPeriod) {
      setError('Selecciona un alumno y un mes de pago.');
      return;
    }
    setSavingPayment('new');
    setError('');
    try {
      await api.post('/admin/payments', { studentId: newPaymentStudentId, period: newPaymentPeriod }, token);
      await refreshDashboard();
      setPaymentStudentId(newPaymentStudentId);
      setShowPaymentHistory(true);
      setSuccess('El periodo de pago quedó listo para capturarse.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible crear el periodo de pago');
    } finally {
      setSavingPayment('');
    }
  }

  async function loadBulkCandidates(careerId: string, cohortId: string) {
    setAssignmentCareerId(careerId);
    setAssignmentCohortId(cohortId);
    setBulkSelectedIds([]);
    if (!careerId) {
      setBulkCandidates([]);
      return;
    }
    try {
      const response = await api.get<{ users: AdminUser[] }>('/admin/users?role=STUDENT', token);
      setBulkCandidates(response.users.filter((student) =>
        student.active && student.cohort?.career.id === careerId &&
        (!cohortId || student.cohort?.id === cohortId) &&
        !selectedStudents.some((selected) => selected.id === student.id) &&
        !selectedOffering?.students.some((current) => current.id === student.id),
      ));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cargar los alumnos');
    }
  }

  async function confirmBulkStudents() {
    const additions = bulkCandidates.filter((student) => bulkSelectedIds.includes(student.id));
    if (selectedOffering) {
      setSavingOffering(true);
      try {
        await api.post(`/admin/offerings/${selectedOffering.id}/students`, { studentIds: additions.map((student) => student.id) }, token);
        await refreshDashboard();
        setBulkCandidates((current) => current.filter((student) => !bulkSelectedIds.includes(student.id)));
        setBulkSelectedIds([]);
        setSuccess(`${additions.length} alumno${additions.length === 1 ? '' : 's'} añadido${additions.length === 1 ? '' : 's'} a la materia.`);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : 'No fue posible añadir los alumnos');
      } finally {
        setSavingOffering(false);
      }
      return;
    }
    setSelectedStudents((current) => [...current, ...additions.filter((student) => !current.some((item) => item.id === student.id))]);
    setBulkCandidates((current) => current.filter((student) => !bulkSelectedIds.includes(student.id)));
    setBulkSelectedIds([]);
  }

  function updatePayment(
    paymentId: string,
    changes: Partial<AdminPayment>,
  ) {
    setData((current) =>
      current
        ? {
            ...current,
            payments: current.payments.map((payment) =>
              payment.id === paymentId ? { ...payment, ...changes } : payment,
            ),
          }
        : current,
    );
  }

  function addStudent(student: AdminUser) {
    setSelectedStudents((current) => [...current, student]);
    setAssignmentResults((current) =>
      current.filter((result) => result.id !== student.id),
    );
  }

  function removeStudent(studentId: string) {
    setSelectedStudents((current) =>
      current.filter((student) => student.id !== studentId),
    );
  }

  function openOfferingManagement(
    offering: AdminOffering,
    focusStudentSearch = false,
  ) {
    setSelectedOffering(offering);
    setOfferingStudentQuery('');
    setOfferingStudentResults([]);
    setAssignmentCareerId(offering.career?.id ?? '');
    setAssignmentCohortId(offering.cohort?.id ?? '');
    setBulkCandidates([]);
    setBulkSelectedIds([]);
    setFocusOfferingStudentSearch(focusStudentSearch);
    setError('');
  }

  async function saveOfferingTeacher() {
    if (!selectedOffering) return;
    setSavingOffering(true);
    setError('');
    try {
      await api.patch(
        `/admin/offerings/${selectedOffering.id}`,
        {
          teacherId: selectedOffering.teacher.id,
          courseCode: selectedOffering.course.code,
          courseName: selectedOffering.course.name,
          careerId: selectedOffering.career?.id,
          cohortId: selectedOffering.cohort?.id ?? null,
          quadrimester: selectedOffering.quadrimester ?? 1,
        },
        token,
      );
      await refreshDashboard();
      setSuccess('La materia fue actualizada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible cambiar el docente');
    } finally {
      setSavingOffering(false);
    }
  }

  async function searchOfferingStudents() {
    if (offeringStudentQuery.trim().length < 2 || !selectedOffering) return;
    setError('');
    try {
      const response = await api.get<{ students: AdminUser[] }>(
        `/admin/students/search?q=${encodeURIComponent(offeringStudentQuery.trim())}`,
        token,
      );
      setOfferingStudentResults(
        response.students.filter(
          (student) =>
            student.active &&
            !selectedOffering.students.some((current) => current.id === student.id),
        ),
      );
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible buscar alumnos');
    }
  }

  async function addOfferingStudent(student: AdminUser) {
    if (!selectedOffering) return;
    setSavingOffering(true);
    try {
      await api.post(
        `/admin/offerings/${selectedOffering.id}/students`,
        { studentIds: [student.id] },
        token,
      );
      await refreshDashboard();
      setOfferingStudentResults((current) => current.filter((item) => item.id !== student.id));
      setSuccess('El alumno fue añadido a la materia.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible añadir al alumno');
    } finally {
      setSavingOffering(false);
    }
  }

  async function saveEnrollment(
    enrollmentId: string,
    changes: { visibleToTeacher?: boolean; finalGrade?: number },
  ) {
    setSavingEnrollment(enrollmentId);
    setError('');
    try {
      await api.patch(`/admin/enrollments/${enrollmentId}`, changes, token);
      await refreshDashboard();
      setSuccess('La información de la inscripción fue actualizada.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible actualizar la inscripción');
    } finally {
      setSavingEnrollment('');
    }
  }

  async function removeOfferingEnrollment(enrollmentId: string) {
    if (!selectedOffering) return;
    if (!window.confirm('¿Quitar a este alumno de la materia?')) return;
    setSavingEnrollment(enrollmentId);
    try {
      await api.delete(
        `/admin/offerings/${selectedOffering.id}/students/${enrollmentId}`,
        token,
      );
      await refreshDashboard();
      setSuccess('El alumno fue retirado de la materia.');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'No fue posible retirar al alumno');
    } finally {
      setSavingEnrollment('');
    }
  }

  async function downloadStudentTranscript(student: AdminUser) {
    setDownloadingTranscriptId(student.id);
    setError('');

    try {
      const transcript = await api.get<AdminTranscript>(
        `/admin/users/${student.id}/transcript`,
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

  const filteredDirectoryUsers = directoryUsers.filter((directoryUser) => {
    const normalizedQuery = directoryQuery.trim().toLowerCase();
    const matchesQuery =
      !normalizedQuery ||
      `${directoryUser.firstName} ${directoryUser.lastName}`
        .toLowerCase()
        .includes(normalizedQuery) ||
      directoryUser.email.toLowerCase().includes(normalizedQuery) ||
      directoryUser.username?.toLowerCase().includes(normalizedQuery);
    const matchesStatus =
      directoryStatus === 'ALL' ||
      (directoryStatus === 'ACTIVE' && directoryUser.active) ||
      (directoryStatus === 'INACTIVE' && !directoryUser.active);
    return matchesQuery && matchesStatus;
  });

  const filteredPayments = data.payments.filter((payment) => {
    return payment.student.id === paymentStudentId;
  });
  const paymentSearchResults = paymentQuery.trim().length < 2
    ? []
    : data.paymentStudents.filter((student) => {
        const query = paymentQuery.trim().toLowerCase();
        return student.name.toLowerCase().includes(query) || student.email.toLowerCase().includes(query);
      }).slice(0, 8);
  const selectedPaymentStudent = data.paymentStudents.find((student) => student.id === paymentStudentId);

  const pendingPayments = data.payments.filter(
    (payment) => payment.status === 'PENDING',
  );
  const pendingModalPayments = data.payments.filter((payment) =>
    pendingPaymentIds.includes(payment.id),
  );

  const filteredOfferings = data.offerings.filter((offering) => {
    const query = offeringQuery.trim().toLowerCase();
    const startsAt = new Date(offering.startsAt);
    const matchesText =
      !query ||
      offering.course.name.toLowerCase().includes(query) ||
      offering.course.code.toLowerCase().includes(query) ||
      offering.section.toLowerCase().includes(query) ||
      offering.teacher.name.toLowerCase().includes(query);
    const matchesYear =
      offeringYear === 'ALL' ||
      String(startsAt.getUTCFullYear()) === offeringYear;
    const matchesMonth =
      offeringMonth === 'ALL' ||
      String(startsAt.getUTCMonth() + 1) === offeringMonth;
    const matchesCareer = offeringCareer === 'ALL' || offering.career?.id === offeringCareer;
    const matchesCohort = offeringCohort === 'ALL' || offering.cohort?.id === offeringCohort;
    const matchesQuadrimester = offeringQuadrimester === 'ALL' || String(offering.quadrimester) === offeringQuadrimester;
    return matchesText && matchesYear && matchesMonth && matchesCareer && matchesCohort && matchesQuadrimester;
  });
  const hasOfferingFilters =
    offeringQuery.trim() !== '' ||
    offeringYear !== 'ALL' ||
    offeringMonth !== 'ALL' || offeringCareer !== 'ALL' ||
    offeringCohort !== 'ALL' || offeringQuadrimester !== 'ALL';
  const offeringYears = [
    ...new Set(
      data.offerings.map((offering) =>
        String(new Date(offering.startsAt).getUTCFullYear()),
      ),
    ),
  ].sort((first, second) => Number(second) - Number(first));
  const monthOptions = Array.from({ length: 12 }, (_, index) => ({
    value: String(index + 1),
    label: new Intl.DateTimeFormat('es-MX', { month: 'long' }).format(
      new Date(2026, index, 1),
    ),
  }));

  return (
    <>
      <section className="page-heading">
        <div>
          <span className="eyebrow">CONTROL INSTITUCIONAL</span>
          <h1>Hola, {user.firstName}</h1>
          <p>Gestiona alumnos, materias mensuales y pagos desde un solo lugar.</p>
        </div>
        <div className="page-heading__actions">
          <button
            className="button button--secondary"
            onClick={() => setShowCohortModal(true)}
          >
            <CalendarPlus size={18} />
            Nueva carrera y generación
          </button>
          <button
            className="button button--primary"
            onClick={() => setShowOfferingModal(true)}
          >
            <Plus size={18} />
            Nueva materia mensual
          </button>
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

      <section className="stats-grid stats-grid--admin">
        <button
          className="stat-card stat-card--interactive"
          onClick={() => void openCareersManagement()}
        >
          <span className="stat-card__icon stat-card__icon--teal">
            <GraduationCap size={22} />
          </span>
          <div>
            <span>Carreras</span>
            <strong>{data.metrics.careers}</strong>
            <small>Administrar carreras creadas</small>
          </div>
        </button>
        <button
          className="stat-card stat-card--interactive"
          onClick={() => void openDirectory('STUDENT')}
        >
          <span className="stat-card__icon stat-card__icon--blue">
            <Users size={22} />
          </span>
          <div>
            <span>Alumnos</span>
            <strong>{data.metrics.students}</strong>
            <small>{data.metrics.enrollments} inscripciones</small>
          </div>
        </button>
        <button
          className="stat-card stat-card--interactive"
          onClick={() => void openDirectory('TEACHER')}
        >
          <span className="stat-card__icon stat-card__icon--purple">
            <UserCog size={22} />
          </span>
          <div>
            <span>Docentes</span>
            <strong>{data.metrics.teachers}</strong>
            <small>Disponibles para asignar</small>
          </div>
        </button>
        <button
          className="stat-card stat-card--interactive"
          onClick={() => setActiveTab('offerings')}
        >
          <span className="stat-card__icon stat-card__icon--green">
            <BookOpen size={22} />
          </span>
          <div>
            <span>Materias en curso</span>
            <strong>{data.metrics.activeCourses}</strong>
            <small>Vigentes este mes</small>
          </div>
        </button>
        <button
          className="stat-card stat-card--interactive"
          onClick={() => {
            setPendingPaymentIds(pendingPayments.map((payment) => payment.id));
            setShowPendingPayments(true);
          }}
        >
          <span className="stat-card__icon stat-card__icon--amber">
            <WalletCards size={22} />
          </span>
          <div>
            <span>Pagos pendientes</span>
            <strong>{data.metrics.pendingPayments}</strong>
            <small>
              ${data.metrics.collected.toLocaleString('es-MX')} recaudado
            </small>
          </div>
        </button>
      </section>

      <div className="admin-tabs">
        <button
          className={activeTab === 'students' ? 'is-active' : ''}
          onClick={() => setActiveTab('students')}
        >
          <Search size={18} />
          Buscar alumnos
        </button>
        <button
          className={activeTab === 'offerings' ? 'is-active' : ''}
          onClick={() => setActiveTab('offerings')}
        >
          <BookPlus size={18} />
          Materias
          <span>{data.offerings.length}</span>
        </button>
        <button
          className={activeTab === 'payments' ? 'is-active' : ''}
          onClick={() => setActiveTab('payments')}
        >
          <ReceiptText size={18} />
          Pagos
          <span>{data.payments.length}</span>
        </button>
      </div>

      {activeTab === 'students' && (
        <section className="student-search-panel">
          <div className="student-search-panel__intro">
            <span className="search-illustration">
              <Search size={25} />
            </span>
            <div>
              <h2>Buscar un alumno</h2>
              <p>
                Localiza por nombre, apellido o correo institucional. La lista
                completa no se muestra para mantener el panel enfocado.
              </p>
            </div>
          </div>
          <form
            className="student-search-form"
            onSubmit={(event) => searchStudents(event, 'main')}
          >
            <Search size={19} />
            <input
              value={studentQuery}
              onChange={(event) => setStudentQuery(event.target.value)}
              placeholder="Ej. Andrea López o alumno@universidad.mx"
              aria-label="Buscar alumno"
            />
            <button className="button button--primary" disabled={searchingStudents}>
              {searchingStudents ? 'Buscando...' : 'Buscar'}
            </button>
          </form>

          {!hasSearchedStudents ? (
            <div className="search-empty-state">
              <Users size={28} />
              <strong>Aquí aparecerá el alumno que busques</strong>
              <p>Después podrás abrir su ficha y editar sus datos o acceso.</p>
            </div>
          ) : studentResults.length ? (
            <div className="student-results">
              {studentResults.map((student) => (
                <article className="student-result-card" key={student.id}>
                  <div className="student-cell">
                    <span>
                      {student.firstName.charAt(0)}
                      {student.lastName.charAt(0)}
                    </span>
                    <div>
                      <strong>
                        {student.firstName} {student.lastName}
                      </strong>
                      <small>
                        {student.username} · {student.email}
                      </small>
                    </div>
                  </div>
                  <span
                    className={`status-dot ${
                      student.active ? 'status-dot--active' : ''
                    }`}
                  >
                    {student.active ? 'Activo' : 'Inactivo'}
                  </span>
                  <button
                    className="button button--secondary"
                    onClick={() => void downloadStudentTranscript(student)}
                    disabled={downloadingTranscriptId === student.id}
                  >
                    <Download size={16} />
                    {downloadingTranscriptId === student.id
                      ? 'Preparando...'
                      : 'Descargar kárdex'}
                  </button>
                  <button
                    className="button button--secondary"
                    onClick={() => setEditingUser({ ...student })}
                  >
                    <Pencil size={16} />
                    Editar alumno
                  </button>
                </article>
              ))}
            </div>
          ) : (
            <div className="search-empty-state">
              <Search size={28} />
              <strong>No encontramos coincidencias</strong>
              <p>Prueba con otro nombre, apellido o correo.</p>
            </div>
          )}
        </section>
      )}

      {activeTab === 'offerings' && (
        <section className="data-card">
          <div className="data-card__header">
            <div>
              <h2>Materias mensuales</h2>
              <p>Grupos creados, docentes asignados y número de alumnos.</p>
            </div>
            <div className="data-card__actions">
              <label className="table-search">
                <Search size={17} />
                <input
                  value={offeringQuery}
                  onChange={(event) => setOfferingQuery(event.target.value)}
                  placeholder="Buscar materia"
                  aria-label="Buscar materia"
                />
              </label>
              <select
                className="compact-filter-select"
                value={offeringYear}
                onChange={(event) => setOfferingYear(event.target.value)}
                aria-label="Filtrar materias por año"
              >
                <option value="ALL">Todos los años</option>
                {offeringYears.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
              <select
                className="compact-filter-select"
                value={offeringMonth}
                onChange={(event) => setOfferingMonth(event.target.value)}
                aria-label="Filtrar materias por mes"
              >
                <option value="ALL">Todos los meses</option>
                {monthOptions.map((month) => (
                  <option key={month.value} value={month.value}>
                    {month.label}
                  </option>
                ))}
              </select>
              <select className="compact-filter-select" value={offeringCareer} onChange={(event) => { setOfferingCareer(event.target.value); setOfferingCohort('ALL'); }} aria-label="Filtrar materias por carrera">
                <option value="ALL">Todas las carreras</option>
                {careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}
              </select>
              <select className="compact-filter-select" value={offeringCohort} onChange={(event) => setOfferingCohort(event.target.value)} aria-label="Filtrar materias por generación">
                <option value="ALL">Todas las generaciones</option>
                {careers.find((career) => career.id === offeringCareer)?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
              </select>
              <select className="compact-filter-select" value={offeringQuadrimester} onChange={(event) => setOfferingQuadrimester(event.target.value)} aria-label="Filtrar materias por cuatrimestre">
                <option value="ALL">Todos los cuatrimestres</option>
                {Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}° cuatrimestre</option>)}
              </select>
              <button
                type="button"
                className="button button--secondary"
                onClick={() => {
                  setOfferingQuery('');
                  setOfferingYear('ALL');
                  setOfferingMonth('ALL');
                  setOfferingCareer('ALL');
                  setOfferingCohort('ALL');
                  setOfferingQuadrimester('ALL');
                }}
                disabled={!hasOfferingFilters}
              >
                <X size={17} />
                Limpiar
              </button>
              <button
                className="button button--primary"
                onClick={() => setShowOfferingModal(true)}
              >
                <Plus size={17} />
                Agregar materia
              </button>
            </div>
          </div>
          <div className="offering-admin-grid">
            {filteredOfferings.map((offering) => (
              <article className="offering-admin-card" key={offering.id}>
                <button
                  className="offering-admin-card__body"
                  type="button"
                  onClick={() => openOfferingManagement(offering)}
                >
                  <div className="offering-admin-card__top">
                    <span className="course-code">{offering.course.code}</span>
                    <span className={`offering-stage stage-${offering.status.toLowerCase()}`}>
                      {stageLabels[offering.status]}
                    </span>
                  </div>
                  <h3>{offering.course.name}</h3>
                  <p>Periodo {offering.term}</p>
                  <p>{offering.career?.name ?? 'Carrera sin clasificar'} · {offering.cohort?.name ?? 'Todas las generaciones'} · {offering.quadrimester ? `${offering.quadrimester}° cuatrimestre` : 'Cuatrimestre sin clasificar'}</p>
                  <div className="offering-admin-card__meta">
                    <span>
                      <CalendarDays size={16} />
                      {new Date(offering.startsAt).toLocaleDateString('es-MX', {
                        timeZone: 'UTC',
                      })}{' '}
                      al{' '}
                      {new Date(offering.endsAt).toLocaleDateString('es-MX', {
                        timeZone: 'UTC',
                      })}
                    </span>
                    <span>
                      <UserCog size={16} />
                      {offering.teacher.name}
                    </span>
                    <span>
                      <Users size={16} />
                      {offering.studentCount} alumnos
                    </span>
                  </div>
                </button>
                <div className="offering-admin-card__actions">
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => openOfferingManagement(offering, true)}
                  >
                    <UserPlus size={16} />
                    Agregar alumno
                  </button>
                  <button
                    type="button"
                    className="button button--secondary"
                    onClick={() => openOfferingManagement(offering)}
                  >
                    <Pencil size={16} />
                    Gestionar
                  </button>
                </div>
              </article>
            ))}
            {!filteredOfferings.length && (
              <div className="directory-empty offering-search-empty">
                No hay materias que coincidan con la búsqueda.
              </div>
            )}
          </div>
        </section>
      )}

      {selectedOffering && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setSelectedOffering(null)}
        >
          <section
            className="modal-card modal-card--wide offering-management-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">GESTIÓN DE MATERIA</span>
                <h2>{selectedOffering.course.name}</h2>
                <p>
                  {selectedOffering.course.code} · Periodo {selectedOffering.term}
                </p>
              </div>
              <div className="modal-card__header-actions">
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => void downloadOfferingReport(selectedOffering)}
                >
                  <Download size={17} />
                  Descargar PDF
                </button>
                <button type="button" onClick={() => setSelectedOffering(null)}>
                  <X size={20} />
                </button>
              </div>
            </div>

            <div className="offering-management-toolbar">
              <label className="field">
                <span>Clave</span>
                <input value={selectedOffering.course.code} onChange={(event) => setSelectedOffering({ ...selectedOffering, course: { ...selectedOffering.course, code: event.target.value } })} />
              </label>
              <label className="field">
                <span>Nombre de la materia</span>
                <input value={selectedOffering.course.name} onChange={(event) => setSelectedOffering({ ...selectedOffering, course: { ...selectedOffering.course, name: event.target.value } })} />
              </label>
              <label className="field">
                <span>Docente responsable</span>
                <select
                  value={selectedOffering.teacher.id}
                  onChange={(event) => {
                    const teacher = data.teachers.find((item) => item.id === event.target.value);
                    if (teacher) {
                      setSelectedOffering({
                        ...selectedOffering,
                        teacher: {
                          id: teacher.id,
                          name: `${teacher.firstName} ${teacher.lastName}`,
                        },
                      });
                    }
                  }}
                >
                  {data.teachers.map((teacher) => (
                    <option key={teacher.id} value={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Carrera</span>
                <select value={selectedOffering.career?.id ?? ''} onChange={(event) => {
                  const career = careers.find((item) => item.id === event.target.value);
                  setSelectedOffering({ ...selectedOffering, career: career ? { id: career.id, name: career.name } : null, cohort: null });
                }}>
                  <option value="">Selecciona una carrera</option>
                  {careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Generación</span>
                <select value={selectedOffering.cohort?.id ?? ''} disabled={!selectedOffering.career} onChange={(event) => {
                  const cohort = careers.find((career) => career.id === selectedOffering.career?.id)?.cohorts.find((item) => item.id === event.target.value);
                  setSelectedOffering({ ...selectedOffering, cohort: cohort ? { id: cohort.id, name: cohort.name } : null });
                }}>
                  <option value="">Todas las generaciones</option>
                  {careers.find((career) => career.id === selectedOffering.career?.id)?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cuatrimestre</span>
                <select value={selectedOffering.quadrimester ?? 1} onChange={(event) => setSelectedOffering({ ...selectedOffering, quadrimester: Number(event.target.value) })}>
                  {Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}° cuatrimestre</option>)}
                </select>
              </label>
              <button
                className="button button--primary"
                onClick={() => void saveOfferingTeacher()}
                disabled={savingOffering}
              >
                <Save size={17} />
                Guardar cambios
              </button>
            </div>

            <div className="assignment-section offering-add-student">
              <div className="assignment-section__heading">
                <div>
                  <strong>Añadir alumno</strong>
                  <span>Busca por nombre, correo o matrícula.</span>
                </div>
              </div>
              <div className="course-form-grid">
                <label className="field"><span>Carrera</span><select value={assignmentCareerId} onChange={(event) => void loadBulkCandidates(event.target.value, '')}><option value="">Selecciona una carrera</option>{careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}</select></label>
                <label className="field"><span>Generación</span><select value={assignmentCohortId} disabled={!assignmentCareerId} onChange={(event) => void loadBulkCandidates(assignmentCareerId, event.target.value)}><option value="">Todas las generaciones</option>{careers.find((career) => career.id === assignmentCareerId)?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
                <button type="button" className="button button--secondary filter-clear-button" onClick={() => { setAssignmentCareerId(''); setAssignmentCohortId(''); setBulkCandidates([]); setBulkSelectedIds([]); }} disabled={!assignmentCareerId}><X size={16} />Limpiar filtros</button>
              </div>
              {bulkCandidates.length > 0 && <div className="bulk-student-picker">
                <label className="bulk-student-row bulk-student-row--all"><input type="checkbox" checked={bulkSelectedIds.length === bulkCandidates.length} onChange={(event) => setBulkSelectedIds(event.target.checked ? bulkCandidates.map((student) => student.id) : [])} /><span>Seleccionar todos ({bulkCandidates.length})</span></label>
                {bulkCandidates.map((student) => <label className="bulk-student-row" key={student.id}><input type="checkbox" checked={bulkSelectedIds.includes(student.id)} onChange={(event) => setBulkSelectedIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span><strong>{student.firstName} {student.lastName}</strong><small>{student.cohort?.name} · {student.email}</small></span></label>)}
                <button type="button" className="button button--primary" disabled={!bulkSelectedIds.length || savingOffering} onClick={() => void confirmBulkStudents()}>Agregar seleccionados ({bulkSelectedIds.length})</button>
              </div>}
              <form
                className="assignment-search"
                onSubmit={(event) => {
                  event.preventDefault();
                  void searchOfferingStudents();
                }}
              >
                <Search size={17} />
                <input
                  ref={offeringStudentSearchRef}
                  value={offeringStudentQuery}
                  onChange={(event) => setOfferingStudentQuery(event.target.value)}
                  placeholder="Buscar alumno para esta materia"
                />
                <button
                  type="submit"
                  className="button button--secondary"
                >
                  Buscar
                </button>
              </form>
              {offeringStudentResults.length > 0 && (
                <div className="assignment-results">
                  {offeringStudentResults.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      onClick={() => void addOfferingStudent(student)}
                      disabled={savingOffering}
                    >
                      <span>
                        <strong>{student.firstName} {student.lastName}</strong>
                        <small>{student.username} · {student.email}</small>
                      </span>
                      <UserPlus size={17} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {selectedOffering.students.length ? (
              <div className="table-scroll">
                <table className="admin-table offering-students-table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Calificación final</th>
                      <th>Visible al docente</th>
                      <th>Acciones</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedOffering.students.map((student) => (
                      <tr key={student.enrollmentId}>
                        <td>
                          <div className="student-cell">
                            <span>{student.firstName.charAt(0)}{student.lastName.charAt(0)}</span>
                            <div>
                              <strong>{student.firstName} {student.lastName}</strong>
                              <small>{student.username} · {student.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="grade-save-cell">
                            <input
                              className="grade-input"
                              type="number"
                              min="0"
                              max="100"
                              value={student.finalGrade ?? ''}
                              onChange={(event) =>
                                setSelectedOffering({
                                  ...selectedOffering,
                                  students: selectedOffering.students.map((item) =>
                                    item.enrollmentId === student.enrollmentId
                                      ? {
                                          ...item,
                                          finalGrade:
                                            event.target.value === ''
                                              ? null
                                              : Number(event.target.value),
                                        }
                                      : item,
                                  ),
                                })
                              }
                            />
                            <button
                              className="icon-button"
                              title="Guardar calificación"
                              disabled={savingEnrollment === student.enrollmentId || student.finalGrade === null}
                              onClick={() =>
                                student.finalGrade !== null &&
                                void saveEnrollment(student.enrollmentId, {
                                  finalGrade: student.finalGrade,
                                })
                              }
                            >
                              <Save size={17} />
                            </button>
                          </div>
                        </td>
                        <td>
                          <label className="visibility-toggle">
                            <input
                              type="checkbox"
                              checked={student.visibleToTeacher}
                              onChange={(event) =>
                                void saveEnrollment(student.enrollmentId, {
                                  visibleToTeacher: event.target.checked,
                                })
                              }
                            />
                            <span>
                              {student.visibleToTeacher ? <Eye size={16} /> : <EyeOff size={16} />}
                              {student.visibleToTeacher ? 'Visible' : 'No visible'}
                            </span>
                          </label>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              className="icon-button"
                              title="Editar datos del alumno"
                              onClick={() =>
                                setEditingUser({
                                  id: student.id,
                                  firstName: student.firstName,
                                  lastName: student.lastName,
                                  email: student.email,
                                  username: student.username,
                                  role: 'STUDENT',
                                  active: student.active,
                                  createdAt: '',
                                  paymentStatus: null,
                                  cohort: null,
                                })
                              }
                            >
                              <Pencil size={17} />
                            </button>
                            <button
                              className="icon-button icon-button--danger"
                              title="Quitar de la materia"
                              disabled={savingEnrollment === student.enrollmentId}
                              onClick={() => void removeOfferingEnrollment(student.enrollmentId)}
                            >
                              <Trash2 size={17} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="directory-empty">
                Esta materia todavía no tiene alumnos inscritos.
              </div>
            )}
          </section>
        </div>
      )}

      {activeTab === 'payments' && (
        <section className="data-card">
          <div className="data-card__header">
            <div>
              <h2>Control de pagos</h2>
              <p>Busca un alumno para capturar su mensualidad o consultar sus pagos anteriores.</p>
            </div>
          </div>
          <div className="payment-student-search">
            <label className="table-search payment-search-field">
              <Search size={18} />
              <input value={paymentQuery} onChange={(event) => { setPaymentQuery(event.target.value); setPaymentStudentId(''); setNewPaymentStudentId(''); setShowPaymentHistory(false); }} placeholder="Buscar por nombre o correo del alumno" aria-label="Buscar alumno en pagos" />
            </label>
            {paymentSearchResults.length > 0 && <div className="payment-search-results">
              {paymentSearchResults.map((student) => <button type="button" key={student.id} onClick={() => { setPaymentStudentId(student.id); setNewPaymentStudentId(student.id); setPaymentQuery(student.name); setShowPaymentHistory(false); }}>
                <span>{student.name.charAt(0)}</span><div><strong>{student.name}</strong><small>{student.email}</small></div>
              </button>)}
            </div>}
          </div>
          {selectedPaymentStudent && <div className="payment-student-card">
            <div className="student-cell"><span>{selectedPaymentStudent.name.charAt(0)}</span><div><strong>{selectedPaymentStudent.name}</strong><small>{selectedPaymentStudent.email}</small></div></div>
            <div className="payment-capture-row">
              <label className="field"><span>Mensualidad</span><input type="month" value={newPaymentPeriod} onChange={(event) => setNewPaymentPeriod(event.target.value)} /></label>
              <button type="button" className="button button--primary" onClick={() => void createPaymentRecord()} disabled={savingPayment === 'new'}><Plus size={17} />Capturar periodo</button>
              <button type="button" className="button button--secondary" onClick={() => setShowPaymentHistory((current) => !current)}><ReceiptText size={17} />{showPaymentHistory ? 'Ocultar historial' : 'Ver historial de pagos'}</button>
            </div>
          </div>}
          {selectedPaymentStudent && showPaymentHistory && <div className="table-scroll payment-history-table">
            <table className="admin-table payment-table">
              <thead>
                <tr>
                  <th>Alumno</th>
                  <th>Periodo</th>
                  <th>Monto abonado</th>
                  <th>Estado</th>
                  <th>Fecha de pago</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {filteredPayments.map((payment) => (
                  <tr key={payment.id}>
                    <td>
                      <div className="student-cell">
                        <span>{payment.student.name.charAt(0)}</span>
                        <div>
                          <strong>{payment.student.name}</strong>
                          <small>{payment.student.email}</small>
                        </div>
                      </div>
                    </td>
                    <td>
                      <select value={payment.termId} onChange={(event) => {
                        const term = data.terms.find((item) => item.id === event.target.value);
                        updatePayment(payment.id, { termId: event.target.value, term: term?.name ?? payment.term });
                      }} aria-label={`Periodo de pago de ${payment.student.name}`}>
                        {data.terms.map((term) => <option key={term.id} value={term.id}>{term.name}</option>)}
                      </select>
                    </td>
                    <td>
                      <div className="money-input">
                        <span>$</span>
                        <input
                          type="number"
                          min="0"
                          value={payment.amount}
                          onChange={(event) =>
                            updatePayment(payment.id, {
                              amount: Number(event.target.value),
                            })
                          }
                        />
                      </div>
                    </td>
                    <td>
                      <select
                        className={`status-select status-${payment.status.toLowerCase()}`}
                        value={payment.status}
                        onChange={(event) =>
                          updatePayment(payment.id, {
                            status: event.target.value as PaymentStatus,
                          })
                        }
                      >
                        {Object.entries(paymentLabels).map(([value, label]) => (
                          <option value={value} key={value}>
                            {label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td>
                      <input
                        className="date-input"
                        type="date"
                        value={payment.paidAt?.slice(0, 10) ?? ''}
                        onChange={(event) =>
                          updatePayment(payment.id, {
                            paidAt: event.target.value
                              ? `${event.target.value}T12:00:00.000Z`
                              : null,
                          })
                        }
                      />
                    </td>
                    <td>
                      <button
                        className={`icon-button ${
                          savedPayment === payment.id
                            ? 'icon-button--saved'
                            : ''
                        }`}
                        onClick={() => savePayment(payment)}
                        disabled={savingPayment === payment.id}
                        title="Guardar pago"
                      >
                        {savedPayment === payment.id ? (
                          <Check size={18} />
                        ) : (
                          <Save size={18} />
                        )}
                      </button>
                    </td>
                  </tr>
                ))}
                {!filteredPayments.length && <tr><td colSpan={6}><div className="directory-empty">Este alumno todavía no tiene pagos registrados.</div></td></tr>}
              </tbody>
            </table>
          </div>}
          {!selectedPaymentStudent && paymentQuery.trim().length >= 2 && !paymentSearchResults.length && <div className="directory-empty">No encontramos alumnos con esa búsqueda.</div>}
        </section>
      )}

      {showPendingPayments && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowPendingPayments(false)}
        >
          <section
            className="modal-card modal-card--wide pending-payments-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">PAGOS PENDIENTES</span>
                <h2>Alumnos con saldo pendiente</h2>
                <p>
                  Registra un abono conservando el estatus pendiente o cambia
                  el pago a pagado cuando se liquide.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowPendingPayments(false)}
                aria-label="Cerrar pagos pendientes"
              >
                <X size={20} />
              </button>
            </div>

            {pendingModalPayments.length ? (
              <div className="table-scroll">
                <table className="admin-table pending-payment-table">
                  <thead>
                    <tr>
                      <th>Alumno</th>
                      <th>Monto abonado</th>
                      <th>Estatus</th>
                      <th>Fecha de pago</th>
                      <th />
                    </tr>
                  </thead>
                  <tbody>
                    {pendingModalPayments.map((payment) => (
                      <tr key={payment.id}>
                        <td>
                          <div className="student-cell">
                            <span>{payment.student.name.charAt(0)}</span>
                            <div>
                              <strong>{payment.student.name}</strong>
                              <small>{payment.student.email}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <div className="money-input">
                            <span>$</span>
                            <input
                              type="number"
                              min="0"
                              value={payment.amount}
                              onChange={(event) =>
                                updatePayment(payment.id, {
                                  amount: Number(event.target.value),
                                })
                              }
                              aria-label={`Monto abonado de ${payment.student.name}`}
                            />
                          </div>
                        </td>
                        <td>
                          <select
                            className={`status-select status-${payment.status.toLowerCase()}`}
                            value={payment.status}
                            onChange={(event) =>
                              updatePayment(payment.id, {
                                status: event.target.value as PaymentStatus,
                              })
                            }
                            aria-label={`Estatus de pago de ${payment.student.name}`}
                          >
                            {Object.entries(paymentLabels).map(([value, label]) => (
                              <option value={value} key={value}>
                                {label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td>
                          <input
                            className="date-input"
                            type="date"
                            value={payment.paidAt?.slice(0, 10) ?? ''}
                            onChange={(event) =>
                              updatePayment(payment.id, {
                                paidAt: event.target.value
                                  ? `${event.target.value}T12:00:00.000Z`
                                  : null,
                              })
                            }
                            aria-label={`Fecha de pago de ${payment.student.name}`}
                          />
                        </td>
                        <td>
                          <button
                            className={`icon-button ${
                              savedPayment === payment.id
                                ? 'icon-button--saved'
                                : ''
                            }`}
                            onClick={() => void savePayment(payment)}
                            disabled={savingPayment === payment.id}
                            title="Guardar abono o pago"
                            aria-label={`Guardar pago de ${payment.student.name}`}
                          >
                            {savedPayment === payment.id ? (
                              <Check size={18} />
                            ) : (
                              <Save size={18} />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="directory-empty">
                No hay alumnos con pagos pendientes.
              </div>
            )}
          </section>
        </div>
      )}

      {directoryRole && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setDirectoryRole(null)}
        >
          <section
            className="modal-card modal-card--wide directory-modal"
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">DIRECTORIO INSTITUCIONAL</span>
                <h2>
                  {directoryRole === 'STUDENT' ? 'Alumnos' : 'Docentes'}
                </h2>
              </div>
              <button type="button" onClick={() => setDirectoryRole(null)}>
                <X size={20} />
              </button>
            </div>
            <div className="directory-toolbar">
              <label>
                <Search size={17} />
                <input
                  value={directoryQuery}
                  onChange={(event) => setDirectoryQuery(event.target.value)}
                  placeholder="Filtrar por nombre, correo o usuario"
                  autoFocus
                />
              </label>
              <select
                value={directoryStatus}
                onChange={(event) =>
                  setDirectoryStatus(
                    event.target.value as 'ALL' | 'ACTIVE' | 'INACTIVE',
                  )
                }
              >
                <option value="ALL">Todos los accesos</option>
                <option value="ACTIVE">Activos</option>
                <option value="INACTIVE">Inactivos</option>
              </select>
            </div>
            {directoryLoading ? (
              <div className="directory-empty">Cargando directorio...</div>
            ) : filteredDirectoryUsers.length ? (
              <div className="directory-list">
                {filteredDirectoryUsers.map((directoryUser) => (
                  <article key={directoryUser.id}>
                    <div className="student-cell">
                      <span>
                        {directoryUser.firstName.charAt(0)}
                        {directoryUser.lastName.charAt(0)}
                      </span>
                      <div>
                        <strong>
                          {directoryUser.firstName} {directoryUser.lastName}
                        </strong>
                        <small>
                          {directoryUser.username} · {directoryUser.email}
                        </small>
                      </div>
                    </div>
                    <span
                      className={`status-dot ${
                        directoryUser.active ? 'status-dot--active' : ''
                      }`}
                    >
                      {directoryUser.active ? 'Activo' : 'Inactivo'}
                    </span>
                    <button
                      className="button button--secondary"
                      onClick={() => setEditingUser({ ...directoryUser })}
                    >
                      <Pencil size={15} />
                      Editar
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="directory-empty">
                No hay usuarios que coincidan con los filtros.
              </div>
            )}
          </section>
        </div>
      )}

      {editingUser && (
        <div className="modal-backdrop" onMouseDown={() => setEditingUser(null)}>
          <form
            className="modal-card"
            onSubmit={saveUser}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">EDITAR USUARIO</span>
                <h2>Datos y acceso</h2>
              </div>
              <button type="button" onClick={() => setEditingUser(null)}>
                <X size={20} />
              </button>
            </div>
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
                <span>Apellido</span>
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
            <label className="field">
              <span>Correo institucional</span>
              <input
                type="email"
                value={editingUser.email}
                onChange={(event) =>
                  setEditingUser({ ...editingUser, email: event.target.value })
                }
                required
              />
            </label>
            <label className="toggle-row">
              <span>
                <strong>Acceso activo</strong>
                <small>Permite que el alumno inicie sesión.</small>
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
                    Habilita las calificaciones de sus periodos inscritos.
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
                onClick={() => setEditingUser(null)}
              >
                Cancelar
              </button>
              <button className="button button--primary">
                <Save size={17} />
                Guardar cambios
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

      {showCareersModal && (
        <div className="modal-backdrop" onMouseDown={() => setShowCareersModal(false)}>
          <div className="modal-card modal-card--wide" onMouseDown={(event) => event.stopPropagation()}>
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">ESTRUCTURA ACADÉMICA</span>
                <h2>Administrar carreras</h2>
              </div>
              <button type="button" onClick={() => setShowCareersModal(false)}><X size={20} /></button>
            </div>
            <p className="academic-structure-help">
              Actualiza el nombre de una carrera o elimínala de las opciones disponibles. Los datos históricos de sus alumnos se conservarán.
            </p>
            {loadingCareers ? (
              <LoadingState label="Cargando carreras" />
            ) : careers.length === 0 ? (
              <div className="academic-empty-state">
                <GraduationCap size={28} />
                <strong>No hay carreras registradas</strong>
                <p>Crea una carrera y generación para verla aquí.</p>
              </div>
            ) : (
              <div className="career-management-list">
                {careers.map((career) => (
                  <article className="career-management-item" key={career.id}>
                    <div className="career-management-item__content">
                      {editingCareerId === career.id ? (
                        <input
                          aria-label="Nombre de la carrera"
                          value={careerName}
                          onChange={(event) => setCareerName(event.target.value)}
                          autoFocus
                        />
                      ) : (
                        <div>
                          <strong>{career.name}</strong>
                          <small>{career.cohorts.length} {career.cohorts.length === 1 ? 'generación' : 'generaciones'}</small>
                        </div>
                      )}
                    </div>
                    <div className="career-management-item__actions">
                      {editingCareerId === career.id ? (
                        <>
                          <button className="icon-button icon-button--success" type="button" aria-label="Guardar carrera" disabled={savingCareer === career.id} onClick={() => void saveCareer(career.id)}><Check size={18} /></button>
                          <button className="icon-button" type="button" aria-label="Cancelar edición" onClick={() => setEditingCareerId('')}><X size={18} /></button>
                        </>
                      ) : (
                        <>
                          <button className="icon-button" type="button" aria-label={`Editar ${career.name}`} onClick={() => { setEditingCareerId(career.id); setCareerName(career.name); }}><Pencil size={17} /></button>
                          <button className="icon-button icon-button--danger" type="button" aria-label={`Eliminar ${career.name}`} disabled={savingCareer === career.id} onClick={() => void deleteCareer(career.id, career.name)}><Trash2 size={17} /></button>
                        </>
                      )}
                    </div>
                    {editingCareerId !== career.id && (
                      <div className="career-cohort-list">
                        {career.cohorts.map((cohort) => (
                          <div className="career-cohort-item" key={cohort.id}>
                            {editingCohortId === cohort.id ? (
                              <div className="career-cohort-item__fields">
                                <label className="field">
                                  <span>Nombre de la generación</span>
                                  <input value={cohortEditName} onChange={(event) => setCohortEditName(event.target.value)} autoFocus />
                                </label>
                                <label className="field">
                                  <span>Fecha de ingreso</span>
                                  <input type="date" value={cohortEditStartsAt} onChange={(event) => setCohortEditStartsAt(event.target.value)} />
                                </label>
                              </div>
                            ) : (
                              <div className="career-cohort-item__summary">
                                <span>{cohort.name}</span>
                                <small>Ingreso: {new Intl.DateTimeFormat('es-MX', { day: '2-digit', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(new Date(cohort.startsAt))}</small>
                              </div>
                            )}
                            <div className="career-management-item__actions">
                              {editingCohortId === cohort.id ? (
                                <>
                                  <button className="icon-button icon-button--success" type="button" aria-label="Guardar generación" disabled={savingCareer === cohort.id} onClick={() => void saveCohort(career.id, cohort.id)}><Check size={17} /></button>
                                  <button className="icon-button" type="button" aria-label="Cancelar edición de generación" onClick={() => setEditingCohortId('')}><X size={17} /></button>
                                </>
                              ) : (
                                <>
                                  <button className="icon-button" type="button" aria-label={`Editar generación ${cohort.name}`} onClick={() => { setEditingCohortId(cohort.id); setCohortEditName(cohort.name); setCohortEditStartsAt(cohort.startsAt.slice(0, 10)); }}><Pencil size={16} /></button>
                                  <button className="icon-button icon-button--danger" type="button" aria-label={`Eliminar generación ${cohort.name}`} disabled={savingCareer === cohort.id} onClick={() => void deleteCohort(career.id, cohort.id, cohort.name)}><Trash2 size={16} /></button>
                                </>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </article>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button type="button" className="button button--secondary" onClick={() => setShowCareersModal(false)}>Cerrar</button>
              <button type="button" className="button button--primary" onClick={() => { setShowCareersModal(false); setShowCohortModal(true); }}><CalendarPlus size={17} />Nueva carrera y generación</button>
            </div>
          </div>
        </div>
      )}

      {showOfferingModal && (
        <div
          className="modal-backdrop"
          onMouseDown={() => setShowOfferingModal(false)}
        >
          <form
            className="modal-card modal-card--wide"
            onSubmit={createOffering}
            onMouseDown={(event) => event.stopPropagation()}
          >
            <div className="modal-card__header">
              <div>
                <span className="eyebrow">NUEVA MATERIA MENSUAL</span>
                <h2>Materia, docente y alumnos</h2>
              </div>
              <button type="button" onClick={() => setShowOfferingModal(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="course-form-grid">
              <label className="field">
                <span>Clave de materia</span>
                <input
                  value={courseForm.courseCode}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      courseCode: event.target.value,
                    })
                  }
                  placeholder="Ej. ADM-302"
                  required
                />
              </label>
              <label className="field field--span-2">
                <span>Nombre de la materia</span>
                <input
                  value={courseForm.courseName}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      courseName: event.target.value,
                    })
                  }
                  placeholder="Ej. Gestión de proyectos"
                  required
                />
              </label>
              <label className="field">
                <span>Grupo</span>
                <input
                  value={courseForm.section}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      section: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="field field--span-2">
                <span>Docente responsable</span>
                <select
                  value={courseForm.teacherId}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      teacherId: event.target.value,
                    })
                  }
                  required
                >
                  <option value="">Selecciona un docente</option>
                  {data.teachers.map((teacher) => (
                    <option value={teacher.id} key={teacher.id}>
                      {teacher.firstName} {teacher.lastName}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Carrera</span>
                <select value={courseForm.careerId} onChange={(event) => setCourseForm({ ...courseForm, careerId: event.target.value, cohortId: '' })} required>
                  <option value="">Selecciona una carrera</option>
                  {careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Generación (opcional)</span>
                <select value={courseForm.cohortId} onChange={(event) => setCourseForm({ ...courseForm, cohortId: event.target.value })} disabled={!courseForm.careerId}>
                  <option value="">Todas las generaciones</option>
                  {careers.find((career) => career.id === courseForm.careerId)?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}
                </select>
              </label>
              <label className="field">
                <span>Cuatrimestre</span>
                <select value={courseForm.quadrimester} onChange={(event) => setCourseForm({ ...courseForm, quadrimester: Number(event.target.value) })} required>
                  {Array.from({ length: 9 }, (_, index) => <option key={index + 1} value={index + 1}>{index + 1}° cuatrimestre</option>)}
                </select>
              </label>
              <label className="field">
                <span>Fecha de inicio</span>
                <input
                  type="date"
                  value={courseForm.startsAt}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      startsAt: event.target.value,
                    })
                  }
                  required
                />
              </label>
              <label className="field">
                <span>Fecha de término</span>
                <input
                  type="date"
                  value={courseForm.endsAt}
                  onChange={(event) =>
                    setCourseForm({
                      ...courseForm,
                      endsAt: event.target.value,
                    })
                  }
                  required
                />
              </label>
            </div>

            <div className="assignment-section">
              <div className="assignment-section__heading">
                <div>
                  <strong>Alumnos que cursarán la materia</strong>
                  <span>Busca y agrega uno o varios alumnos.</span>
                </div>
                <span className="selection-count">
                  <Users size={15} />
                  {selectedStudents.length} seleccionados
                </span>
              </div>
              <div className="selected-students">
                {selectedStudents.map((student) => (
                  <span key={student.id}>
                    {student.firstName} {student.lastName}
                    <button
                      type="button"
                      onClick={() => removeStudent(student.id)}
                      aria-label={`Quitar a ${student.firstName}`}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
                {!selectedStudents.length && (
                  <p>Aún no has agregado alumnos.</p>
                )}
              </div>
              <div className="course-form-grid">
                <label className="field"><span>Filtrar alumnos por carrera</span><select value={assignmentCareerId} onChange={(event) => void loadBulkCandidates(event.target.value, '')}><option value="">Selecciona una carrera</option>{careers.map((career) => <option key={career.id} value={career.id}>{career.name}</option>)}</select></label>
                <label className="field"><span>Filtrar por generación</span><select value={assignmentCohortId} disabled={!assignmentCareerId} onChange={(event) => void loadBulkCandidates(assignmentCareerId, event.target.value)}><option value="">Todas las generaciones</option>{careers.find((career) => career.id === assignmentCareerId)?.cohorts.map((cohort) => <option key={cohort.id} value={cohort.id}>{cohort.name}</option>)}</select></label>
                <button type="button" className="button button--secondary filter-clear-button" onClick={() => { setAssignmentCareerId(''); setAssignmentCohortId(''); setBulkCandidates([]); setBulkSelectedIds([]); }} disabled={!assignmentCareerId}><X size={16} />Limpiar filtros</button>
              </div>
              {bulkCandidates.length > 0 && <div className="bulk-student-picker">
                <label className="bulk-student-row bulk-student-row--all"><input type="checkbox" checked={bulkSelectedIds.length === bulkCandidates.length} onChange={(event) => setBulkSelectedIds(event.target.checked ? bulkCandidates.map((student) => student.id) : [])} /><span>Seleccionar todos ({bulkCandidates.length})</span></label>
                {bulkCandidates.map((student) => <label className="bulk-student-row" key={student.id}><input type="checkbox" checked={bulkSelectedIds.includes(student.id)} onChange={(event) => setBulkSelectedIds((current) => event.target.checked ? [...current, student.id] : current.filter((id) => id !== student.id))} /><span><strong>{student.firstName} {student.lastName}</strong><small>{student.cohort?.name} · {student.email}</small></span></label>)}
                <button type="button" className="button button--primary" disabled={!bulkSelectedIds.length} onClick={() => void confirmBulkStudents()}>Agregar seleccionados ({bulkSelectedIds.length})</button>
              </div>}
              <div
                className="assignment-search"
              >
                <Search size={17} />
                <input
                  value={assignmentQuery}
                  onChange={(event) => setAssignmentQuery(event.target.value)}
                  placeholder="Buscar alumno por nombre o correo"
                  aria-label="Buscar alumno para asignar"
                />
                <button
                  type="button"
                  className="button button--secondary"
                  onClick={() => void searchStudents(undefined, 'assignment')}
                >
                  Buscar
                </button>
              </div>
              {assignmentResults.length > 0 && (
                <div className="assignment-results">
                  {assignmentResults.map((student) => (
                    <button
                      type="button"
                      key={student.id}
                      onClick={() => addStudent(student)}
                    >
                      <span>
                        <strong>
                          {student.firstName} {student.lastName}
                        </strong>
                        <small>{student.email}</small>
                      </span>
                      <UserPlus size={17} />
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="modal-actions">
              <button
                type="button"
                className="button button--secondary"
                onClick={() => setShowOfferingModal(false)}
              >
                Cancelar
              </button>
              <button className="button button--primary" disabled={creatingOffering}>
                <BookPlus size={17} />
                {creatingOffering ? 'Creando materia...' : 'Crear materia mensual'}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
