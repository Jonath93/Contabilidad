# Contabilidad App

Aplicacion local en Node.js, Express, EJS, Prisma y PostgreSQL para registrar deudas, tarjetas, estados de cuenta y pagos proyectados.

## Requisitos

- Node.js 22+
- PostgreSQL local
- Base de datos `ContabilidadApp`

## Configuracion

La conexion local esta en `.env`:

## Comandos

```bash
npm install
npm run db:push
npm run dev
```

Abre `http://localhost:3000`.

## Flujo sugerido

1. Configura tu perfil y sueldo mensual.
2. Agrega tarjetas con dia de corte y dia de pago.
3. Registra deudas manuales o recurrentes.
4. Sube estados de cuenta PDF y revisa las compras detectadas antes de guardarlas.
