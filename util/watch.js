const fs = require('fs'),
    util = require('util'),
    { EventEmitter } = require('events'),
    findLinks = require('./findLinks'),
    readFile = util.promisify(fs.readFile),
    writeFile = util.promisify(fs.writeFile),
    chokidar = require('chokidar');


/**
 * 
 * @class Watcher - The Event Handler for file changes,
 *                  Looks for global file changes and updates the 
 *                  dirTree only for linked files.
 * 
 */

class Watcher extends EventEmitter {
    /**
     * 
     * Set up a single global watcher for getting all the move events and set
     * individual fs watchers on files for rename events, then on any update,
     * rebuild or update the dirTree and change the imports in the linked files
     * 
     * @constructor - creates a globalWatcher (instance of chokidar watcher)
     *                and looks for file changes over the whole project dir.
     * 
     * @param {Object} files - The AllFiles Object created by the @makeDirTree
     * 
     */
    constructor(files) {
        super();
        this.files = files;
        this.globalWatcher = chokidar.watch('.', { ignored: [/node_modules/, /tree.json/], ignoreInitial: true });
        this.watch();
    }

    /**
     * 
     * @method watch - watches for updates of files that are linked, 
     *                 and emits @event update for recreating the dirTree
     * 
     */

    watch() {
        let eventList = [],
            filesList = [];
        this.globalWatcher.on('all', (e, f) => {
            if (eventList.length === 0) {
                setTimeout(() => {
                    this.updateFiles(eventList, filesList);
                    eventList = [];
                    filesList = [];
                    clearTimeout();
                }, 1000);
            }
            eventList.push(e);
            filesList.push(f);
        })
    }

    /**
     * @method update
     * 
     * @param {Object} newFiles - The Updated AllFiles 
     * 
     */
    update(newFiles) {
        this.files = newFiles;
    }

    /**
     * @method updateFiles
     * 
     * @param {Array} events - The Array of All Events 
     * @param {Array} files - The Array of All Paths 
     * 
     */
    async updateFiles(events, files) {
        let renameOrMove = false,
            newPath = '';
        for (let i = 0; i < events.length; i++) {
            if (events[i] === 'add') {
                if (events.length > 1) {
                    newPath = files[i];
                    renameOrMove = true;
                } else this.emit('update');
            }
            if (events[i] === 'unlink') {
                if (renameOrMove) {
                    await this.updatePath(files[i], newPath);
                    this.emit('update');
                }
            }
        }
    }

    /**
     * @method updatePath - Updates the paths of the reference links in the file
     * 
     * @param {String} oldPath - The Old Path of the file
     * @param {String} newPath - The New Path of the file
     * 
     * @returns {Array}
     *  
     */
    updatePath(oldPath, newPath) {
        let promiseList = [];
        oldPath = './' + oldPath;
        newPath = './' + newPath;
        for (let i of Object.keys(this.files)) {
            if (this.files[i].path === oldPath) {
                this.files[i].path = newPath;
                this.files[i].name = newPath.slice(newPath.lastIndexOf('/') + 1);
                if (this.files[i].extension.match(/js|ts/)) {
                    oldPath = oldPath.slice(0, oldPath.lastIndexOf('.'));
                    newPath = newPath.slice(0, newPath.lastIndexOf('.'));
                }
                if (this.files[i].exports.length > 0) {
                    this.files[i].exports.map(async(j) => {
                        for (let k of Object.values(this.files)) {
                            if (k.path === j) {
                                let oldRelPath = calcRelPath(j, oldPath),
                                    newRelPath = calcRelPath(j, newPath),
                                    file;
                                promiseList.push(new Promise(async(res, rej) => {
                                    try {
                                        let data = await (readFile(this.files[k.id].path, 'utf8'));
                                        await updateFileData(this.files[k.id].path, newRelPath, oldRelPath, data);
                                        res();
                                    } catch (err) {
                                        rej(err);
                                    }
                                }))
                            }
                        }
                    })
                }
            }
        }
        return Promise.all(promiseList);
    }
}

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
    console.log(oldPath, newPath);
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

module.exports = Watcher;