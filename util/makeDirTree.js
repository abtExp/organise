const fs = require('fs'),
    path = require('path'),
    util = require('util'),
    readdir = util.promisify(fs.readdir);

/**
 * NOTE TO SELF : 
 * 
 * Currently The root directory of the script is being used to read the dirTree 
 * when releasing use the projects root directory and delete this note.
 * 
 * 
 */
const root = '.';

let AllFiles = {},
    idx = 0,
    id = 0;


/**
 * @function makeDirTree - creates the dirTree by reading the paths.
 * 
 * @param {string} dir - The name of the current directory to be searched
 *                       for files and inner directories to create the dirTree
 * 
 * @param {string} relative - The relative path to the dir from root
 * 
 * @returns {object} dirTree
 * 
 */


async function makeDirTree() {
    console.log('Creating Directory Tree ...');
    let dirTree = {},
        dirs = [],
        dir = root,
        relative = '';
    dirs.push({ name: 'root', type: 'dir', path: '.', files: {} });
    dirTree['root'] = { name: 'root', type: 'dir', path: '.', files: {} };
    return new Promise(async(res, rej) => {
        console.log('Reading files ...');
        while (dirs.length > 0) {
            let activeDir = dirs.shift();
            console.log(`Reading ${activeDir.path}`);
            let files = await walkTree(activeDir.path);
            if (files.length > 0) {
                for (const i of files) {
                    let name = i.type === 'dir' ? i.name : idx++;
                    if (i.type === 'dir' && !i.path.match(/node_modules/)) {
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
 * @param {string} dir - name of the directory
 * 
 * @param {string} relative - the relative path of the directory
 * 
 * @returns {object}
 * 
 */

function walkTree(dirPath) {
    let filesindir = [];
    return new Promise((res, rej) => {
        if (dirPath.match(/node_modules/)) {
            rej([]);
        }
        const relative = `${dirPath}/`;
        console.log(`Reading files from ${dirPath}`);
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
                            links: []
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


module.exports = makeDirTree;