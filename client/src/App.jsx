import { Navigate, Route, Routes } from 'react-router-dom';
import { useAuth } from './AuthContext';
import Login from './paginas/Login';
import Panel from './paginas/Panel';
import Venta from './paginas/Venta';
import Inventario from './paginas/Inventario';
import Comprobante from './paginas/Comprobante';
import Reportes from './paginas/Reportes';

function Protegida({ children, soloPropietaria = false }) {
  const { sesion, esPropietaria } = useAuth();
  if (!sesion) return <Navigate to="/login" replace />;
  if (soloPropietaria && !esPropietaria) return <Navigate to="/" replace />;
  return children;
}

export default function App() {
  const { sesion } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={sesion ? <Navigate to="/" replace /> : <Login />} />
      <Route path="/" element={<Protegida><Panel /></Protegida>} />
      <Route path="/vender" element={<Protegida><Venta /></Protegida>} />
      <Route path="/inventario" element={<Protegida><Inventario /></Protegida>} />
      <Route path="/comprobante" element={<Protegida><Comprobante /></Protegida>} />
      <Route path="/reportes" element={<Protegida soloPropietaria><Reportes /></Protegida>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
