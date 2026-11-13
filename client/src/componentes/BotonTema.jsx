import { useTema } from '../tema';

export default function BotonTema() {
  const { oscuro, alternar } = useTema();
  return (
    <button type="button" className="btn-barra" onClick={alternar}
      aria-label={oscuro ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}>
      {oscuro ? 'Claro' : 'Oscuro'}
    </button>
  );
}
