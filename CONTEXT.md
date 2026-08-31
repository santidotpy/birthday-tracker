# Birthday Tracker

Muestra los cumpleaños de los integrantes de la empresa: quién cumple en la fecha que se está viendo, y cuánto falta para el siguiente.

## Language

**Integrante**:
Persona activa en la empresa cuya Fecha de cumpleaños se muestra en la app. No tiene credenciales y nunca inicia sesión.
_Avoid_: empleado, usuario, miembro, persona

**Archivado**:
Integrante que dejó la empresa. Conserva sus datos, pero no aparece en ninguna vista ni cuenta para el Próximo cumpleaños.
_Avoid_: borrado, eliminado, inactivo, dado de baja

**Administrador**:
La única persona que se autentica. Da de alta, edita y archiva Integrantes.
_Avoid_: usuario, editor, dueño

**Fecha de cumpleaños**:
El día y mes en que nació un Integrante. No incluye el año, no es un instante y no lleva zona horaria.
_Avoid_: fecha de nacimiento, cumple, DOB

**Ocurrencia**:
La instancia de una Fecha de cumpleaños en un año concreto. La Ocurrencia del 29/02 en un año no bisiesto es el 01/03.
_Avoid_: evento, instancia, aniversario

**Cumpleañero**:
Integrante cuya Ocurrencia cae en la fecha que se está viendo. Puede haber más de uno en la misma fecha.
_Avoid_: festejado, homenajeado

**Hoy**:
El día corriente en Argentina, sin importar dónde esté el dispositivo que mira la app.
_Avoid_: fecha actual, día local, fecha del sistema

**Próximo cumpleaños**:
La primera Ocurrencia estrictamente posterior a la fecha que se está viendo. Nunca la incluye: si hoy hay cumpleaños, el Próximo cumpleaños es el de otro día.
_Avoid_: siguiente cumpleaños, el que viene

**Agenda**:
La lista de todos los Integrantes ordenada desde la fecha que se está viendo hacia adelante, dando la vuelta al año. A diferencia del Próximo cumpleaños, sí incluye esa fecha: quien cumple hoy encabeza la Agenda. No empieza en enero.
_Avoid_: calendario, listado, índice

**Área**:
La parte de la empresa a la que pertenece un Integrante. Sale de una lista cerrada; un Integrante puede no tener ninguna.
_Avoid_: sector, departamento, equipo, unidad

**Retrato**:
La imagen que representa a un Integrante. Es una copia que guarda la app, no una referencia a una imagen alojada en otro lado.
_Avoid_: foto, avatar, imagen de perfil
