import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { borrarRetrato, esNombreDeRetrato, guardarRetrato, rutaDeRetrato } from './almacen.js';

let directorio: string;

beforeEach(async () => {
  directorio = await mkdtemp(join(tmpdir(), 'retratos-'));
});

afterEach(async () => {
  await rm(directorio, { recursive: true, force: true });
});

describe('guardarRetrato', () => {
  it('escribe los bytes y devuelve un nombre válido', async () => {
    const nombre = await guardarRetrato(Buffer.from('bytes'), directorio);
    expect(esNombreDeRetrato(nombre)).toBe(true);
    expect(await readFile(join(directorio, nombre), 'utf8')).toBe('bytes');
  });

  it('crea el directorio si no existe', async () => {
    const anidado = join(directorio, 'a', 'b');
    const nombre = await guardarRetrato(Buffer.from('bytes'), anidado);
    expect(await readFile(join(anidado, nombre), 'utf8')).toBe('bytes');
  });

  it('nunca repite nombre', async () => {
    const nombres = await Promise.all(
      Array.from({ length: 20 }, () => guardarRetrato(Buffer.from('x'), directorio)),
    );
    expect(new Set(nombres).size).toBe(20);
  });
});

describe('rutaDeRetrato', () => {
  it('rechaza cualquier cosa que no sea un nombre que generó la app', () => {
    for (const malicioso of [
      '../../../etc/passwd',
      '..\..\windows\system32\config\sam',
      'retrato.webp',
      'a/b.webp',
      '',
      '00000000-0000-0000-0000-000000000000.png',
    ]) {
      expect(() => rutaDeRetrato(malicioso, directorio), malicioso).toThrow(/inválido/i);
    }
  });

  it('acepta el nombre que devuelve guardarRetrato', async () => {
    const nombre = await guardarRetrato(Buffer.from('x'), directorio);
    expect(rutaDeRetrato(nombre, directorio)).toBe(join(directorio, nombre));
  });
});

describe('borrarRetrato', () => {
  it('borra el archivo', async () => {
    const nombre = await guardarRetrato(Buffer.from('x'), directorio);
    await borrarRetrato(nombre, directorio);
    await expect(readFile(join(directorio, nombre))).rejects.toThrow();
  });

  it('no falla si el archivo ya no está', async () => {
    const nombre = await guardarRetrato(Buffer.from('x'), directorio);
    await borrarRetrato(nombre, directorio);
    await expect(borrarRetrato(nombre, directorio)).resolves.toBeUndefined();
  });
});
