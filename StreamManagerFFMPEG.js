const { spawn } = require('child_process');

class StreamManager {
    constructor() {
        this.ffmpegProcess = null;
    }

    combineRtmpStreams(inputUrls, outputUrl) {
        if (inputUrls.length === 0) {
            console.error('No input URLs provided');
            return;
        }

        this.stop(); // Stop any existing ffmpeg process

        // Construct the ffmpeg command
        let ffmpegCommand = ['ffmpeg'];

        // Add input streams
        inputUrls.forEach(url => {
            ffmpegCommand.push('-i', url);
        });

        // Add fps option
        ffmpegCommand.push('-r', '60');

        if (inputUrls.length === 1) {
            // If there is only one input stream, directly map it to the output
            ffmpegCommand.push('-c', 'copy', '-f', 'flv', outputUrl);
        } else {
            // Determine the grid size (e.g., 2x2, 3x3)
            const numInputs = inputUrls.length;
            const gridSize = Math.ceil(Math.sqrt(numInputs));
            
            // Construct the filter_complex part
            let filterComplex = [];
            for (let i = 0; i < numInputs; i++) {
                filterComplex.push(`[${i}:v]scale=iw/${gridSize}:ih/${gridSize}[v${i}];`);
            }

            // Stack the videos horizontally and vertically
            for (let row = 0; row < gridSize; row++) {
                let rowInputs = '';
                for (let col = 0; col < gridSize; col++) {
                    if (row * gridSize + col < numInputs) {
                        rowInputs += `[v${row * gridSize + col}]`;
                    }
                }
                if (rowInputs) {
                    filterComplex.push(`${rowInputs}hstack=inputs=${Math.min(gridSize, numInputs - row * gridSize)}[row${row}];`);
                }
            }

            // Combine all rows vertically
            let rowInputs = '';
            for (let row = 0; row < gridSize; row++) {
                if (filterComplex.join('').includes(`[row${row}]`)) {
                    rowInputs += `[row${row}]`;
                }
            }
            if (rowInputs && rowInputs.split('[').length - 1 > 1) {
                filterComplex.push(`${rowInputs}vstack=inputs=${rowInputs.split('[').length - 1}[outv]`);
            } else {
                filterComplex.push(`${rowInputs}copy[outv]`);
            }

            // Add filter_complex to the command
            ffmpegCommand.push('-filter_complex', filterComplex.join(' '), '-map', '[outv]', '-pix_fmt', 'yuv420p', '-f', 'flv', outputUrl);
        }

        // Spawn the ffmpeg process
        this.ffmpegProcess = spawn(ffmpegCommand.shift(), ffmpegCommand);

        this.ffmpegProcess.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        this.ffmpegProcess.stderr.on('data', (data) => {
            console.error(`stderr: ${data}`);
        });

        this.ffmpegProcess.on('error', (err) => {
            console.error(`Failed to start ffmpeg process: ${err.message}`);
        });

        this.ffmpegProcess.on('close', (code) => {
            console.log(`ffmpeg process exited with code ${code}`);
            this.ffmpegProcess = null;
        });
    }

    stop() {
        if (this.ffmpegProcess) {
            console.log('Stopping existing ffmpeg process');
            this.ffmpegProcess.kill('SIGINT');
            this.ffmpegProcess = null;
        }
    }
}

module.exports = StreamManager;