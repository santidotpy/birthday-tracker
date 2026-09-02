import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Field, FieldDescription, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Separator } from '@/components/ui/separator';
import { Spinner } from '@/components/ui/spinner';
import { useRouter } from '@tanstack/react-router';
import { UserRoundCogIcon } from 'lucide-react';
import { useState } from 'react';
import { cambiarContrasena, cambiarEmail } from '../servidor/sesion.js';
import { CampoDeContrasena } from './CampoDeContrasena.js';

/** Lo que muestra cada formulario después de intentar: nada, un error, o listo. */
type Resultado = { tipo: 'error'; mensaje: string } | { tipo: 'listo'; mensaje: string } | null;

interface Props {
  emailActual: string;
}

/**
 * Cambiar el email y la contraseña del Administrador.
 *
 * Va en un diálogo y no en la página porque se usa una vez cada muchos meses:
 * en la página competiría todo el tiempo con la lista de Integrantes, que es a
 * lo que se entra al panel.
 */
export function Cuenta({ emailActual }: Props) {
  return (
    <Dialog>
      <DialogTrigger
        render={
          <Button variant="outline" size="sm">
            <UserRoundCogIcon data-icon="inline-start" />
            Cuenta
          </Button>
        }
      />

      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Tu cuenta</DialogTitle>
          <DialogDescription>
            Con estos datos entrás al panel. No los ve nadie más.
          </DialogDescription>
        </DialogHeader>

        <FormularioDeEmail emailActual={emailActual} />
        <Separator />
        <FormularioDeContrasena />
      </DialogContent>
    </Dialog>
  );
}

function FormularioDeEmail({ emailActual }: { emailActual: string }) {
  const router = useRouter();
  const [resultado, setResultado] = useState<Resultado>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const email = String(new FormData(evento.currentTarget).get('email'));

    if (email.trim().toLowerCase() === emailActual.toLowerCase()) {
      setResultado({ tipo: 'error', mensaje: 'Ese ya es tu email' });
      return;
    }

    setEnviando(true);
    setResultado(null);
    try {
      const admin = await cambiarEmail({ data: { email } });
      setResultado({ tipo: 'listo', mensaje: `Ahora entrás con ${admin.email}` });
      await router.invalidate();
    } catch (fallo) {
      setResultado({
        tipo: 'error',
        mensaje: fallo instanceof Error ? fallo.message : 'No se pudo cambiar el email',
      });
    } finally {
      setEnviando(false);
    }
  }

  const invalido = resultado?.tipo === 'error';

  return (
    <form onSubmit={enviar}>
      <FieldGroup>
        <Field data-invalid={invalido || undefined}>
          <FieldLabel htmlFor="cuenta-email">Email</FieldLabel>
          <Input
            id="cuenta-email"
            name="email"
            type="email"
            autoComplete="username"
            required
            defaultValue={emailActual}
            aria-invalid={invalido || undefined}
          />
          <FieldDescription>Tu sesión sigue abierta después de cambiarlo.</FieldDescription>
        </Field>

        <Aviso resultado={resultado} />

        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando && <Spinner data-icon="inline-start" />}
          {enviando ? 'Guardando…' : 'Cambiar el email'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function FormularioDeContrasena() {
  const [resultado, setResultado] = useState<Resultado>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const formulario = evento.currentTarget;
    const campos = new FormData(formulario);
    const actual = String(campos.get('actual'));
    const nueva = String(campos.get('nueva'));

    if (nueva.length < 8) {
      setResultado({ tipo: 'error', mensaje: 'La nueva tiene que tener al menos 8 caracteres' });
      return;
    }

    setEnviando(true);
    setResultado(null);
    try {
      await cambiarContrasena({ data: { actual, nueva } });
      setResultado({ tipo: 'listo', mensaje: 'Contraseña cambiada' });
      // Vaciar los campos: si quedan escritos, el próximo que se siente frente
      // a la pantalla se lleva la contraseña nueva servida.
      formulario.reset();
    } catch (fallo) {
      setResultado({
        tipo: 'error',
        mensaje: fallo instanceof Error ? fallo.message : 'No se pudo cambiar la contraseña',
      });
    } finally {
      setEnviando(false);
    }
  }

  const invalido = resultado?.tipo === 'error';

  return (
    <form onSubmit={enviar}>
      <FieldGroup>
        <Field data-invalid={invalido || undefined}>
          <FieldLabel htmlFor="cuenta-actual">Contraseña actual</FieldLabel>
          <CampoDeContrasena
            id="cuenta-actual"
            name="actual"
            autoComplete="current-password"
            invalido={invalido}
          />
        </Field>

        <Field data-invalid={invalido || undefined}>
          <FieldLabel htmlFor="cuenta-nueva">Contraseña nueva</FieldLabel>
          <CampoDeContrasena id="cuenta-nueva" name="nueva" autoComplete="new-password" />
          <FieldDescription>Al menos 8 caracteres.</FieldDescription>
        </Field>

        <Aviso resultado={resultado} />

        <Button type="submit" variant="outline" disabled={enviando}>
          {enviando && <Spinner data-icon="inline-start" />}
          {enviando ? 'Guardando…' : 'Cambiar la contraseña'}
        </Button>
      </FieldGroup>
    </form>
  );
}

function Aviso({ resultado }: { resultado: Resultado }) {
  if (!resultado) return null;
  return (
    <Alert variant={resultado.tipo === 'error' ? 'destructive' : 'default'} role="status">
      <AlertTitle>{resultado.mensaje}</AlertTitle>
    </Alert>
  );
}
