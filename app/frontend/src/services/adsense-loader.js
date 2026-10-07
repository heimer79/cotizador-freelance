// Carga asíncrona del script de AdSense. Solo se llama cuando el usuario acepta cookies de publicidad.
let cargando = null;

export function loadAdSense(publisherId) {
  if (!publisherId) return Promise.reject(new Error('Falta el identificador de AdSense'));
  if (cargando) return cargando;

  cargando = new Promise((resolver, rechazar) => {
    const script = document.createElement('script');
    script.async = true;
    script.crossOrigin = 'anonymous';
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(publisherId)}`;
    script.onload = () => resolver();
    script.onerror = () => {
      cargando = null;
      rechazar(new Error('AdSense no se pudo cargar (bloqueador o red)'));
    };
    document.head.appendChild(script);
  });

  return cargando;
}
