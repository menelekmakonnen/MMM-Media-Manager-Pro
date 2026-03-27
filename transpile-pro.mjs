import fs from 'fs';
import path from 'path';
import { transformSync } from 'esbuild';

const srcBase = 'D:\\ICUNI Group\\ICUNI Labs\\MMMedia Pro\\src';
const destBase = 'D:\\ICUNI Group\\ICUNI Labs\\MMMedia Darkroom\\src';

function ensureDir(dir) {
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function processFile(srcFile, destFile) {
    console.log(`Processing ${srcFile} -> ${destFile}`);
    const code = fs.readFileSync(srcFile, 'utf8');
    
    const ext = path.extname(srcFile);
    if (ext === '.ts' || ext === '.tsx') {
        const outExt = ext === '.tsx' ? '.jsx' : '.js';
        const finalDest = destFile.replace(ext, outExt);
        try {
            const transformed = transformSync(code, {
                loader: ext === '.tsx' ? 'tsx' : 'ts',
                format: 'esm',
                target: 'esnext'
            });
            fs.writeFileSync(finalDest, transformed.code);
        } catch (e) {
            console.error(`Error transforming ${srcFile}:`, e);
        }
    } else {
        fs.copyFileSync(srcFile, destFile);
    }
}

function copyDirIterative(srcDir, destDir) {
    ensureDir(destDir);
    const entries = fs.readdirSync(srcDir, { withFileTypes: true });
    for (const entry of entries) {
        const srcPath = path.join(srcDir, entry.name);
        const destPath = path.join(destDir, entry.name);
        if (entry.isDirectory()) {
            copyDirIterative(srcPath, destPath);
        } else {
            processFile(srcPath, destPath);
        }
    }
}

// 1. Stores
ensureDir(path.join(destBase, 'stores'));
processFile(path.join(srcBase, 'store', 'clipStore.ts'), path.join(destBase, 'stores', 'clipStore.js'));
processFile(path.join(srcBase, 'store', 'assetStore.ts'), path.join(destBase, 'stores', 'assetStore.js'));
processFile(path.join(srcBase, 'store', 'projectStore.ts'), path.join(destBase, 'stores', 'projectStore.js'));
// viewStore is simple but let's copy it as editorViewStore
processFile(path.join(srcBase, 'store', 'viewStore.ts'), path.join(destBase, 'stores', 'editorViewStore.js'));

// 2. Features
copyDirIterative(path.join(srcBase, 'features', 'Timeline'), path.join(destBase, 'features', 'Timeline'));
copyDirIterative(path.join(srcBase, 'features', 'SequenceView'), path.join(destBase, 'features', 'SequenceView'));
copyDirIterative(path.join(srcBase, 'features', 'Settings'), path.join(destBase, 'features', 'Settings'));
copyDirIterative(path.join(srcBase, 'features', 'Export'), path.join(destBase, 'features', 'Export'));

// 3. Components
// We will dump editor-specific components into src/components/Editor
ensureDir(path.join(destBase, 'components', 'Editor'));
['AssetPicker.tsx', 'AudioVisualizer.tsx', 'GridPlayer.tsx', 'SpeedControl.tsx', 'VideoPlayer.tsx'].forEach(file => {
   const srcPath = path.join(srcBase, 'components', file);
   if (fs.existsSync(srcPath)) {
        processFile(srcPath, path.join(destBase, 'components', 'Editor', file));
   }
});

// 4. Utils (lib)
copyDirIterative(path.join(srcBase, 'lib'), path.join(destBase, 'utils', 'editorUtils'));

console.log('Porting complete!');
