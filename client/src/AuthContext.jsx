import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { api } from './api';

const Contexto = createContext(null);
const CLAVE = 'ventaclara_sesion';

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorSesion, setErrorSesion] = useState('');
  const [intentoSesion, setIntentoSesion] = useState(0);

  useEffect(() => {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      // El token anterior no se usa aunque el almacenamiento no esté disponible.
    }
    let activo = true;
    api('/api/auth/session')
      .then(({ usuario }) => activo && setSesion({ usuario }))
      .catch((error) => {
        if (!activo) return;
        if (error.status === 401) setSesion(null);
        else setErrorSesion(error.message);
      })
      .finally(() => activo && setCargando(false));
    return () => { activo = false; };
  }, [intentoSesion]);

  const login = useCallback(async (usuario, password) => {
    const respuesta = await api('/api/auth/login', { method: 'POST', cuerpo: { usuario, password } });
    setSesion(respuesta);
    setErrorSesion('');
  }, []);

  const logout = useCallback(async () => {
    await api('/api/auth/logout', { method: 'POST' });
    setSesion(null);
    setErrorSesion('');
  }, []);

  const reintentarSesion = useCallback(() => {
    setCargando(true);
    setErrorSesion('');
    setIntentoSesion((actual) => actual + 1);
  }, []);

  // Si el token venció, cierra la sesión.
  const llamar = useCallback(
    async (ruta, opciones = {}) => {
      try {
        return await api(ruta, opciones);
      } catch (error) {
        if (error.status === 401) setSesion(null);
        throw error;
      }
    },
    []
  );

  const valor = useMemo(
    () => ({
      sesion,
      usuario: sesion?.usuario,
      esPropietaria: sesion?.usuario?.rol === 'propietaria',
      cargando,
      errorSesion,
      reintentarSesion,
      login,
      logout,
      llamar,
    }),
    [sesion, cargando, errorSesion, reintentarSesion, login, logout, llamar]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAuth = () => useContext(Contexto);
