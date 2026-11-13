import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';

const Contexto = createContext(null);
const CLAVE = 'ventaclara_tema';

// Tema inicial: el que eligió el usuario; si nunca eligió, el del dispositivo
function temaInicial() {
  try {
    const guardado = localStorage.getItem(CLAVE);
    if (guardado === 'claro' || guardado === 'oscuro') return guardado;
  } catch {
    /* sin acceso al almacenamiento */
  }
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'oscuro' : 'claro';
}

export function TemaProvider({ children }) {
  const [tema, setTema] = useState(temaInicial);

  useEffect(() => {
    document.documentElement.dataset.tema = tema;
  }, [tema]);

  // Solo se guarda cuando la persona lo cambia a propósito
  const alternar = useCallback(() => {
    setTema((actual) => {
      const nuevo = actual === 'oscuro' ? 'claro' : 'oscuro';
      try { localStorage.setItem(CLAVE, nuevo); } catch { /* sin acceso al almacenamiento */ }
      return nuevo;
    });
  }, []);

  const valor = useMemo(() => ({ tema, oscuro: tema === 'oscuro', alternar }), [tema, alternar]);
  return <Contexto.Provider value={valor}>{children}</Contexto.Provider>;
}

export const useTema = () => useContext(Contexto);
