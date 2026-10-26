import { NavLink } from 'react-router-dom';
import { useAuth } from '../AuthContext';

// Estructura común: barra superior, contenido y navegación (inferior en celular, lateral en computadora)
export default function Pagina({ titulo, subtitulo, children }) {
  const { usuario, esPropietaria, logout } = useAuth();
  return (
    <div className="app">
      <header className="barra">
        <div>
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <button type="button" className="salir" onClick={logout} aria-label={`Cerrar sesión de ${usuario?.nombre}`}>
          Salir
        </button>
      </header>
      <nav className="nav" aria-label="Menú principal">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/vender">Vender</NavLink>
        <NavLink to="/inventario">Inventario</NavLink>
        {esPropietaria && <NavLink to="/reportes">Reportes</NavLink>}
      </nav>
      <main className="contenido">{children}</main>
    </div>
  );
}
