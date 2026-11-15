import { Navigate, useLocation, useNavigate, useParams } from 'react-router-dom';
import { useEffect, useState } from 'react';
import Pagina from '../componentes/Pagina';
import { useAuth } from '../AuthContext';
import { dinero, fechaHora } from '../formato';

export default function Comprobante() {
  const { id } = useParams();
  const { state } = useLocation();
  const navegar = useNavigate();
  const { llamar, esPropietaria } = useAuth();
  const [venta, setVenta] = useState(null);
  const [alertas] = useState(state?.alertas || []);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(Boolean(id));
  const [anulando, setAnulando] = useState(false);

  useEffect(() => {
    if (!id) {
      setVenta(state?.venta || null);
      setCargando(false);
      return;
    }
    let activo = true;
    setVenta(null);
    setError('');
    setCargando(true);
    llamar(`/api/ventas/${id}`)
      .then(({ venta: actual }) => activo && setVenta(actual))
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [id, state, llamar]);

  async function anular(evento) {
    evento.preventDefault();
    if (!window.confirm('¿Anular esta venta y devolver sus productos al inventario?')) return;
    setAnulando(true);
    setError('');
    try {
      const resultado = await llamar(`/api/ventas/${venta.id}/anular`, {
        method: 'POST',
        cuerpo: { motivo },
      });
      setVenta(resultado.venta);
      setMotivo('');
    } catch (e) {
      setError(e.message);
    } finally {
      setAnulando(false);
    }
  }

  if (!id && !state?.venta) return <Navigate to="/" replace />;
  if (cargando) {
    return <Pagina titulo="Comprobante"><p role="status">Cargando comprobante…</p></Pagina>;
  }
  if (!venta) {
    return <Pagina titulo="Comprobante"><p className="error" role="alert">{error || 'No se encontró la venta.'}</p></Pagina>;
  }

  async function compartir() {
    const texto = `Comprobante ${venta.numeroComprobante} · Total ${dinero(venta.total)} · Tienda Emmanuel`;
    if (navigator.share) {
      try {
        await navigator.share({ title: 'Comprobante de venta', text: texto });
        return;
      } catch {
        return;
      }
    }
    window.print();
  }

  return (
    <Pagina titulo="Comprobante" subtitulo={venta.estado === 'anulada' ? 'Venta anulada' : 'Venta guardada'}>
      <section className="c recibo">
        <div className="centro">
          <b className="negocio">Tienda Emmanuel</b>
          <br />
          <span className="m">Brisas del Norte, Tonacatepeque</span>
        </div>
        <div className="fila m">
          <span>Comprobante {venta.numeroComprobante}</span>
          <span>{fechaHora(venta.fecha)}</span>
        </div>
        {venta.estado === 'anulada' && (
          <div className="estado-anulada" role="status">
            ANULADA{venta.motivoAnulacion ? ` · ${venta.motivoAnulacion}` : ''}
          </div>
        )}
        <hr />
        {venta.items.map((item, indice) => (
          <div className="fila" key={`${item.productoId}-${indice}`}>
            <span>{item.cantidad} × {item.nombre}</span>
            <span>{dinero(item.subtotal)}</span>
          </div>
        ))}
        <hr />
        <div className="fila"><b>Total</b><b className="total">{dinero(venta.total)}</b></div>
        {venta.efectivoRecibido != null && (
          <>
            <div className="fila"><span>Recibido</span><span>{dinero(venta.efectivoRecibido)}</span></div>
            <div className="fila"><b>Vuelto</b><b>{dinero(venta.vuelto)}</b></div>
          </>
        )}
        <p className="m centro">Gracias por su compra</p>
      </section>
      {alertas.length > 0 && (
        <p className="aviso" role="status">
          <span>Quedan pocas unidades de: <b>{alertas.map((a) => a.nombre).join(', ')}</b></span>
        </p>
      )}
      {error && <p className="error" role="alert">{error}</p>}
      {esPropietaria && venta.estado !== 'anulada' && (
        <form className="c lista solo-pantalla" onSubmit={anular}>
          <div>
            <label htmlFor="motivo-anulacion">Motivo para anular</label>
            <input id="motivo-anulacion" type="text" maxLength={200} value={motivo}
              onChange={(e) => setMotivo(e.target.value)} placeholder="Explique el error o motivo" />
          </div>
          <button type="submit" className="btn btn-claro" disabled={anulando || motivo.trim().length < 5}>
            {anulando ? 'Anulando…' : 'Anular venta'}
          </button>
        </form>
      )}
      <button type="button" className="btn solo-pantalla" onClick={compartir}>Imprimir o compartir</button>
      <button type="button" className="btn btn-claro solo-pantalla" onClick={() => navegar('/vender')}>Nueva venta</button>
    </Pagina>
  );
}
