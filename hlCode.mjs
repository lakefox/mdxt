import hljs from "highlight.js";
import vm from "node:vm";

export function highlight(contents) {
    let parts = contents.split("```");
    let includeEditor = false;
    for (let i = 0; i < parts.length; i++) {
        let part = parts[i];
        let tags = {};
        part = part.replace(
            /\<(div|span)(.*?)data\-mdxt\-(parent|child|exe|value)\=(.*?)\>(.*?)\<\/(div|span)\>/gs,
            (tag) => {
                tags[`temp${Math.abs(hashCode(tag))}temp`] = tag;
                return `temp${Math.abs(hashCode(tag))}temp`;
            }
        );
        if (i % 2 == 1) {
            let code = prep(part, tags);
            if (code.editor) {
                parts[i] = code.html;
                includeEditor = true;
            } else {
                if (code.execute) {
                    parts[i] = `<pre rel="${code.lang}"><code>${
                        code.html
                    }</code>
                    <div class="mdxt_code_result">${runCode(
                        code.code
                    )}</div></pre>`;
                } else {
                    parts[
                        i
                    ] = `<pre rel="${code.lang}"><code>${code.html}</code></pre>`;
                }
            }
        }
    }
    let hydrater = "";
    if (includeEditor) {
        hydrater = `(${(() => {
            let e = document.createElement("script");
            (e.src = "./highlight.min.js"),
                (e.onload = () => {
                    let e = document.querySelectorAll("[editor]");
                    for (let t = 0; t < e.length; t++) l(e[t]);
                    function l(e) {
                        let t = { html: "", css: "", js: "" },
                            l = e.querySelectorAll("[data-lang]"),
                            a = e.querySelector("iframe");
                        for (let n = 0; n < l.length; n++)
                            (t[l[n].dataset.lang] = l[n].value),
                                (l[n].parentNode.querySelector(
                                    "code"
                                ).innerHTML = hljsWeb
                                    .highlightAuto(l[n].value)
                                    .value.replace(/\n/g, "<br/>")),
                                l[n].addEventListener("scroll", (e) => {
                                    e.target.parentNode
                                        .querySelector("pre")
                                        .scrollTo(0, l[n].scrollTop);
                                }),
                                l[n].addEventListener("keyup", (e) => {
                                    (t[e.target.dataset.lang] = e.target.value),
                                        (e.target.parentNode.querySelector(
                                            "code"
                                        ).innerHTML = hljsWeb
                                            .highlightAuto(e.target.value)
                                            .value.replace(/\n/g, "<br/>")),
                                        r(t, a);
                                }),
                                l[n].addEventListener("keydown", (e) => {
                                    if ("Tab" == e.key) {
                                        e.preventDefault();
                                        let t = e.currentTarget;
                                        t.setRangeText(
                                            "	",
                                            t.selectionStart,
                                            t.selectionEnd,
                                            "end"
                                        );
                                    }
                                }),
                                r(t, a);
                    }
                    function r(e, t) {
                        let l =
                                `<!DOCTYPE html><html><head><style>${e.css}</style></head><body>${e.html}<scr` +
                                `ipt>${e.js}</scri` +
                                `pt></body></html>`,
                            r = new Blob([l], { type: "text/html" });
                        t.src = URL.createObjectURL(r);
                    }
                }),
                document.body.appendChild(e);
        }).toString()})();`;
    }
    return { html: parts.join(""), hydrater };
}

function runCode(code) {
    let logs = (code.match(new RegExp("console.log", "g")) || []).length;
    if (logs == 0) {
        return "> ";
    }
    let context = {
        store: [],
        output: function () {
            context.store.push(Object.values(arguments));
        },
    };
    vm.createContext(context);
    code = code.replace(/console.log/g, "output");
    try {
        vm.runInContext(code, context, { timeout: 1000 });
        let op =
            "<span>> " +
            context.store
                .map((e) => e.map((a) => JSON.stringify(a)).join(" "))
                .join("\n</span><span>> ");
        return op;
    } catch (e) {
        let op =
            "<span>> " +
            context.store
                .map((e) => e.map((a) => JSON.stringify(a)).join(" "))
                .join("\n</span><span>> ");
        op += `\n</span><span class="mdxt_error">> ${e.toString()}</span>`;
        return op;
    }
}

