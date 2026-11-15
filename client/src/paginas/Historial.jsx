import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero, fechaHora } from '../formato';

const FILTROS_VACIOS = { desde: '', hasta: '', comprobante: '' };

export default function Historial() {
  const { llamar } = useAuth();
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [consulta, setConsulta] = useState(FILTROS_VACIOS);
  const [pagina, setPagina] = useState(1);
  const [resultado, setResultado] = useState(null);
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    let activo = true;
    const parametros = new URLSearchParams({ pagina: String(pagina) });
    Object.entries(consulta).forEach(([clave, valor]) => {
      if (valor) parametros.set(clave, valor);
    });
    setCargando(true);
    setError('');
    llamar(`/api/ventas?${parametros}`)
      .then((datos) => activo && setResultado(datos))
      .catch((e) => activo && setError(e.message))
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [consulta, pagina, llamar]);

  function buscar(evento) {
    evento.preventDefault();
    setPagina(1);
    setConsulta({ ...filtros });
  }

  return (
    <Pagina titulo="Historial de ventas" subtitulo="Consulte e imprima comprobantes anteriores">
      <form className="c lista" onSubmit={buscar}>
        <div className="dos-columnas">
          <div>
            <label htmlFor="desde">Desde</label>
            <input id="desde" type="date" value={filtros.desde}
              onChange={(e) => setFiltros({ ...filtros, desde: e.target.value })} />
          </div>
          <div>
            <label htmlFor="hasta">Hasta</label>
            <input id="hasta" type="date" value={filtros.hasta}
              onChange={(e) => setFiltros({ ...filtros, hasta: e.target.value })} />
          </div>
        </div>
        <div>
          <label htmlFor="comprobante">Número de comprobante</label>
          <input id="comprobante" type="text" placeholder="V-000001" value={filtros.comprobante}
            onChange={(e) => setFiltros({ ...filtros, comprobante: e.target.value })} />
        </div>
        <button className="btn" type="submit">Buscar ventas</button>
      </form>

      {error && <p className="error" role="alert">{error}</p>}
      {cargando && <p role="status">Cargando ventas…</p>}
      {!cargando && resultado && (
        <>
          <section className="c lista" aria-label="Resultados de ventas">
            <div className="fila">
              <b>{resultado.total} {resultado.total === 1 ? 'venta' : 'ventas'}</b>
              <span className="m">Página {resultado.pagina} de {resultado.paginas || 1}</span>
            </div>
            {resultado.ventas.length === 0 && <p className="m">No se encontraron ventas.</p>}
            {resultado.ventas.map((venta) => (
              <div className="fila" key={venta.id}>
                <span>
                  <Link className="enlace-historial" to={`/comprobante/${venta.id}`}>
                    Comprobante {venta.numeroComprobante}
                  </Link>
                  <br />
                  <span className="m">{fechaHora(venta.fecha)}</span>
                  {venta.estado === 'anulada' && <><br /><span className="estado-anulada">Anulada</span></>}
                </span>
                <b>{dinero(venta.total)}</b>
              </div>
            ))}
          </section>
          <div className="fila">
            <button type="button" className="btn-mini" disabled={pagina <= 1 || cargando}
              onClick={() => setPagina((actual) => actual - 1)}>Anterior</button>
            <button type="button" className="btn-mini" disabled={pagina >= resultado.paginas || cargando}
              onClick={() => setPagina((actual) => actual + 1)}>Siguiente</button>
          </div>
        </>
      )}
    </Pagina>
  );
}
