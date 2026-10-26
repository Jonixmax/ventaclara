// El Salvador usa UTC-6 todo el año (no tiene horario de verano)
const DESFASE_HORAS = -6;
const HORA_MS = 3600000;

// Devuelve el inicio y el fin del día local (hora de El Salvador) que contiene a la fecha dada
function rangoDelDia(fecha = new Date()) {
  const local = new Date(fecha.getTime() + DESFASE_HORAS * HORA_MS);
  const medianocheComoUTC = Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate());
  const inicio = new Date(medianocheComoUTC - DESFASE_HORAS * HORA_MS);
  const fin = new Date(inicio.getTime() + 24 * HORA_MS);
  return { inicio, fin };
}

module.exports = { rangoDelDia };