function prep(raw, tags) {
    let part = raw.trim();
    let lang = part.slice(0, part.indexOf("\n")).toLowerCase();
    let execute = false;
    if (lang[0] == ">" && ["javascript", "js"].indexOf(lang.slice(1)) != -1) {
        lang = lang.slice(1);
        execute = true;
    } else if (lang[0] == ">" && lang[1] == "\n") {
        let code = part.slice(part.indexOf("\n") + 1);
        let doc = parseDoc(code, [...code.matchAll(/\[(.*?)\]\n/g)]);
        let ret = `<div editor>
        <iframe frameborder="0"></iframe>
        <div>
          <label for="html">
            HTML
            <div code>
              <textarea name="html" data-lang="html">${
                  doc.html || ""
              }</textarea>
              <pre>
                <code id="html"></code>
              </pre>
            </div>
          </label>
          <label for="css">
            CSS
            <div code>
              <textarea name="css" data-lang="css">${doc.css || ""}</textarea>
              <pre>
                <code id="css"></code>
              </pre>
            </div>
          </label>
          <label for="js">
            JS
            <div code>
              <textarea name="js" data-lang="js">${doc.js || ""}</textarea>
              <pre>
                <code id="js"></code>
              </pre>
            </div>
          </label>
        </div>
      </div>`;

        return {
            html: ret,
            editor: true,
        };
    }
    if (lang == "none") {
        return raw;
    }
    let highlighted;
    let code = part.slice(part.indexOf("\n") + 1);
    if (supported.indexOf(lang) != -1) {
        highlighted = hljs.highlight(code, { language: lang }).value;
    } else {
        highlighted = hljs.highlightAuto(part).value;
    }
    return {
        html: highlighted.replace(/temp[0-9]+temp/gs, (placeholder) => {
            return tags[placeholder];
        }),
        execute,
        code,
        lang,
        editor: false,
    };
}

function parseDoc(code, matches) {
    let doc = {};
    for (let i = 0; i < matches.length; i++) {
        doc[matches[i][1].toLowerCase()] = code.slice(
            matches[i].index + matches[i][0].length,
            matches[i + 1]?.index
        );
    }
    return doc;
}

