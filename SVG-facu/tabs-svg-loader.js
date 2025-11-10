(async () => {
	const SVG_NS = 'http://www.w3.org/2000/svg';
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
			let svg = wrap.querySelector('svg');
			if (!svg) throw new Error(`El archivo no contiene <svg>: ${url}`);

			// Si el SVG ya trae grupos .left / .right, lo inyectamos tal cual y saltamos la división
			if (svg.querySelector('g.left') || svg.querySelector('g.right')) {
				svg.setAttribute('preserveAspectRatio', 'none');
				svg.style.width = '100%';
				svg.style.height = '100%';
				tab.prepend(svg);
				continue; // paso al siguiente tab
			}

			// Aseguro que ocupe el contenedor mientras calculo dimensiones
			svg.setAttribute('preserveAspectRatio', 'none');
			svg.style.width = '100%';
			svg.style.height = '100%';

			// Prepend temporal para que getBBox funcione si hace falta
			tab.prepend(svg);

			// Obtener viewBox o bbox
			let minX = 0, minY = 0, vbW = null, vbH = null;
			const vbAttr = svg.getAttribute('viewBox');
			if (vbAttr) {
				const parts = vbAttr.trim().split(/\s+|,/).map(Number);
				if (parts.length === 4) {
					[minX, minY, vbW, vbH] = parts;
				}
			}
			if (vbW == null || vbH == null) {
				// fallback: usar bbox del SVG (requiere que esté en DOM)
				const bb = svg.getBBox();
				minX = bb.x;
				minY = bb.y;
				vbW = bb.width || svg.clientWidth || 100;
				vbH = bb.height || svg.clientHeight || 100;
				// establecer viewBox para trabajar consistentemente
				svg.setAttribute('viewBox', `${minX} ${minY} ${vbW} ${vbH}`);
			}

			// calcular proporción izquierda según variable CSS (si existe)
			const comp = getComputedStyle(tab);
			let leftClipProp = parseFloat(comp.getPropertyValue('--left-clip')) || 0.5;
			if (leftClipProp < 0) leftClipProp = 0;
			if (leftClipProp > 1) leftClipProp = 1;
			const leftWidth = vbW * leftClipProp;

			// crear nuevo SVG que contendrá las dos capas clonadas
			const newSvg = document.createElementNS(SVG_NS, 'svg');
			// copiar atributos útiles
			for (const attr of ['viewBox','preserveAspectRatio','xmlns','width','height']) {
				if (svg.hasAttribute(attr)) newSvg.setAttribute(attr, svg.getAttribute(attr));
			}
			newSvg.style.width = '100%';
			newSvg.style.height = '100%';

			// defs y clipPaths únicos
			const defs = document.createElementNS(SVG_NS, 'defs');
			const idBase = 'clip_' + Math.random().toString(36).slice(2,9);
			const leftId = idBase + '_L';
			const rightId = idBase + '_R';

			const cpLeft = document.createElementNS(SVG_NS, 'clipPath');
			cpLeft.setAttribute('id', leftId);
			const rectL = document.createElementNS(SVG_NS, 'rect');
			rectL.setAttribute('x', minX);
			rectL.setAttribute('y', minY);
			rectL.setAttribute('width', String(leftWidth));
			rectL.setAttribute('height', String(vbH));
			cpLeft.appendChild(rectL);

			const cpRight = document.createElementNS(SVG_NS, 'clipPath');
			cpRight.setAttribute('id', rightId);
			const rectR = document.createElementNS(SVG_NS, 'rect');
			rectR.setAttribute('x', String(minX + leftWidth));
			rectR.setAttribute('y', minY);
			rectR.setAttribute('width', String(vbW - leftWidth));
			rectR.setAttribute('height', String(vbH));
			cpRight.appendChild(rectR);

			defs.appendChild(cpLeft);
			defs.appendChild(cpRight);
			newSvg.appendChild(defs);

			// clonar todo el contenido original para crear dos capas
			const leftClone = svg.cloneNode(true);
			const rightClone = svg.cloneNode(true);

			// envolver cada clone en un <g> con clip-path y clase
			const gLeft = document.createElementNS(SVG_NS, 'g');
			gLeft.setAttribute('class', 'left-layer');
			gLeft.setAttribute('clip-path', `url(#${leftId})`);
			// quitar un posible <defs> duplicado dentro del clone para mantener limpio
			const defsInsideLeft = leftClone.querySelector('defs');
			if (defsInsideLeft) defsInsideLeft.remove();
			// mover children del clone interno al group
			while (leftClone.firstChild) {
				gLeft.appendChild(leftClone.firstChild);
			}

			const gRight = document.createElementNS(SVG_NS, 'g');
			gRight.setAttribute('class', 'right-layer');
			gRight.setAttribute('clip-path', `url(#${rightId})`);
			const defsInsideRight = rightClone.querySelector('defs');
			if (defsInsideRight) defsInsideRight.remove();
			while (rightClone.firstChild) {
				gRight.appendChild(rightClone.firstChild);
			}

			// añadir las dos capas al nuevo SVG (el orden importa: left primero detrás o delante según z)
			// dejamos left primero y right encima para que la parte derecha no quede tapada por la escala izquierda
			newSvg.appendChild(gLeft);
			newSvg.appendChild(gRight);

			// reemplazar el SVG original por el nuevo
			svg.remove(); // el original estaba prepended
			tab.prepend(newSvg);

		} catch (e) {
			console.error(e);
			// Fallback visual si falla la carga
			tab.style.background = 'var(--c)';
			tab.style.borderRadius = '14px 14px 0 0';
		}
	}
})();
