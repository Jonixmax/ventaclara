import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../AuthContext';

const TEMAS = [
  {
    id: 'ventas',
    nombre: 'Ventas',
    preguntas: [
      { id: 'registrar', texto: '¿Cómo registro una venta?' },
      { id: 'comprobante', texto: '¿Cómo vuelvo a ver un comprobante?' },
      { id: 'anular', texto: '¿Cómo anulo una venta?', propietaria: true },
    ],
  },
  {
    id: 'inventario',
    nombre: 'Inventario',
    preguntas: [
      { id: 'estados', texto: '¿Qué significan los colores del inventario?' },
      { id: 'producto', texto: '¿Cómo agrego o actualizo un producto?' },
      { id: 'borrar', texto: '¿Cómo quito un producto del inventario?', propietaria: true },
    ],
  },
  {
    id: 'compras',
    nombre: 'Compras y pedidos',
    propietaria: true,
    preguntas: [
      { id: 'programar', texto: '¿Cómo programo un pedido?' },
      { id: 'recibir', texto: '¿Cómo registro que llegó un pedido?' },
    ],
  },
  {
    id: 'caja',
    nombre: 'Cierre de caja',
    propietaria: true,
    preguntas: [
      { id: 'cerrar', texto: '¿Cómo hago el cierre del día?' },
      { id: 'corregir', texto: '¿Puedo corregir un cierre guardado?' },
    ],
  },
  {
    id: 'distribuidores',
    nombre: 'Distribuidores',
    propietaria: true,
    preguntas: [
      { id: 'contacto', texto: '¿Cómo guardo o cambio un contacto?' },
    ],
  },
  {
    id: 'usuarios',
    nombre: 'Usuarios',
    propietaria: true,
    preguntas: [
      { id: 'empleado', texto: '¿Cómo agrego un empleado?' },
    ],
  },
];

