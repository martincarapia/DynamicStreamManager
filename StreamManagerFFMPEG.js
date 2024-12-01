const { spawn, execSync } = require('child_process');

class StreamManager {
    constructor() {
        this.ffmpegProcess = null;
    }

    validateStream(url) {
        try {
            console.log(`Validating stream URL: ${url}`);
            /// This here is breaking the code. Take a look at fluent-ffmpeg package to see if it can be used to validate the stream
            execSync(`ffprobe -v error -show_streams ${url}`);
            console.log(`Stream URL is valid: ${url}`);
            return true;
        } catch (error) {
            console.error(`Invalid stream URL: ${url}`);
            console.error(error.message);
            return false;
        }
    }

    combineRtmpStreams(inputUrls, outputUrl) {
        if (inputUrls.length === 0) {
            console.error('No input URLs provided');
            return;
        }

        this.stop(); // Stop any existing ffmpeg process

        // Validate input streams
        const validInputUrls = inputUrls.filter(url => this.validateStream(url));

        if (validInputUrls.length === 0) {
            console.error('No valid input URLs provided');
            return;
        }

        // Construct the ffmpeg command
        let ffmpegCommand = ['ffmpeg'];

        // Add input streams
        validInputUrls.forEach(url => {
            ffmpegCommand.push('-i', url);
        });

        // Add fps option
        ffmpegCommand.push('-r', '60');

        if (validInputUrls.length === 1) {
            // Additional logic for single input stream
        }

        // Continue building the ffmpeg command...
        console.log(`FFmpeg command: ${ffmpegCommand.join(' ')}`);
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