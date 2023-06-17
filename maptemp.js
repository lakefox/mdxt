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
    let aLock = 0;
    let aLocked = false;
    for (let a = 1; a < broke.length; a++) {
        console.log("start");
        console.log(broke[a]);
        if (broke[a].text) {
            if (
                (store[name] == undefined || typeof store[name] == "object") &&
                name != ""
            ) {
                let found = false;
                let seperate = 0;
                if (broke[a].repeatable && !aLocked) {
                    for (let b = a; b >= 0; b--) {
                        if (!broke[b].repeatable) {
                            aLock = b;
                            break;
                        }
                    }
                    aLocked = true;
                } else if (!broke[a].repeatable) {
                    aLocked = false;
                }
                let offset = string.indexOf(broke[a].text, index);
                if (offset != -1) {
                    seperate = broke[a].text.length;
                    found = true;
                } else {
                    for (let b = a; b < broke.length; b++) {
                        if (broke[b].text) {
                            let pos = string.indexOf(broke[b].text, index);
                            if (pos != -1) {
                                offset = pos;
                                seperate = broke[b].text.length;
                                a = b;
                                found = true;
                                break;
                            }
                        }
                    }
                }
                if (found) {
                    console.log("found", name);
                    // if (broke[a].repeatable || store[name] != undefined) {
                    if (broke[a].repeatable) {
                        console.log("Storing", a, string.slice(index, offset));
                        if (store[name] == undefined) {
                            store[name] = [];
                        }
                        store[name].push(string.slice(index, offset));
                        if (broke[a + 1]) {
                            if (!broke[a + 1].repeatable) {
                                console.log("Reset: ", a, aLock);
                                a = aLock;
                                aLocked = true;
                            }
                        } else {
                            console.log("Reset: ", a, aLock);
                            a = aLock;
                            aLocked = true;
                        }
                    } else if (store[name] == undefined) {
                        console.log("Store 2");
                        store[name] = string.slice(index, offset);
                    }
                    name = "";
                    index = offset + seperate;
                }
            } else {
                if (index == string.indexOf(broke[a].text, index)) {
                    index += broke[a].text.length;
                } else {
                    a += 2;
                }
            }
        } else {
            console.log("Making Name");
            if (broke[a].name) {
                name = broke[a].name;
            }
            console.log(name);
        }
    }
    name = broke.at(-1).name;
    if (name) {
        if (store[name] == undefined) {
            if (string.slice(index) != "") {
                store[name] = string.slice(index);
            }
        } else if (typeof store[name] == "object" || store[name].repeatable) {
            if (store[name] == undefined) {
                store[name] = [];
            }
            store[name].push(string.slice(index));
        }
    }
    return store;
}
