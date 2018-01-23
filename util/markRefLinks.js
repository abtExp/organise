const findLinks = require('./findLinks'),
    { findExactPath } = require('./util');


/**
 * @function markRefLinks - marks all reference links (imports) for a file
 * 
 * @param {string} path - the path of the file 
 * 
 * @returns {Array} of strings of file names of all the imports 
 * 
 */

module.exports = function markRefLinks(files) {
    console.log(`Marking reference links.`);
    let promiseList = [],
        matchN = false,
        ext = '';

    for (let i of Object.values(files)) {
        ext = i.name.slice(i.name.lastIndexOf('.') + 1);
        files[i.id].extension = ext;
        matchN = ext === 'html' ? true : false;
        promiseList.push(new Promise(async(res, rej) => {
            let links = await findLinks(i.path, ext);
            if (links && links.length > 0) {
                if (!matchN) links = links.filter(j => !(j.indexOf('./') === -1));
                links.map(k => {
                    k = findExactPath(i.path, k);
                    for (let z of Object.values(files)) {
                        if (z.path.match(k)) {
                            files[i.id].imports.push(files[z.id].path);
                            files[z.id].exports.push(i.path);
                        }
                    }
                })
            }
            res();
        }));
    }
    return Promise.all(promiseList);
}