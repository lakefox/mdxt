import { marked } from "marked";
import { highlight } from "./hlCode";

export function render(md) {
    let glob = {};
    // find the initiators
    let inputInit = breaker(md, "@[", "]{", "}");
    let exeInit = breaker(md, ">{", "}");
    let exeWIdInit = breaker(md, ">[","]{", "}");
    let ifInit = breaker(md, "?{", "}");
    let elInit = breaker(md, "#{", "}");

    let textSplit = md.split("");

    for (let i = 0; i < inputInit.length; i++) {
        let name = inputInit[i][1];
        let type = "text";
        if (name.indexOf(":") != -1) {
            type = name.split(":")[1];
            name = name.split(":")[0];
        }
        let isGroup = false;
        if (name[0] == "#") {
            name = name.slice(1);
            isGroup = true;
            if (glob[name] == undefined) {
                glob[name] = {
                    type: type,
                    group: []
                };
            }
            glob[name].group.push({
                value: inputInit[i][2]
            })
        } else {
            glob[name] = {
                value: inputInit[i][2],
                type: type,
                group: false
            };
        }
        let label = md.slice(inputInit[i].index + inputInit[i][0].length, md.indexOf("\n", inputInit[i].index + inputInit[i][0].length));
        let params = "";
        if (label[0] == "(") {
            params = label.slice(1,label.indexOf(")"));
            label = label.slice(label.indexOf(")")+1);
        }
        let interal;
        let tabs = "";
        if (type == "select") {
            let parsed = parseTabs(inputInit[i].index + inputInit[i][0].length+1, textSplit);
            tabs = parsed.lines
            interal = `<select title="${inputInit[i][2]}" ${params} name="${name}" data-mdxt-parent="${name}" value="${inputInit[i][2]}" ${isGroup ? "data-mdxt-index='" + (glob[name].group.length - 1) + "'" : ""}>
                ${tabs.map(e => 
                    `<option value="${e.trim().split("](")[1].slice(0, -1)}"  ${inputInit[i][2] == e.trim().split("](")[1].slice(0, -1) ? "selected":""}>${e.trim().split("](")[0].slice(1)}</option>`
                    ).join("")
                }
            </select>`;
            tabs = new Array(parsed.end).fill(0).join("");
        } else if (type == "textarea") {
            interal = `<textarea title="${inputInit[i][2]}" ${params} name="${name}" data-mdxt-parent="${name}" ${isGroup ? "data-mdxt-index='" + (glob[name].group.length - 1) + "'" : ""}>${inputInit[i][2]}</textarea>`;
        } else {
            interal = `<input type="${type}" ${params} title="${inputInit[i][2]}" name="${name}" data-mdxt-parent="${name}" value="${inputInit[i][2]}" ${isGroup ? "data-mdxt-index='" + (glob[name].group.length - 1) + "'" : ""} ${(type == "checkbox" || type == "radio") && inputInit[i][2] == "true" ? "checked" : ""}>`;
        }
        if (params != "") {
            params = params + "  ";   
        }
        if (label.length > 0) {
            textSplit = inject(textSplit, inputInit[i][0] + label + tabs + params, `<label for="${name}">${interal}${label}</label>`, inputInit[i].index);
        } else {
            textSplit = inject(textSplit, inputInit[i][0] + tabs + params, interal, inputInit[i].index);
        }
    }
    
    for (let i = 0; i < elInit.length; i++) {
        let interal = "";
        let type = elInit[i][1];

        let tabs = "";
        let parsed;
        let start = elInit[i].index + elInit[i][0].length + 1;
        if (type == "accordion") {
            parsed = parseTabs(start, textSplit);
            tabs = parsed.lines;
            let tabGroups = [...chunks(tabs, 2)];
            for (let a = 0; a < tabGroups.length; a++) {
                interal += `<details data-mdxt-type="accordion" ${a==0?"open":""}>
                    <summary>${tabGroups[a][0].trim().slice(1,-1)}</summary>
                    <p>${tabGroups[a][1]}</p>
                </details>`
            }
        } else if (type == "column") {
            parsed = parseTabs(start, textSplit);
            tabs = parsed.lines;
            let current = "";
            let all = "";
            for (let a = 0; a < tabs.length; a++) {
                if (new RegExp(/[\t+]\=+\n/).test(tabs[a])) {
                    all += `<div style="flex-basis: 100%">${current}</div>`;
                    current = "";
                } else {
                    current += tabs[a];
                }
            }
            all += `<div style="flex-basis: 100%">${current}</div>`;
            interal = `<div data-mdxt-type="column" style="display: flex;">${all}</div>`
        }
        textSplit = inject(textSplit, new Array((start - elInit[i].index) + parsed.end).fill(0).join(""), interal, elInit[i].index);
    }

    for (let i = 0; i < exeWIdInit.length; i++) {
        let name = exeWIdInit[i][1];
        glob[name] = {
            value: exe(exeWIdInit[i][2], glob).toString(),
            cmd: exeWIdInit[i][2],
            type: "exe",
            group: false
        };
        textSplit = inject(textSplit, exeWIdInit[i][0], `<span data-mdxt-parent="${name}" style="display: none;" data-mdxt-exe="${encodeURIComponent(exeWIdInit[i][2])}">${exe(exeWIdInit[i][2], glob)}</span>`, exeWIdInit[i].index);
    }

    for (let i = 0; i < ifInit.length; i++) {
        let start = ifInit[i].index + ifInit[i][0].length + 1;
        let parsed = parseTabs(start, textSplit);
        let tabs = parsed.lines.join("");
        textSplit = inject(textSplit, new Array((start - ifInit[i].index) + parsed.end).fill(0).join(""),
            `<div data-mdxt-exe="${encodeURIComponent(ifInit[i][1])}" data-mdxt-if="true" style="display: ${exe(ifInit[i][1], glob) ? "inline" : "none"};">\n\n${tabs.replace(/\t/g, "").trim()}</div>`, ifInit[i].index
        );
    }
    
    for (let i = 0; i < exeInit.length; i++) {
        textSplit = inject(textSplit, exeInit[i][0],
            `<span data-mdxt-exe="${encodeURIComponent(exeInit[i][1])}">${exe(exeInit[i][1], glob)}</span>`, exeInit[i].index
        );
    }

    let doc = fillVars(textSplit.join(""), glob);
    return {content: marked.parse(highlight(doc)), hydrater: hydrater(glob)};
}

