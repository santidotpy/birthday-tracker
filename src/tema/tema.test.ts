import { describe, expect, it } from 'vitest';
import {
  NOMBRE_DE_COOKIE,
  TEMA_POR_DEFECTO,
  TEMAS,
  cookieDeTema,
  esTema,
  temaDeCookies,
  temaODefecto,
  temaONada,
} from './tema.js';

describe('esTema', () => {
  it('acepta los tres temas y nada más', () => {
    for (const tema of TEMAS) expect(esTema(tema)).toBe(true);
    expect(esTema('dark')).toBe(false);
    expect(esTema('Oscuro')).toBe(false);
    expect(esTema('')).toBe(false);
  });
});

describe('temaONada', () => {
  it('limpia espacios y rechaza lo que no sirve', () => {
    expect(temaONada('  oscuro ')).toBe('oscuro');
    expect(temaONada('cualquiera')).toBe(null);
    expect(temaONada(null)).toBe(null);
    expect(temaONada(undefined)).toBe(null);
  });
});

describe('temaODefecto', () => {
  it('cae en seguir al sistema ante cualquier duda', () => {
    // Una cookie vieja o manipulada no debería dejar la pantalla en un estado
    // raro: lo peor que puede pasar es que siga al sistema, como si no hubiera
    // elegido nada.
    expect(temaODefecto('basura')).toBe(TEMA_POR_DEFECTO);
    expect(temaODefecto(null)).toBe(TEMA_POR_DEFECTO);
    expect(temaODefecto('claro')).toBe('claro');
  });
});

describe('temaDeCookies', () => {
  it('encuentra la cookie entre otras', () => {
    expect(temaDeCookies('otra=1; tema=oscuro; better-auth.session=abc')).toBe('oscuro');
  });

  it('tolera espacios y el orden', () => {
    expect(temaDeCookies('tema=claro')).toBe('claro');
    expect(temaDeCookies('  tema = claro  ')).toBe('claro');
  });

  it('no confunde una cookie cuyo nombre termina igual', () => {
    // "mi-tema" no es "tema". Sin el corte exacto, un prefijo ajeno ganaría.
    expect(temaDeCookies('mi-tema=oscuro')).toBe(TEMA_POR_DEFECTO);
  });

  it('aguanta valores con signo igual adentro', () => {
    expect(temaDeCookies('sesion=a=b=c; tema=oscuro')).toBe('oscuro');
  });

  it('sin cookies devuelve el default', () => {
    expect(temaDeCookies(null)).toBe(TEMA_POR_DEFECTO);
    expect(temaDeCookies('')).toBe(TEMA_POR_DEFECTO);
    expect(temaDeCookies('otra=1')).toBe(TEMA_POR_DEFECTO);
  });

  it('ignora un valor que no es un tema', () => {
    expect(temaDeCookies('tema=neon')).toBe(TEMA_POR_DEFECTO);
  });
});

describe('cookieDeTema', () => {
  it('la vuelve a leer igual', () => {
    for (const tema of TEMAS) {
      expect(temaDeCookies(cookieDeTema(tema).split(';')[0])).toBe(tema);
    }
  });

  it('dura más que una sesión y vale para todo el sitio', () => {
    const cookie = cookieDeTema('oscuro');
    expect(cookie).toContain(`${NOMBRE_DE_COOKIE}=oscuro`);
    expect(cookie).toContain('Path=/');
    expect(cookie).toMatch(/Max-Age=\d{7,}/);
    expect(cookie).toContain('SameSite=Lax');
  });

  it('no lleva HttpOnly: el navegador tiene que poder escribirla', () => {
    expect(cookieDeTema('claro')).not.toContain('HttpOnly');
  });
});
