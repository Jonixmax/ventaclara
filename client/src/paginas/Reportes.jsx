import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';
import { dinero } from '../formato';

const FORMATO_MONTO = /^\d+([.,]\d{1,2})?$/;

export default function Reportes() {
  const { llamar } = useAuth();
  const [periodo, setPeriodo] = useState('hoy');
  const [datos, setDatos] = useState(null);
  const [cierre, setCierre] = useState(null);
  const [efectivo, setEfectivo] = useState('');
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    setDatos(null);
    llamar(`/api/reportes/rubros?periodo=${periodo}`)
      .then((d) => activo && setDatos(d))
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [periodo, llamar]);

  useEffect(() => {
    let activo = true;
    llamar('/api/cierres/previsualizar')
      .then((d) => activo && setCierre(d.cierre))
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar]);

  const totalCentavos = datos ? Math.round(datos.total * 100) : 0;
  const efectivoValido = FORMATO_MONTO.test(efectivo.trim());
  const diferencia = efectivoValido ? Math.round(Number(efectivo.trim().replace(',', '.')) * 100) - totalCentavos : null;

  function textoDiferencia() {
    if (diferencia === null) return { clase: '', texto: 'Se calcula al escribir' };
    if (diferencia === 0) return { clase: 'cuadra', texto: 'La caja cuadra' };
    if (diferencia > 0) return { clase: 'sobra', texto: `Sobran ${dinero(diferencia / 100)}` };
    return { clase: 'falta', texto: `Faltan ${dinero(-diferencia / 100)}` };
  }

  async function guardar() {
    if (!efectivoValido) {
      setError('Escriba el efectivo contado.');
      return;
    }
    setGuardando(true);
    setError('');
    try {
      setCierre(await llamar('/api/cierres', { method: 'POST', cuerpo: { efectivoContado: efectivo.trim() } }));
    } catch (e) {
      setError(e.message);
      if (e.status === 409) llamar('/api/cierres/previsualizar').then((d) => setCierre(d.cierre)).catch(() => {});
    } finally {
      setGuardando(false);
    }
  }

  const mostrarDiferencia = textoDiferencia();
  return (
    <Pagina titulo="Reportes" subtitulo="Ventas por rubro y cierre de caja">
      <div className="fila-chips" role="group" aria-label="Periodo">
        <button type="button" className="chip" aria-pressed={periodo === 'hoy'}
          style={periodo === 'hoy' ? { background: '#0F4C81', borderColor: '#0F4C81', color: '#fff' } : undefined}
          onClick={() => setPeriodo('hoy')}>Hoy</button>
        <button type="button" className="chip" aria-pressed={periodo === 'mes'}
          style={periodo === 'mes' ? { background: '#0F4C81', borderColor: '#0F4C81', color: '#fff' } : undefined}
          onClick={() => setPeriodo('mes')}>Este mes</button>
      </div>

      <section className="c lista">
        <div className="fila">
          <b>{periodo === 'hoy' ? 'Total del sistema hoy' : 'Total del mes'}</b>
          <b className="total">{datos ? dinero(datos.total) : '…'}</b>
        </div>
        {datos && <div className="m">{datos.cantidadVentas} {datos.cantidadVentas === 1 ? 'venta' : 'ventas'}</div>}
        {(datos?.porRubro || []).map((r) => (
          <div key={r.rubroId}>
            <div className="fila">
              <span><span className="muestra" style={{ background: r.color }} />{r.nombre}</span>
              <b>{dinero(r.total)}</b>
            </div>
            <div className="pista">
              <div className="relleno" style={{ width: `${datos.total > 0 ? (r.total / datos.total) * 100 : 0}%`, background: r.color }} />
            </div>
          </div>
        ))}
      </section>

      {periodo === 'hoy' && (cierre ? (
        <section className="c lista" aria-live="polite">
          <b>Cierre guardado</b>
          <div className="fila"><span>Efectivo contado</span><b>{dinero(cierre.efectivoContado)}</b></div>
          <div className="fila"><span>Total del sistema</span><b>{dinero(cierre.totalSistema)}</b></div>
          <div className={`dif ${cierre.diferencia === 0 ? 'cuadra' : cierre.diferencia > 0 ? 'sobra' : 'falta'}`}>
            {cierre.diferencia === 0 ? 'La caja cuadra' : cierre.diferencia > 0 ? `Sobraron ${dinero(cierre.diferencia)}` : `Faltaron ${dinero(-cierre.diferencia)}`}
          </div>
          <p className="m centro" style={{ margin: 0 }}>Ya se hizo el cierre de hoy.</p>
        </section>
      ) : (
        <>
          <div>
            <label htmlFor="efectivo">Efectivo contado</label>
            <input id="efectivo" type="text" inputMode="decimal" placeholder="0.00" value={efectivo}
              onChange={(e) => { setEfectivo(e.target.value); setError(''); }} />
          </div>
          <div className={`dif ${mostrarDiferencia.clase}`} aria-live="polite">Diferencia: {mostrarDiferencia.texto}</div>
          {error && <p className="error" role="alert">{error}</p>}
          <button type="button" className="btn" onClick={guardar} disabled={guardando}>
            {guardando ? 'Guardando…' : 'Guardar cierre'}
          </button>
        </>
      ))}
      {(periodo === 'mes' || cierre) && error && <p className="error" role="alert">{error}</p>}
    </Pagina>
  );
}
