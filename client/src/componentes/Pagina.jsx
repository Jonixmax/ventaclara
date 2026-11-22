import { NavLink } from 'react-router-dom';
import { useState } from 'react';
import { useAuth } from '../AuthContext';
import BotonTema from './BotonTema';
import AyudaGuiada from './AyudaGuiada';

// Estructura común: barra superior, contenido y navegación (inferior en celular, lateral en computadora)
export default function Pagina({ titulo, subtitulo, children }) {
  const { usuario, esPropietaria, logout } = useAuth();
  const [error, setError] = useState('');

  async function salir() {
    setError('');
    try {
      await logout();
    } catch (e) {
      setError(e.message);
    }
  }

  return (
    <div className="app">
      <header className="barra">
        <div className="encabezado-titulo">
          <span className="marca">VentaClara</span>
          <h1>{titulo}</h1>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        <div className="acciones-barra">
          <BotonTema />
          <button type="button" className="btn-barra" onClick={salir} aria-label={`Cerrar sesión de ${usuario?.nombre}`}>
            Salir
          </button>
        </div>
      </header>
      <nav className="nav" aria-label="Menú principal">
        <NavLink to="/" end>Inicio</NavLink>
        <NavLink to="/vender">Vender</NavLink>
        <NavLink to="/historial">Historial</NavLink>
        <NavLink to="/inventario">Inventario</NavLink>
        {esPropietaria && <NavLink to="/compras">Compras</NavLink>}
        {esPropietaria && <NavLink to="/reportes">Reportes</NavLink>}
      </nav>
      <main className="contenido">
        {error && <p className="error" role="alert">{error}</p>}
        {children}
      </main>
      <AyudaGuiada />
    </div>
  );
}
