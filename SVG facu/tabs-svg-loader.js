(async () => {
    const tabs = document.querySelectorAll('.tab[data-svg]');
    for (const tab of tabs) {
    try {
        const url = tab.getAttribute('data-svg');
        const res = await fetch(url);
        if (!res.ok) throw new Error(`No encontré: ${url}`);
        const svgText = await res.text();

      // Inserto el SVG inline para poder estilizarlo con CSS
        const wrap = document.createElement('div');
        wrap.innerHTML = svgText.trim();
        const svg = wrap.querySelector('svg');
        if (!svg) throw new Error(`El archivo no contiene <svg>: ${url}`);

    // Hago que el SVG ocupe el contenedor
        svg.setAttribute('preserveAspectRatio', 'none');
        svg.style.width = '100%';
        svg.style.height = '100%';

        tab.prepend(svg);
    } catch (e) {
        console.error(e);
      // Fallback visual si falla la carga
        tab.style.background = 'var(--c)';
        tab.style.borderRadius = '14px 14px 0 0';
    }
    }
})();
