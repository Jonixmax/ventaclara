import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import Etiqueta from '../componentes/Etiqueta';

export default function Inventario() {
  const { llamar } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [rubroId, setRubroId] = useState('todos');
  const [error, setError] = useState('');
  const soloAlertas = params.get('alertas') === '1';

  useEffect(() => {
    let activo = true;
    Promise.all([llamar('/api/rubros'), llamar('/api/productos')])
      .then(([r, p]) => { if (activo) { setRubros(r); setProductos(p); } })
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar]);

  const colores = useMemo(() => Object.fromEntries(rubros.map((r) => [r.id, r.color])), [rubros]);
  const visibles = productos
    .filter((p) => rubroId === 'todos' || p.rubroId === rubroId)
    .filter((p) => !soloAlertas || p.estadoStock !== 'verde')
    .sort((a, b) => a.existencias - b.existencias);

  return (
    <Pagina titulo="Inventario" subtitulo="Existencias por rubro">
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fila-chips" role="group" aria-label="Rubro">
        {[{ id: 'todos', nombre: 'Todos', color: '#0F4C81' }, ...rubros].map((r) => (
          <button key={r.id} type="button" className="chip" aria-pressed={r.id === rubroId}
            style={r.id === rubroId ? { background: '#0F4C81', borderColor: '#0F4C81', color: '#fff' } : undefined}
            onClick={() => setRubroId(r.id)}>
            {r.nombre}
          </button>
        ))}
      </div>
      <button type="button" className="btn btn-claro"
        onClick={() => setParams(soloAlertas ? {} : { alertas: '1' })}>
        {soloAlertas ? 'Ver todos los productos' : 'Ver solo alertas'}
      </button>
      {visibles.length === 0 && !error && <p className="m centro">No hay productos para mostrar.</p>}
      {visibles.map((p) => (
        <div className="c fila" key={p.id}>
          <span>
            <span className="muestra" style={{ background: colores[p.rubroId] }} />
            {p.nombre}
            <br />
            <span className="m">Quedan {p.existencias}</span>
          </span>
          <Etiqueta estado={p.estadoStock} />
        </div>
      ))}
    </Pagina>
  );
}
