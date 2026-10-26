import { ESTADOS_STOCK } from '../formato';

// El semáforo SIEMPRE lleva texto además del color (accesibilidad)
export default function Etiqueta({ estado }) {
  const { texto, clase } = ESTADOS_STOCK[estado] || ESTADOS_STOCK.verde;
  return <span className={`etiqueta ${clase}`}>{texto}</span>;
}
