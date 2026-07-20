# Deploy gratuito para pruebas y migración a producción

La app queda preparada para desplegarse como un solo servicio en Render Free.
NestJS sirve la API en `/api` y tambien entrega el frontend compilado de Vite.

## 1. Subir el proyecto a GitHub

Desde la carpeta del proyecto:

```bash
git init
git add .
git commit -m "Preparar deploy de pruebas"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/TU_REPO.git
git push -u origin main
```

El `.gitignore` ya evita subir `.env`, `node_modules`, `dist` y bases SQLite.

## 2. Crear el servicio en Render

1. Entra a https://render.com y crea cuenta con GitHub.
2. Click en `New +` > `Blueprint`.
3. Elige el repo que acabas de subir.
4. Render detectara `render.yaml`.
5. Confirma el servicio `instituto-esparta` en plan `Free`.
6. Click en `Apply` / `Deploy`.

Cuando termine, Render dara una URL tipo:

```text
https://instituto-esparta.onrender.com
```

Prueba:

```text
https://instituto-esparta.onrender.com/api/health
```

## Notas del plan gratis

- El servicio puede dormir despues de unos minutos sin uso y tardar cerca de un
  minuto al despertar.
- La base SQLite esta en disco temporal; en el plan gratis puede reiniciarse y
  volver a los datos demo.
- Para esta prueba no configures Gmail SMTP en Render Free. La recuperacion de
  contrasena mostrara el token/link en pantalla mientras `EXPOSE_RESET_TOKEN`
  este activo.
- Cuando pasen a datos reales, conviene migrar la base a PostgreSQL y apagar
  `EXPOSE_RESET_TOKEN`.

## Producción con PostgreSQL

El archivo `render.production.yaml` describe la arquitectura recomendada:
un servicio web Starter que entrega frontend y API, y una base PostgreSQL
Basic 256 MB. No sustituyas `render.yaml` hasta aprobar los cargos en Render.

Antes del cambio:

1. Detén temporalmente la captura de datos.
2. Conserva una copia de `apps/api/university.sqlite`.
3. Crea PostgreSQL y copia su URL externa como `DATABASE_URL`.
4. Desde la raíz, migra la base local:

```bash
SOURCE_DB_PATH=university.sqlite \
DATABASE_URL='postgresql://...' \
DATABASE_SSL=true \
npm run db:migrate:sqlite-to-postgres -w apps/api
```

El importador crea el esquema mediante migraciones, conserva todos los UUID y
se detiene si PostgreSQL ya contiene usuarios. Después compara en Render los
conteos de usuarios, carreras, materias, inscripciones, pagos y calificaciones.

Para una base nueva sin datos configura `INITIAL_ADMIN_EMAIL`,
`INITIAL_ADMIN_USERNAME` e `INITIAL_ADMIN_PASSWORD`. La contraseña debe tener
al menos 10 caracteres y no puede ser `Demo123!`.

Variables obligatorias/recomendadas de producción:

```text
NODE_ENV=production
DATABASE_URL=<conexión interna de Render>
DATABASE_SSL=false
SEED_DEMO_DATA=false
EXPOSE_RESET_TOKEN=false
JWT_SECRET=<valor largo y aleatorio>
```
