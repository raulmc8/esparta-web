# Instituto Universitario Esparta

MVP de un portal universitario con tres perfiles:

- **Alumno:** consulta la materia vigente y un historial de materias
  finalizadas. La API solo entrega calificaciones cuando el pago del periodo
  tiene estado `PAID`.
- **Docente:** consulta las materias mensuales vigentes, sus alumnos y captura
  calificaciones.
- **Administrativo:** busca alumnos por nombre o correo, modifica sus datos,
  crea materias mensuales, asigna docente y alumnos, y administra pagos.
- **Gestión de usuarios:** crea alumnos y docentes, genera matrícula/usuario y
  contraseña inicial, y vincula cada cuenta con un correo electrónico.

## Tecnología

- NestJS 10 + JWT + TypeORM
- React 18 + Vite
- Base de datos relacional SQL.js (SQLite en WebAssembly) para desarrollo local
  sin instalaciones externas

El modelo relacional separa usuarios, periodos, materias, grupos mensuales,
inscripciones, pagos y calificaciones. Cada grupo tiene fechas propias de
inicio y término, lo que permite clasificar automáticamente materias vigentes,
próximas e históricas. Para producción se recomienda PostgreSQL; las entidades
de TypeORM se pueden conservar y sustituir únicamente la configuración del
controlador de base de datos.

## Ejecutar

Requiere Node.js 16.20 o superior.

```bash
npm install
npm run dev
```

- Web: `http://localhost:5173`
- API: `http://localhost:3000/api`
- Salud de la API: `http://localhost:3000/api/health`

La base de datos y los datos demo se crean automáticamente la primera vez.

## Cuentas demo

Todas usan la contraseña `Demo123!` y permiten iniciar sesión con usuario o
correo.

| Perfil | Usuario |
| --- | --- |
| Alumno con pago | `ESP-2026-0001` |
| Alumno con pago pendiente | `ESP-2026-0002` |
| Docente | `DOC-2026-0001` |
| Administrativo | `ADMIN-ESPARTA` |

## Verificación

```bash
npm test
npm run build
```

Las pruebas cubren la regla de visibilidad por pago, el historial académico, la
actualización de calificaciones, la búsqueda de alumnos, la aprobación de pagos
y la creación de materias mensuales con docente y alumnos asignados.

## Variables de entorno

Puede copiarse `.env.example` como referencia. En producción deben configurarse
al menos un `JWT_SECRET` robusto, el origen permitido del frontend y la conexión
a PostgreSQL.

Para enviar credenciales por correo con la cuenta oficial, el proyecto queda
preconfigurado para Gmail:

```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=instituto.esparta.nacajuca@gmail.com
SMTP_PASS=contraseña-de-aplicación-de-gmail
SMTP_FROM="Instituto Universitario Esparta <instituto.esparta.nacajuca@gmail.com>"
```

`SMTP_PASS` debe ser una contraseña de aplicación de Google, no la contraseña
normal de la cuenta.
