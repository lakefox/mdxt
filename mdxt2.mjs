import { FastExtract } from "./parser.mjs";
import { exe } from "./utils.mjs";
import { marked } from "marked";
import { highlight } from "./hlCode.mjs";

let parser = new FastExtract();

parser.define(
    "input",
    /\@\[{id}?{\:{type}}\]\{{default}\}?{\({parameters}\){text}}\n?{*{\t\[{label}\]\({value}\)\n}}/
);

parser.define(
    "column",
    /\#\{[column]\}\n*{\t{content}\n\t[===]\n}\t{content}\n/
);

parser.define(
    "accordion",
    /\#\{[accordion]\}\n*{\t\[{label}\]\n\t{content}\n}/
);

parser.define("spreadsheet", /\#\{[spreadsheet]\}\n*{\t{row}\n}/);

parser.define("video", /\#\{[video]\}\n*{\t\[{url}\]\({type}\)\n}/);

parser.define("var", /\@\{{id}\}?{\[{index}\]}/);

parser.define("note", /\!\{{note}\}/);

parser.define("exe", /\>\{{exp}\}\;/);
parser.define("exeId", /\>\[{id}\]\{{exp}\}\;/);

parser.define("for", /\%\[{vars}\]\{{amount}\}\n*{\t{repeatable}\n}/);

parser.define("if", /\?\{{condition}\}\n*{\t{repeatable}\n}/);

parser.on("input", ({ state }) => {
    let isGroup = state.id[0] == "#";
    let name = (isGroup ? state.id.slice(1) : state.id) || "";
    let value = ` value="${state.default || ""}"`;
    let title = ` title="${state.default || ""}"`;
    let namep = ` name="${name}"`;
    let parent = ` data-mdxt-parent="${name}"`;
    let group = ` ${isGroup ? "data-mdxt-index='" + name + "'" : ""}`;
    let parameters = state.parameters || "";
    let html = "";
    if (state.type == "select") {
        let options = "";
        for (let i = 0; i < state.label.length; i++) {
            options += `<option value="${state.value[i]}">${state.label[i]}</option>`;
        }
        html = `<select${value}${title}${namep}${parent}${group} ${parameters}>
            ${options}
        </select>`;
    } else if (state.type == "textarea") {
        html = `<textarea${title}${namep} ${parameters} type="${
            state.type || "text"
        }" placeholder="${state.placeholder || ""}"${parent}${group}>${
            state.default || ""
        }</textarea>\n`;
    } else {
        html = `<input${value}${title}${namep} ${parameters} type="${
            state.type || "text"
        }" placeholder="${state.placeholder || ""}"${parent}${group} ${
            (state.type || "" == "checkbox" || state.type || "" == "radio") &&
            state.default == "true"
                ? "checked"
                : ""
        }>\n`;
    }

    if (state.text) {
        if (state.type == "checkbox" || state.type == "radio") {
            return `<label for="${name}">${html}${state.text}</label>`;
        } else {
            return `<label for="${name}">${state.text}${html}</label>`;
        }
    } else {
        return html;
    }
});

parser.on("var", ({ state }, context) => {
    let inputs = context.input.filter((e) => {
        return e.state.id == state.id || e.state.id.slice(1) == state.id;
    });
    let value;
    let index = "";
    if (inputs.length > 0) {
        if (state.index) {
            value = inputs[parseInt(state.index)].state.default;
            index = ` data-mdxt-index="${state.index}"`;
        } else {
            value = inputs[0].state.default;
        }
        return `<span data-mdxt-value="${state.id}"${index}>${value}</span>`;
    } else {
        let e = exe(`@{${state.id}}`, context);
        return `<span data-mdxt-value="${state.id}">${e.result}</span>`;
    }
});

parser.on("column", ({ state }) => {
    let all = "";
    for (let i = 0; i < state.content.length; i++) {
        const element = state.content[i];
        if (element != "") {
            all += `<div style="flex-basis: 100%">${element}</div>\n`;
        }
    }
    return `<div data-mdxt-type="column" style="display: flex;">\n${all}\n</div>\n`;
});

parser.on("accordion", ({ state }) => {
    let html = "";
    for (let i = 0; i < state.label.length; i++) {
        html += `<details data-mdxt-type="accordion" ${
            i == 0 ? "open" : ""
        }><summary>${state.label[i]}</summary><p>${
            state.content[i]
        }</p></details>`;
    }
    return html;
});

parser.on("video", ({ state }) => {
    let html = "<video controls>";
    for (let i = 0; i < state.url.length; i++) {
        html += `<source src="${state.url[i]}" type="${state.type[i]}">`;
    }
    html += "</video>";
    return html;
});

parser.on("spreadsheet", ({ state }, context) => {
    let csv = state.row.map((e) =>
        e
            .trim()
            .split("|")
            .map((f) => f.trim())
    );
    return `<table spreadsheet cells="${Math.max(
        Array.from(csv).sort((a, b) => {
            return b.length - a.length;
        })[0].length,
        20
    )}" rows="${Math.max(csv.length, 20)}" data='${JSON.stringify(
        csv
    )}'></table>`;
});

// WARN!: Not done
parser.on("exe", ({ state }, context) => {
    let e = exe(state.exp, context);
    return `<span data-mdxt-exe="${encodeURIComponent(e.statement)}">${
        e.result
    }</span>`;
});

parser.on("exeId", ({ state }, context) => {
    console.log("here", state);
    let e = exe(state.exp, context);
    console.log(e);
    return `<span data-mdxt-parent="${
        state.id
    }" style="display: none;" data-mdxt-exe="${encodeURIComponent(
        e.statement
    )}}">${e.result}</span>`;
});

parser.on("note", ({ state }) => {
    return `<span class="mdxt-note" data-content="${state.note}">...</span>`;
});

parser.on("for", ({ state }, context) => {
    let html = "";
    let vars = state.vars.split(", ");
    let int = state.repeatable.join("\n") + "\n";
    let e = exe(state.amount, context);
    let amt = e.result;
    for (let i = 0; i < amt; i++) {
        html += int.replace(`@{${vars[0]}}`, i).replace(`@{${vars[1]}}`, amt);
    }
    return `<div data-mdxt-exe="${encodeURIComponent(
        e.statement
    )}" data-mdxt-for="${encodeURIComponent(
        int
    )}" data-mdxt-inject="${encodeURIComponent(state.vars)}">${html}</div>`;
});

parser.on("if", ({ state }, context) => {
    let e = exe(state.condition, context);
    let int = state.repeatable.join("\n") + "\n";
    return `<div data-mdxt-exe="${encodeURIComponent(
        e.statement
    )}" data-mdxt-if="true" style="display: ${
        e.result ? "inline" : "none"
    };">\n\n${int}</div>`;
});

export function render(md) {
    let doc = parser.extract(md);
    let highlighted = highlight(doc.value);
    contains.highlighted = highlighted.hydrater;
    return {
        content: marked.parse(highlighted.html),
        hydrater: hydrater(doc.state),
    };
}
