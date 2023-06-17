import { FastExtract } from "./parser.mjs";

let parser = new FastExtract();

parser.define(
    "input",
    /\@\[{id}?{\:{type}}\]\{{default}\}?{\({parameters}\){text}}\n?{*{\t\[{label}\]\({value}\)\n}}/
);

parser.define(
    "column",
    /\#\{[column]\}\n*{\t{content}\n\t[===]\n}\t{content}\n/
);

parser.define("var", /\@\{{id}\}/);

parser.on("input", ({ state }) => {
    console.log(state);
    if (state.type == "select") {
    }
    return `<input value="${state.default || ""}" name="${
        state.id || ""
    }" type="${state.type || "text"}" placeholder="${
        state.placeholder || ""
    }">\n`;
});

parser.on("var", ({ state }, context) => {
    for (let i = 0; i < context.input.length; i++) {
        const element = context.input[i];
        if (element.state.id == state.id) {
            return `<div>${element.state.default}</div>`;
        }
    }
});

parser.on("column", ({ state }) => {
    console.log(state);
    let all = "";
    for (let i = 0; i < state.content.length; i++) {
        const element = state.content[i];
        if (element != "") {
            all += `<div style="flex-basis: 100%">${element}</div>\n`;
        }
    }
    return `<div data-mdxt-type="column" style="display: flex;">\n${all}\n</div>\n`;
});

export function render(md) {
    let res = parser.extract(md);

    console.log(res);
}

console.log(
    parser.extract(`test
@[id:select]{0}
\t[Label](0)
\t[L2](1)
more`)
);
