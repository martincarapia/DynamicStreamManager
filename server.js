const http = require('http');
const url = require('url');
const StreamManager = require('./StreamManagerFFMPEG');
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

const streamManager = new StreamManager();

const requestHandler = (req, res) => {
    if (req.method === 'GET') {
        const parsedUrl = url.parse(req.url, true);
        const queryParams = parsedUrl.query;

        const action = queryParams.action;
        const inputs = [];
        for (let i = 0; queryParams[`input${i}`]; i++) {
            inputs.push(queryParams[`input${i}`]);
        }
        const output = queryParams.output;

        if (action) {
            if (action === 'start' && inputs.length > 0 && output) {
                try {
                    streamManager.combineRtmpStreams(inputs, output);
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end("Output stream has started.");
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(`Error starting stream: ${error.message}`);
                }
            } else if (action === 'stop') {
                try {
                    streamManager.stop();
                    res.writeHead(200, { 'Content-Type': 'text/plain' });
                    res.end("Output stream has been stopped.");
                } catch (error) {
                    res.writeHead(500, { 'Content-Type': 'text/plain' });
                    res.end(`Error stopping stream: ${error.message}`);
                }
            } else {
                res.writeHead(400, { 'Content-Type': 'text/plain' });
                res.end("Error: For 'start' action, inputs and output are required.");
            }
        } else {
            res.writeHead(400, { 'Content-Type': 'text/plain' });
            res.end("Error: Action must be either 'start' or 'stop'.");
        }
    } else {
        res.writeHead(405, { 'Content-Type': 'text/plain' });
        res.end("Error: Only GET method is supported.");
    }
};

const server = http.createServer(requestHandler);

const PORT = 8080;
server.listen(PORT, () => {
    console.log(`HTTP Server is running on port ${PORT}`);
    console.log(`RTMP Server is running on port 1935`);
});