function breaker() {
    let text = arguments[0];
    let exact = arguments[arguments.length-1] === true;
    let matchParams = [...arguments].slice(1);
    let matcher = "(.*)";
    if (exact) {
        matchParams.pop();
        matcher = "(.*?)";
    }
    let rexStr = "";
    for (let i = 0; i < matchParams.length; i++) {
        rexStr += escapeNA(matchParams[i]) + matcher;
    }
    rexStr = rexStr.slice(0, -matcher.length);
    let rxp = new RegExp(rexStr, "g");
    if (exact) {
        rxp = new RegExp(rexStr, "gs");
    } 
    return [...text.matchAll(rxp)];
}

function escapeNA(text) {
    let r = new RegExp(/[a-z0-9]/i);
    return text.split("").map(e=>r.test(e) ? e: "\\"+e).join("");
}

function inject(text, old, newLine, index) {
    for (let i = index; i < index+old.length; i++) {
        text[i] = newLine[i-index];
        if (i >= index + old.length-1) {
            text[i] = newLine.slice(i-index);
        }
    }
    return text;
}

function parseTabs(index, textSplit) {
    let lines = [];
    let raw = textSplit.slice(index);
    raw.push("\n");
    let cutIn = 0;
    let nextIsTab = false;
    let doubleNewLines = false;
    let end = 0;
    for (let i = 0; i < raw.length; i++) {
        if (raw[i] == "\t") {
            cutIn = i;
            nextIsTab = false;
            doubleNewLines = false;
        } else if (raw[i] == "\n" && !nextIsTab) {
            lines.push(raw.slice(cutIn, i).join("") + "\n");
            nextIsTab = true;
        } else if (nextIsTab && !doubleNewLines) {
            lines.push("\n");
            doubleNewLines = true;
        } else if (nextIsTab && doubleNewLines) {
            break;
        }
        end++;
    }
    return {lines, start: index, end};
}

function exe(statement, glob) {
    let cmd = statement.replaceAll(/\@\{(.*?)\}/g, (raw, name) => {
        if (glob[name].value) {
            return type(glob[name].value);
        } else {
            return JSON.stringify(glob[name].group.map(e => type(e.value)));
        }
    });
    try {
        return eval(cmd);
    } catch (e) {
        console.error(e);
    }
}

function type(val) {
    if (val == "false" || val == "true") {
        return val == "true";
    } else {
        if (isNaN(val)) {
            return val;
        } else {
            return parseFloat(val);
        }
    }
}

function fillVars(doc, glob) {
    doc = doc.replaceAll(/\@\{(.*?)\}[^\[\d+\]]/g, (raw, name) => {
        if (glob[name].value) {
            return `<span data-mdxt-value="${name}">${glob[name].value}</span>` || "";
        } else {
            return `<span data-mdxt-value="${name}">${JSON.stringify(glob[name].group.map(e => type(e.value)))}</span>` || "";
        }
    })
    doc = doc.replaceAll(/\@\{(.*?)\}\[\d+\]/g, (raw, name) => {
        let index = parseInt(raw.slice(`@{${name}}[`.length, -1));
        if (glob[name].group) {
            return `<span data-mdxt-value="${name}" data-mdxt-index="${index}">${glob[name].group[index].value}</span>`;
        } else {
            return `<span data-mdxt-value="${name}">${glob[name].value}</span>` || "";
        }
    })
    return doc;
}

function hydrater(keys) {
    if (Object.keys(keys).length > 0) {
        return `
    (()=>{
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
    });})()`
    } else {
        return "";
    }
}

function* chunks(arr, n) {
    for (let i = 0; i < arr.length; i += n) {
        yield arr.slice(i, i + n);
    }
}