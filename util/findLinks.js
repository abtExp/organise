const fs = require('fs'),
    util = require('util'),
    readFile = util.promisify(fs.readFile);


module.exports = function(dirpath, ext, mode = 'findPaths') {
    let links = [],
        regexp;

    console.log('finding links in : ', dirpath);
    if (ext === 'html')
        regexp = /(?:(href|src))=["']?((?:.(?!["']?\s+(?:\S+)=|[>"']))+.)["']?/gim;
    else if (ext.match(/js|ts/))
        regexp = /^import.*|(require(?=\().*(('([^']|'')*')|("([^"]|"")*"))\))(;|,)$/gm;

    if (regexp) {
        return new Promise((res, rej) => {
            readFile(dirpath, 'utf8')
                .then(data => {
                    while (match = regexp.exec(data)) {
                        let pth;
                        if (mode === 'findPaths') {
                            if (match[0].indexOf('\''))
                                pth = match[0].slice(match[0].indexOf(`\'`) + 1, match[0].lastIndexOf(`\'`));
                            else pth = match[0].slice(match[0].indexOf(`\"`) + 1, match[0].lastIndexOf(`\"`));
                            if (pth.match(/.html|.css|.js|.ts$/)) links.push(pth);
                            else links.push(`${pth}.js`);
                        } else links.push(match);
                    }
                    console.log('found links for : ', dirpath);
                    console.log(links);
                    res(links);
                })
                .catch(err => {
                    console.error(err);
                    rej();
                })
        })
    }
}