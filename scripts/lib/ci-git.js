const { execFileSync } = require('node:child_process');
const path = require('node:path');

const ROOT = path.resolve(__dirname, '../..');

function parseBaseHeadArgs(argv) {
    const args = argv.slice(2);
    let base = 'origin/main';
    let head = 'HEAD';
    for (let i = 0; i < args.length; i += 1) {
        if (args[i] === '--base' && args[i + 1]) {
            base = args[++i];
        } else if (args[i] === '--head' && args[i + 1]) {
            head = args[++i];
        }
    }
    return { base, head };
}

function git(args) {
    return execFileSync('git', args, { cwd: ROOT, encoding: 'utf8' }).trim();
}

function normalizePaths(output) {
    return output
        .split('\n')
        .map((line) => line.replace(/\\/g, '/'))
        .filter(Boolean);
}

function listChangedFiles(base, head) {
    try {
        return normalizePaths(git(['diff', '--name-only', `${base}...${head}`]));
    } catch {
        return normalizePaths(git(['diff', '--name-only', 'HEAD~1..HEAD']));
    }
}

function readFileAtRef(ref, relativePath) {
    try {
        return git(['show', `${ref}:${relativePath.replace(/\\/g, '/')}`]);
    } catch {
        return null;
    }
}

function compareLex(a, b) {
    return String(a).localeCompare(String(b));
}

module.exports = {
    ROOT,
    parseBaseHeadArgs,
    listChangedFiles,
    readFileAtRef,
    compareLex,
};
