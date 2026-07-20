# Deploy de producción en Render Starter y PostgreSQL

La app queda preparada para desplegarse como un servicio Starter en Render y
una base PostgreSQL persistente.
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
5. Confirma el servicio `instituto-esparta` en plan `Starter` y la base
   `instituto-esparta-db`.
6. Captura una contraseña segura en `INITIAL_ADMIN_PASSWORD` cuando Render la
   solicite.
7. Click en `Apply` / `Deploy`.

Cuando termine, Render dara una URL tipo:

```text
https://instituto-esparta.onrender.com
```

Prueba:

```text
https://instituto-esparta.onrender.com/api/health
```

## Producción con PostgreSQL

`render.yaml` describe un servicio web Starter que entrega frontend y API, y
una base PostgreSQL Basic 256 MB. `render.production.yaml` se conserva como
copia equivalente de referencia.

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

El comando de compilación del servicio debe ser
`npm ci --include=dev && npm run build`. La opción `--include=dev` es necesaria
porque Nest CLI y TypeScript participan en la compilación aunque
`NODE_ENV=production`.
