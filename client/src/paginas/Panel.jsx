import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero, primerNombre, saludo } from '../formato';

export default function Panel() {
  const { usuario, esPropietaria, llamar } = useAuth();
  const [alertas, setAlertas] = useState([]);
  const [resumen, setResumen] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let activo = true;
    llamar('/api/productos/alertas').then((d) => activo && setAlertas(d)).catch((e) => activo && setError(e.message));
    if (esPropietaria) {
      llamar('/api/ventas/resumen-hoy').then((d) => activo && setResumen(d)).catch((e) => activo && setError(e.message));
    }
    return () => { activo = false; };
  }, [llamar, esPropietaria]);

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
    </Pagina>
  );
}
