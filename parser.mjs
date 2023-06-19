let escapeMap = { n: "\n", t: "\t" };

export function FastExtract() {
    let definitions = {};
    let handlers = {};

    this.define = (name, pattern) => {
        definitions[name] = pattern;
    };

    this.extract = (text) => {
        let extracted = {};
        for (const key in definitions) {
            if (Object.hasOwnProperty.call(definitions, key)) {
                const pattern = definitions[key];
                extracted[key] = [...find(text, pattern)].reverse();
            }
        }
        for (const key in definitions) {
            if (Object.hasOwnProperty.call(definitions, key)) {
                const pattern = definitions[key];
                if (handlers[key]) {
                    let found = [...find(text, pattern)].reverse();
                    found.sort((a, b) => b.start - a.start);
                    for (let i = 0; i < found.length; i++) {
                        let replaceValue = handlers[key](found[i], extracted);
                        text =
                            text.slice(0, found[i].start) +
                            replaceValue +
                            text.slice(found[i].end);
                        // console.log(text);
                    }
                }
            }
        }
        return { value: text, state: extracted };
    };

    this.on = (name, cb) => {
        handlers[name] = cb;
    };
}

function* find(string, pattern) {
    let broke = breakPattern(
        pattern.toString().slice(1, -1).replace("\\\\", "\\")
    );
    if (broke[0].text == undefined) {
        throw new Error("Pattern Can Not Start with a Variable");
    }
    let done = false;
    let index = Infinity;
    while (!done) {
        let start = string.slice(0, index).lastIndexOf(broke[0].text);
        let part = string.slice(start, index);
        let output = map(part, pattern);

        if (output.start != -1) {
            index = start;
            output.start += start;
            output.end += start;
            yield output;
        } else {
            done = true;
        }
    }
}

function map(string, pattern) {
    let broke = breakPattern(
        pattern.toString().slice(1, -1).replace("\\\\", "\\")
    );
    if (broke[0].text == undefined) {
        throw new Error("Pattern Can Not Start with a Variable");
    }
    let initPattern = "";
    let startIndex = 0;
    for (let i = 0; i < broke.length; i++) {
        if (broke[i].text) {
            initPattern += broke[i].text;
            startIndex = i;
        } else {
            break;
        }
    }
    if (string.indexOf(initPattern) == -1) {
        return {
            start: -1,
            end: 0,
            raw: "",
            length: 0,
            state: {},
        };
    }

    let index = string.indexOf(initPattern) + initPattern.length;
    let store = {};
    let name = "";
    let repeatable = false;
    let secondPass = false;
    for (let a = startIndex + 1; a < broke.length; a++) {
        if (broke[a].text) {
            let slug = "";
            let end = a;
            for (let b = a; b < broke.length; b++) {
                if (
                    broke[b].text &&
                    broke[a].optional == broke[b].optional &&
                    broke[a].repeatable == broke[b].repeatable
                ) {
                    slug += broke[b].text;
                } else {
                    end = b;
                    break;
                }
            }
            if (broke[a].optional) {
                let pos = string.indexOf(broke[a].text, index);
                let skip = false;
                if (pos != -1) {
                    for (let b = a + 1; b < broke.length; b++) {
                        if (broke[b].text && !broke[b].optional) {
                            if (string.indexOf(broke[b].text, index) < pos) {
                                skip = true;
                            }
                            break;
                        }
                    }
                } else {
                    skip = true;
                }
                broke[a].exists = !skip;
                if (skip) {
                    continue;
                }
            }

            let slugPos = string.indexOf(slug, index);

            if (slugPos == -1 && broke[a].repeatable) {
                for (let b = a; b < broke.length; b++) {
                    if (broke[b].text && !broke[b].repeatable) {
                        a = b;
                        break;
                    }
                }
                continue;
            }
            if (name) {
                let contents = string.slice(index, slugPos);
                if (repeatable || typeof store[name] == "object") {
                    if (!store[name]) {
                        store[name] = [];
                    }
                    store[name].push(contents);
                } else {
                    store[name] = contents;
                }
                secondPass = false;
                name = "";
            } else {
                a = end - 1;
            }

            if (slugPos != -1) {
                index = slugPos + slug.length;
            }
            if (broke[a].repeatable && !secondPass && slugPos != -1) {
                let reset = false;
                if (broke[end + 1]) {
                    if (!broke[end + 1].repeatable) {
                        reset = true;
                    }
                } else {
                    reset = true;
                }
                if (reset) {
                    for (let b = a; b > 0; b--) {
                        if (!broke[b].repeatable) {
                            a = b;
                            break;
                        }
                    }
                    secondPass = true;
                }
            }
        } else {
            if (broke[a].name && !broke[a].optional) {
                name = broke[a].name;
                repeatable = broke[a].repeatable;
            } else if (broke[a].optional) {
                if (broke[a - 1]) {
                    if (broke[a - 1].exists) {
                        name = broke[a].name;
                        repeatable = broke[a].repeatable;
                    }
                }
            }
        }
    }
    let start = string.indexOf(broke[0].text);
    let end = index;
    let raw = string.slice(start, end);
    return {
        start,
        end,
        raw,
        length: end - start,
        state: store,
    };
}

