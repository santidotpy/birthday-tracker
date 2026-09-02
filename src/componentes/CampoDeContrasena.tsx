import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '@/components/ui/input-group';
import { EyeIcon, EyeOffIcon } from 'lucide-react';
import { useId, useState } from 'react';

interface Props {
  id?: string;
  name: string;
  autoComplete: 'current-password' | 'new-password';
  invalido?: boolean;
  autoFocus?: boolean;
}

/**
 * Contraseña con un ojo para verla.
 *
 * Existe porque escribir una contraseña a ciegas y que te rebote sin saber si
 * fue un dedazo es la forma más tonta de quedarse afuera. El ojo arranca
 * apagado y se apaga solo de nuevo al desmontarse, así que nunca queda una
 * contraseña visible en pantalla sin que alguien la haya destapado a propósito.
 */
export function CampoDeContrasena({ id, name, autoComplete, invalido, autoFocus }: Props) {
  const generado = useId();
  const idCampo = id ?? generado;
  const [visible, setVisible] = useState(false);

  return (
    <InputGroup>
      <InputGroupInput
        id={idCampo}
        name={name}
        type={visible ? 'text' : 'password'}
        autoComplete={autoComplete}
        required
        autoFocus={autoFocus}
        aria-invalid={invalido || undefined}
      />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          type="button"
          // El botón no entra en el orden de tabulado: quien navega con teclado
          // viene a escribir la contraseña y seguir, no a tropezarse con esto.
          tabIndex={-1}
          aria-label={visible ? 'Ocultar la contraseña' : 'Mostrar la contraseña'}
          aria-pressed={visible}
          onClick={() => setVisible((estaba) => !estaba)}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  );
}
