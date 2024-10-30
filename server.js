const http = require('http');
const url = require('url');
const { spawn } = require('child_process');
const NodeMediaServer = require('node-media-server');

// RTMP server configuration
const config = {
    rtmp: {
        port: 1935,
        chunk_size: 60000,
        gop_cache: true,
        ping: 30,
        ping_timeout: 60
    },
    http: {
        port: 8000,
        allow_origin: '*'
    }
};

const nms = new NodeMediaServer(config);
nms.run();

const requestHandler = (req, res) => {
    if (req.method === 'GET') {
        const parsedUrl = url.parse(req.url, true);
        const queryParams = parsedUrl.query;

        const scriptPath = queryParams.script_path;
        const action = queryParams.action;
        const inputs = [];
        for (let i = 0; queryParams[`input${i}`]; i++) {
            inputs.push(queryParams[`input${i}`]);
        }
        const output = queryParams.output;

        if (scriptPath && action) {
            let args = [];
            if (action === 'start' && inputs.length > 0 && output) {
                args = [scriptPath, action, '--inputs', ...inputs, '--output', output];
            } else if (action === 'stop') {
                args = [scriptPath, action];
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end("Error: For 'start' action, inputs and output are required.");
                return;
            }

            const pythonProcess = spawn('python3', args);
            let outputData = '';
            let errorData = '';

            pythonProcess.stdout.on('data', (data) => {
                outputData += data.toString();
            });

            pythonProcess.stderr.on('data', (data) => {
                errorData += data.toString();
            });

            pythonProcess.on('close', (code) => {
                if (code === 0) {
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end(outputData);
                } else {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(errorData);
                }
            });
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end("Error: script_path and action are required.");
        }
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end("Method not allowed");
    }
};

const server = http.createServer(requestHandler);

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
    console.log(`RTMP Server is running on port 1935`);
});