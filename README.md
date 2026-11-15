# VentaClara

Sistema web de ventas, compras e inventario para comercios multirubro (Tienda Emmanuel, Tonacatepeque).

## Qué incluye

- Inicio de sesión con roles (propietaria y empleado); la sesión usa una cookie HttpOnly y limita intentos fallidos.
- Ventas por rubro con dinero recibido y vuelto, historial y comprobantes imprimibles; la propietaria puede anular ventas de días sin cierre y devolver el inventario.
- Compras de mercadería: cantidad, costo por unidad y proveedor; pueden registrarse al recibirlas o programarse en un calendario. Los pedidos programados solo actualizan el inventario al marcarlos como recibidos.
- Inventario fácil de leer: estados con texto (pedir ya, por agotarse, bien), barra de nivel, cantidad sugerida a comprar, valor del inventario y lista de pedido para el proveedor.
- Reportes de hoy y del mes: ventas, ganancia estimada por rubro y compras; cierre de caja con diferencia.
- Modo claro y oscuro.

## Estructura

```
ventaclara/
  server/    API REST (Node.js, Express y MongoDB)
    src/models/       Usuario, Rubro, Producto, Venta, Compra, PedidoCompra, CierreCaja, Contador
    src/middleware/   sesión (token) y permisos por rol
    src/services/     sesión, ventas, compras, productos, cierre de caja y usuarios
    src/routes/       rutas de la API
    src/utils/        semáforo, dinero, fechas, folios, pago, visibilidad de costos
    src/scripts/      seed.js (datos de ejemplo) e inicializar.js (sistema real)
    test/             pruebas automáticas (no necesitan base de datos)
  client/    Interfaz web (React + Vite)
  GUIA_PUBLICACION.md   cómo publicar con Atlas, Render y Vercel
```

## Puesta en marcha (desarrollo)

Requisitos: Node.js 22 LTS (mínimo 20.19) y una cuenta en MongoDB Atlas.

**Terminal 1: servidor**
1. `cd server` y luego `npm install`
2. Copiar `.env.example` como `.env` y completar `MONGODB_URI` (base `ventaclara_dev`) y `JWT_SECRET`
3. `npm run seed` carga datos de ejemplo (borra lo anterior)
4. `npm run dev` inicia la API en http://localhost:4000
5. `npm test` ejecuta las pruebas automáticas

**Terminal 2: interfaz**
1. `cd client` y luego `npm install`
2. `npm run dev` y abrir http://localhost:5173

## Usuarios de ejemplo (solo desarrollo)

| Rol | Usuario | Contraseña |
|---|---|---|
| Propietaria | elsy | Ventaclara2026 |
| Empleado | empleado1 | Ventaclara2026 |

## Rutas de la API

| Método | Ruta | Quién | Descripción |
|---|---|---|---|
| GET | /api/salud | Público | Verifica que la API esté activa |
| POST | /api/auth/login | Público | Inicia sesión y establece una cookie HttpOnly |
| GET | /api/auth/session | Con sesión | Recupera la sesión activa |
| POST | /api/auth/logout | Público | Cierra la sesión |
| GET | /api/rubros | Con sesión | Lista los rubros |
| GET | /api/productos | Con sesión | Catálogo (el costo solo lo recibe la propietaria) |
| GET | /api/productos?todos=1 | Propietaria | Incluye productos inactivos |
| GET | /api/productos/alertas | Con sesión | Productos por agotarse |
| POST / PUT | /api/productos, /api/productos/:id | Propietaria | Agrega o edita productos |
| POST | /api/ventas | Propietaria y empleado | Registra una venta (stock, folio, costo y vuelto) |
| GET | /api/ventas?desde=AAAA-MM-DD&hasta=AAAA-MM-DD&comprobante=V-000001 | Propietaria y empleado | Historial filtrado y paginado |
| GET | /api/ventas/:id | Propietaria y empleado | Consulta venta para reimprimir el comprobante |
| POST | /api/ventas/:id/anular | Solo propietaria | Anula con motivo y devuelve existencias; no permite anular días cerrados |
| GET | /api/ventas/resumen-hoy | Propietaria | Total del día y desglose por rubro |
| POST | /api/compras | Propietaria | Registra una compra: suma existencias y guarda el costo |
| GET | /api/compras | Propietaria | Historial de compras |
| POST | /api/compras/pedidos | Propietaria | Programa un pedido con su fecha esperada de recepción sin cambiar existencias |
| GET | /api/compras/pedidos | Propietaria | Lista pedidos pendientes para el calendario |
| POST | /api/compras/pedidos/:id/recibir | Propietaria | Marca un pedido como recibido, registra la compra y suma existencias |
| GET | /api/reportes/rubros?periodo=hoy\|mes | Propietaria | Ventas, ganancia y compras |
| GET | /api/cierres/previsualizar | Propietaria | Total del sistema hoy y si ya hay cierre |
| POST | /api/cierres | Propietaria | Guarda el cierre de caja del día (uno por día) |
| GET / POST / PUT | /api/usuarios, /api/usuarios/:id | Propietaria | Administra empleados |

## Reglas del equipo

- El archivo `.env` NUNCA se sube a GitHub (ya está en `.gitignore`).
- El precio de una venta lo decide la API con el catálogo; el navegador nunca lo envía.
- El costo de compra es solo de la propietaria: el empleado nunca lo recibe.
- `CLIENT_URL` debe ser el origen exacto del cliente publicado (protocolo y dominio, sin rutas). En producción el servidor debe usar HTTPS para la cookie de sesión. Para evitar bloqueos de cookies entre sitios, publica cliente y API bajo el mismo sitio (por ejemplo, subdominios) o configura un proxy del API en el dominio del cliente.
- Para publicar el sistema, sigue `GUIA_PUBLICACION.md`.
