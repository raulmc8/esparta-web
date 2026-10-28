import { existsSync, readFileSync } from 'fs';
import { join } from 'path';
import { jsPDF } from 'jspdf';
import { Payment } from '../database/entities';
import { PaymentStatus } from '../database/enums';

const BLUE = [22, 47, 139] as const;

function formatCurrency(amount: number) {
  return `$${amount.toLocaleString('es-MX', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: Date) {
  return new Intl.DateTimeFormat('es-MX', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(value);
}

function loadLogo() {
  const candidates = [
    join(process.cwd(), 'apps/web/public/instituto-esparta.jpg'),
    join(process.cwd(), 'public/instituto-esparta.jpg'),
  ];
  const logoPath = candidates.find((candidate) => existsSync(candidate));
  return logoPath
    ? `data:image/jpeg;base64,${readFileSync(logoPath).toString('base64')}`
    : null;
}

export function createPaymentReceiptPdf(payment: Payment) {
  const doc = new jsPDF({ unit: 'mm', format: 'letter' });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const fullName = `${payment.student.firstName} ${payment.student.lastName}`;
  const folio = payment.id.slice(0, 8).toUpperCase();
  const isPaid = payment.status === PaymentStatus.PAID;
  const statusLabel = isPaid
    ? 'Pagado - liquidación total'
    : payment.status === PaymentStatus.PENDING
      ? 'Pendiente - abono parcial'
      : 'Vencido';
  const logo = loadLogo();

  doc.setFillColor(...BLUE);
  doc.rect(0, 0, pageWidth, 35, 'F');
  if (logo) {
    doc.addImage(logo, 'JPEG', 13, 4, 68, 23);
  } else {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(15);
    doc.setTextColor(255, 255, 255);
    doc.text('INSTITUTO UNIVERSITARIO ESPARTA', 13, 17);
  }
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(8.5);
  doc.setTextColor(255, 255, 255);
  doc.text('Campus Guatacalca', 47, 32, { align: 'center' });

  doc.setTextColor(25, 35, 60);
  doc.setFontSize(15);
  doc.text('Recibo de pago', 14, 45);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 120);
  doc.text(
    `Folio ${folio} - Fecha de emisión ${new Intl.DateTimeFormat('es-MX').format(new Date())}`,
    14,
    51,
  );

  doc.setDrawColor(218, 224, 234);
  doc.setFillColor(247, 249, 253);
  doc.roundedRect(14, 60, 188, 42, 3, 3, 'FD');
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(25, 35, 60);
  doc.text('RECIBIMOS DE', 21, 70);
  doc.setFontSize(14);
  doc.text(fullName, 21, 79);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(90, 100, 120);
  doc.text(payment.student.email, 21, 86);
  doc.text(`Periodo: ${payment.term.name}`, 21, 94);

  const columns = [14, 60, 107, 155, 202];
  doc.setFillColor(...BLUE);
  doc.rect(14, 112, 188, 12, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8.5);
  doc.text('Concepto', 18, 120);
  doc.text('Estado', 64, 120);
  doc.text('Fecha de pago', 111, 120);
  doc.text('Monto recibido', 198, 120, { align: 'right' });

  doc.setDrawColor(205, 211, 220);
  doc.rect(14, 124, 188, 14);
  columns.slice(1, -1).forEach((x) => doc.line(x, 124, x, 138));
  doc.setTextColor(75, 75, 75);
  doc.setFontSize(8.3);
  doc.text('Pago de colegiatura', 18, 133);
  doc.text(statusLabel, 64, 133);
  doc.text(formatDate(payment.paidAt ?? new Date()), 111, 133);
  doc.setFont('helvetica', 'bold');
  doc.text(formatCurrency(payment.amount), 198, 133, { align: 'right' });

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 90, 108);
  doc.text(
    isPaid
      ? 'Este recibo acredita la liquidación total del periodo indicado.'
      : 'Este recibo acredita un abono parcial. El periodo conserva saldo pendiente.',
    14,
    151,
  );
  doc.setDrawColor(150, 160, 177);
  doc.line(64, 195, 152, 195);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(45, 55, 75);
  doc.text('Administración / Firma y sello', 108, 201, { align: 'center' });

  doc.setDrawColor(220, 225, 235);
  doc.line(14, pageHeight - 14, pageWidth - 14, pageHeight - 14);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(110, 120, 140);
  doc.text('Instituto Universitario Esparta', 14, pageHeight - 8);
  doc.text('Página 1 de 1', pageWidth - 14, pageHeight - 8, {
    align: 'right',
  });

  return Buffer.from(doc.output('arraybuffer'));
}
