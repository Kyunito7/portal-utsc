/* Moderación automática del blog.

   Cada publicación o comentario pasa por App.moderacion.revisar() antes de publicarse.
   El resultado es una de tres decisiones:
     - "aprobar"  → se publica normal.
     - "revisar"  → se guarda oculto (solo lo ven su autor y los moderadores)
                    hasta que un moderador lo apruebe o lo rechace.
     - "bloquear" → no se publica y se le explica al alumno por qué.

   Por ahora decide un filtro local (reglas). Para la entrega final, revisar() se
   cambia por una llamada a una función del servidor (Supabase Edge Function) que
   consulte una IA. La clave de la IA NUNCA va en este archivo: cualquiera la vería
   con F12. Las pantallas no cambian porque reciben el mismo { decision, motivos }. */
window.App = window.App || {};

(function () {
  // ---------- Listas ----------
  // Insultos fuertes y discriminación: se bloquean.
  // Cada entrada es el inicio de la palabra (detecta plurales y variantes); las abreviaturas van exactas con \\b.
  const BLOQUEAR = ["idiota", "estupid", "pendej", "imbecil", "puto", "puta", "verga", "culer", "mamon", "ojete",
    "joto", "maricon", "retrasad", "mongol(es)?\\b", "malparid", "hdp\\b", "ctm\\b", "naco(s|a|as)?\\b"];
  const FRASES_BLOQUEAR = ["hijo de puta", "chinga tu madre", "chingas a tu madre", "vete a la verga", "ve a chingar"];
  // Groserías leves o palabras ambiguas: van a revisión, no se bloquean.
  const REVISAR = ["pinche", "ching", "cabron", "mamad", "pedo", "culo", "perra", "zorra", "mierda", "carajo",
    "alv\\b", "ptm\\b", "nmms\\b", "wtf\\b"];
  // Amenazas o acoso: a revisión con prioridad alta.
  const AMENAZAS = [
    /te voy a (matar|golpear|partir|madrear|buscar|romper|encontrar)/,
    /\bte (mato|parto|rompo|madreo)\b/,
    /(los|las) voy a (matar|golpear|buscar)/,
    /te espero a la salida/,
    /\bvas a ver\b.*\b(salida|afuera|cuando)\b/,
    /se donde vives/
  ];
  const TRAMPA = [/\b(vendo|compro|paso|tengo)\b.*\b(respuestas|examen|examenes)\b/, /\b(hago|hacemos) tareas\b.*\b(cobro|precio|\$)\b/];

  // ---------- Normalización ----------
  // Convierte "P3ND3J0", "p.e.n.d.e.j.o", "peeendejooo" o "pendéjo" en "pendejo".
  const LEET = { "0": "o", "1": "i", "3": "e", "4": "a", "5": "s", "7": "t", "@": "a", "$": "s", "!": "i" };
  function normalizar(texto) {
    let t = String(texto).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "");
    // Une letras sueltas separadas: "p u t o", "p.u.t.o", "p-u-t-o"
    t = t.replace(/\b(?:[a-z0-9@$!][\s.\-_*]+){2,}[a-z0-9@$!]\b/g, m => m.replace(/[\s.\-_*]+/g, ""));
    t = t.replace(/[013457@$!]/g, (c, i, s) => {
      // solo cambia números que están pegados a letras (no toca "40 ejercicios")
      const antes = s[i - 1] || " ", despues = s[i + 1] || " ";
      return /[a-z]/.test(antes) || /[a-z]/.test(despues) ? LEET[c] : c;
    });
    return t.replace(/([a-z])\1+/g, "$1");   // "peeendejooo" → "pendejo"
  }
  const sinRepetir = s => s.replace(/([a-z])\1+/g, "$1");
  const raiz = lista => new RegExp("\\b(" + lista.map(sinRepetir).join("|") + ")\\w*", "g");
  const RX_BLOQUEAR = raiz(BLOQUEAR), RX_REVISAR = raiz(REVISAR);

  // ---------- Análisis ----------
  function analizar(texto) {
    const original = String(texto || "");
    const t = normalizar(original);
    const bloquear = [], revisar = [];
    let prioridad = "normal";

    const fuertes = [...new Set((t.match(RX_BLOQUEAR) || []))];
    FRASES_BLOQUEAR.forEach(f => { if (t.includes(sinRepetir(f))) fuertes.push(f); });
    if (fuertes.length) bloquear.push("Lenguaje ofensivo: «" + fuertes.slice(0, 3).join("», «") + "»");

    const leves = [...new Set((t.match(RX_REVISAR) || []))];
    if (leves.length) revisar.push("Groserías: «" + leves.slice(0, 3).join("», «") + "»");

    if (AMENAZAS.some(rx => rx.test(t))) { revisar.push("Posible amenaza o acoso"); prioridad = "alta"; }
    if (TRAMPA.some(rx => rx.test(t))) revisar.push("Posible deshonestidad académica");

    const enlaces = (original.match(/https?:\/\/|www\./gi) || []).length;
    if (enlaces >= 2) revisar.push("Varios enlaces externos (" + enlaces + ")");

    const letras = original.replace(/[^a-záéíóúñA-ZÁÉÍÓÚÑ]/g, "");
    const mayus = original.replace(/[^A-ZÁÉÍÓÚÑ]/g, "").length;
    if (letras.length >= 15 && mayus / letras.length > 0.7) revisar.push("Escrito casi todo en mayúsculas");

    if (/(.)\1{5,}/.test(original) || /\b(\w+)\b(?:\W+\1\b){4,}/i.test(original)) revisar.push("Texto repetido (posible spam)");

    if (/\b\d{10}\b|\b\d{2,3}[\s-]\d{3,4}[\s-]\d{4}\b/.test(original)) revisar.push("Comparte un número de teléfono");

    const decision = bloquear.length ? "bloquear" : revisar.length ? "revisar" : "aprobar";
    return { decision, motivos: bloquear.concat(revisar), prioridad, fuente: "Filtro automático" };
  }

  App.moderacion = {
    normalizar,
    analizar,
    // Punto único que usan las pantallas. Es async para que mañana pueda ser una IA en el servidor:
    //   const r = await fetch(SUPABASE_URL + "/functions/v1/moderar", { method: "POST", body: JSON.stringify(contenido) });
    //   return await r.json();   // { decision, motivos, prioridad, fuente: "IA" }
    async revisar(contenido) {
      return analizar([contenido.titulo, contenido.texto].filter(Boolean).join("\n"));
    },
    estado: x => (x && x.mod && x.mod.estado) || "aprobado",
    esModerador: () => !!(App.state && App.state.usuario.rol === "Moderador"),
    MOTIVOS_REPORTE: ["Lenguaje ofensivo", "Acoso o amenazas", "Spam o publicidad", "Información falsa o deshonestidad académica", "Contenido inapropiado", "Otro"],
    MOTIVOS_RECHAZO: ["Lenguaje ofensivo", "Acoso o amenazas", "Spam o publicidad", "Deshonestidad académica", "Datos personales expuestos", "No respeta el reglamento del blog"],
    REPORTES_PARA_OCULTAR: 3
  };
})();
