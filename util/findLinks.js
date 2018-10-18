const fs = require('fs'),
    path = require('path'),
    util = require('util'),
    readFile = util.promisify(fs.readFile);


module.exports = function(dirpath, ext) {
    let links = [],
        regexp;
    if (ext === 'html')
        regexp = /(?:(href|src))=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/gim;
    else if (ext.match(/js|ts/))
        regexp = /^import.*|(require(?=\().*(('([^']|'')*')|("([^"]|"")*"))\))(;|,)$/gm;

    if (regexp) {
        return new Promise((res, rej) => {
            readFile(path.resolve(dirpath), 'utf8')
                .then(data => {
                    while (match = regexp.exec(data)) {
                        let pth;
                        if (match[0].indexOf(`'`))
                            pth = match[0].slice(match[0].indexOf(`'`) + 1, match[0].lastIndexOf(`'`));
                        else pth = match[0].slice(match[0].indexOf(`"`) + 1, match[0].lastIndexOf(`"`));
                        if (pth.match(/.html|.css|.js|.ts$/)) links.push(pth);
                        else links.push(`${pth}.js`);
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