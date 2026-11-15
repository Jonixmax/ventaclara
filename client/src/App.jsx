import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './paginas/Login';
import Panel from './paginas/Panel';
import Venta from './paginas/Venta';
import Inventario from './paginas/Inventario';
import Comprobante from './paginas/Comprobante';
import Reportes from './paginas/Reportes';
import ProductoForm from './paginas/ProductoForm';
import Compras from './paginas/Compras';
import Usuarios from './paginas/Usuarios';
import Historial from './paginas/Historial';

function Protegida({ children, soloPropietaria = false }) {
  const { sesion, esPropietaria } = useAuth();
  if (!sesion) return <Navigate to="/login" replace />;
  if (soloPropietaria && !esPropietaria) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { sesion, cargando, errorSesion, reintentarSesion } = useAuth();
  if (cargando) return <main className="contenido"><p role="status">Verificando sesión…</p></main>;
  if (errorSesion) {
    return (
      <main className="contenido">
        <p className="error" role="alert">{errorSesion}</p>
        <button type="button" className="btn" onClick={reintentarSesion}>Reintentar</button>
      </main>
    );
  }
  return (
    <Routes>
      <Route path="/login" element={sesion ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protegida><Panel /></Protegida>} />
      <Route path="/vender" element={<Protegida><Venta /></Protegida>} />
      <Route path="/inventario" element={<Protegida><Inventario /></Protegida>} />
      <Route path="/comprobante" element={<Protegida><Comprobante /></Protegida>} />
      <Route path="/comprobante/:id" element={<Protegida><Comprobante /></Protegida>} />
      <Route path="/historial" element={<Protegida><Historial /></Protegida>} />
      <Route path="/reportes" element={<Protegida soloPropietaria><Reportes /></Protegida>} />
      <Route path="/producto/nuevo" element={<Protegida soloPropietaria><ProductoForm /></Protegida>} />
      <Route path="/producto/:id" element={<Protegida soloPropietaria><ProductoForm /></Protegida>} />
      <Route path="/compras" element={<Protegida soloPropietaria><Compras /></Protegida>} />
      <Route path="/usuarios" element={<Protegida soloPropietaria><Usuarios /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
