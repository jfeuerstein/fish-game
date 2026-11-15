// The island's short palette, for whatever the game colours in code. The same list as
// tools/assets/palette.mjs, which cuts every model, icon and ground tile down to it; a test
// keeps the two in step. Pure.
export const INKS = [
  // ink and slate
  '#10181f', '#18262f', '#2b4250', '#4f6d7c', '#86a1ab',
  // sea
  '#143c46', '#1b5a66', '#2c8a8a', '#62c0b0', '#b4e4d4',
  // sky
  '#1f4f86', '#3f86c8', '#7fbbe6', '#c6e4f4',
  // leaf
  '#1f3d2a', '#35633a', '#5c8f44', '#93b85a', '#cbdc8e',
  // moss
  '#4a5126', '#7d8438', '#b6b25c',
  // brass
  '#5e3f12', '#96691f', '#c8963e', '#ecc77d', '#f8e6b0',
  // wood
  '#2e1e16', '#523524', '#7d5436', '#a97c52', '#cfa57a',
  // bone
  '#70685a', '#a89c84', '#d6cbb2', '#f4eee3', '#fffdf6',
  // enamel
  '#5e1c18', '#a2341f', '#d65a3c', '#f08c62', '#f8c4a4',
  // rose
  '#8a3a56', '#cf6e86', '#f2a8b0',
  // plum
  '#33264c', '#5c4486', '#8f74ba', '#c6b4e2',
  // stone
  '#24282c', '#474e54', '#737b80', '#a4abac', '#d2d6d2',
] as const;

export const INK = { dark: '#10181f', pale: '#fffdf6' } as const;
