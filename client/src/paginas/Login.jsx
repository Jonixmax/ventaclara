import { useState } from 'react';
import { useAuth } from '../AuthContext';

export default function Login() {
  const { login } = useAuth();
  const [usuario, setUsuario] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento) {
    evento.preventDefault();
    if (!usuario.trim() || !password) {
      setError('Escriba su usuario y contraseña.');
      return;
    }
    setError('');
    setEnviando(true);
    try {
      await login(usuario.trim(), password);
    } catch (e) {
      setError(e.message);
      setEnviando(false);
    }
  }

  return (
    <div className="login">
      <div className="barra barra-login">
        <h1>VentaClara</h1>
        <p>Control de ventas de su tienda</p>
      </div>
      <form className="login-cuerpo" onSubmit={enviar} noValidate>
        <div>
          <label htmlFor="usuario">Usuario</label>
          <input id="usuario" type="text" autoComplete="username" placeholder="Escriba su usuario"
            value={usuario} onChange={(e) => setUsuario(e.target.value)} />
        </div>
        <div>
          <label htmlFor="password">Contraseña</label>
          <input id="password" type="password" autoComplete="current-password" placeholder="Escriba su contraseña"
            value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn" type="submit" disabled={enviando}>{enviando ? 'Entrando…' : 'Entrar'}</button>
        <p className="m centro">¿No puede entrar? Pida ayuda a la propietaria.</p>
      </form>
      <p className="m centro pie-login">Tienda Emmanuel · Brisas del Norte</p>
    </div>
  );
}
