import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';

const VACIO = { rubroId: '', nombre: '', precio: '', existencias: '', stockMinimo: '5', activo: true };

// Mismas reglas que la API (punto 4.4); la API vuelve a validar todo
function validar(d) {
  if (!d.rubroId) return 'Elija un rubro.';
  const nombre = d.nombre.trim();
  if (nombre.length < 2 || nombre.length > 80) return 'El nombre debe tener de 2 a 80 caracteres.';
  const precio = d.precio.trim().replace(',', '.');
  if (!/^\d+(\.\d{1,2})?$/.test(precio) || Number(precio) <= 0) return 'Escriba un precio válido, por ejemplo 0.75.';
  if (!/^\d+$/.test(d.existencias.trim()) || !/^\d+$/.test(d.stockMinimo.trim())) return 'Escriba un número entero, cero o mayor.';
  return '';
}

export default function ProductoForm() {
  const { id } = useParams();
  const editando = Boolean(id);
  const { llamar } = useAuth();
  const navegar = useNavigate();
  const [rubros, setRubros] = useState([]);
  const [datos, setDatos] = useState(VACIO);
  const [error, setError] = useState('');
  const [guardando, setGuardando] = useState(false);

  useEffect(() => {
    let activo = true;
    Promise.all([llamar('/api/rubros'), editando ? llamar('/api/productos?todos=1') : Promise.resolve([])])
      .then(([r, productos]) => {
        if (!activo) return;
        setRubros(r);
        if (editando) {
          const p = productos.find((x) => x.id === id);
          if (!p) { setError('Producto no encontrado.'); return; }
          setDatos({
            rubroId: p.rubroId, nombre: p.nombre, precio: Number(p.precio).toFixed(2),
            existencias: String(p.existencias), stockMinimo: String(p.stockMinimo), activo: p.activo,
          });
        }
      })
      .catch((e) => activo && setError(e.message));
    return () => { activo = false; };
  }, [llamar, editando, id]);

  const cambiar = (campo) => (e) => { setDatos({ ...datos, [campo]: e.target.value }); setError(''); };

  async function guardar(evento) {
    evento.preventDefault();
    const problema = validar(datos);
    if (problema) { setError(problema); return; }
    setGuardando(true);
    setError('');
    const cuerpo = {
      rubroId: datos.rubroId, nombre: datos.nombre.trim(), precio: datos.precio.trim(),
      existencias: datos.existencias.trim(), stockMinimo: datos.stockMinimo.trim(),
      ...(editando ? { activo: datos.activo } : {}),
    };
    try {
      await llamar(editando ? `/api/productos/${id}` : '/api/productos', { method: editando ? 'PUT' : 'POST', cuerpo });
      navegar('/inventario');
    } catch (e) {
      setError(e.message);
      setGuardando(false);
    }
  }

  return (
    <Pagina titulo={editando ? 'Editar producto' : 'Agregar producto'} subtitulo="Catálogo del negocio">
      <form className="lista formulario" onSubmit={guardar} noValidate>
        <div>
          <span className="etiqueta-campo" id="etq-rubro">Rubro</span>
          <div className="fila-chips" role="group" aria-labelledby="etq-rubro">
            {rubros.map((r) => (
              <button key={r.id} type="button" className="chip" aria-pressed={r.id === datos.rubroId}
                style={r.id === datos.rubroId ? { background: r.color, borderColor: r.color, color: '#fff' } : undefined}
                onClick={() => { setDatos({ ...datos, rubroId: r.id }); setError(''); }}>
                {r.nombre}
              </button>
            ))}
          </div>
        </div>
        <div>
          <label htmlFor="nombre">Nombre del producto</label>
          <input id="nombre" type="text" placeholder="Por ejemplo: Azúcar 1 lb" value={datos.nombre} onChange={cambiar('nombre')} />
        </div>
        <div>
          <label htmlFor="precio">Precio en dólares</label>
          <input id="precio" type="text" inputMode="decimal" placeholder="0.75" value={datos.precio} onChange={cambiar('precio')} />
        </div>
        <div>
          <label htmlFor="existencias">Existencias (unidades)</label>
          <input id="existencias" type="text" inputMode="numeric" placeholder="0" value={datos.existencias} onChange={cambiar('existencias')} />
        </div>
        <div>
          <label htmlFor="minimo">Stock mínimo</label>
          <input id="minimo" type="text" inputMode="numeric" placeholder="5" value={datos.stockMinimo} onChange={cambiar('stockMinimo')} />
          <p className="m ayuda">Cuando queden esta cantidad o menos, el producto saldrá en rojo.</p>
        </div>
        {editando && (
          <label className="casilla" htmlFor="activo">
            <input id="activo" type="checkbox" checked={datos.activo}
              onChange={(e) => setDatos({ ...datos, activo: e.target.checked })} />
            Disponible para la venta
          </label>
        )}
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Guardar producto'}</button>
        <button className="btn btn-claro" type="button" onClick={() => navegar('/inventario')}>Cancelar</button>
      </form>
    </Pagina>
  );
}
