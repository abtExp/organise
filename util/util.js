const fs = require('fs'),
    util = require('util'),
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
    console.log('oldPath : ', oldPath);
    console.log('newPath : ', newPath);
    let newData = data;
    console.log(newData);
    newData = newData.split(oldPath).join(newPath);
    console.log(newData);
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
    let RelPath = '',
        PathList = linkPath.split('/'),
        filePathList = filePath.split('/');
    if (filePathList.length > PathList.length) {
        let idx = 0;
        for (let i = 0; i < filePathList.length - 1; i++) {
            if (PathList[i] !== undefined && PathList[i] !== filePathList[i]) {
                idx = i;
                break;
            }
        }
        for (let i = 0; i < (filePathList.length - 1 - idx); i++) {
            RelPath += '../';
        }

        for (let i = idx; i < PathList.length - 1; i++) {
            RelPath += PathList[i] + '/';
        }
        RelPath += PathList[PathList.length - 1];
    } else {
        for (let i = 0; i < PathList.length; i++) {
            if (filePathList[i] !== undefined && filePathList[i] !== PathList[i]) {
                idx = i;
                break;
            }
        }
        RelPath += './';
        for (let i = idx; i < PathList.length - 1; i++) {
            RelPath += PathList[i] + '/';
        }
        RelPath += PathList[PathList.length - 1];
    }

    return RelPath;
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
    console.log('Updating import links...');
    return new Promise(async(res, rej) => {
        let file = await readFile(currFile.path, 'utf8');
        currFile.imports.map(async(i) => {
            let oldRelPath = calcRelPath(oldPath, i),
                newRelPath = calcRelPath(newPath, i);
            oldRelPath = oldRelPath.slice(0, oldRelPath.lastIndexOf('.'));
            newRelPath = newRelPath.slice(0, newRelPath.lastIndexOf('.'));
            file = editLinks(file, newRelPath, oldRelPath);
        })
        try {
            await writeFile(currFile.path, file);
            res();
        } catch (err) {
            rej(err);
        }
    });
}

function updateExports(files, currFile, oldPath, newPath) {
    console.log('Updating export links...');
    let promiseList = [];
    currFile.exports.map(async(j) => {
        let oldRelPath = calcRelPath(j, oldPath),
            newRelPath = calcRelPath(j, newPath),
            file;
        oldRelPath = oldRelPath.slice(0, oldRelPath.lastIndexOf('.'));
        newRelPath = newRelPath.slice(0, newRelPath.lastIndexOf('.'));
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
    editLinks,
    calcRelPath,
    updateFileData,
    updateImports,
    updateExports
}