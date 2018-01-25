# organize
A simple solution for reference errors when re-organizing your project structure.

## Installation 
```
npm install organize

```

## Command

```
$ organize

```


# Problem
When Making a project, sometimes the project structure isn't predefined and the project has to be re-structured.
This makes creates the hassle of going manually to every linked file to change the paths in import statements
or resources.

# Solution
## Organize
This Project solves this problem, when you want to restructure your project, just run organize and it'll create a directory tree keeping track of all links between all files, and sets a watcher on the projects root directory.
On any rename or move event of files, it updates the directory tree, and also updates the files import paths and for every file that it imports, it updates the export paths as well, thus keeping the hassle out of your way so that you can focus on making the project.


# Status

- Currently works for js and ts files
- works for html if the paths in src or href are given as './fileName.extension' for same dir file and not as 'fileName.extension'




