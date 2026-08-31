---
status: accepted
---

# Los Retratos se copian al guardarlos, no se referencian

El Administrador da de alta un Retrato pegando la URL de una imagen que ya existe en otro lado (LinkedIn, Facebook, donde sea). Al guardar, el servidor descarga esa imagen una vez, la redimensiona y guarda la copia. La app nunca vuelve a pedir la URL original.

## Considered Options

Referenciar la URL directamente desde el `<img>` era la opción obvia y la descartamos. Las imágenes de perfil de LinkedIn y Facebook son URLs pre-firmadas con un parámetro de expiración (`e=<timestamp>` en `media.licdn.com`): cuando vence, devuelven 403. También se rompen si la persona cambia su foto de perfil.

## Consequences

- La fuente de la imagen es irrelevante. Cualquier URL que resuelva una vez sirve, y una foto sacada en la oficina sirve igual.
- El servidor necesita salida a internet en el momento del alta. Si en algún momento queda aislado, el alta pasa a ser una subida desde el navegador del Administrador.
- La URL original se guarda solo como referencia de procedencia. Nada del render depende de ella.
