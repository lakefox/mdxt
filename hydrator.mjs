function hydrater(keys, contains) {
    if (Object.keys(keys).length > 0) {
        return `
    (()=>{
		${injectScript(contains)}
        let state = ${JSON.stringify(keys)};
        Object.keys(state).forEach(key => {
        document.querySelectorAll('[data-mdxt-parent="'+key+'"]').forEach(input => {
            let evt = (e) => {
                let el = e.srcElement;
                let type = state[el.dataset.mdxtParent].type;
                let value;
                if (type == "text" || type == "textarea" || type == "select" || type == "number") {
                    value = el.value;
                } else if (type == "checkbox" || type == "radio") {
                    value = el.checked.toString();
                }
                if (el.dataset.mdxtIndex) {
                    if (type == "radio") {
                        state[el.dataset.mdxtParent].group.forEach((e, i)=>{
                            state[el.dataset.mdxtParent].group[i].value = "false";
                        })
                    }
                    state[el.dataset.mdxtParent].group[parseInt(el.dataset.mdxtIndex)].value = value;
                } else {
                    state[el.dataset.mdxtParent].value = value;
                }
                document.querySelectorAll('[data-mdxt-exe]').forEach((exe) => {
                    let rawCmd = decodeURIComponent(exe.dataset.mdxtExe);
                    let cmd = rawCmd.replaceAll(/\\@\\{(.*?)\\}/g, (raw, name) => {
                        if (state[name].value) {
                            return type(state[name].value);
                        } else {
                            return JSON.stringify(state[name].group.map(e => type(e.value)));
                        }
                    });
                    try {
                        if (exe.dataset.mdxtIf) {
                            exe.style.display = eval(cmd) ? "inline": "none";
                        } else if (exe.dataset.mdxtFor) {
                            let internal = "";
                            let v = decodeURIComponent(exe.dataset.mdxtInject).split(",");
                            for (let i = 0; i < cmd; i++) {
                                let cp = decodeURIComponent(exe.dataset.mdxtFor);
                                cp = cp.replace(new RegExp("@{"+v[0].trim()+"}", "g"), i);
                                if (v.length == 2) {
                                    cp = cp.replace(new RegExp("@{"+v[1].trim()+"}", "g"), cmd);
                                }
                                internal += "<div>"+cp+"</div>";
                            }
                            exe.innerHTML = internal;
                        } else {
                            exe.innerHTML = eval(cmd)
                        }
                        if (exe.dataset.mdxtParent) {
                            state[exe.dataset.mdxtParent].value = eval(cmd).toString();
                        }
                    } catch (e) {
                        console.error(e);
                    }
                    function type(val, quotes=false) {
                        if (val == "false" || val == "true") {
                            return val == "true";
                        } else {
                            if (isNaN(val)) {
                                    return '"'+val+'"';
                            } else {
                                return parseFloat(val);
                            }
                        }
                    }
                });
                document.querySelectorAll('[data-mdxt-value]').forEach((child) => {
                    if (child.dataset.mdxtIndex) {
                        child.innerHTML = state[child.dataset.mdxtValue].group[parseInt(child.dataset.mdxtIndex)].value;
                    } else {
                        child.innerHTML = state[child.dataset.mdxtValue].value
                    }
                });
            };
             if (input.type == "text" || input.type == "textarea") {
                input.onkeyup = evt;
            } else {
                input.onchange = evt;
            }
            input.querySelectorAll('[data-mdxt-option]').forEach(option => option.onchange = evt);
        })
    });})()`;
    } else if (Object.values(contains).includes(true)) {
        return `(()=>{${injectScript(contains)}})();`;
    } else {
        return "";
    }
}