let supported = [
    "1c",
    "4d",
    "sap-abap",
    "abap",
    "accesslog",
    "ada",
    "apex",
    "arduino",
    "ino",
    "armasm",
    "arm",
    "actionscript",
    "as",
    "alan",
    "i",
    "ln",
    "angelscript",
    "asc",
    "apache",
    "apacheconf",
    "applescript",
    "osascript",
    "arcade",
    "asciidoc",
    "adoc",
    "aspectj",
    "autohotkey",
    "autoit",
    "awk",
    "mawk",
    "nawk",
    "gawk",
    "bash",
    "sh",
    "zsh",
    "basic",
    "bbcode",
    "blade",
    "bnf",
    "bqn",
    "brainfuck",
    "bf",
    "csharp",
    "cs",
    "c",
    "h",
    "cpp",
    "hpp",
    "cc",
    "hh",
    "c++",
    "h++",
    "cxx",
    "hxx",
    "cal",
    "cos",
    "cls",
    "candid",
    "did",
    "cmake",
    "cmake.in",
    "cobol",
    "standard-cobol",
    "coq",
    "csp",
    "css",
    "capnproto",
    "capnp",
    "chaos",
    "kaos",
    "chapel",
    "chpl",
    "cisco",
    "clojure",
    "clj",
    "coffeescript",
    "coffee",
    "cson",
    "iced",
    "cpc",
    "crmsh",
    "crm",
    "pcmk",
    "crystal",
    "cr",
    "curl",
    "cypher",
    "d",
    "dafny",
    "dart",
    "dpr",
    "dfm",
    "pas",
    "pascal",
    "diff",
    "patch",
    "django",
    "jinja",
    "dns",
    "zone",
    "bind",
    "dockerfile",
    "docker",
    "dos",
    "bat",
    "cmd",
    "dsconfig",
    "dts",
    "dust",
    "dylan",
    "ebnf",
    "elixir",
    "elm",
    "erlang",
    "erl",
    "excel",
    "xls",
    "xlsx",
    "extempore",
    "xtlang",
    "xtm",
    "fsharp",
    "fs",
    "fix",
    "flix",
    "fortran",
    "f90",
    "f95",
    "func",
    "gcode",
    "nc",
    "gams",
    "gms",
    "gauss",
    "gss",
    "godot",
    "gdscript",
    "gherkin",
    "hbs",
    "glimmer",
    "html.hbs",
    "html.handlebars",
    "htmlbars",
    "gn",
    "gni",
    "go",
    "golang",
    "gf",
    "golo",
    "gololang",
    "gradle",
    "graphql",
    "groovy",
    "gsql",
    "xml",
    "html",
    "xhtml",
    "rss",
    "atom",
    "xjb",
    "xsd",
    "xsl",
    "plist",
    "svg",
    "http",
    "https",
    "haml",
    "handlebars",
    "hbs",
    "html.hbs",
    "html.handlebars",
    "haskell",
    "hs",
    "haxe",
    "hx",
    "hlsl",
    "hy",
    "hylang",
    "ini",
    "toml",
    "inform7",
    "i7",
    "irpf90",
    "json",
    "java",
    "jsp",
    "javascript",
    "js",
    "jsx",
    "jolie",
    "iol",
    "ol",
    "julia",
    "julia-repl",
    "kotlin",
    "kt",
    "tex",
    "leaf",
    "lean",
    "lasso",
    "ls",
    "lassoscript",
    "less",
    "ldif",
    "lisp",
    "livecodeserver",
    "livescript",
    "lookml",
    "lua",
    "macaulay2",
    "mma",
    "wl",
    "matlab",
    "maxima",
    "mel",
    "mercury",
    "mips",
    "mipsasm",
    "mirc",
    "mrc",
    "mizar",
    "mkb",
    "mlir",
    "mojolicious",
    "monkey",
    "moonscript",
    "moon",
    "motoko",
    "mo",
    "n1ql",
    "nsis",
    "never",
    "nginx",
    "nginxconf",
    "nim",
    "nimrod",
    "nix",
    "oak",
    "ocl",
    "ocaml",
    "ml",
    "objectivec",
    "mm",
    "objc",
    "obj-c",
    "obj-c++",
    "objective-c++",
    "glsl",
    "openscad",
    "scad",
    "ruleslanguage",
    "oxygene",
    "pf",
    "pf.conf",
    "php",
    "papyrus",
    "psc",
    "parser3",
    "perl",
    "pl",
    "pm",
    "pine",
    "pinescript",
    "plaintext",
    "txt",
    "text",
    "pony",
    "pgsql",
    "postgres",
    "postgresql",
    "powershell",
    "ps",
    "ps1",
    "processing",
    "prolog",
    "properties",
    "protobuf",
    "puppet",
    "pp",
    "python",
    "py",
    "gyp",
    "profile",
    "python-repl",
    "pycon",
    "qsharp",
    "k",
    "kdb",
    "qml",
    "r",
    "cshtml",
    "razor",
    "razor-cshtml",
    "reasonml",
    "re",
    "redbol",
    "red",
    "red-system",
    "redbol",
    "rib",
    "rsl",
    "risc",
    "riscript",
    "graph",
    "instances",
    "robot",
    "rf",
    "rpm-specfile",
    "rpm",
    "spec",
    "rpm-spec",
    "specfile",
    "ruby",
    "rb",
    "gemspec",
    "podspec",
    "thor",
    "irb",
    "rust",
    "rs",
    "rvt",
    "rvt-script",
    "sas",
    "SQL",
    "p21",
    "step",
    "stp",
    "scala",
    "scheme",
    "scilab",
    "sci",
    "shexc",
    "shell",
    "console",
    "smali",
    "smalltalk",
    "sml",
    "ml",
    "solidity",
    "sol",
    "spl",
    "stan",
    "stanfuncs",
    "stata",
    "iecst",
    "scl",
    "stl",
    "structured-text",
    "stylus",
    "styl",
    "subunit",
    "supercollider",
    "sc",
    "svelte",
    "swift",
    "tcl",
    "tk",
    "terraform",
    "tf",
    "hcl",
    "tap",
    "thrift",
    "toit",
    "tp",
    "tsql",
    "twig",
    "craftcms",
    "typescript",
    "ts",
    "tsx",
    "mts",
    "cts",
    "unicorn-rails-log",
    "vbnet",
    "vb",
    "vba",
    "vbscript",
    "vbs",
    "vhdl",
    "vala",
    "verilog",
    "v",
    "vim",
    "xsharp",
    "xs",
    "prg",
    "axapta",
    "x++",
    "x86asm",
    "xl",
    "tao",
    "xquery",
    "xpath",
    "xq",
    "yml",
    "yaml",
    "zenscript",
    "zs",
    "zephir",
    "zep",
];

function hashCode(str) {
    let hash = 0;
    for (let i = 0, len = str.length; i < len; i++) {
        let chr = str.charCodeAt(i);
        hash = (hash << 5) - hash + chr;
        hash |= 0; // Convert to 32bit integer
    }
    return hash;
}
