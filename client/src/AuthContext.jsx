import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { api } from './api';

const Contexto = createContext(null);
const CLAVE = 'ventaclara_sesion';

function leerSesion() {
  try {
    return JSON.parse(localStorage.getItem(CLAVE));
  } catch {
    return null;
  }
}

export function AuthProvider({ children }) {
  const [sesion, setSesion] = useState(leerSesion);

  const login = useCallback(async (usuario, password) => {
    const respuesta = await api('/api/auth/login', { method: 'POST', cuerpo: { usuario, password } });
    localStorage.setItem(CLAVE, JSON.stringify(respuesta));
    setSesion(respuesta);
  }, []);

  const logout = useCallback(() => {
    localStorage.removeItem(CLAVE);
    setSesion(null);
  }, []);

  // Llama a la API con el token de la sesión; si el token venció, cierra la sesión
  const llamar = useCallback(
    async (ruta, opciones = {}) => {
      try {
        return await api(ruta, { ...opciones, token: sesion?.token });
      } catch (error) {
        if (error.status === 401) logout();
        throw error;
      }
    },
    [sesion, logout]
  );

  const valor = useMemo(
    () => ({ sesion, usuario: sesion?.usuario, esPropietaria: sesion?.usuario?.rol === 'propietaria', login, logout, llamar }),
    [sesion, login, logout, llamar]
  );
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useAuth = () => useContext(Contexto);
