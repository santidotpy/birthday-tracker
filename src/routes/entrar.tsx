import { Alert, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { Spinner } from '@/components/ui/spinner';
import { createFileRoute, redirect, useRouter } from '@tanstack/react-router';
import { useState } from 'react';
import { iniciarSesion, sesionActual } from '../servidor/sesion.js';

export const Route = createFileRoute('/entrar')({
  beforeLoad: async () => {
    if (await sesionActual()) throw redirect({ to: '/admin' });
  },
  component: Entrar,
});

function Entrar() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function enviar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    const campos = new FormData(evento.currentTarget);
    setEnviando(true);
    setError(null);
    try {
      await iniciarSesion({
        data: {
          email: String(campos.get('email')),
          password: String(campos.get('password')),
        },
      });
      await router.navigate({ to: '/admin' });
    } catch (fallo) {
      setError(fallo instanceof Error ? fallo.message : 'No se pudo entrar');
      setEnviando(false);
    }
  }

  return (
    <main className="aparece flex min-h-dvh items-center justify-center p-6">
      <Card className="w-full max-w-sm">
        <CardHeader>
          <CardTitle>Entrar</CardTitle>
        </CardHeader>

        <CardContent>
          <form onSubmit={enviar}>
            <FieldGroup>
              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="email">Email</FieldLabel>
                <Input
                  id="email"
                  name="email"
                  type="email"
                  autoComplete="username"
                  required
                  autoFocus
                  aria-invalid={error ? true : undefined}
                />
              </Field>

              <Field data-invalid={error ? true : undefined}>
                <FieldLabel htmlFor="password">Contraseña</FieldLabel>
                <Input
                  id="password"
                  name="password"
                  type="password"
                  autoComplete="current-password"
                  required
                  aria-invalid={error ? true : undefined}
                />
              </Field>

              {error && (
                <Alert variant="destructive" role="alert">
                  <AlertTitle>{error}</AlertTitle>
                </Alert>
              )}

              <Button type="submit" disabled={enviando}>
                {enviando && <Spinner data-icon="inline-start" />}
                {enviando ? 'Entrando…' : 'Entrar'}
              </Button>
            </FieldGroup>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
