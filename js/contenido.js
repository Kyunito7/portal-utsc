/* Contenido que publica la universidad (noticias y eventos) — semana 4.
   Se descarga de data/noticias.json. El service worker lo responde desde su caché
   al instante (funciona sin internet) y en segundo plano pide la versión nueva
   a la red: estrategia "stale-while-revalidate". Si llegó algo nuevo, el service
   worker avisa con el mensaje CONTENIDO_ACTUALIZADO y aquí se vuelve a leer. */
(function () {
  const URL_CONTENIDO = "data/noticias.json";
  App.contenido = { actualizado: null, desdeCache: false };

  App.contenido.cargar = async function () {
    try {
      const resp = await fetch(URL_CONTENIDO);
      if (!resp.ok) throw new Error("HTTP " + resp.status);
      const datos = await resp.json();
      App.CATALOGO.noticias = datos.noticias || [];
      App.CATALOGO.eventos = datos.eventos || [];
      App.contenido.actualizado = datos.actualizado || null;
      App.contenido.desdeCache = resp.headers.get("X-Desde-Cache") === "1";
      return true;
    } catch (e) {
      console.warn("No se pudieron cargar las noticias:", e.message);
      return false;
    }
  };

  // El service worker encontró una versión más nueva del archivo.
  if ("serviceWorker" in navigator) {
    navigator.serviceWorker.addEventListener("message", async e => {
      if (!e.data || e.data.tipo !== "CONTENIDO_ACTUALIZADO") return;
      const antes = App.contenido.actualizado;
      await App.contenido.cargar();
      if (App.contenido.actualizado === antes || !App.sesion) return;
      const ruta = App.ruta();
      if (ruta === "noticias" || ruta === "inicio") App.render();
      App.toast("Hay noticias nuevas");
    });
  }
})();
