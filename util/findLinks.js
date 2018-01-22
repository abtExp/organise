const fs = require('fs'),
    util = require('util'),
    readFile = util.promisify(fs.readFile);


module.exports = function(dirpath, ext, mode = 'findPaths') {
    let links = [],
        regexp;

    if (ext === 'html')
        regexp = /(?:script|link|style|img).*((href|src)(?==|\s=).*('([^']|'')))/gm;
    else if (ext.match(/js|ts/))
        regexp = /^import.*|(require(?=\().*(('([^']|'')*')|("([^"]|"")*"))\))(;|,)$/gm;

    if (regexp) {
        return new Promise((res, rej) => {
            readFile(dirpath, 'utf8')
                .then(data => {
                    while (match = regexp.exec(data)) {
                        if (mode === 'findPaths') {
                            let pth = match[0].slice(match[0].indexOf(`\'`) + 1, match[0].lastIndexOf(`\'`));
                            if (pth.match(/.html|.css|.js$/)) links.push(pth);
                            else links.push(`${pth}.js`); // Have to change it for other files
                        } else {
                            links.push(match);
                        }
                    }
                    res(links);
                })
                .catch(err => {
                    console.error(err);
                    rej();
                })
        })
    }
}