export default function AyudaGuiada() {
  const { esPropietaria } = useAuth();
  const [abierto, setAbierto] = useState(false);
  const [temaId, setTemaId] = useState('');
  const [preguntaId, setPreguntaId] = useState('');
  const temas = TEMAS.filter((tema) => !tema.propietaria || esPropietaria);
  const tema = temas.find((item) => item.id === temaId);
  const preguntas = tema?.preguntas.filter((item) => !item.propietaria || esPropietaria);
  const pregunta = preguntas?.find((item) => item.id === preguntaId);

  function cerrar() {
    setAbierto(false);
    setTemaId('');
    setPreguntaId('');
  }

  function volverATemas() {
    setTemaId('');
    setPreguntaId('');
  }

  function mostrarRespuesta() {
    const ir = (ruta, texto) => <Link to={ruta} onClick={cerrar}>{texto}</Link>;
    if (temaId === 'ventas' && preguntaId === 'registrar') {
      return <>Elige <b>Vender</b>, selecciona los productos y cantidades, revisa el total y registra el pago. Al confirmar, el inventario se actualiza. {ir('/vender', 'Ir a vender')}.</>;
    }
    if (temaId === 'ventas' && preguntaId === 'comprobante') {
      return <>Abre <b>Historial</b>, busca la venta y entra a su comprobante para consultarlo o imprimirlo. {ir('/historial', 'Ir al historial')}.</>;
    }
    if (temaId === 'ventas' && preguntaId === 'anular') {
      return <>Abre <b>Historial</b>, busca la venta, pulsa <b>Anular</b> y escribe el motivo. Solo se pueden anular ventas de días que todavía no tienen cierre. {ir('/historial', 'Ir al historial')}.</>;
    }
    if (temaId === 'inventario' && preguntaId === 'estados') {
      return <>Rojo significa que hay que pedir; amarillo, que se está acabando; verde, que hay suficiente. Los productos inactivos no aparecen en ventas.</>;
    }
    if (temaId === 'inventario' && preguntaId === 'producto') {
      return <>En <b>Inventario</b>, usa <b>Agregar producto</b> para crear uno nuevo o <b>Editar</b> en su tarjeta para corregir sus datos y existencias. {ir('/inventario', 'Ir al inventario')}.</>;
    }
    if (temaId === 'inventario' && preguntaId === 'borrar') {
      return <>Pulsa <b>Borrar</b> en la tarjeta y confirma. El producto quedará inactivo y dejará de aparecer en ventas; sus registros se conservan y se puede reactivar desde <b>Editar</b>.</>;
    }
    if (temaId === 'compras' && preguntaId === 'programar') {
      return <>En <b>Compras → Nueva compra</b>, agrega los productos, elige el distribuidor y la fecha esperada; luego pulsa <b>Programar recepción</b>. Programarlo no suma existencias. {ir('/compras?pestana=calendario', 'Ver calendario')}.</>;
    }
    if (temaId === 'compras' && preguntaId === 'recibir') {
      return <>En <b>Compras → Calendario</b>, selecciona la fecha del pedido y pulsa <b>Marcar recibido</b>. Entonces se registra la compra y se actualiza el inventario. {ir('/compras?pestana=calendario', 'Ir al calendario')}.</>;
    }
    if (temaId === 'caja' && preguntaId === 'cerrar') {
      return <>En <b>Reportes</b>, selecciona <b>Hoy</b>, escribe el efectivo contado y pulsa <b>Guardar cierre</b>. Solo se registra un cierre por día. {ir('/reportes', 'Ir a Reportes')}.</>;
    }
    if (temaId === 'caja' && preguntaId === 'corregir') {
      return <>En <b>Reportes</b>, dentro del cierre de hoy, pulsa <b>Editar cierre</b>. Cambia el efectivo contado; la diferencia se recalcula y se conserva el total del sistema original. {ir('/reportes', 'Ir a Reportes')}.</>;
    }
    if (temaId === 'distribuidores' && preguntaId === 'contacto') {
      return <>En <b>Compras → Distribuidores</b>, puedes agregar un nombre y WhatsApp, editar sus datos o inactivarlo. Inactivarlo conserva los pedidos anteriores. {ir('/compras', 'Ir a Compras')}.</>;
    }
    if (temaId === 'usuarios' && preguntaId === 'empleado') {
      return <>En <b>Usuarios</b>, completa el nombre, usuario y contraseña inicial. Comparte la contraseña en persona. {ir('/usuarios', 'Ir a Usuarios')}.</>;
    }
    return null;
  }

  return (
    <aside className="ayuda-asistente" aria-label="Ayuda guiada">
      {abierto && (
        <section id="ayuda-panel" className="ayuda-panel" aria-labelledby="ayuda-titulo">
          <div className="ayuda-encabezado">
            <div>
              <span className="marca">VentaClara</span>
              <h2 id="ayuda-titulo">Ayuda guiada</h2>
            </div>
            <button type="button" className="btn-mini" onClick={cerrar} aria-label="Cerrar ayuda">Cerrar</button>
          </div>
          <p className="m ayuda-intro">Elige un tema y una pregunta para ver los pasos.</p>
          {!tema && (
            <div className="lista ayuda-opciones">
              {temas.map((opcion) => (
                <button type="button" className="ayuda-opcion" key={opcion.id} onClick={() => setTemaId(opcion.id)}>
                  {opcion.nombre}<span aria-hidden="true">›</span>
                </button>
              ))}
            </div>
          )}
          {tema && (
            <>
              <button type="button" className="ayuda-volver" onClick={volverATemas}>‹ Todos los temas</button>
              <h3 className="ayuda-subtitulo">{tema.nombre}</h3>
              {!pregunta && (
                <div className="lista ayuda-opciones">
                  {preguntas.map((opcion) => (
                    <button type="button" className="ayuda-opcion" key={opcion.id} onClick={() => setPreguntaId(opcion.id)}>
                      {opcion.texto}<span aria-hidden="true">›</span>
                    </button>
                  ))}
                </div>
              )}
              {pregunta && (
                <div className="ayuda-respuesta" aria-live="polite">
                  <b>{pregunta.texto}</b>
                  <p>{mostrarRespuesta()}</p>
                  <button type="button" className="ayuda-volver" onClick={() => setPreguntaId('')}>‹ Otras preguntas de {tema.nombre}</button>
                </div>
              )}
            </>
          )}
          <p className="m ayuda-pie">Ayuda informativa; no consulta ni modifica tus datos.</p>
        </section>
      )}
      <button type="button" className="ayuda-boton" aria-expanded={abierto}
        onClick={() => setAbierto((actual) => !actual)}>
        {abierto ? 'Cerrar ayuda' : '¿Necesitas ayuda?'}
      </button>
    </aside>
  );
}
