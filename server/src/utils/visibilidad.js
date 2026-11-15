// El costo de compra es información de la propietaria: el empleado nunca lo recibe.
function productoVisible(producto, esPropietaria) {
  const json = producto.toJSON();
  if (!esPropietaria) delete json.costo;
  return json;
}

function ventaVisible(venta, esPropietaria) {
  const json = venta.toJSON();
  if (!esPropietaria) json.items = json.items.map(({ costoUnitario, ...resto }) => resto);
  return json;
}

module.exports = { productoVisible, ventaVisible };
