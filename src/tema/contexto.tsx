import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { type Tema, cookieDeTema } from './tema.js';

interface Valor {
  tema: Tema;
  elegir: (tema: Tema) => void;
}

const Contexto = createContext<Valor | null>(null);

/**
 * Guarda el tema elegido y lo estampa en el `<html>`, que es donde el CSS lo
 * lee: `estilos.css` cambia `color-scheme` según `data-tema` y todos los
 * tokens salen de `light-dark()`.
 *
 * El valor inicial lo trae el servidor desde la cookie, así que la primera
 * pintada ya sale con el tema correcto. De ahí en más el atributo se toca a
 * mano desde acá: React no lo pisa porque el `data-tema` que renderiza el
 * documento sale de los datos del loader, que no cambian al tocar el selector.
 */
export function ProveedorDeTema({ inicial, children }: { inicial: Tema; children: ReactNode }) {
  const [tema, setTema] = useState<Tema>(inicial);

  useEffect(() => {
    const html = document.documentElement;
    // Sin atributo, manda `prefers-color-scheme`. Con atributo, manda la
    // elección: el default tiene que poder recuperarse, no ser una calle
    // de una sola mano.
    if (tema === 'sistema') delete html.dataset.tema;
    else html.dataset.tema = tema;
  }, [tema]);

  const elegir = useCallback((nuevo: Tema) => {
    setTema(nuevo);
    document.cookie = cookieDeTema(nuevo);
  }, []);

  return <Contexto.Provider value={{ tema, elegir }}>{children}</Contexto.Provider>;
}

export function useTema(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useTema necesita estar dentro de <ProveedorDeTema>.');
  return valor;
}
