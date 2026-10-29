/* Se ejecuta antes de pintar la página (no lleva "defer"), para que nada "parpadee".
   Antes estaba escrito dentro de index.html; se movió a este archivo para que la
   Política de Seguridad de Contenido (CSP) pueda bloquear cualquier script incrustado.
   1. Modo oscuro: la primera vez sigue al sistema; después, lo que elijas en
      Configuración → Apariencia (js/menu-usuario.js, M.tema).
   2. Si no hay sesión, se oculta el shell desde el inicio. */
try { document.documentElement.dataset.tema = localStorage.getItem("utsc-tema") || (matchMedia("(prefers-color-scheme: dark)").matches ? "oscuro" : "claro"); } catch (e) {}
try { if (!localStorage.getItem("utsc-portal-sesion")) document.documentElement.classList.add("sin-sesion"); } catch (e) { document.documentElement.classList.add("sin-sesion"); }
