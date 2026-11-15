import { useEffect, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero, fechaHora } from '../formato';

const ENTERO = /^\d+$/;
const MONTO = /^\d+([.,]\d{1,2})?$/;
const aCentavos = (texto) => (MONTO.test(texto.trim()) ? Math.round(Number(texto.trim().replace(',', '.')) * 100) : null);
const cantidadDe = (texto) => (ENTERO.test(texto.trim()) ? Number(texto.trim()) : null);
const claveFecha = (fecha) => `${fecha.getFullYear()}-${String(fecha.getMonth() + 1).padStart(2, '0')}-${String(fecha.getDate()).padStart(2, '0')}`;
const fechaHoy = () => claveFecha(new Date());
const fechaLegible = (fecha) => new Date(`${fecha}T12:00:00`).toLocaleDateString('es-SV', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

export default function Compras() {
  const { llamar } = useAuth();
  const [params] = useSearchParams();
  const [pestana, setPestana] = useState('nueva');
  const [rubros, setRubros] = useState([]);
  const [productos, setProductos] = useState([]);
  const [rubroId, setRubroId] = useState('');
  const [busqueda, setBusqueda] = useState('');
  const [lineas, setLineas] = useState({});
  const [proveedor, setProveedor] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [resultado, setResultado] = useState(null);
  const [historial, setHistorial] = useState(null);
  const [pedidos, setPedidos] = useState(null);
  const [fechaEsperada, setFechaEsperada] = useState(fechaHoy);
  const [fechaSeleccionada, setFechaSeleccionada] = useState(fechaHoy);
  const [mesCalendario, setMesCalendario] = useState(() => {
    const hoy = new Date();
    return new Date(hoy.getFullYear(), hoy.getMonth(), 1);
  });
  const [programando, setProgramando] = useState(false);
  const [recibiendo, setRecibiendo] = useState('');
  const [confirmacionPedido, setConfirmacionPedido] = useState('');
  const [confirmacionRecepcion, setConfirmacionRecepcion] = useState('');
  const precargado = useRef(false);

  const lineaInicial = (p) => ({ cantidad: String(p.sugerido || 1), costo: p.costo != null ? Number(p.costo).toFixed(2) : '' });

  useEffect(() => {
    let activo = true;
    Promise.all([llamar('/api/rubros'), llamar('/api/productos')])
      .then(([r, p]) => {
        if (!activo) return;
        setRubros(r);
        setProductos(p);
        setRubroId(r[0]?.id || '');
        // Si se llegó desde el inventario con "Comprar", el producto ya viene agregado
        const idPedido = params.get('producto');
        const pedido = p.find((x) => x.id === idPedido);
        if (pedido && !precargado.current) {
          precargado.current = true;
          setRubroId(pedido.rubroId);
          setLineas({ [pedido.id]: lineaInicial(pedido) });
        }
      })
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar, params]);

  useEffect(() => {
    if (pestana !== 'historial') return undefined;
    let activo = true;
    llamar('/api/compras?limite=30').then((d) => activo && setHistorial(d)).catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [pestana, llamar]);

  useEffect(() => {
    if (pestana !== 'calendario') return undefined;
    let activo = true;
    llamar('/api/compras/pedidos')
      .then((d) => activo && setPedidos(d))
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [pestana, llamar]);

  const texto = busqueda.trim().toLowerCase();
  const visibles = productos.filter((p) => p.rubroId === rubroId && p.nombre.toLowerCase().includes(texto));
  const elegidos = productos.filter((p) => lineas[p.id]);

  const subtotalDe = (p) => {
    const l = lineas[p.id];
    const cantidad = cantidadDe(l.cantidad);
    const costo = aCentavos(l.costo);
    return cantidad !== null && costo !== null ? cantidad * costo : null;
  };
  const totalCentavos = elegidos.reduce((s, p) => s + (subtotalDe(p) ?? 0), 0);

  function agregar(p) {
    setError('');
    setLineas((actual) => ({ ...actual, [p.id]: lineaInicial(p) }));
  }
  function quitar(id) {
    setLineas((actual) => { const copia = { ...actual }; delete copia[id]; return copia; });
  }
  function cambiar(id, campo, valor) {
    setError('');
    setLineas((actual) => ({ ...actual, [id]: { ...actual[id], [campo]: valor } }));
  }

  // Mismas reglas que la API (punto 4.4); la API vuelve a validar todo
  function validar() {
    if (!elegidos.length) return 'Agregue al menos un producto a la compra.';
    for (const p of elegidos) {
      const l = lineas[p.id];
      const cantidad = cantidadDe(l.cantidad);
      if (cantidad === null || cantidad < 1) return 'La cantidad debe ser un número entero mayor a cero.';
      const costo = aCentavos(l.costo);
      if (costo === null || costo <= 0) return 'Escriba el costo por unidad, por ejemplo 0.45.';
    }
    return '';
  }

  async function guardar() {
    const problema = validar();
    if (problema) { setError(problema); return; }
    setGuardando(true);
    setError('');
    try {
      const respuesta = await llamar('/api/compras', {
        method: 'POST',
        cuerpo: {
          proveedor: proveedor.trim(),
          items: elegidos.map((p) => ({ productoId: p.id, cantidad: lineas[p.id].cantidad.trim(), costoUnitario: lineas[p.id].costo.trim() })),
        },
      });
      // El catálogo local se actualiza con las nuevas existencias y costos
      const nuevos = Object.fromEntries(respuesta.productos.map((p) => [p.id, p]));
      setProductos((actual) => actual.map((p) => nuevos[p.id] || p));
      setResultado(respuesta);
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function programar() {
    const problema = validar();
    if (problema) { setError(problema); return; }
    if (!fechaEsperada) { setError('Seleccione el día en que espera recibir el pedido.'); return; }
    setProgramando(true);
    setError('');
    try {
      const respuesta = await llamar('/api/compras/pedidos', {
        method: 'POST',
        cuerpo: {
          proveedor: proveedor.trim(),
          fechaEsperada,
          items: elegidos.map((p) => ({ productoId: p.id, cantidad: lineas[p.id].cantidad.trim(), costoUnitario: lineas[p.id].costo.trim() })),
        },
      });
      setConfirmacionPedido(`Pedido programado para el ${fechaLegible(respuesta.pedido.fechaEsperada)}. No se sumará al inventario hasta recibirlo.`);
      setFechaSeleccionada(respuesta.pedido.fechaEsperada);
      setMesCalendario(() => {
        const [anio, mes] = respuesta.pedido.fechaEsperada.split('-').map(Number);
        return new Date(anio, mes - 1, 1);
      });
      setLineas({});
      setProveedor('');
      setBusqueda('');
      setPestana('calendario');
    } catch (e) {
      setError(e.message);
    } finally {
      setProgramando(false);
    }
  }

  async function recibir(id) {
    setRecibiendo(id);
    setError('');
    setConfirmacionRecepcion('');
    try {
      const respuesta = await llamar(`/api/compras/pedidos/${id}/recibir`, { method: 'POST' });
      const nuevos = Object.fromEntries(respuesta.productos.map((p) => [p.id, p]));
      setProductos((actual) => actual.map((p) => nuevos[p.id] || p));
      setPedidos((actual) => (actual || []).filter((p) => p.id !== id));
      setConfirmacionRecepcion(`Pedido recibido y registrado como compra ${respuesta.compra.numeroCompra}.`);
    } catch (e) {
      setError(e.message);
    } finally {
      setRecibiendo('');
    }
  }

  function otraCompra() {
    setResultado(null);
    setLineas({});
    setProveedor('');
    setBusqueda('');
  }

  const botonPestana = (id, nombre) => (
    <button type="button" className="chip" aria-pressed={pestana === id} onClick={() => setPestana(id)}>{nombre}</button>
  );

  return (
    <Pagina titulo="Compras" subtitulo="Mercadería que entra y cuánto costó">
      <div className="fila-chips" role="group" aria-label="Sección">
        {botonPestana('nueva', 'Nueva compra')}
        {botonPestana('calendario', 'Calendario')}
        {botonPestana('historial', 'Historial')}
      </div>
      {error && <p className="error" role="alert">{error}</p>}

      {pestana === 'calendario' && (
        <>
          {confirmacionPedido && <p className="aviso aviso-ok" role="status">{confirmacionPedido}</p>}
          {confirmacionRecepcion && <p className="aviso aviso-ok" role="status">{confirmacionRecepcion}</p>}
          {pedidos === null && !error && <p className="m centro">Cargando pedidos…</p>}
          {pedidos !== null && (() => {
            const hoy = fechaHoy();
            const pedidosPorFecha = pedidos.reduce((grupos, pedido) => {
              grupos[pedido.fechaEsperada] = [...(grupos[pedido.fechaEsperada] || []), pedido];
              return grupos;
            }, {});
            const inicioMes = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth(), 1);
            const primerDia = new Date(inicioMes.getFullYear(), inicioMes.getMonth(), 1 - inicioMes.getDay());
            const dias = Array.from({ length: 42 }, (_, indice) => new Date(primerDia.getFullYear(), primerDia.getMonth(), primerDia.getDate() + indice));
            const vencidos = pedidos.filter((pedido) => pedido.fechaEsperada < hoy && pedido.fechaEsperada !== fechaSeleccionada);
            const listaPedidos = (lista, vencido = false) => lista.map((pedido) => (
              <section className="c lista pedido-calendario" key={pedido.id}>
                <div className="fila">
                  <b>{pedido.proveedor || 'Sin proveedor'}</b>
                  {vencido && <span className="estado-anulada">Vencido</span>}
                </div>
                <div className="m">{pedido.items.map((item) => `${item.cantidad} × ${item.nombre}`).join(' · ')}</div>
                <div className="fila">
                  <b>{dinero(pedido.total)}</b>
                  <button type="button" className="btn-mini" onClick={() => recibir(pedido.id)} disabled={Boolean(recibiendo)}
                    aria-label={`Marcar como recibido el pedido de ${pedido.proveedor || 'proveedor sin nombre'}`}>
                    {recibiendo === pedido.id ? 'Recibiendo…' : 'Marcar recibido'}
                  </button>
                </div>
              </section>
            ));
            return (
              <>
                <section className="c calendario">
                  <div className="fila calendario-encabezado">
                    <button type="button" className="btn-mini" aria-label="Mes anterior" onClick={() => {
                      const anterior = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() - 1, 1);
                      setMesCalendario(anterior);
                      setFechaSeleccionada(claveFecha(anterior));
                    }}>‹</button>
                    <h2>{mesCalendario.toLocaleDateString('es-SV', { month: 'long', year: 'numeric' })}</h2>
                    <button type="button" className="btn-mini" aria-label="Mes siguiente" onClick={() => {
                      const siguiente = new Date(mesCalendario.getFullYear(), mesCalendario.getMonth() + 1, 1);
                      setMesCalendario(siguiente);
                      setFechaSeleccionada(claveFecha(siguiente));
                    }}>›</button>
                  </div>
                  <div className="calendario-rejilla" role="grid" aria-label="Calendario de pedidos pendientes">
                    {['D', 'L', 'M', 'M', 'J', 'V', 'S'].map((dia, indice) => <span className="calendario-dia-semana" role="columnheader" key={`${dia}-${indice}`}>{dia}</span>)}
                    {dias.map((dia) => {
                      const fecha = claveFecha(dia);
                      const cantidad = pedidosPorFecha[fecha]?.length || 0;
                      return (
                        <button type="button" role="gridcell" key={fecha}
                          className={`calendario-dia${dia.getMonth() !== mesCalendario.getMonth() ? ' fuera-mes' : ''}${fecha === fechaSeleccionada ? ' seleccionado' : ''}${fecha === hoy ? ' hoy' : ''}${fecha < hoy && cantidad ? ' vencido' : ''}`}
                          aria-pressed={fecha === fechaSeleccionada}
                          aria-label={`${fechaLegible(fecha)}${cantidad ? `, ${cantidad} ${cantidad === 1 ? 'pedido pendiente' : 'pedidos pendientes'}` : ''}`}
                          onClick={() => setFechaSeleccionada(fecha)}>
                          <span>{dia.getDate()}</span>
                          {cantidad > 0 && <small>{cantidad}</small>}
                        </button>
                      );
                    })}
                  </div>
                  <p className="m calendario-resumen">
                    {pedidos.length === 0 ? 'No hay pedidos pendientes.' : `${pedidos.length} ${pedidos.length === 1 ? 'pedido pendiente' : 'pedidos pendientes'}${vencidos.length ? ` · ${vencidos.length} vencido${vencidos.length === 1 ? '' : 's'}` : ''}`}
                  </p>
                </section>
                <h2 className="grupo-titulo">Pedidos para {fechaLegible(fechaSeleccionada)}</h2>
                {(pedidosPorFecha[fechaSeleccionada] || []).length === 0
                  ? <p className="m centro">No hay pedidos programados para este día.</p>
                  : listaPedidos(pedidosPorFecha[fechaSeleccionada])}
                {vencidos.length > 0 && (
                  <>
                    <h2 className="grupo-titulo">Pedidos vencidos</h2>
                    {listaPedidos(vencidos, true)}
                  </>
                )}
              </>
            );
          })()}
        </>
      )}

      {pestana === 'historial' && (
        <>
          {historial === null && !error && <p className="m centro">Cargando…</p>}
          {historial?.length === 0 && <p className="m centro">Todavía no hay compras registradas.</p>}
          {(historial || []).map((c) => (
            <section className="c lista" key={c.id}>
              <div className="fila">
                <b>{c.numeroCompra}</b>
                <b>{dinero(c.total)}</b>
              </div>
              <div className="m">{fechaHora(c.fecha)} · {c.proveedor || 'Sin proveedor'}</div>
              {c.items.map((i) => (
                <div className="fila m" key={i.productoId}>
                  <span>{i.cantidad} × {i.nombre}</span>
                  <span>a {dinero(i.costoUnitario)}</span>
                </div>
              ))}
            </section>
          ))}
        </>
      )}

      {pestana === 'nueva' && resultado && (
        <>
          <section className="c lista" aria-live="polite">
            <b>Compra guardada: {resultado.compra.numeroCompra}</b>
            <div className="fila"><span>Total de la compra</span><b className="total">{dinero(resultado.compra.total)}</b></div>
            <p className="m" style={{ margin: 0 }}>Las unidades ya se sumaron al inventario:</p>
            {resultado.compra.items.map((i) => {
              const actual = resultado.productos.find((p) => p.id === i.productoId);
              return (
                <div className="fila" key={i.productoId}>
                  <span>{i.nombre}<br /><span className="m">+{i.cantidad} a {dinero(i.costoUnitario)} cada una</span></span>
                  <b>Hay {actual?.existencias}</b>
                </div>
              );
            })}
          </section>
          {resultado.avisos.length > 0 && (
            <p className="aviso" role="status">
              <span>
                Ojo con el precio de venta:{' '}
                {resultado.avisos.map((a) => `${a.nombre} se vende a ${dinero(a.precio)} y ahora le cuesta ${dinero(a.costo)}`).join('; ')}.
              </span>
            </p>
          )}
          <button type="button" className="btn" onClick={otraCompra}>Registrar otra compra</button>
          <Link className="btn btn-claro btn-enlace" to="/inventario">Ver inventario</Link>
        </>
      )}

      {pestana === 'nueva' && !resultado && (
        <>
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
            <label htmlFor="buscar-compra">Buscar producto</label>
            <input id="buscar-compra" type="text" placeholder="Por ejemplo: arroz" value={busqueda} onChange={(e) => setBusqueda(e.target.value)} />
          </div>
          <section className="c lista">
            {visibles.length === 0 && <p className="m">No hay productos con ese nombre.</p>}
            {visibles.map((p) => (
              <div className="fila" key={p.id}>
                <span className="nombre-producto">
                  {p.nombre}
                  <br />
                  <span className="m">Hay {p.existencias} · último costo {p.costo != null ? dinero(p.costo) : 'sin registrar'}</span>
                </span>
                <button type="button" className="btn-mini" disabled={Boolean(lineas[p.id])} onClick={() => agregar(p)}
                  aria-label={`Agregar ${p.nombre} a la compra`}>
                  {lineas[p.id] ? 'Agregado' : 'Agregar'}
                </button>
              </div>
            ))}
            <Link className="m" to="/producto/nuevo">¿Producto nuevo? Agréguelo primero al catálogo.</Link>
          </section>

          {elegidos.length > 0 && (
            <section className="c lista">
              <b>Productos de esta compra</b>
              {elegidos.map((p) => {
                const l = lineas[p.id];
                const cantidad = cantidadDe(l.cantidad);
                const costo = aCentavos(l.costo);
                const subtotal = subtotalDe(p);
                return (
                  <div className="linea-compra" key={p.id}>
                    <div className="fila">
                      <b>{p.nombre}</b>
                      <button type="button" className="btn-mini" onClick={() => quitar(p.id)} aria-label={`Quitar ${p.nombre} de la compra`}>Quitar</button>
                    </div>
                    <div className="dos-columnas">
                      <div>
                        <label htmlFor={`cant-${p.id}`}>Cantidad</label>
                        <input id={`cant-${p.id}`} type="text" inputMode="numeric" value={l.cantidad} onChange={(e) => cambiar(p.id, 'cantidad', e.target.value)} />
                      </div>
                      <div>
                        <label htmlFor={`costo-${p.id}`}>Costo por unidad</label>
                        <input id={`costo-${p.id}`} type="text" inputMode="decimal" placeholder="0.45" value={l.costo} onChange={(e) => cambiar(p.id, 'costo', e.target.value)} />
                      </div>
                    </div>
                    <div className="fila m">
                      <span>{cantidad !== null ? `Pasará de ${p.existencias} a ${p.existencias + cantidad}` : 'Escriba la cantidad'}</span>
                      <b>{subtotal !== null ? dinero(subtotal / 100) : '—'}</b>
                    </div>
                    {costo !== null && costo > 0 && Math.round(p.precio * 100) <= costo && (
                      <p className="error-suave">Ojo: lo vende a {dinero(p.precio)}, igual o menos de lo que le cuesta.</p>
                    )}
                  </div>
                );
              })}
              <div className="fila"><span>Total de la compra</span><b className="total">{dinero(totalCentavos / 100)}</b></div>
            </section>
          )}

          {elegidos.length > 0 && (
            <div>
              <label htmlFor="proveedor">Proveedor (opcional)</label>
              <input id="proveedor" type="text" placeholder="Por ejemplo: Distribuidora López" value={proveedor} onChange={(e) => setProveedor(e.target.value)} />
            </div>
          )}
          {elegidos.length > 0 && (
            <div className="programar-pedido">
              <div>
                <label htmlFor="fecha-esperada">Día esperado de recepción</label>
                <input id="fecha-esperada" type="date" value={fechaEsperada} onChange={(e) => setFechaEsperada(e.target.value)} />
                <p className="m">El pedido programado no cambia las existencias hasta que lo marques como recibido.</p>
              </div>
              <button type="button" className="btn btn-claro" onClick={programar} disabled={programando || guardando}>
                {programando ? 'Programando…' : 'Programar recepción'}
              </button>
            </div>
          )}
          <button type="button" className="btn" onClick={guardar} disabled={guardando || programando}>
            {guardando ? 'Guardando…' : 'Guardar compra recibida y sumar al inventario'}
          </button>
        </>
      )}
    </Pagina>
  );
}
