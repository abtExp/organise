const { updateImports, updateExports } = require('./util'),
    findLinks = require('./findLinks'), { EventEmitter } = require('events'),
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
                setTimeout(async() => {
                    await this.updateFiles(eventList, filesList);
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
            if (events[i].match('add')) {
                if (events.length > 1) {
                    newPath = files[i];
                    renameOrMove = true;
                } else this.emit('update');
            }
            if (events[i].match('unlink')) {
                if (renameOrMove) {
                    await this.updatePath(files[i], newPath);
                }
                this.emit('update');
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
    async updatePath(oldPath, newPath) {
        let promiseList = [];
        oldPath = './' + oldPath;
        newPath = './' + newPath;
        for (let i of Object.keys(this.files)) {
            if (this.files[i].path === oldPath) {
                this.files[i].path = newPath;
                this.files[i].name = newPath.slice(newPath.lastIndexOf('/') + 1);
                oldPath = oldPath.slice(0, oldPath.lastIndexOf('.'));
                newPath = newPath.slice(0, newPath.lastIndexOf('.'));
                if (this.files[i].imports.length > 0) {
                    await updateImports(this.files[i], oldPath, newPath);
                }
                if (this.files[i].exports.length > 0) {
                    await updateExports(this.files, this.files[i], oldPath, newPath);
                }
            }
        }
    }


}

module.exports = Watcher;