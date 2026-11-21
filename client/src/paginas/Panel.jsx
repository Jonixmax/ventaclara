import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero, primerNombre, saludo } from '../formato';

function fechaEnElSalvador() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'America/El_Salvador',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date());
  const valor = Object.fromEntries(partes.map((parte) => [parte.type, parte.value]));
  return `${valor.year}-${valor.month}-${valor.day}`;
}

function fechaPedido(fecha) {
  return new Date(`${fecha}T12:00:00`).toLocaleDateString('es-SV', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });
}

export default function Panel() {
  const { usuario, esPropietaria, llamar } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [pedidosPendientes, setPedidosPendientes] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    llamar('/api/productos/alertas').then((d) => activo && setAlertas(d)).catch((e) => activo && setError(e.message));
    if (esPropietaria) {
      llamar('/api/ventas/resumen-hoy').then((d) => activo && setResumen(d)).catch((e) => activo && setError(e.message));
      llamar('/api/compras/pedidos').then((d) => activo && setPedidosPendientes(d)).catch((e) => activo && setError(e.message));
    }
    return () => { activo = false; };
  }, [llamar, esPropietaria]);

  const hoy = fechaEnElSalvador();
  const pedidosUrgentes = (pedidosPendientes || []).filter((pedido) => pedido.fechaEsperada <= hoy);
  const pedidosVencidos = pedidosUrgentes.filter((pedido) => pedido.fechaEsperada < hoy).length;

  return (
    <Pagina titulo={`${saludo()}, ${primerNombre(usuario.nombre)}`} subtitulo="Resumen de hoy">
      {error && <p className="error" role="alert">{error}</p>}
      <div className="rejilla">
        {esPropietaria && (
          <>
            <section className="c">
              <div className="m">Total vendido hoy</div>
              <div className="gigante">{resumen ? dinero(resumen.total) : '…'}</div>
              {resumen && <div className="m">{resumen.cantidadVentas} {resumen.cantidadVentas === 1 ? 'venta' : 'ventas'}</div>}
            </section>
            <section className="c lista">
              <b>Por rubro</b>
              {(resumen?.porRubro || []).map((r) => (
                <div className="fila" key={r.rubroId}>
                  <span><span className="muestra" style={{ background: r.color }} />{r.nombre}</span>
                  <b>{dinero(r.total)}</b>
                </div>
              ))}
            </section>
          </>
        )}
        {esPropietaria && pedidosPendientes !== null && (
          <section className={`aviso ${pedidosUrgentes.length ? '' : 'aviso-ok'}`}>
            <span>
              {pedidosUrgentes.length === 0
                ? 'No hay pedidos para recibir hoy ni atrasados.'
                : <>
                  <b>{pedidosUrgentes.length} {pedidosUrgentes.length === 1 ? 'pedido' : 'pedidos'}</b> por recibir
                  {pedidosVencidos > 0 && ` · ${pedidosVencidos} atrasado${pedidosVencidos === 1 ? '' : 's'}`}
                </>}
            </span>
            <Link className="enlace-boton" to="/compras?pestana=calendario">Ver calendario</Link>
          </section>
        )}
        {esPropietaria && pedidosUrgentes.map((pedido) => (
          <section className="c lista" key={pedido.id}>
            <div className="fila">
              <b>{pedido.proveedor || 'Sin distribuidor'}</b>
              <span className={pedido.fechaEsperada < hoy ? 'error-suave' : 'm'}>
                {pedido.fechaEsperada < hoy ? 'Atrasado' : 'Recibir hoy'}
              </span>
            </div>
            <div className="m">{fechaPedido(pedido.fechaEsperada)}</div>
            <div className="m">{pedido.items.map((item) => `${item.cantidad} × ${item.nombre}`).join(' · ')}</div>
          </section>
        ))}
        <section className={`aviso ${alertas.length ? '' : 'aviso-ok'}`}>
          <span>
            {alertas.length
              ? <><b>{alertas.length} {alertas.length === 1 ? 'producto' : 'productos'}</b> por agotarse</>
              : 'No hay productos por agotarse'}
          </span>
          {alertas.length > 0 && <Link className="enlace-boton" to="/inventario?alertas=1">Ver</Link>}
        </section>
      </div>
      <Link className="btn btn-enlace" to="/vender">Nueva venta</Link>
      {esPropietaria && (
        <>
          <Link className="btn btn-claro btn-enlace" to="/compras">Registrar compra de mercadería</Link>
          <Link className="btn btn-claro btn-enlace" to="/reportes">Cerrar caja del día</Link>
          <Link className="btn btn-claro btn-enlace" to="/usuarios">Usuarios del sistema</Link>
        </>
      )}
    </Pagina>
  );
}
