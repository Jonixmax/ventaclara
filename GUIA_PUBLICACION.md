# Guía para publicar VentaClara en internet

Esta guía no se ha probado en un despliegue real: sigue los pasos con calma y revisa cada servicio.
Resumen: la base de datos vive en MongoDB Atlas, la API en Render y la interfaz en Vercel.

## 0. Antes de empezar

- Código subido a GitHub (el archivo `.env` NO debe estar en el repositorio).
- Cuentas en MongoDB Atlas, Render y Vercel.
- Costos a tener en cuenta (revisa siempre las páginas oficiales):
  - Render: el plan gratuito puede suspender el servicio por inactividad; para uso diario conviene un plan de pago.
  - Vercel: el plan gratuito (Hobby) no permite uso comercial; para vender el sistema se necesita el plan Pro.
  - MongoDB Atlas: el nivel gratuito sirve para empezar.

## 1. Base de datos de producción (Atlas)

1. En el mismo clúster crea una base nueva llamada `ventaclara` (sin `_dev`). Se crea sola al guardar el primer dato.
2. Crea un usuario de base de datos con una contraseña larga, solo con letras y números.
3. En Network Access, Render no tiene una IP fija en todos los planes: la opción práctica es permitir el acceso desde cualquier lugar (`0.0.0.0/0`).
   Eso solo es seguro si la contraseña del usuario es fuerte, así que no la reutilices.
4. La cadena de conexión queda así:
   `mongodb+srv://USUARIO:CONTRASENA@cluster0.xxxxx.mongodb.net/ventaclara?retryWrites=true&w=majority`

## 2. Crear la cuenta de la propietaria (una sola vez, desde tu computadora)

En `server/.env` pon la cadena de PRODUCCIÓN y corre:

```bash
cd server
npm run inicializar -- --usuario elsy --nombre "Elsy Elizabeth Cruz Romero" --password "UnaClaveSegura1"
```

Esto crea los 3 rubros, los contadores y la cuenta de la propietaria. No borra nada y no carga productos de ejemplo.
No uses `npm run seed` en producción: ese script es solo para la base de desarrollo.
Después vuelve a poner en tu `.env` la cadena de desarrollo.

## 3. API en Render

1. New > Web Service, y conecta el repositorio de GitHub.
2. Root Directory: `server`
3. Build Command: `npm install`  |  Start Command: `npm start`
4. Variables de entorno:
   - `MONGODB_URI`: la cadena de producción del paso 1
   - `JWT_SECRET`: un texto largo y aleatorio NUEVO (genéralo con `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`)
   - `CLIENT_URL`: la dirección de Vercel del paso 4, sin barra al final (puedes ponerla después de crear el sitio en Vercel)
   - `NODE_VERSION`: `22` (Mongoose necesita Node 20.19 o superior)
5. Cuando termine, abre `https://TU-SERVICIO.onrender.com/api/salud`: debe responder `{"estado":"ok"}`.

## 4. Interfaz en Vercel

1. Add New > Project, y elige el mismo repositorio.
2. Root Directory: `client`. Framework: Vite. Build: `npm run build`. Output: `dist`.
3. Variable de entorno: `VITE_API_URL` = la dirección de Render (por ejemplo `https://TU-SERVICIO.onrender.com`, sin barra al final).
4. El archivo `client/vercel.json` ya hace que las direcciones internas (como `/inventario`) funcionen al recargar la página.
5. Copia la dirección de Vercel y ponla en `CLIENT_URL` en Render; luego reinicia el servicio de Render.

## 5. Primer uso real

1. Entra con la cuenta de la propietaria.
2. En Inventario > Agregar producto, carga el catálogo real (precio, costo y existencias iniciales).
3. Crea al empleado en Usuarios del sistema.
4. Haz una venta de prueba y un cierre de caja para confirmar que todo funciona, y borra esos datos de prueba desde Atlas si no los quieres.

## 6. Lista de revisión

- [ ] `.env` no está en GitHub
- [ ] `JWT_SECRET` de producción es distinto al de desarrollo
- [ ] No quedan contraseñas de demostración (`Ventaclara2026`) en la base de producción
- [ ] La dirección del sitio abre con `https://`
- [ ] El empleado no ve costos, reportes ni compras
- [ ] Hay un respaldo de los datos (Atlas ofrece copias de seguridad según el nivel contratado: confirma lo que incluye el tuyo)
