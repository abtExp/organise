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

    update(newFiles) {
        this.files = newFiles;
        console.log('Updated this.files >>>');
    }

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
                    console.log('Emiting Update event >>>');
                    // this.emit('update');
                }
            }
        }
    }

    updatePath(oldPath, newPath) {
        let promiseList = [];
        oldPath = './' + oldPath;
        newPath = './' + newPath;
        for (let i of Object.keys(this.files)) {
            if (this.files[i].path === oldPath) {
                console.log('Found file ??>>>');
                this.files[i].path = newPath;
                this.files[i].name = newPath.slice(newPath.lastIndexOf('/') + 1);
                if (this.files[i].links.length > 0) {
                    this.files[i].links.map(async(j) => {
                        for (let k of Object.values(this.files)) {
                            if (k.path === j) {
                                let oldRelPath = calcRelPath(j, oldPath),
                                    newRelPath = calcRelPath(j, newPath),
                                    file;
                                console.log("UPDATING THE INNER LINKS OF THE FILE>>>>>>");
                                promiseList.push(new Promise(async(res, rej) => {
                                    try {
                                        let data = await (readFile(this.files[k.id].path, 'utf8'));
                                        await updateFileData(this.files[k.id].path, newRelPath, oldRelPath, data);
                                        console.log('Updated the file ^^^^^');
                                        res();
                                    } catch (err) {
                                        rej(err);
                                    } finally {
                                        console.log('Dealt with the file');
                                    }
                                }))
                            }
                        }
                    })
                }
            }
            return Promise.all(promiseList);
        }
    }
}


function editLinks(data, newPath, oldPath) {
    // data is formatted differently then expected,
    // thus indexOf oldPath in data = -1;
}

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

function updateFileData(filePath, newRelPath, oldRelPath, data) {
    return new Promise(async(res, rej) => {
        let file = editLinks(data, newRelPath, oldRelPath);
        try {
            await writeFile(filePath, file);
            console.log('Wrote The New Links@@@@00');
            res();
        } catch (err) {
            rej();
        }
    })
}

module.exports = Watcher;