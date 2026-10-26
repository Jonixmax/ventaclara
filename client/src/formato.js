export const dinero = (monto) => `$${Number(monto).toFixed(2)}`;

export function saludo(fecha = new Date()) {
  const hora = fecha.getHours();
  if (hora < 12) return 'Buenos días';
  if (hora < 19) return 'Buenas tardes';
  return 'Buenas noches';
}

export const primerNombre = (nombre = '') => nombre.split(' ')[0];

export const fechaHora = (iso) =>
  new Date(iso).toLocaleString('es-SV', { dateStyle: 'short', timeStyle: 'short' });

export const ESTADOS_STOCK = {
  rojo: { texto: 'Pedir ya', clase: 'rojo' },
  amarillo: { texto: 'Por agotarse', clase: 'amarillo' },
  verde: { texto: 'Bien', clase: 'verde' },
};
