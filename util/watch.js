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
        console.log(events, files);
        let renameOrMove = false,
            newPath = '';
        for (let i = 0; i < events.length; i++) {
            if (events[i] === 'add') {
                if (events.length > 0) {
                    console.log('file moved or renamed');
                    newPath = files[i];
                    renameOrMove = true;
                } else this.emit('update');
            }
            if (events[i] === 'unlink') {
                if (renameOrMove) await this.updatePath(files[i], newPath);
                this.emit('update');
            }
        }
    }

    updatePath(oldPath, newPath) {
        let promiseList = [];
        oldPath = './' + oldPath;
        for (let i of Object.keys(this.files)) {
            if (this.files[i].path === oldPath) this.files[i].path = newPath;
            if (this.files[i].links.length > 0) {
                this.files[i].links.map(async(j) => {
                    for (let k of Object.values(this.files)) {
                        if (k.path === j) {
                            promiseList.push(new Promise(async(res, rej) => {
                                let links = await findLinks(this.files[k.id].path, this.files[k.id].extension, 'findLinks'),
                                    file;
                                readFile(this.files[k.id].path, 'utf-8')
                                    .then(data => {
                                        file = editLinks(data, links);
                                    }).catch(err => {
                                        console.error(err);
                                        rej();
                                    })
                                writeFile(this.files[k.id].path, file)
                                    .then(() => {
                                        res();
                                    })
                                    .catch(() => {
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


function editLinks(data, links) {
    console.log(data);
}

module.exports = Watcher;