import { type ReactNode, createContext, useCallback, useContext, useEffect, useState } from 'react';
import { flushSync } from 'react-dom';
import { type Tema, cookieDeTema } from './tema.js';

interface Valor {
  tema: Tema;
  elegir: (tema: Tema) => void;
}

const Contexto = createContext<Valor | null>(null);

/** Sin atributo manda `prefers-color-scheme`; con atributo manda la elección. */
function estampar(tema: Tema): void {
  const html = document.documentElement;
  // El default tiene que poder recuperarse, no ser una calle de una sola mano.
  if (tema === 'sistema') delete html.dataset.tema;
  else html.dataset.tema = tema;
}

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

  // Solo para el arranque y para cuando el tema cambia sin pasar por `elegir`
  // (una navegación que trae otra cookie). El camino del selector ya estampó.
  useEffect(() => {
    estampar(tema);
  }, [tema]);

  const elegir = useCallback((nuevo: Tema) => {
    document.cookie = cookieDeTema(nuevo);

    // Sin transición, el fondo salta de golpe: en esta app eso es un fogonazo
    // de pantalla completa —de casi blanco a casi negro—, que es justo el
    // cambio brusco de brillo que hay que evitar. Un crossfade lo suaviza sin
    // mover nada, así que no hay que apagarlo con movimiento reducido: es
    // opacidad pura, la forma que el movimiento reducido pide.
    //
    // El `flushSync` mete el cambio de React —el botón marcado del selector—
    // en la misma captura que el cambio de tema, para que las dos cosas pasen
    // en el mismo cuadro en vez de una atrás de la otra.
    if (!document.startViewTransition) {
      setTema(nuevo);
      return;
    }

    document.startViewTransition(() => {
      flushSync(() => setTema(nuevo));
      estampar(nuevo);
    });
  }, []);

  return <Contexto.Provider value={{ tema, elegir }}>{children}</Contexto.Provider>;
}

export function useTema(): Valor {
  const valor = useContext(Contexto);
  if (!valor) throw new Error('useTema necesita estar dentro de <ProveedorDeTema>.');
  return valor;
}
