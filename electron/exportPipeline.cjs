const fs = require('fs');
const path = require('path');
const { ipcMain, dialog } = require('electron');
const ffmpeg = require('fluent-ffmpeg');
const ffmpegStatic = require('ffmpeg-static');

function setupExportHandlers(mainWindow) {
    // Manifest Handlers
    ipcMain.handle('save-manifest', async (_event, content) => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: 'manifest.json',
            filters: [{ name: 'JSON Manifest', extensions: ['json'] }]
        });
        if (canceled || !filePath) return { success: false };
        try {
            await fs.promises.writeFile(filePath, content, 'utf-8');
            return { success: true, filePath };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    });

    ipcMain.handle('import-manifest', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'JSON Manifest', extensions: ['json'] }]
        });
        if (canceled || filePaths.length === 0) return { canceled: true };
        try {
            const content = await fs.promises.readFile(filePaths[0], 'utf-8');
            return { success: true, content, filePath: filePaths[0] };
        } catch (e) {
            return { success: false, error: String(e) };
        }
    });

    // Export Dialog
    ipcMain.handle('show-export-dialog', async (_event, options) => {
        const { canceled, filePath } = await dialog.showSaveDialog(mainWindow, {
            defaultPath: options?.defaultPath || 'output.mp4',
            filters: options?.filters || [{ name: 'Video File', extensions: ['mp4', 'mov'] }]
        });
        if (canceled || !filePath) return { canceled: true };
        return { canceled: false, filePath };
    });

    // FFmpeg Export Handler
    ipcMain.handle('export-project', async (event, { filePath, clips, settings, isIntermediate }) => {
        return new Promise((resolve, reject) => {
            const binaryPath = ffmpegStatic?.replace('app.asar', 'app.asar.unpacked');
            if (binaryPath) ffmpeg.setFfmpegPath(binaryPath);

            const command = ffmpeg();
            let filterComplex = [];
            let inputCount = 0;

            clips.forEach((clip, index) => {
                command.input(clip.path);
                const fps = settings?.fps || 30;
                const trimStart = clip.trimStartFrame / fps;
                const duration = (clip.trimEndFrame - clip.trimStartFrame) / fps;
                let speed = clip.speed || 1.0;

                const vIn = `${index}:v`;
                const aIn = `${index}:a`;
                const vOut = `v${index}`;
                const aOut = `a${index}`;

                const scaleFilter = `scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,setsar=1`;
                let videoFilters = `trim=start=${trimStart}:duration=${duration},setpts=PTS-STARTPTS,${scaleFilter}`;

                const ptsFilter = `setpts=${(1 / speed).toFixed(4)}*PTS`;
                videoFilters += `,${ptsFilter}`;

                filterComplex.push(`[${vIn}]${videoFilters}[${vOut}]`);
                filterComplex.push(`anullsrc=r=44100:cl=stereo[silence${index}]`);

                let atempoFilter = speed !== 1.0 ? `,atempo=${speed}` : '';
                const volume = (clip.volume !== undefined ? clip.volume : 100) / 100;
                const finalVolume = volume * (!clip.isMuted ? 1 : 0);

                if (clip.type === 'image') {
                    filterComplex.push(`[silence${index}]atrim=start=0:duration=${duration},asetpts=PTS-STARTPTS,volume=${finalVolume}[${aOut}]`);
                } else {
                    filterComplex.push(
                       `[${aIn}]atrim=start=${trimStart}:duration=${duration},asetpts=PTS-STARTPTS${atempoFilter},volume=${finalVolume}[a_orig${index}];` +
                       `[a_orig${index}][silence${index}]amix=inputs=2:duration=first:dropout_transition=0[${aOut}]`
                    );
                }
                inputCount++;
            });

            const vInputs = Array.from({ length: inputCount }, (_, i) => `[v${i}]`).join('');
            const aInputs = Array.from({ length: inputCount }, (_, i) => `[a${i}]`).join('');
            filterComplex.push(`${vInputs}${aInputs}concat=n=${inputCount}:v=1:a=1[outv][outa]`);

            let outputOptions = [
                '-map [outv]', '-map [outa]', '-c:v libx264', '-preset fast', '-crf 23',
                '-c:a aac', '-b:a 128k', '-pix_fmt yuv420p', '-movflags +faststart'
            ];

            if (isIntermediate) {
                outputOptions = [
                    '-map [outv]', '-map [outa]', '-c:v libx264', '-preset ultrafast',
                    '-crf 10', '-c:a aac', '-b:a 320k', '-pix_fmt yuv420p'
                ];
            }

            command.complexFilter(filterComplex).outputOptions(outputOptions)
                .on('start', (cmdLine) => console.log('FFmpeg command:', cmdLine))
                .on('progress', (progress) => {
                    if (progress.percent) event.sender.send('export-progress', Math.round(progress.percent));
                })
                .on('end', () => {
                    event.sender.send('export-progress', 100);
                    resolve({ success: true });
                })
                .on('error', (err, stdout, stderr) => resolve({ success: false, error: err.message, stderr }))
                .save(filePath);
        });
    });

    // AME Handler
    ipcMain.handle('open-in-ame', async (event, filePath) => {
        return new Promise((resolve) => {
            try {
                const cp = require('child_process');
                let amePath = '';
                if (process.platform === 'win32') {
                    const base = 'C:\\Program Files\\Adobe';
                    if (fs.existsSync(base)) {
                        const dirs = fs.readdirSync(base);
                        const ameDirs = dirs.filter(d => d.includes('Adobe Media Encoder')).sort().reverse();
                        if (ameDirs.length > 0) amePath = path.join(base, ameDirs[0], 'Adobe Media Encoder.exe');
                    }
                } else if (process.platform === 'darwin') {
                    cp.exec(`open -a "Adobe Media Encoder" "${filePath}"`);
                    return resolve({ success: true });
                }
                if (amePath && fs.existsSync(amePath)) {
                    cp.spawn(amePath, [filePath], { detached: true, stdio: 'ignore' }).unref();
                    resolve({ success: true });
                } else {
                    resolve({ success: false, error: 'Adobe Media Encoder not found.' });
                }
            } catch (err) {
                resolve({ success: false, error: err.message });
            }
        });
    });
}
module.exports = setupExportHandlers;
