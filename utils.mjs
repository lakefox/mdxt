export function exe(statement, context) {
    let cmd = statement.replace(/<[^>]*>(.*?)<[^>]*>/g, (tag, value) => {
        return type(value);
    });
    statement = statement.replace(/<[^>]*>(.*?)<[^>]*>/g, (tag) => {
        tag = tag.replace('<span data-mdxt-value="', "@{");
        if (tag.indexOf('" data-mdxt-index="') != -1) {
            tag = tag.replace('" data-mdxt-index="', "}[");
            tag = tag.replace(/\"\>(.*?)<[^>]*>/g, "]");
        } else {
            tag = tag.replace(/\"\>(.*?)<[^>]*>/g, "}");
        }
        return tag;
    });
    if (cmd.indexOf("@{") != -1) {
        try {
            cmd = resolveFromContext(statement, context);
        } catch {
            return { result: cmd, statement };
        }
    }
    try {
        return { result: eval(cmd), statement };
    } catch (e) {
        return { result: cmd, statement };
    }
}

function type(val) {
    if (val == "false" || val == "true") {
        return val == "true";
    } else {
        if (isNaN(val)) {
            return `"${val}"`;
        } else {
            return parseFloat(val);
        }
    }
}

function resolveFromContext(statement, context) {
    let ret = statement.replace(/\@\{(.*?)\}/g, (v) => {
        let values = {};
        for (let i = 0; i < context.input.length; i++) {
            const element = context.input[i].raw.slice(2);
            let end = element.indexOf(":");
            if (end == -1) {
                end = element.indexOf("]");
            }
            if (element[0] == "#") {
                if (typeof values[element.slice(1, end)] == "undefined") {
                    values[element.slice(1, end)] = [];
                }
                values[element.slice(1, end)].push(
                    type(
                        element.slice(
                            element.indexOf("{") + 1,
                            element.indexOf("}")
                        )
                    )
                );
            } else {
                values[element.slice(0, end)] = type(
                    element.slice(
                        element.indexOf("{") + 1,
                        element.indexOf("}")
                    )
                );
            }
        }
        for (let i = 0; i < context.exeId.length; i++) {
            const element = context.exeId[i].raw.slice(2);
            values[element.slice(0, element.indexOf("]"))] = type(
                element.slice(element.indexOf("{") + 1, element.indexOf("};"))
            );
        }
        console.log(values);
        let r = values[v.slice(2, -1)];
        if (typeof r == "object") {
            return `[${r.toString()}]`;
        } else {
            return r;
        }
    });

    if (ret.indexOf("@{") != -1) {
        ret = resolveFromContext(ret, context);
    }
    return eval(ret);
}
