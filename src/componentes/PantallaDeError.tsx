import { Button } from '@/components/ui/button';
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from '@/components/ui/empty';
import { RotateCwIcon, UnplugIcon } from 'lucide-react';

/**
 * Lo que se ve cuando la app no puede levantar los datos.
 *
 * Existe porque el error por defecto del router es una pantalla en inglés con
 * un stack trace, y el lugar donde va a aparecer es un televisor colgado en la
 * oficina. Quien lo vea tiene que poder entender qué pasó sin abrir la consola,
 * y el Administrador tiene que poder arreglarlo sin adivinar: por eso el texto
 * nombra la causa más probable —el volumen sin montar— y deja abajo el mensaje
 * técnico, que no molesta a nadie y le ahorra un viaje a los logs.
 */
export function PantallaDeError({ error, reintentar }: { error: Error; reintentar: () => void }) {
  return (
    <main className="aparece flex min-h-dvh flex-col items-center justify-center p-6 text-center 2xl:scale-125">
      <Empty>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <UnplugIcon />
          </EmptyMedia>
          <EmptyTitle className="2xl:text-2xl">No se pueden leer los cumpleaños</EmptyTitle>
          <EmptyDescription className="2xl:text-lg">
            La app está andando, pero no llega a sus datos. Lo más común es que el volumen con la
            base y las fotos no haya quedado montado después de un despliegue.
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent>
          <Button onClick={reintentar}>
            <RotateCwIcon data-icon="inline-start" />
            Reintentar
          </Button>

          {error.message && (
            <p className="m-0 max-w-[60ch] text-xs text-muted-foreground 2xl:text-sm">
              {error.message}
            </p>
          )}
        </EmptyContent>
      </Empty>
    </main>
  );
}

