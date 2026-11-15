import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import Pagina from '../componentes/Pagina';

const VACIO = { nombre: '', usuario: '', password: '' };

// Mismas reglas que la API (punto 4.4); la API vuelve a validar todo
function validarNuevo(d) {
  const nombre = d.nombre.trim();
  if (nombre.length < 3 || nombre.length > 60) return 'El nombre debe tener de 3 a 60 caracteres.';
  const usuario = d.usuario.trim().toLowerCase();
  if (usuario.length < 4 || usuario.length > 20) return 'El usuario debe tener de 4 a 20 caracteres.';
  if (!/^[a-z0-9._-]+$/.test(usuario)) return 'Use solo letras minúsculas, números, punto, guion o guion bajo.';
  if (d.password.length < 8) return 'La contraseña debe tener al menos 8 caracteres.';
  return '';
}

export default function Usuarios() {
  const { llamar, usuario: yo } = useAuth();
  const [usuarios, setUsuarios] = useState([]);
  const [nuevo, setNuevo] = useState(VACIO);
  const [error, setError] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [guardando, setGuardando] = useState(false);
  const [cambiando, setCambiando] = useState(null);
  const [clave, setClave] = useState('');

  const cargar = useCallback(() => llamar('/api/usuarios').then(setUsuarios).catch((e) => setError(e.message)), [llamar]);
  useEffect(() => { cargar(); }, [cargar]);

  const escribir = (campo) => (e) => { setNuevo({ ...nuevo, [campo]: e.target.value }); setError(''); setMensaje(''); };

  async function crear(evento) {
    evento.preventDefault();
    const problema = validarNuevo(nuevo);
    if (problema) { setError(problema); return; }
    setGuardando(true);
    setError('');
    try {
      const creado = await llamar('/api/usuarios', {
        method: 'POST',
        cuerpo: { nombre: nuevo.nombre.trim(), usuario: nuevo.usuario.trim(), password: nuevo.password },
      });
      setNuevo(VACIO);
      setMensaje(`Se creó el empleado ${creado.nombre}. Ya puede iniciar sesión con el usuario ${creado.usuario}.`);
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setGuardando(false);
    }
  }

  async function actualizar(id, cuerpo, textoExito) {
    setError('');
    setMensaje('');
    try {
      await llamar(`/api/usuarios/${id}`, { method: 'PUT', cuerpo });
      setMensaje(textoExito);
      setCambiando(null);
      setClave('');
      await cargar();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <Pagina titulo="Usuarios" subtitulo="Quién puede entrar al sistema">
      {error && <p className="error" role="alert">{error}</p>}
      {mensaje && <p className="aviso aviso-ok" role="status">{mensaje}</p>}

      <form className="c lista formulario" onSubmit={crear} noValidate>
        <b>Agregar empleado</b>
        <div>
          <label htmlFor="u-nombre">Nombre completo</label>
          <input id="u-nombre" type="text" value={nuevo.nombre} onChange={escribir('nombre')} />
        </div>
        <div>
          <label htmlFor="u-usuario">Usuario para entrar</label>
          <input id="u-usuario" type="text" autoCapitalize="none" placeholder="Por ejemplo: ana.perez" value={nuevo.usuario} onChange={escribir('usuario')} />
        </div>
        <div>
          <label htmlFor="u-password">Contraseña</label>
          <input id="u-password" type="password" autoComplete="new-password" value={nuevo.password} onChange={escribir('password')} />
          <p className="m ayuda">Mínimo 8 caracteres. Entréguesela al empleado en persona.</p>
        </div>
        <button className="btn" type="submit" disabled={guardando}>{guardando ? 'Guardando…' : 'Crear empleado'}</button>
      </form>

      {usuarios.map((u) => {
        const esYo = u.id === yo?.id;
        return (
          <section className="c lista" key={u.id}>
            <div className="fila">
              <span className="nombre-producto">
                <b>{u.nombre}</b>
                <br />
                <span className="m">{u.usuario} · {u.rol === 'propietaria' ? 'Propietaria' : 'Empleado'}{esYo ? ' (usted)' : ''}</span>
              </span>
              <span className={`etiqueta ${u.activo ? 'verde' : 'inactivo'}`}>{u.activo ? 'Activo' : 'Inactivo'}</span>
            </div>
            <div className="acciones-fila">
              <button type="button" className="btn-mini" onClick={() => { setCambiando(cambiando === u.id ? null : u.id); setClave(''); setError(''); }}>
                Cambiar contraseña
              </button>
              {!esYo && (
                <button type="button" className="btn-mini"
                  onClick={() => actualizar(u.id, { activo: !u.activo }, u.activo ? `Se desactivó a ${u.nombre}.` : `Se activó a ${u.nombre}.`)}>
                  {u.activo ? 'Desactivar' : 'Activar'}
                </button>
              )}
            </div>
            {cambiando === u.id && (
              <div className="lista">
                <div>
                  <label htmlFor={`clave-${u.id}`}>Nueva contraseña</label>
                  <input id={`clave-${u.id}`} type="password" autoComplete="new-password" value={clave} onChange={(e) => { setClave(e.target.value); setError(''); }} />
                </div>
                <button type="button" className="btn"
                  onClick={() => (clave.length < 8 ? setError('La contraseña debe tener al menos 8 caracteres.') : actualizar(u.id, { password: clave }, `Se cambió la contraseña de ${u.nombre}.`))}>
                  Guardar contraseña
                </button>
              </div>
            )}
          </section>
        );
      })}
    </Pagina>
  );
}
