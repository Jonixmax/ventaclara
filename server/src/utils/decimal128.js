const mongoose = require('mongoose');
const { deCentavos } = require('./dinero');

// Convierte centavos (entero) en el Decimal128 que se guarda en MongoDB
const aDecimal = (centavos) => mongoose.Types.Decimal128.fromString(deCentavos(centavos).toFixed(2));

module.exports = { aDecimal };
