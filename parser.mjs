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
                extracted[key] = [...find(text, pattern)].slice(0, -1);
            }
        }
        for (const key in definitions) {
            if (Object.hasOwnProperty.call(definitions, key)) {
                const pattern = definitions[key];
                if (handlers[key]) {
                    let found = [...find(text, pattern)].slice(0, -1);
                    found.sort((a, b) => b.index - a.index);
                    for (let i = 0; i < found.length; i++) {
                        let replaceValue = handlers[key](found[i], extracted);
                        text =
                            text.slice(0, found[i].index) +
                            replaceValue +
                            text.slice(found[i].index + found[i].length);
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
    let index = 0;
    let lock = 0;
    let locked = false;
    let unlock = 0;
    while (!done) {
        let start = null;
        let end = null;
        for (let i = 0; i < broke.length; i++) {
            if (broke[i].text) {
                if (start == null) {
                    start = string.indexOf(broke[i].text, index);
                    end = start;
                }
                if (start == -1) {
                    done = true;
                    break;
                } else {
                    let g = string.indexOf(broke[i].text, end);
                    if (g > end) {
                        if (broke[i + 1]) {
                            let j = false;
                            for (let a = i + 1; a < broke.length; a++) {
                                if (broke[a].text) {
                                    if (!broke[a].optional) {
                                        j = a;
                                        break;
                                    }
                                }
                            }
                            if (j) {
                                let h = string.indexOf(broke[j].text, end);
                                if (g > h && broke[i].optional) {
                                    i = j - 1;
                                    continue;
                                } else {
                                }
                            }
                        }
                        end = g;
                    } else if (g != -1) {
                        locked = false;
                        i = unlock;
                    } else if (!broke[i].optional) {
                        break;
                    }
                    if (broke[i].repeatable && !locked) {
                        locked = true;
                        lock = i;
                    } else if (locked) {
                        let last = end;
                        let hasBeenSet = false;
                        for (let a = i; a < broke.length; a++) {
                            if (broke[a].text) {
                                let found = string.indexOf(broke[a].text, last);
                                if (broke[a].repeatable) {
                                    last = found + broke[a].text.length;
                                    hasBeenSet = true;
                                } else {
                                    unlock = a;
                                    if (hasBeenSet) {
                                        if (last >= found) {
                                            locked = false;
                                        } else {
                                            end = last;
                                        }
                                    }
                                    break;
                                }
                            }
                        }
                        if (locked && !broke[i].repeatable) {
                            i = lock;
                        }
                    }
                }
            }
        }
        if (broke[broke.length - 1].text) {
            end += broke[broke.length - 1].text.length;
        }
        index = end;
        let raw = string.slice(start, end);
        yield {
            raw,
            index: start,
            length: end - start,
            state: map(raw, pattern),
        };
    }
}

function map(string, pattern) {
    let broke = breakPattern(
        pattern.toString().slice(1, -1).replace("\\\\", "\\")
    );
    console.log(broke);
    if (broke[0].text == undefined) {
        throw new Error("Pattern Can Not Start with a Variable");
    }
    let index = string.indexOf(broke[0].text) + broke[0].text.length;
    let store = {};
    let name = "";
    let repeatable = false;
    let secondPass = false;
    for (let a = 1; a < broke.length; a++) {
        console.log("start");
        console.log(broke[a], index);
        console.log("#-----------------");
        console.log(string.slice(index));
        console.log("!-----------------");
        if (broke[a].text) {
            //combine all repeatables after the varible declearation into a single string and look for it then add the length and skip to the a value at/or if at skip to start until not found
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
                console.log("optional");
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

                if (skip) {
                    console.log("skipping");
                    continue;
                }
            }
            console.log(slug.split(""));

            let slugPos = string.indexOf(slug, index);
            console.log("Slug Position: ", slugPos);

            if (slugPos == -1 && broke[a].repeatable) {
                console.log("Stopping Loop");
                for (let b = a; b < broke.length; b++) {
                    if (broke[b].text && !broke[b].repeatable) {
                        a = b;
                        break;
                    }
                }
                continue;
            }

            if (name) {
                console.log("OP", name, end);
                let contents = string.slice(index, slugPos);
                console.log(repeatable);
                if (repeatable || typeof store[name] == "object") {
                    if (!store[name]) {
                        store[name] = [];
                    }
                    store[name].push(contents);
                } else {
                    store[name] = contents;
                }
                secondPass = false;
                console.table(store);
                name = "";
            } else {
                console.log("Jump", end - 1);
                a = end - 1;
            }

            if (slugPos != -1) {
                index = slugPos + slug.length;
            }
            console.log(broke[end], broke[a]);
            if (broke[a].repeatable && !secondPass && slugPos != -1) {
                let reset = false;
                if (broke[end + 1]) {
                    if (!broke[end + 1].repeatable) {
                        reset = true;
                    }
                } else {
                    reset = true;
                }
                console.log("reset", reset);
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
            if (broke[a].name) {
                name = broke[a].name;
                repeatable = broke[a].repeatable;
            }
        }
    }
    return store;
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

// let f = map(
//     `@[id:select]{0}
// \t[L1](0)
// \t[L2](1)
// \t[L3](2)
// `,
//     /\@\[{id}?{\:{type}}\]\{{default}\}?{\({parameters}\){text}}\n?{*{\t\[{label}\]\({value}\)\n}}/
// );

let f = map(
    `#{column}
\tconetn1
\ttest
\t===
\thi
\tmore
\t===
\ttext
word hello
`,
    /\#\{[column]\}\n*{\t{content}\n\t[===]\n}\t{content}\n/
);
console.log(f);

// pattern have \t+>(tabs){content}\n(tabs)>[=+]
