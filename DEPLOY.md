# Deploy gratis para pruebas

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
