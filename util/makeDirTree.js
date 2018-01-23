const fs = require('fs'),
    path = require('path'),
    util = require('util'),
    readdir = util.promisify(fs.readdir);

/**
 * NOTE TO SELF : 
 * 
 * Currently The root directory of the script is being used to read the dirTree 
 * when releasing use the project's root directory and delete this note.
 * 
 * 
 */
const rootPath = './testFiles';

let AllFiles = {},
    idx = 0,
    id = 0;


/**
 * @function makeDirTree - creates the dirTree by reading the paths.
 * 
 * @returns {object} dirTree
 * 
 */


async function makeDirTree() {
    console.log('Creating Directory Tree ...');
    let dirTree = {},
        dirs = [],
        dir = rootPath,
        relative = '';
    AllFiles = {};
    idx = 0;
    id = 0;

    dirs.push({ name: 'root', type: 'dir', path: `${dir}`, files: {} });
    dirTree['root'] = { name: 'root', type: 'dir', path: `${dir}`, files: {} };
    return new Promise(async(res, rej) => {
        console.log('Reading files ...');
        while (dirs.length > 0) {
            let activeDir = dirs.shift();
            let files = await walkTree(activeDir.path);
            if (files.length > 0) {
                for (const i of files) {
                    let name = i.type === 'dir' ? i.name : idx++;
                    if (i.type === 'dir' && !i.path.match(/node_modules|.git|bower/)) {
                        dirs.push(i);
                    }
                    activeDir.files[name] = i;
                }
            }
            dirTree[activeDir.name] = activeDir;
        }
        dirTree = dirTree.root;
        res([dirTree, AllFiles]);
    })
}

/**
 * @function walkTree - returns a sub tree for a directory
 * 
 * @param {string} dirPath - path of the directory
 * 
 * @returns {object}
 * 
 */

function walkTree(dirPath) {
    let filesindir = [];
    return new Promise((res, rej) => {
        if (dirPath.match(/node_modules|.git|bower|LICENCE/)) {
            rej([]);
        }
        const relative = `${dirPath}/`;
        readdir(relative)
            .then(files => {
                files.map(async(i) => {
                    let file;
                    if (fs.statSync(path.join(relative, i)).isDirectory()) {
                        file = {
                            name: i,
                            type: 'dir',
                            path: `${relative}${i}`,
                            files: {}
                        }
                    } else {
                        file = {
                            id: id,
                            name: i,
                            type: 'file',
                            path: `${relative}${i}`,
                            imports: [],
                            exports: []
                        }
                        AllFiles[id++] = file;
                    }
                    filesindir.push(file);
                })
                res(filesindir);
            })
            .catch(err => {
                console.error(err);
                rej([]);
            })
    })
}


function updateDirTree(file) {
    /**
     * Update a specific part of dirTree instead
     * of fully recreating the dirTree.
     * 
     * useful for updating by updateImports and
     * updateExports 
     * 
     */

}



module.exports = makeDirTree;