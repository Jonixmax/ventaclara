# VentaClara - Prototipo

Sistema web de ventas e inventario para comercios multirubro (Tienda Emmanuel, Tonacatepeque).

## Estructura

```
ventaclara/
  server/    API REST (Node.js, Express y MongoDB)
    src/models/       colecciones: Usuario, Rubro, Producto, Venta, CierreCaja, Contador
    src/middleware/   sesión (token) y permisos por rol
    src/services/     lógica de negocio: inicio de sesión y ventas (con transacción)
    src/routes/       rutas de la API
    src/utils/        funciones: semáforo de stock, dinero, fechas, folio
    src/scripts/      seed.js (datos de ejemplo)
    test/             30 pruebas automáticas (no necesitan base de datos)
  client/    Interfaz web (React + Vite)
    src/paginas/      Login, Panel, Venta, Inventario, Comprobante, Reportes (pendiente)
    src/componentes/  estructura común y etiqueta del semáforo
    src/estilos.css   temas y estilos (punto 8 del documento)
```

## Puesta en marcha

Requisitos: Node.js 22 LTS (mínimo 20.19) y una cuenta en MongoDB Atlas. Verifique con `node -v`.

**Terminal 1: servidor**

1. `cd server` y luego `npm install`
2. Copiar `.env.example` como `.env` y completar `MONGODB_URI` y `JWT_SECRET`
   (la base debe llamarse `ventaclara_dev`; el seed lo exige para no borrar datos reales)
3. `npm run seed` carga rubros, usuarios y productos de ejemplo
4. `npm run dev` inicia la API en http://localhost:4000
5. `npm test` ejecuta las pruebas automáticas

**Terminal 2: interfaz**

1. `cd client` y luego `npm install`
2. `npm run dev` y abrir http://localhost:5173

## Usuarios de ejemplo (cambiar la contraseña antes de usar datos reales)

| Rol | Usuario | Contraseña |
|---|---|---|
| Propietaria | elsy | Ventaclara2026 |
| Empleado | empleado1 | Ventaclara2026 |

## Rutas de la API

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | /api/salud | Público | Verifica que la API esté activa |
| POST | /api/auth/login | Público | Inicia sesión y devuelve el token |
| GET | /api/rubros | Con sesión | Lista los rubros |
| GET | /api/productos | Con sesión | Catálogo (opcional `?rubroId=`) |
| GET | /api/productos/alertas | Con sesión | Productos por agotarse |
| POST | /api/ventas | Propietaria y empleado | Registra una venta (descuenta stock y numera el comprobante) |
| GET | /api/ventas/resumen-hoy | Solo propietaria | Total del día y desglose por rubro |

## Reglas del equipo

- El archivo `.env` NUNCA se sube a GitHub (ya está en `.gitignore`).
- El precio de una venta lo decide la API con el catálogo; el navegador nunca lo envía.
