const fs = require('fs'),
    util = require('util'),
    markRefLinks = require('./markRefLinks'),
    readFile = util.promisify(fs.readFile),
    writeFile = util.promisify(fs.writeFile);


/**
 * @function editLinks - edits the reference links
 * 
 * @param {String} data 
 * @param {String} newPath 
 * @param {String} oldPath
 * 
 * @returns {String} edited file  
 */

function editLinks(data, newPath, oldPath) {
    let newData = data;
    newData = newData.split(oldPath).join(newPath);
    return newData;
}

/**
 * @function calcRelPath - finds the relative path give 
 *                         the file path and the referenced file path
 * 
 * @param {String} filePath 
 * @param {String} linkPath
 * 
 * @returns {String} the relative path
 *  
 */
function calcRelPath(filePath, linkPath) {
    filePath = filePath.replace(`\\`, `/`);
    linkPath = linkPath.replace(`\\`, `/`);
    let RelPath = '',
        linkPathList = linkPath.split('/'),
        filePathList = filePath.split('/'),
        idx = 0;
    console.log(`File Path : ${filePath}, link path : ${linkPath}`);
    for (let i = 1; i < filePathList.length - 1; i++) {
        idx = i;
        if (filePathList[i] === linkPathList[i])
            break;
        RelPath += '../';
    }

    if (RelPath.length === 0) {
        RelPath += './';
        idx += 1;
    }

    if (idx === 0) idx += 1;

    for (let i = idx; i < linkPathList.length - 1; i++) {
        RelPath += linkPathList[i] + '/';
    }

    RelPath += linkPathList[linkPathList.length - 1];
    console.log(`RelPath : ${RelPath}`);
    return RelPath;
}

/**
 * @function findExactPath - 
 * 
 * @param {String} filePath 
 * @param {String} relPath 
 * 
 */
function findExactPath(filePath, relPath) {
    let filePathList = filePath.split('/'),
        relPathList = relPath.split('/'),
        actualPath = '',
        i = 0,
        j = 0;

    while (relPathList[i] === '..') {
        i++;
    }

    for (; j < filePathList.length - 1 - i; j++) {
        actualPath += filePathList[j] + '/';
    }

    if (i === 0) {
        i++;
        if (relPathList[i] === filePathList[i]) i++;
    }

    for (; i < relPathList.length - 1; i++) {
        actualPath += relPathList[i] + '/';
    }

    actualPath += relPathList[relPathList.length - 1];

    return actualPath;
}


/**
 * @function updateFileData - edits the file and writes the 
 *                            new data to the file.
 * 
 * @param {String} filePath 
 * @param {String} newRelPath 
 * @param {String} oldRelPath 
 * @param {String} data 
 * 
 * @returns {Promise}
 * 
 */

function updateFileData(filePath, newRelPath, oldRelPath, data) {
    return new Promise(async(res, rej) => {
        let file = editLinks(data, newRelPath, oldRelPath);
        try {
            await writeFile(filePath, file);
            res();
        } catch (err) {
            rej();
        }
    })
}

function updateImports(currFile, oldPath, newPath) {
    currFile.path = currFile.path.replace(`\\`, `/`);
    return new Promise(async(res, rej) => {
        let file;
        try {
            file = await readFile(currFile.path, 'utf8');
        } catch (err) {
            rej(err);
        }
        if (file) {
            currFile.imports.map(i => {
                i = i.slice(0, i.lastIndexOf('.'));
                let oldRelPath = calcRelPath(oldPath, i),
                    newRelPath = calcRelPath(newPath, i);
                console.log(`For File : ${currFile.path}, updating : ${oldRelPath} -> ${newRelPath}`);
                file = editLinks(file, newRelPath, oldRelPath);
            })
            try {
                await writeFile(currFile.path, file);
                res();
            } catch (err) {
                rej(err);
            }
        }
    });
}

function updateExports(files, currFile, oldPath, newPath) {
    let promiseList = [];
    currFile.exports.map(j => {
        let oldRelPath = calcRelPath(j, oldPath),
            newRelPath = calcRelPath(j, newPath),
            file;
        for (let k of Object.values(files)) {
            if (k.path === j) {
                promiseList.push(new Promise(async(res, rej) => {
                    try {
                        let data = await readFile(files[k.id].path, 'utf8');
                        await updateFileData(files[k.id].path, newRelPath, oldRelPath, data);
                        res();
                    } catch (err) {
                        rej(err);
                    }
                }))
            }
        }
    })
    return Promise.all(promiseList);
}


module.exports = {
    calcRelPath,
    editLinks,
    findExactPath,
    updateExports,
    updateFileData,
    updateImports
}