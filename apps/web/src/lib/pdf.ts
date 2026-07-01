import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AdminOffering, StudentCourse, TeacherOffering, User } from '../types';

const BLUE = [22, 47, 139] as const;

async function loadLogo() {
  const response = await fetch('/instituto-esparta.jpg');
  const blob = await response.blob();
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });
}

function drawLetterhead(
  doc: jsPDF,
  logo: string,
  title: string,
  subtitle: string,
) {
  const width = doc.internal.pageSize.getWidth();
  doc.setFillColor(...BLUE);
  doc.rect(0, 0, width, 35, 'F');
  doc.addImage(logo, 'JPEG', 13, 6, 73, 27);
  doc.setTextColor(25, 35, 60);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(15);
  doc.text(title, 14, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 120);
  doc.text(subtitle, 14, 51);
}

function addFooter(doc: jsPDF) {
  const pages = doc.getNumberOfPages();
  for (let page = 1; page <= pages; page += 1) {
    doc.setPage(page);
    const width = doc.internal.pageSize.getWidth();
    const height = doc.internal.pageSize.getHeight();
    doc.setDrawColor(220, 225, 235);
    doc.line(14, height - 14, width - 14, height - 14);
    doc.setFontSize(8);
    doc.setTextColor(110, 120, 140);
    doc.text('Instituto Universitario Esparta', 14, height - 8);
    doc.text(`Página ${page} de ${pages}`, width - 14, height - 8, {
      align: 'right',
    });
  }
}

function safeFileName(value: string) {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .toLowerCase();
}

type OfferingReport = Pick<
  AdminOffering,
  'course' | 'section' | 'term' | 'teacher' | 'students'
> | {
  course: TeacherOffering['course'];
  section: string;
  term: string;
  teacher?: {
    name: string;
  };
  students: Array<{
    student: { name: string; email: string; username: string | null };
    grades: { finalGrade: number | null };
  }>;
};

export async function downloadOfferingReport(offering: OfferingReport) {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const adminStudents = 'finalGrade' in (offering.students[0] ?? {});
  const rows = offering.students.map((entry, index) => {
    if (adminStudents) {
      const student = entry as AdminOffering['students'][number];
      return [
        String(index + 1),
        `${student.firstName} ${student.lastName}`,
        student.username ?? '—',
        `${offering.course.code} - ${offering.course.name}`,
        offering.term,
        student.finalGrade ?? '—',
        '',
      ];
    }
    const student = entry as TeacherOffering['students'][number];
    return [
      String(index + 1),
      student.student.name,
      student.student.username ?? '—',
      `${offering.course.code} - ${offering.course.name}`,
      offering.term,
      student.grades.finalGrade ?? '—',
      '',
    ];
  });
  const title = 'Lista de alumnos y calificaciones';
  const teacherName =
    'teacher' in offering && offering.teacher
      ? offering.teacher.name
      : '—';
  const subtitle = `Profesor: ${teacherName} · Periodo: ${offering.term}`;

  autoTable(doc, {
    head: [
      [
        '#',
        'Alumno',
        'Matrícula',
        'Materia',
        'Periodo',
        'Calificación final',
        'Firma del alumno',
      ],
    ],
    body: rows,
    startY: 58,
    margin: { top: 58, left: 14, right: 14, bottom: 20 },
    theme: 'grid',
    styles: {
      font: 'helvetica',
      fontSize: 7.6,
      cellPadding: 2.3,
      minCellHeight: 9,
    },
    headStyles: { fillColor: [...BLUE], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: {
      0: { cellWidth: 9, halign: 'center' },
      1: { cellWidth: 35 },
      2: { cellWidth: 24 },
      3: { cellWidth: 47 },
      4: { cellWidth: 28 },
      5: { cellWidth: 22, halign: 'center' },
      6: { cellWidth: 23 },
    },
    willDrawPage: () => drawLetterhead(doc, logo, title, subtitle),
  });
  addFooter(doc);
  doc.save(`lista-${safeFileName(offering.course.name)}.pdf`);
}

export async function downloadTranscript(
  user: User,
  history: StudentCourse[],
  generalAverage: string,
) {
  const logo = await loadLogo();
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const title = 'Kárdex académico';
  const subtitle = 'Historial oficial de materias cursadas';

  drawLetterhead(doc, logo, title, subtitle);
  doc.setFontSize(10);
  doc.setTextColor(35, 45, 65);
  doc.setFont('helvetica', 'bold');
  doc.text(`${user.firstName} ${user.lastName}`, 14, 61);
  doc.setFont('helvetica', 'normal');
  doc.text(`Matrícula: ${user.username ?? '—'}`, 14, 67);
  doc.text(`Promedio general: ${generalAverage}`, 138, 67);

  autoTable(doc, {
    head: [['Clave', 'Materia', 'Periodo', 'Créditos', 'Calificación final']],
    body: history.map((course) => [
      course.course.code,
      course.course.name,
      course.term,
      String(course.course.credits),
      course.grades?.finalGrade ?? '—',
    ]),
    startY: 75,
    margin: { top: 58, left: 14, right: 14, bottom: 20 },
    theme: 'grid',
    styles: { font: 'helvetica', fontSize: 8.5, cellPadding: 2.8 },
    headStyles: { fillColor: [...BLUE], textColor: 255 },
    alternateRowStyles: { fillColor: [245, 247, 252] },
    columnStyles: {
      0: { cellWidth: 24 },
      3: { cellWidth: 22, halign: 'center' },
      4: { cellWidth: 33, halign: 'center' },
    },
    willDrawPage: ({ pageNumber }) => {
      if (pageNumber > 1) drawLetterhead(doc, logo, title, subtitle);
    },
  });
  addFooter(doc);
  doc.save(`kardex-${safeFileName(`${user.firstName}-${user.lastName}`)}.pdf`);
}
