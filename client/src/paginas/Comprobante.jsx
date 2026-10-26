import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import Pagina from '../componentes/Pagina';
import { dinero, fechaHora } from '../formato';

export default function Comprobante() {
  const { state } = useLocation();
  const navegar = useNavigate();
  if (!state?.venta) return <Navigate to="/" replace />;
  const { venta, alertas = [] } = state;

  async function compartir() {
    const texto = `Comprobante ${venta.numeroComprobante} · Total ${dinero(venta.total)} · Tienda Emmanuel`;
    if (navigator.share) {
      try { await navigator.share({ title: 'Comprobante de venta', text: texto }); return; } catch { /* el usuario canceló */ }
    }
    window.print();
  }

  return (
    <Pagina titulo="Comprobante" subtitulo="Venta guardada">
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
        <hr />
        {venta.items.map((i) => (
          <div className="fila" key={i.productoId}>
            <span>{i.cantidad} × {i.nombre}</span>
            <span>{dinero(i.subtotal)}</span>
          </div>
        ))}
        <hr />
        <div className="fila"><b>Total</b><b className="total">{dinero(venta.total)}</b></div>
        <p className="m centro">Gracias por su compra</p>
      </section>
      {alertas.length > 0 && (
        <p className="aviso" role="status">
          <span>Quedan pocas unidades de: <b>{alertas.map((a) => a.nombre).join(', ')}</b></span>
        </p>
      )}
      <button type="button" className="btn" onClick={compartir}>Imprimir o compartir</button>
      <button type="button" className="btn btn-claro" onClick={() => navegar('/vender')}>Nueva venta</button>
    </Pagina>
  );
}
