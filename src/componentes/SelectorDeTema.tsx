import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { MoonIcon, SunIcon, SunMoonIcon } from 'lucide-react';
import { useTema } from '../tema/contexto.js';
import type { Tema } from '../tema/tema.js';

const OPCIONES = [
  // Sol y luna a la vez, no un monitor: el panel ya usa el monitor para
  // "Ver la pantalla" y dos monitores en la misma fila se leen como lo mismo.
  { valor: 'sistema', etiqueta: 'Sistema', Icono: SunMoonIcon },
  { valor: 'claro', etiqueta: 'Claro', Icono: SunIcon },
  { valor: 'oscuro', etiqueta: 'Oscuro', Icono: MoonIcon },
] as const satisfies readonly { valor: Tema; etiqueta: string; Icono: typeof SunIcon }[];

interface Props {
  /** Solo iconos, para meterlo en una fila que ya está llena. */
  compacto?: boolean;
}

/**
 * Elegir el tema: seguir al sistema, o forzar claro u oscuro.
 *
 * Son tres opciones y no un interruptor de dos porque "sistema" es el default
 * y tiene que poder recuperarse: en un celular, seguir al sistema es mejor que
 * cualquier cosa que elija esta app. El override existe para la pantalla de la
 * oficina, donde el sistema no sabe que es un televisor.
 */
export function SelectorDeTema({ compacto = false }: Props) {
  const { tema, elegir } = useTema();

  return (
    <ToggleGroup
      aria-label="Tema"
      variant="outline"
      size="sm"
      spacing={0}
      value={[tema]}
      onValueChange={(valores) => {
        // Volver a tocar la opción activa la desmarcaría y dejaría el grupo
        // vacío. Acá siempre hay un tema puesto, así que se ignora.
        const elegido = valores[0] as Tema | undefined;
        if (elegido) elegir(elegido);
      }}
    >
      {OPCIONES.map(({ valor, etiqueta, Icono }) => (
        <ToggleGroupItem
          key={valor}
          value={valor}
          aria-label={compacto ? etiqueta : undefined}
          title={compacto ? etiqueta : undefined}
        >
          <Icono data-icon={compacto ? undefined : 'inline-start'} />
          {!compacto && etiqueta}
        </ToggleGroupItem>
      ))}
    </ToggleGroup>
  );
}
