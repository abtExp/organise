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
    }

    async updateFiles(events, files) {
        let renameOrMove = false,
            newPath = '';
        for (let i = 0; i < events.length; i++) {
            if (events[i] === 'add') {
                if (events.length > 0) {
                    newPath = files[i];
                    renameOrMove = true;
                }
            }
            if (events[i] === 'unlink') {
                if (renameOrMove) await this.updatePath(files[i], newPath);
            }
        }
        this.emit('update');
    }

    updatePath(oldPath, newPath) {
        let promiseList = [];
        oldPath = './' + oldPath;
        newPath = './' + newPath;
        for (let i of Object.keys(this.files)) {
            if (this.files[i].path === oldPath) this.files[i].path = newPath;
            if (this.files[i].links.length > 0) {
                this.files[i].links.map(async(j) => {
                    let oldRelPath = calcRelPath(j, oldPath),
                        newRelPath = calcRelPath(j, newPath);
                    for (let k of Object.values(this.files)) {
                        if (k.path === j) {
                            promiseList.push(new Promise(async(res, rej) => {
                                let file;
                                readFile(this.files[k.id].path, 'utf-8')
                                    .then(data => {
                                        file = editLinks(data, newRelPath, oldRelPath);
                                        writeFile(this.files[k.id].path, file)
                                            .then(() => {
                                                res('Updated Reference links.');
                                            })
                                            .catch(() => {
                                                rej();
                                            })
                                    }).catch(err => {
                                        console.error(err);
                                        rej();
                                    })
                            }))
                        }
                    }
                })
            }
        }
        return Promise.all(promiseList);
    }
}


function editLinks(data, newPath, oldPath) {
    console.log('editing links...');
    console.log(data, newPath, oldPath);
    let newData = data;
    newData.replace(oldPath, newPath);
    return newData;
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

module.exports = Watcher;