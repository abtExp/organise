#!/usr/bin/env node

const markRefLinks = require('./util/markRefLinks'),
    makeDirTree = require('./util/makeDirTree'),
    Watcher = require('./util/watch'),
    util = require('util'),
    path = require('path'),
    fs = require('fs'),
    readFile = util.promisify(fs.readFile),
    writeFile = util.promisify(fs.writeFile);


console.log('Organizing...');

/**
 * @function keepOrganized
 * 
 * Initializes the dirTree,
 * Marks all the reference links,
 * and sets a watcher on every file
 * and also handles updates for any changes.
 * 
 */


function init() {
    try {
        keepOrganized().then((AllFiles) => {
            console.log('Marked Reference Links');
            console.log('Created Directory Tree');
            console.log('Setting up watchers...');
            let watcher = new Watcher(AllFiles);
            console.log('Watching for file changes...');
            watcher.on('update', () => {
                console.log('Updating dirTree...')
                keepOrganized().then((AllFiles) => {
                    console.log('Updated dirTree.');
                    watcher.update(AllFiles);
                })
            })
        })
    } catch (err) {
        console.error(err);
    }
}

async function keepOrganized() {
    let [dirTree, AllFiles] = await makeDirTree();
    await markRefLinks(AllFiles);
    await writeFile('tree.json', JSON.stringify(dirTree, null, 4));
    return AllFiles;
}


init();