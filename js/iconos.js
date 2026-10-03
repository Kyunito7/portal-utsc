/* Iconos del portal.
   Los dibujos están en el sprite <svg> al inicio de index.html (iconos de Lucide, licencia ISC).
   I("bell") devuelve el SVG listo para meterlo en cualquier plantilla de texto. */
function I(nombre, clase) {
  return `<svg class="i${clase ? " " + clase : ""}" aria-hidden="true" focusable="false"><use href="#i-${nombre}"></use></svg>`;
}
