// Semáforo de stock (regla del punto 3.2 del documento)
// rojo: existencias <= stock mínimo | amarillo: <= el doble del mínimo | verde: el resto
function estadoStock(existencias, stockMinimo) {
  if (existencias <= stockMinimo) return 'rojo';
  if (existencias <= stockMinimo * 2) return 'amarillo';
  return 'verde';
}

module.exports = { estadoStock };
