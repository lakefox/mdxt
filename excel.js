(() => {
	let e = document.createElement('script');
	(e.onload = () => {
		let e = document.querySelectorAll('table[spreadsheet]');
		for (let t = 0; t < e.length; t++) {
			let a = e[t],
				r = JSON.parse(a.getAttribute('data')),
				l = parseInt(a.getAttribute('cells')),
				n = parseInt(a.getAttribute('rows')),
				d = document.createElement('thead');
			d.appendChild(document.createElement('td'));
			for (let p = 0; p < l; p++) {
				let u = document.createElement('td');
				(u.innerHTML = (
					' abcdefghijklmnopqrstuvwxyz'[Math.floor(p / 26)] +
					'abcdefghijklmnopqrstuvwxyz'[Math.floor(p % 26)]
				)
					.trim()
					.toUpperCase()),
					d.appendChild(u);
			}
			a.appendChild(d);
			let o = document.createElement('tbody');
			for (let i = 0; i < n; i++) {
				let s = document.createElement('tr'),
					c = document.createElement('td');
				(c.innerHTML = i), s.appendChild(c);
				for (let f = 0; f < l; f++) {
					let g = document.createElement('td'),
						v = document.createElement('input');
					(v.type = 'text'),
						(v.dataset.x = f),
						(v.dataset.y = i),
						(v.dataset.value = ''),
						(v.value = ''),
						v.addEventListener('focusin', (e) => {
							e.target.value = e.target.dataset.value;
						}),
						v.addEventListener('focusout', (e) => {
							E(e.target.parentNode.parentNode.parentNode.parentNode);
						}),
						v.addEventListener('keyup', (e) => {
							(e.target.dataset.value = e.value),
								e.target.parentNode.parentNode.parentNode.parentNode.setAttribute(
									'data',
									JSON.stringify(h(e.target.parentNode.parentNode.parentNode.parentNode))
								);
						}),
						g.appendChild(v),
						s.appendChild(g),
						r[i] && r[i][f] && ((v.dataset.value = r[i][f]), (v.value = r[i][f]));
				}
				o.appendChild(s);
			}
			a.appendChild(o), E(a);
		}
		function h(e, t = !1) {
			let a = [...e.querySelectorAll('input')].filter((e) => e.value.length > 0),
				r = [];
			return (
				a.forEach((e) => {
					r[parseInt(e.dataset.y)] || (r[parseInt(e.dataset.y)] = []),
						t
							? (r[parseInt(e.dataset.y)][parseInt(e.dataset.x)] = e)
							: (r[parseInt(e.dataset.y)][parseInt(e.dataset.x)] = e.value);
				}),
				r
			);
		}
		function m(e, t) {
			let a = t.toLowerCase().split(':');
			if (a.length > 1) {
				let r = y(a[0]),
					l = y(a[1]),
					n = [];
				for (let d = r[1]; d < l[1] + 1; d++) {
					let p = [];
					for (let u = r[0]; u < l[0] + 1; u++)
						p.push($(e.querySelector(`input[data-x="${u}"][data-y="${d}"]`).value));
					n.push(p);
				}
				return n;
			}
			{
				let o = y(a[0]);
				return $(e.querySelector(`input[data-x="${o[0]}"][data-y="${o[1]}"]`).value);
			}
		}
		function y(e) {
			return [
				e
					.replace(/[^a-z]/g, '')
					.split('')
					.map((e) => 'abcdefghijklmnopqrstuvwxyz'.indexOf(e))
					.reduce((e, t) => e + t, 0),
				parseInt(e.replace(/[a-z]/g, '')) - 1
			];
		}
		function $(e) {
			return 'false' == e || 'true' == e ? 'true' == e : isNaN(e) ? `"${e}"` : parseFloat(e);
		}
		function E(e) {
			let t = h(e, !0)
				.flat()
				.filter((e) => e.dataset.value);
			for (let a = 0; a < t.length; a++)
				if ('=' == t[a].dataset.value.trim()[0]) {
					let r = Function(
						`return ${t[a].dataset.value
							.replace(/[A-Z0-9]+\:[A-Z0-9]+/g, (t) => JSON.stringify(m(e, t)))
							.replace(/[A-Z]+[0-9]+/g, (t) => JSON.stringify(m(e, t)))
							.replace(/[A-Z]+\((.*?)\)/g, (e) => `formulajs.${e}`)
							.slice(1)}`
					)();
					t[a].value = r;
				}
		}
	}),
		(e.src = 'https://cdn.jsdelivr.net/npm/@formulajs/formulajs/lib/browser/formula.min.js'),
		document.body.appendChild(e);
})();
