import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero } from '../formato';

const FORMATO_MONTO = /^\d+([.,]\d{1,2})?$/;
const BILLETES = [5, 10, 20];

export default function Venta() {
  const { llamar } = useAuth();
  const navegar = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [rubroId, setRubroId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [cantidades, setCantidades] = useState({});
  const [recibido, setRecibido] = useState('');
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

  // Cobro: dinero que entrega el cliente y vuelto (todo en centavos para no perder precisión)
  const textoRecibido = recibido.trim();
  const recibidoValido = FORMATO_MONTO.test(textoRecibido);
  const recibidoCentavos = recibidoValido ? Math.round(Number(textoRecibido.replace(',', '.')) * 100) : null;
  const vueltoCentavos = recibidoCentavos === null ? null : recibidoCentavos - totalCentavos;

  function estadoPago() {
    if (vueltoCentavos === null) {
      return { clase: '', texto: textoRecibido ? 'Escriba solo números, por ejemplo 5.00' : 'Se calcula al escribir' };
    }
    if (vueltoCentavos < 0) return { clase: 'falta', texto: `Faltan ${dinero(-vueltoCentavos / 100)}` };
    if (vueltoCentavos === 0) return { clase: 'cuadra', texto: 'Pago exacto, sin vuelto' };
    return { clase: 'vuelto', texto: dinero(vueltoCentavos / 100), grande: true };
  }

  function cambiar(producto, delta) {
    setError('');
    setCantidades((actual) => {
      const nueva = Math.min(producto.existencias, Math.max(0, (actual[producto.id] || 0) + delta));
      return { ...actual, [producto.id]: nueva };
    });
  }

  function escribirRecibido(valor) {
    setRecibido(valor);
    setError('');
  }

  async function guardar() {
    if (!elegidos.length) {
      setError('Agregue al menos un producto.');
      return;
    }
    if (textoRecibido && !recibidoValido) {
      setError('Escriba cuánto dinero entregó el cliente.');
      return;
    }
    if (recibidoCentavos !== null && recibidoCentavos < totalCentavos) {
      setError('El dinero recibido no alcanza para pagar el total.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      const resultado = await llamar('/api/ventas', {
        method: 'POST',
        cuerpo: {
          items: elegidos.map((p) => ({ productoId: p.id, cantidad: cantidades[p.id] })),
          ...(textoRecibido ? { efectivoRecibido: textoRecibido } : {}),
        },
      });
      navegar('/comprobante', { state: resultado });
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  const pago = estadoPago();
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

      {elegidos.length > 0 && (
        <section className="c lista">
          <div>
            <label htmlFor="recibido">Dinero que entrega el cliente</label>
            <input id="recibido" type="text" inputMode="decimal" placeholder="0.00" value={recibido}
              onChange={(e) => escribirRecibido(e.target.value)} />
          </div>
          <div className="fila-chips" role="group" aria-label="Montos rápidos">
            <button type="button" className="chip" onClick={() => escribirRecibido((totalCentavos / 100).toFixed(2))}>Exacto</button>
            {BILLETES.map((b) => (
              <button key={b} type="button" className="chip" aria-pressed={recibidoCentavos === b * 100}
                onClick={() => escribirRecibido(`${b}.00`)}>
                {dinero(b)}
              </button>
            ))}
          </div>
          <div className={`dif dif-fila ${pago.clase}`} aria-live="polite">
            <span>Vuelto</span>
            <b className={pago.grande ? 'vuelto-valor' : undefined}>{pago.texto}</b>
          </div>
        </section>
      )}

      {error && <p className="error" role="alert">{error}</p>}
      <button type="button" className="btn" onClick={guardar} disabled={guardando}>
        {guardando ? 'Guardando…' : 'Guardar venta'}
      </button>
    </Pagina>
  );
}