function breakPattern(pattern, allOptional = false, allRepeatable = false) {
    let pStr = pattern;
    let parts = [];
    let escaped = false;
    let value = false;
    let nest = 0;
    let buffer = "";
    let optional = allOptional;
    let literal = false;
    let repeatable = allRepeatable;
    for (let i = 0; i < pStr.length; i++) {
        if (escaped) {
            buffer += pStr[i];
        } else {
            if (buffer != "" && pStr[i] != "\\" && !value && !literal) {
                parts.push({
                    text: escapeBuffer(buffer),
                    optional,
                    repeatable,
                });
                buffer = "";
            }
            if (pStr[i] == "}" && !escaped && value) {
                if (nest > 1) {
                    nest--;
                } else if (buffer != "" && nest == 1) {
                    value = false;
                    nest = 0;
                    if (buffer.indexOf("{") != -1) {
                        parts.push(
                            ...breakPattern(
                                buffer + pStr[i],
                                optional,
                                repeatable,
                                nest
                            )
                        );
                    } else {
                        parts.push({
                            name: buffer,
                            optional,
                            repeatable,
                        });
                    }
                    buffer = "";
                }
            } else if (pStr[i] == "}") {
                optional = allOptional;
                repeatable = allRepeatable;
            }
            if (value && !escaped && !literal) {
                buffer += pStr[i];
            }
            if (pStr[i] == "{" && !escaped) {
                value = true;
                nest++;
                if (pStr[i - 1]) {
                    if (pStr[i - 1] == "*" || pStr[i - 1] == "?") {
                        value = false;
                        nest = Math.max(nest - 1, 0);
                    }
                }
            }
            if (pStr[i] == "?" && !escaped) {
                if (pStr[i + 1]) {
                    if (pStr[i + 1] == "{") {
                        optional = true;
                    }
                }
            }
            if (pStr[i] == "*" && !escaped) {
                if (pStr[i + 1]) {
                    if (pStr[i + 1] == "{") {
                        repeatable = true;
                    }
                }
            }
        }

        if (literal && !escaped) {
            buffer += pStr[i];
        }
        if (pStr[i] == "]" && !escaped && literal) {
            if (buffer.indexOf("[") != -1) {
                parts.push(
                    ...breakPattern(buffer + pStr[i], optional, repeatable)
                );
            } else {
                parts.push({
                    text: buffer.slice(0, -1),
                    optional,
                    repeatable,
                    literal,
                });
            }
            literal = false;
            buffer = "";
        }
        if (pStr[i] == "[" && !escaped) {
            literal = true;
        }

        if (pStr[i] == "\\") {
            escaped = true;
        } else {
            escaped = false;
        }
    }
    if (buffer != "") {
        parts.push({
            text: escapeBuffer(buffer),
            optional,
            repeatable,
        });
    }
    return parts;
}

function escapeBuffer(b) {
    return b
        .split(/[A-Za-z]/g)
        .map((e, i) => (e == "" ? (escapeMap[b[i]] ? escapeMap[b[i]] : "") : e))
        .join("");
}

// let f = [
//     ...find(
//         `dfs@[id]{0} test
// tejsahjkdhjksdfhkajsldhfjkshdjk
// @[id:select]{0}
// \t[L1](0)
// \t[L2](1)
// \t[L3](2)
// dshfjksdahfkjhdsjakhfjkasdhfkjshalkjfhjkas
// `,
//         /\@\[{id}?{\:{type}}\]\{{default}\}?{\({parameters}\){text}}\n?{*{\t\[{label}\]\({value}\)\n}}/
//     ),
// ];

// let f = [
//     ...find(
//         `jkfgdsfjkhlgjhkldfshjkgjhkdsjhkgjhkdsjkfgjkhdsfjhkgkjldsfhgljkdsf
// #{column}
// \tconetn1
// \ttest
// \t===
// \thi
// \tmore
// \t===
// \ttext
// word hellodfgdsfgdfsgdsfgdsfgdsfgsdfgdsfg
// `,
//         /\#\{[column]\}\n*{\t{content}\n\t[===]\n}\t{content}\n/
//     ),
// ];
// console.log(f);

// pattern have \t+>(tabs){content}\n(tabs)>[=+]
