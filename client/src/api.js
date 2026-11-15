// Dirección de la API: vacía en desarrollo (usa el proxy de Vite) o definida al publicar
const BASE = import.meta.env.VITE_API_URL || '';

export async function api(ruta, { method = 'GET', cuerpo } = {}) {
  let respuesta;
  try {
    respuesta = await fetch(`${BASE}${ruta}`, {
      method,
      credentials: 'include',
      headers: {
        ...(cuerpo ? { 'Content-Type': 'application/json' } : {}),
      },
      body: cuerpo ? JSON.stringify(cuerpo) : undefined,
    });
  } catch {
    throw Object.assign(new Error('No hay conexión a internet. Revise sus datos o el wifi.'), { status: 0 });
  }
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    throw Object.assign(new Error(datos.mensaje || 'Ocurrió un error. Intente de nuevo.'), { status: respuesta.status });
  }
  return datos;
}
