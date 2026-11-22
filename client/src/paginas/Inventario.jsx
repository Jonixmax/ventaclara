import { useEffect, useMemo, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import Etiqueta from '../componentes/Etiqueta';
import { dinero, ESTADOS_STOCK, ESTADOS_TITULO } from '../formato';

const ORDEN = ['rojo', 'amarillo', 'verde', 'inactivo'];
const COLOR_BARRA = { rojo: 'var(--rojo)', amarillo: 'var(--amarillo)', verde: 'var(--verde)', inactivo: 'var(--borde-campo)' };

// Qué hacer con cada producto, en palabras sencillas
function consejo(p, esPropietaria) {
  if (!p.activo) return 'No aparece en las ventas.';
  if (p.estadoStock === 'rojo') {
    return esPropietaria ? `Quedan muy pocas. Sugerimos comprar ${p.sugerido}.` : 'Avise a la propietaria: hay que pedir este producto.';
  }
  if (p.estadoStock === 'amarillo') {
    return esPropietaria ? `Se está acabando. Sugerimos comprar ${p.sugerido}.` : 'Avise a la propietaria: se está acabando.';
  }
  return 'Hay suficiente.';
}

function Tarjeta({ p, color, esPropietaria, onBorrar, borrando }) {
  const grupo = p.activo ? p.estadoStock : 'inactivo';
  // La barra se llena hasta la meta: 3 veces el stock mínimo
  const meta = Math.max(1, p.stockMinimo * 3);
  const porcentaje = Math.min(100, Math.round((p.existencias / meta) * 100));
  const ganancia = p.costo == null ? null : p.precio - p.costo;
  return (
    <div className="c producto">
      <div className="fila">
        <span className="nombre-producto">
          <span className="muestra" style={{ background: color }} />
          {p.nombre}
        </span>
        <Etiqueta estado={grupo} />
      </div>
      <div>
        <div className="nivel-texto">
          <b className="cantidad">{p.existencias}</b>
          <span className="m">en inventario · mínimo {p.stockMinimo}</span>
        </div>
        <div className="pista" role="img" aria-label={`Nivel de inventario: ${porcentaje}% de la meta`}>
          <div className="relleno" style={{ width: `${porcentaje}%`, background: COLOR_BARRA[grupo] }} />
        </div>
      </div>
      <p className="m consejo">{consejo(p, esPropietaria)}</p>
      {esPropietaria && (
        <div className="m">
          {ganancia === null ? (
            <>Vende a {dinero(p.precio)} · Falta registrar el costo</>
          ) : (
            <>
              Vende a {dinero(p.precio)} · Le cuesta {dinero(p.costo)} ·{' '}
              {ganancia > 0 ? `Gana ${dinero(ganancia)} por unidad` : <span className="error-suave">Se vende por debajo del costo</span>}
            </>
          )}
        </div>
      )}
      {esPropietaria && (
        <div className="acciones-fila">
          {p.activo && <Link className="enlace-boton" to={`/compras?producto=${p.id}`} aria-label={`Comprar ${p.nombre}`}>Comprar</Link>}
          <Link className="enlace-boton" to={`/producto/${p.id}`} aria-label={`Editar ${p.nombre}`}>Editar</Link>
          {p.activo && (
            <button type="button" className="btn-mini btn-peligro" disabled={borrando} onClick={() => {
              const confirmar = window.confirm(
                `¿Borrar ${p.nombre} del inventario? Dejará de aparecer en ventas. Se conservará para el historial y podrás reactivarlo desde Editar.`
              );
              if (confirmar) onBorrar(p);
            }}>
              {borrando ? 'Quitando…' : 'Borrar'}
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function Inventario() {
  const { llamar, esPropietaria } = useAuth();
  const [params, setParams] = useSearchParams();
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [rubroId, setRubroId] = useState('todos');
  const [filtro, setFiltro] = useState(params.get('alertas') === '1' ? 'alertas' : 'todos');
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [borrando, setBorrando] = useState('');

  useEffect(() => {
    let activo = true;
    // La propietaria también ve los productos inactivos, para poder reactivarlos
    Promise.all([llamar('/api/rubros'), llamar(esPropietaria ? '/api/productos?todos=1' : '/api/productos')])
      .then(([r, p]) => { if (activo) { setRubros(r); setProductos(p); } })
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar, esPropietaria]);

  const colores = useMemo(() => Object.fromEntries(rubros.map((r) => [r.id, r.color])), [rubros]);
  const grupoDe = (p) => (p.activo ? p.estadoStock : 'inactivo');
  const delRubro = productos.filter((p) => rubroId === 'todos' || p.rubroId === rubroId);

  const conteo = { rojo: 0, amarillo: 0, verde: 0 };
  delRubro.forEach((p) => { if (p.activo) conteo[p.estadoStock] += 1; });

  // Valor del inventario a costo (solo la propietaria; solo productos con costo registrado)
  const conCosto = delRubro.filter((p) => p.activo && p.costo != null);
  const sinCosto = delRubro.filter((p) => p.activo && p.costo == null).length;
  const valorCentavos = conCosto.reduce((s, p) => s + Math.round(p.costo * 100) * p.existencias, 0);

  const visibles = delRubro.filter((p) => {
    if (filtro === 'todos') return true;
    if (filtro === 'alertas') return p.activo && p.estadoStock !== 'verde';
    return grupoDe(p) === filtro;
  });
  const grupos = ORDEN.map((g) => ({
    g,
    lista: visibles.filter((p) => grupoDe(p) === g).sort((a, b) => a.existencias - b.existencias || a.nombre.localeCompare(b.nombre)),
  })).filter((x) => x.lista.length > 0);

  function quitarFiltro() {
    setFiltro('todos');
    setParams({});
  }

  async function borrarProducto(producto) {
    setBorrando(producto.id);
    setError('');
    setMensaje('');
    try {
      const actualizado = await llamar(`/api/productos/${producto.id}`, { method: 'PUT', cuerpo: { activo: false } });
      setProductos((actuales) => actuales.map((item) => item.id === actualizado.id ? actualizado : item));
      setMensaje(`${producto.nombre} se quitó de los productos activos. Se conservó su historial.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setBorrando('');
    }
  }

  // Lista de pedido para mandar al proveedor (por WhatsApp, por ejemplo)
  async function compartirLista() {
    const pedir = productos.filter((p) => p.activo && p.estadoStock !== 'verde').sort((a, b) => a.nombre.localeCompare(b.nombre));
    const texto = ['Pedido - Tienda Emmanuel', ...pedir.map((p) => `- ${p.nombre}: ${p.sugerido} unidades`)].join('\n');
    if (navigator.share) {
      try { await navigator.share({ title: 'Lista de pedido', text: texto }); return; } catch (e) { if (e.name === 'AbortError') return; }
    }
    try {
      await navigator.clipboard.writeText(texto);
      setMensaje('Lista copiada. Péguela en WhatsApp.');
    } catch {
      setMensaje(texto);
    }
  }

  const hayQuePedir = conteo.rojo + conteo.amarillo > 0;
  return (
    <Pagina titulo="Inventario" subtitulo="Qué hay y qué hay que pedir">
      {error && <p className="error" role="alert">{error}</p>}
      <div className="fila-chips" role="group" aria-label="Rubro">
        {[{ id: 'todos', nombre: 'Todos' }, ...rubros].map((r) => (
          <button key={r.id} type="button" className="chip" aria-pressed={r.id === rubroId}
            style={r.id === rubroId ? { background: '#0F4C81', borderColor: '#0F4C81', color: '#fff' } : undefined}
            onClick={() => setRubroId(r.id)}>
            {r.nombre}
          </button>
        ))}
      </div>

      <div className="tarjetas-estado" role="group" aria-label="Filtrar por estado">
        {['rojo', 'amarillo', 'verde'].map((e) => (
          <button key={e} type="button" className={`tarjeta-estado ${e}`} aria-pressed={filtro === e}
            onClick={() => setFiltro(filtro === e ? 'todos' : e)}>
            <b className="numero">{conteo[e]}</b>
            <span>{ESTADOS_STOCK[e].texto}</span>
          </button>
        ))}
      </div>

      {filtro === 'alertas' && (
        <p className="aviso">
          <span>Mostrando solo lo que hay que pedir o se está acabando.</span>
          <button type="button" className="btn-mini" onClick={quitarFiltro}>Ver todos</button>
        </p>
      )}

      {esPropietaria && (
        <section className="c lista">
          <div className="fila">
            <span>Valor del inventario (a costo)</span>
            <b className="total">{dinero(valorCentavos / 100)}</b>
          </div>
          {sinCosto > 0 && <p className="m" style={{ margin: 0 }}>{sinCosto} {sinCosto === 1 ? 'producto no tiene' : 'productos no tienen'} costo registrado y no se cuentan.</p>}
          <Link className="btn btn-enlace" to="/producto/nuevo">Agregar producto</Link>
          {hayQuePedir && <button type="button" className="btn btn-claro" onClick={compartirLista}>Compartir lista de pedido</button>}
          {mensaje && <p className="aviso aviso-ok" role="status" style={{ whiteSpace: 'pre-line' }}>{mensaje}</p>}
        </section>
      )}

      {grupos.length === 0 && !error && <p className="m centro">No hay productos para mostrar.</p>}
      {grupos.map(({ g, lista }) => (
        <section key={g} className="lista" aria-label={ESTADOS_TITULO[g]}>
          <h2 className="grupo-titulo">{ESTADOS_TITULO[g]} ({lista.length})</h2>
          {lista.map((p) => (
            <Tarjeta key={p.id} p={p} color={colores[p.rubroId]} esPropietaria={esPropietaria}
              onBorrar={borrarProducto} borrando={borrando === p.id} />
          ))}
        </section>
      ))}
    </Pagina>
  );
}