function injectScript(contains) {
    let sum = "";
    if (contains.spreadsheet) {
        sum += `(${(() => {
            let e = document.createElement("script");
            (e.onload = () => {
                let e = document.querySelectorAll("table[spreadsheet]");
                for (let t = 0; t < e.length; t++) {
                    let a = e[t],
                        r = JSON.parse(a.getAttribute("data")),
                        l = parseInt(a.getAttribute("cells")),
                        n = parseInt(a.getAttribute("rows")),
                        d = document.createElement("thead");
                    d.appendChild(document.createElement("td"));
                    for (let u = 0; u < l; u++) {
                        let p = document.createElement("td");
                        (p.innerHTML = (
                            " abcdefghijklmnopqrstuvwxyz"[Math.floor(u / 26)] +
                            "abcdefghijklmnopqrstuvwxyz"[Math.floor(u % 26)]
                        )
                            .trim()
                            .toUpperCase()),
                            d.appendChild(p);
                    }
                    a.appendChild(d);
                    let o = document.createElement("tbody");
                    for (let i = 0; i < n; i++) {
                        let s = document.createElement("tr"),
                            c = document.createElement("td");
                        (c.innerHTML = i), s.appendChild(c);
                        for (let f = 0; f < l; f++) {
                            let g = document.createElement("td"),
                                v = document.createElement("input");
                            (v.type = "text"),
                                (v.dataset.x = f),
                                (v.dataset.y = i),
                                (v.dataset.value = ""),
                                (v.value = ""),
                                v.addEventListener("focusin", (e) => {
                                    e.target.value = e.target.dataset.value;
                                }),
                                v.addEventListener("focusout", (e) => {
                                    E(
                                        e.target.parentNode.parentNode
                                            .parentNode.parentNode
                                    );
                                }),
                                v.addEventListener("keyup", (e) => {
                                    (e.target.dataset.value = e.target.value),
                                        e.target.parentNode.parentNode.parentNode.parentNode.setAttribute(
                                            "data",
                                            JSON.stringify(
                                                h(
                                                    e.target.parentNode
                                                        .parentNode.parentNode
                                                        .parentNode
                                                )
                                            )
                                        );
                                }),
                                g.appendChild(v),
                                s.appendChild(g),
                                r[i] &&
                                    r[i][f] &&
                                    ((v.dataset.value = r[i][f]),
                                    (v.value = r[i][f]));
                        }
                        o.appendChild(s);
                    }
                    a.appendChild(o), E(a);
                }
                function h(e, t = !1) {
                    let a = [...e.querySelectorAll("input")].filter(
                            (e) => e.value.length > 0
                        ),
                        r = [];
                    return (
                        a.forEach((e) => {
                            r[parseInt(e.dataset.y)] ||
                                (r[parseInt(e.dataset.y)] = []),
                                t
                                    ? (r[parseInt(e.dataset.y)][
                                          parseInt(e.dataset.x)
                                      ] = e)
                                    : (r[parseInt(e.dataset.y)][
                                          parseInt(e.dataset.x)
                                      ] = e.value);
                        }),
                        r
                    );
                }
                function m(e, t) {
                    let a = t.toLowerCase().split(":");
                    if (a.length > 1) {
                        let r = y(a[0]),
                            l = y(a[1]),
                            n = [];
                        for (let d = r[1]; d < l[1] + 1; d++) {
                            let u = [];
                            for (let p = r[0]; p < l[0] + 1; p++)
                                u.push(
                                    $(
                                        e.querySelector(
                                            `input[data-x="${p}"][data-y="${d}"]`
                                        ).value
                                    )
                                );
                            n.push(u);
                        }
                        return n;
                    }
                    {
                        let o = y(a[0]);
                        return $(
                            e.querySelector(
                                `input[data-x="${o[0]}"][data-y="${o[1]}"]`
                            ).value
                        );
                    }
                }
                function y(e) {
                    return [
                        e
                            .replace(/[^a-z]/g, "")
                            .split("")
                            .map((e) => "abcdefghijklmnopqrstuvwxyz".indexOf(e))
                            .reduce((e, t) => e + t, 0),
                        parseInt(e.replace(/[a-z]/g, "")) - 1,
                    ];
                }
                function $(e) {
                    return "false" == e || "true" == e
                        ? "true" == e
                        : isNaN(e)
                        ? `"${e}"`
                        : parseFloat(e);
                }
                function E(e) {
                    let t = h(e, !0)
                        .flat()
                        .filter((e) => e.dataset.value);
                    for (let a = 0; a < t.length; a++)
                        if ("=" == t[a].dataset.value.trim()[0]) {
                            let r = Function(
                                `return ${t[a].dataset.value
                                    .replace(/[A-Z0-9]+\:[A-Z0-9]+/g, (t) =>
                                        JSON.stringify(m(e, t))
                                    )
                                    .replace(/[A-Z]+[0-9]+/g, (t) =>
                                        JSON.stringify(m(e, t))
                                    )
                                    .replace(
                                        /[A-Z]+\((.*?)\)/g,
                                        (e) => `formulajs.${e}`
                                    )
                                    .slice(1)}`
                            )();
                            t[a].value = r;
                        }
                }
            }),
                (e.src =
                    "https://cdn.jsdelivr.net/npm/@formulajs/formulajs/lib/browser/formula.min.js"),
                document.body.appendChild(e);
        }).toString()})();`;
    }
    if (contains.highlighted) {
        sum += contains.highlighted;
    }
    return sum;
}
