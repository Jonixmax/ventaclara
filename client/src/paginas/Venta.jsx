import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero } from '../formato';

export default function Venta() {
  const { llamar } = useAuth();
  const navegar = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [rubroId, setRubroId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cantidades, setCantidades] = useState({});
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([llamar('/api/rubros'), llamar('/api/productos')])
      .then(([r, p]) => {
        if (!activo) return;
        setRubros(r);
        setProductos(p);
        setRubroId(r[0]?.id || '');
      })
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar]);

  const visibles = useMemo(() => {
    const texto = busqueda.trim().toLowerCase();
    return productos.filter((p) => p.rubroId === rubroId && p.nombre.toLowerCase().includes(texto));
  }, [productos, rubroId, busqueda]);

  const elegidos = productos.filter((p) => cantidades[p.id] > 0);
  const unidades = elegidos.reduce((s, p) => s + cantidades[p.id], 0);
  const totalCentavos = elegidos.reduce((s, p) => s + Math.round(p.precio * 100) * cantidades[p.id], 0);

  function cambiar(producto, delta) {
    setError('');
    setCantidades((actual) => {
      const nueva = Math.min(producto.existencias, Math.max(0, (actual[producto.id] || 0) + delta));
      return { ...actual, [producto.id]: nueva };
    });
  }

  async function guardar() {
    if (!elegidos.length) {
      setError('Agregue al menos un producto.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const resultado = await llamar('/api/ventas', {
        method: 'POST',
        cuerpo: { items: elegidos.map((p) => ({ productoId: p.id, cantidad: cantidades[p.id] })) },
      });
      navegar('/comprobante', { state: resultado });
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <Pagina titulo="Nueva venta" subtitulo="Elija el rubro y los productos">
      <div className="fila-chips" role="group" aria-label="Rubro">
        {rubros.map((r) => (
          <button key={r.id} type="button" className="chip" aria-pressed={r.id === rubroId}
            style={r.id === rubroId ? { background: r.color, borderColor: r.color, color: '#fff' } : undefined}
            onClick={() => setRubroId(r.id)}>
            {r.nombre}
          </button>
        ))}
      </div>
      <div>
        <label htmlFor="buscar">Buscar producto</label>
        <input id="buscar" type="text" placeholder="Por ejemplo: arroz" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
      </div>
      <section className="c lista">
        {visibles.length === 0 && <p className="m">No hay productos con ese nombre.</p>}
        {visibles.map((p) => {
          const cantidad = cantidades[p.id] || 0;
          return (
            <div className="fila" key={p.id}>
              <span>
                {p.nombre}
                <br />
                <span className="m">{dinero(p.precio)} · quedan {p.existencias}</span>
              </span>
              <span className="contador">
                <button type="button" className="paso" aria-label={`Quitar uno de ${p.nombre}`} disabled={cantidad === 0}
                  onClick={() => cambiar(p, -1)}>−</button>
                <b aria-live="polite">{cantidad}</b>
                <button type="button" className="paso" aria-label={`Agregar uno de ${p.nombre}`} disabled={cantidad >= p.existencias}
                  onClick={() => cambiar(p, 1)}>+</button>
              </span>
            </div>
          );
        })}
      </section>
      <section className="c fila">
        <span className="m">{unidades} {unidades === 1 ? 'producto' : 'productos'}</span>
        <span>Total <b className="total">{dinero(totalCentavos / 100)}</b></span>
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" className="btn" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar venta'}
      </button>
    </Pagina>
  );
}
