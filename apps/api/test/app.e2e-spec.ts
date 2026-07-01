import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request = require('supertest');
import { AppModule } from '../src/app.module';

describe('Campus API', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleRef.createNestApplication();
    app.setGlobalPrefix('api');
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, transform: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  async function login(email: string) {
    const response = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({ identifier: email, password: 'Demo123!' })
      .expect(201);

    return response.body.accessToken as string;
  }

  function currentMonthRange(reference = new Date()) {
    const year = reference.getUTCFullYear();
    const month = reference.getUTCMonth();
    const startsAt = new Date(Date.UTC(year, month, 1));
    const endsAt = new Date(Date.UTC(year, month + 1, 0));

    return {
      startsAt: startsAt.toISOString().slice(0, 10),
      endsAt: endsAt.toISOString().slice(0, 10),
    };
  }

  it('oculta las calificaciones cuando el alumno tiene pago pendiente', async () => {
    const token = await login('alumno2@universidad.mx');

    const response = await request(app.getHttpServer())
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.currentCourses).toHaveLength(1);
    expect(response.body.history).toHaveLength(1);
    expect(response.body.currentCourses[0].canViewGrades).toBe(false);
    expect(response.body.currentCourses[0].grades).toBeNull();
    expect(response.body.history[0].grades).toBeNull();
  });

  it('muestra las calificaciones cuando el alumno está al corriente', async () => {
    const token = await login('alumno@universidad.mx');

    const response = await request(app.getHttpServer())
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.currentCourses).toHaveLength(1);
    expect(response.body.history).toHaveLength(2);
    expect(response.body.currentCourses[0].canViewGrades).toBe(true);
    expect(response.body.currentCourses[0].grades.finalGrade).toBeGreaterThan(0);
  });

  it('permite al admin descargar datos de kárdex de un alumno', async () => {
    const token = await login('admin@universidad.mx');
    const search = await request(app.getHttpServer())
      .get('/api/admin/students/search?q=Diego')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const studentId = search.body.students[0].id;

    const response = await request(app.getHttpServer())
      .get(`/api/admin/users/${studentId}/transcript`)
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(response.body.user.id).toBe(studentId);
    expect(response.body.history.length).toBeGreaterThan(0);
    expect(response.body.history[0].grades).not.toBeNull();
    expect(response.body.generalAverage).toBeTruthy();
  });

  it('permite al docente actualizar una calificación de su grupo', async () => {
    const token = await login('maestro@universidad.mx');
    const dashboard = await request(app.getHttpServer())
      .get('/api/teacher/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const currentOffering = dashboard.body.offerings.find(
      (offering: { course: { code: string } }) =>
        offering.course.code === 'PRO-301',
    );
    const enrollmentId = currentOffering.students[0].enrollmentId;

    const response = await request(app.getHttpServer())
      .patch(`/api/teacher/enrollments/${enrollmentId}/grade`)
      .set('Authorization', `Bearer ${token}`)
      .send({ finalGrade: 97 })
      .expect(200);

    expect(response.body.finalGrade).toBe(97);
  });

  it('impide eliminar docentes con materias asignadas y explica qué hacer', async () => {
    const adminToken = await login('admin@universidad.mx');
    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const assignedTeacher = dashboard.body.teachers[0];

    const response = await request(app.getHttpServer())
      .delete(`/api/admin/users/${assignedTeacher.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(400);

    expect(response.body.message).toContain('No se puede eliminar este docente');
    expect(response.body.message).toContain('Primero cambia el maestro responsable');
  });

  it('permite al administrativo aprobar un pago', async () => {
    const token = await login('admin@universidad.mx');
    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);
    const pendingPayment = dashboard.body.payments.find(
      (payment: { status: string }) => payment.status === 'PENDING',
    );

    const partialPayment = await request(app.getHttpServer())
      .patch(`/api/admin/payments/${pendingPayment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PENDING', amount: 1500, paidAt: '2026-02-10' })
      .expect(200);

    expect(partialPayment.body.status).toBe('PENDING');
    expect(partialPayment.body.amount).toBe(1500);
    expect(partialPayment.body.paidAt).toContain('2026-02-10');

    const response = await request(app.getHttpServer())
      .patch(`/api/admin/payments/${pendingPayment.id}`)
      .set('Authorization', `Bearer ${token}`)
      .send({ status: 'PAID', paidAt: '2026-02-14' })
      .expect(200);

    expect(response.body.status).toBe('PAID');
    expect(response.body.paidAt).toContain('2026-02-14');
  });

  it('permite al admin ocultar un alumno únicamente en una materia', async () => {
    const adminToken = await login('admin@universidad.mx');
    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const offering = dashboard.body.offerings.find(
      (item: { course: { code: string } }) => item.course.code === 'PRO-301',
    );
    const enrollment = offering.students[0];

    await request(app.getHttpServer())
      .patch(`/api/admin/enrollments/${enrollment.enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visibleToTeacher: false, finalGrade: 91 })
      .expect(200);

    const teacherToken = await login('maestro@universidad.mx');
    const teacherDashboard = await request(app.getHttpServer())
      .get('/api/teacher/dashboard')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    const teacherOffering = teacherDashboard.body.offerings.find(
      (item: { id: string }) => item.id === offering.id,
    );
    expect(
      teacherOffering.students.some(
        (item: { enrollmentId: string }) =>
          item.enrollmentId === enrollment.enrollmentId,
      ),
    ).toBe(false);

    await request(app.getHttpServer())
      .patch(`/api/admin/enrollments/${enrollment.enrollmentId}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ visibleToTeacher: true })
      .expect(200);
  });

  it('busca alumnos sin devolver el directorio completo en el dashboard', async () => {
    const token = await login('admin@universidad.mx');

    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(dashboard.body.users).toBeUndefined();
    expect(dashboard.body.teachers).toHaveLength(1);

    const search = await request(app.getHttpServer())
      .get('/api/admin/students/search?q=Andrea')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    expect(search.body.students).toHaveLength(1);
    expect(search.body.students[0].email).toBe('alumno@universidad.mx');
  });

  it('organiza alumnos por carrera y generación', async () => {
    const token = await login('admin@universidad.mx');

    const cohort = await request(app.getHttpServer())
      .post('/api/admin/cohorts')
      .set('Authorization', `Bearer ${token}`)
      .send({
        careerName: 'Derecho',
        cohortName: 'Septiembre 2026',
        startsAt: '2026-09-01',
      })
      .expect(201);

    const student = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${token}`)
      .send({
        username: 'DER-SEP-2026-001',
        firstName: 'Lucía',
        lastName: 'Álvarez',
        email: 'lucia.alvarez@esparta.edu.mx',
        role: 'STUDENT',
        cohortId: cohort.body.id,
      })
      .expect(201);

    expect(student.body.user.cohort.name).toBe('Septiembre 2026');
    expect(student.body.user.cohort.career.name).toBe('Derecho');

    const structure = await request(app.getHttpServer())
      .get('/api/admin/academic-structure')
      .set('Authorization', `Bearer ${token}`)
      .expect(200);

    const derecho = structure.body.careers.find(
      (career: { name: string }) => career.name === 'Derecho',
    );
    expect(derecho.cohorts[0].studentCount).toBe(1);
  });

  it('permite crear una materia mensual con docente y alumnos asignados', async () => {
    const adminToken = await login('admin@universidad.mx');
    const monthRange = currentMonthRange();
    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const search = await request(app.getHttpServer())
      .get('/api/admin/students/search?q=Andrea')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const created = await request(app.getHttpServer())
      .post('/api/admin/offerings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseCode: 'UX-401',
        courseName: 'Diseño de Experiencia',
        section: 'JUN-UX',
        teacherId: dashboard.body.teachers[0].id,
        studentIds: [search.body.students[0].id],
        startsAt: monthRange.startsAt,
        endsAt: monthRange.endsAt,
      })
      .expect(201);

    expect(created.body.studentCount).toBe(1);

    const teacherToken = await login('maestro@universidad.mx');
    const teacherDashboard = await request(app.getHttpServer())
      .get('/api/teacher/dashboard')
      .set('Authorization', `Bearer ${teacherToken}`)
      .expect(200);
    expect(
      teacherDashboard.body.offerings.some(
        (offering: { course: { code: string } }) =>
          offering.course.code === 'UX-401',
      ),
    ).toBe(true);

    const updatedDashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    const offeringWithStudents = updatedDashboard.body.offerings.find(
      (offering: { course: { code: string } }) =>
        offering.course.code === 'UX-401',
    );
    expect(offeringWithStudents.students).toHaveLength(1);
    expect(offeringWithStudents.students[0].email).toBe('alumno@universidad.mx');

    const studentToken = await login('alumno@universidad.mx');
    const studentDashboard = await request(app.getHttpServer())
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${studentToken}`)
      .expect(200);
    expect(
      studentDashboard.body.currentCourses.some(
        (course: { course: { code: string } }) =>
          course.course.code === 'UX-401',
      ),
    ).toBe(true);
  });

  it('administra cuentas manuales y sincroniza el pago con las materias del alumno', async () => {
    const adminToken = await login('ADMIN-ESPARTA');
    const monthRange = currentMonthRange();

    const teacher = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'DOC-ELENA',
        firstName: 'Elena',
        lastName: 'Torres',
        email: 'elena.torres@esparta.edu.mx',
        role: 'TEACHER',
      })
      .expect(201);

    expect(teacher.body.credentials.username).toBe('DOC-ELENA');
    expect(teacher.body.credentials.password).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: teacher.body.credentials.username,
        password: teacher.body.credentials.password,
      })
      .expect(201);

    const student = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'ESP-MATEO-2026',
        firstName: 'Mateo',
        lastName: 'Santos',
        email: 'mateo.santos@esparta.edu.mx',
        role: 'STUDENT',
      })
      .expect(201);

    expect(student.body.credentials.username).toBe('ESP-MATEO-2026');

    const userDirectory = await request(app.getHttpServer())
      .get('/api/admin/users?role=STUDENT&q=Mateo')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(userDirectory.body.users).toHaveLength(1);
    expect(userDirectory.body.users[0].username).toBe('ESP-MATEO-2026');

    await request(app.getHttpServer())
      .post('/api/admin/offerings')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        courseCode: 'PAY-401',
        courseName: 'Control de pagos',
        section: 'JUN-PAY',
        teacherId: teacher.body.user.id,
        studentIds: [student.body.user.id],
        startsAt: monthRange.startsAt,
        endsAt: monthRange.endsAt,
      })
      .expect(201);

    const paymentUpdate = await request(app.getHttpServer())
      .patch(`/api/admin/users/${student.body.user.id}/payment`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'PAID' })
      .expect(200);
    expect(paymentUpdate.body.status).toBe('PAID');
    expect(paymentUpdate.body.periodsUpdated).toBeGreaterThan(0);

    const studentLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: student.body.credentials.username,
        password: student.body.credentials.password,
      })
      .expect(201);

    const studentDashboard = await request(app.getHttpServer())
      .get('/api/student/dashboard')
      .set('Authorization', `Bearer ${studentLogin.body.accessToken}`)
      .expect(200);
    const paidCourse = studentDashboard.body.currentCourses.find(
      (course: { course: { code: string } }) =>
        course.course.code === 'PAY-401',
    );
    expect(paidCourse.payment.status).toBe('PAID');
    expect(paidCourse.canViewGrades).toBe(true);
    expect(paidCourse.grades).not.toBeNull();

    await request(app.getHttpServer())
      .patch(`/api/admin/users/${student.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ username: 'ESP-MATEO-ACT' })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: 'ESP-MATEO-ACT',
        password: student.body.credentials.password,
      })
      .expect(201);

    const dashboard = await request(app.getHttpServer())
      .get('/api/admin/dashboard')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    expect(
      dashboard.body.teachers.some(
        (account: { username: string }) =>
          account.username === teacher.body.credentials.username,
      ),
    ).toBe(true);

    const disposable = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'ESP-BAJA-2026',
        firstName: 'Cuenta',
        lastName: 'Temporal',
        email: 'temporal@esparta.edu.mx',
        role: 'STUDENT',
      })
      .expect(201);

    await request(app.getHttpServer())
      .delete(`/api/admin/users/${disposable.body.user.id}`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);

    const deletedSearch = await request(app.getHttpServer())
      .get('/api/admin/users?q=ESP-BAJA-2026')
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
    expect(deletedSearch.body.users).toHaveLength(0);
  });

  it('permite cambiar y restablecer la contraseña', async () => {
    const adminToken = await login('ADMIN-ESPARTA');
    const created = await request(app.getHttpServer())
      .post('/api/admin/users')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        username: 'SEC-PASS-2026',
        firstName: 'Sofía',
        lastName: 'Segura',
        email: 'sofia.segura@esparta.edu.mx',
        role: 'STUDENT',
      })
      .expect(201);

    expect(created.body.email.delivered).toBe(false);

    const firstLogin = await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: created.body.credentials.username,
        password: created.body.credentials.password,
      })
      .expect(201);

    await request(app.getHttpServer())
      .patch('/api/auth/password')
      .set('Authorization', `Bearer ${firstLogin.body.accessToken}`)
      .send({
        currentPassword: created.body.credentials.password,
        newPassword: 'Nueva123!',
      })
      .expect(200);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: created.body.credentials.username,
        password: created.body.credentials.password,
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: created.body.credentials.username,
        password: 'Nueva123!',
      })
      .expect(201);

    const recovery = await request(app.getHttpServer())
      .post('/api/auth/password/forgot')
      .send({ identifier: created.body.credentials.username })
      .expect(201);

    expect(recovery.body.resetToken).toBeTruthy();

    await request(app.getHttpServer())
      .post('/api/auth/password/reset')
      .send({
        token: recovery.body.resetToken,
        newPassword: 'Reseteada456!',
      })
      .expect(201);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: created.body.credentials.username,
        password: 'Nueva123!',
      })
      .expect(401);

    await request(app.getHttpServer())
      .post('/api/auth/login')
      .send({
        identifier: created.body.credentials.username,
        password: 'Reseteada456!',
      })
      .expect(201);
  });
});
