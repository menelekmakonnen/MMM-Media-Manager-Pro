const fs = require('fs');
const path = require('path');

const targets = [
    path.join(__dirname, 'src/features'),
    path.join(__dirname, 'src/components/Editor'),
    path.join(__dirname, 'src/stores')
];

const replacements = [
    { from: /['"]\.\.\/lib\/time['"]/g, to: '"../utils/editorUtils/time"' },
    { from: /['"]\.\.\/\.\.\/lib\/manifestBridge['"]/g, to: '"../../utils/editorUtils/manifestBridge"' },
    { from: /['"]\.\.\/lib\/random['"]/g, to: '"../utils/editorUtils/random"' },
    { from: /['"]\.\.\/lib\/audioAnalysis['"]/g, to: '"../utils/editorUtils/audioAnalysis"' },
    { from: /['"]\.\.\/\.\.\/lib\/projectController['"]/g, to: '"../../utils/editorUtils/projectController"' },
    { from: /['"]\.\.\/lib\/projectController['"]/g, to: '"../utils/editorUtils/projectController"' },
];

function processDir(dir) {
    if (!fs.existsSync(dir)) return;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const fullPath = path.join(dir, file);
        if (fs.statSync(fullPath).isDirectory()) {
            processDir(fullPath);
        } else if (fullPath.endsWith('.js') || fullPath.endsWith('.jsx')) {
            let content = fs.readFileSync(fullPath, 'utf8');
            let changed = false;
            for (const { from, to } of replacements) {
                if (from.test(content)) {
                    content = content.replace(from, to);
                    changed = true;
                }
            }
            if (changed) {
                console.log('Fixed imports in:', fullPath);
                fs.writeFileSync(fullPath, content, 'utf8');
            }
        }
    }
}

for (const dir of targets) {
    processDir(dir);
}
console.log('Import fix complete!');
