// Simple HTTP server to serve the game with ES6 modules
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 3000;
const HOST = 'localhost';

const server = http.createServer((req, res) => {
    const rawUrl = typeof req.url === 'string' ? req.url : '/';
    const pathOnly = rawUrl.split('?')[0];
    let decodedPath;
    try {
        decodedPath = decodeURIComponent(pathOnly);
    } catch (err) {
        res.writeHead(400);
        res.end('Bad request');
        return;
    }
    const requestPath = decodedPath === '/' ? '/index.html' : decodedPath;
    const filePath = path.resolve(__dirname, `.${requestPath}`);
    const relativePath = path.relative(__dirname, filePath);

    // Security: don't allow access outside the current directory
    if (relativePath.startsWith('..') || path.isAbsolute(relativePath)) {
        res.writeHead(403);
        res.end('Access forbidden');
        return;
    }

    // Check if file exists
    fs.access(filePath, fs.constants.F_OK, (err) => {
        if (err) {
            res.writeHead(404);
            res.end('File not found');
            return;
        }

        // Determine content type
        let contentType = 'text/plain';
        const ext = path.extname(filePath);

        switch (ext) {
            case '.html': contentType = 'text/html'; break;
            case '.css': contentType = 'text/css'; break;
            case '.js': contentType = 'application/javascript'; break;
            case '.json': contentType = 'application/json'; break;
            default: contentType = 'text/plain';
        }

        // Set CORS headers for ES6 modules
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Read and serve file
        fs.readFile(filePath, (err, data) => {
            if (err) {
                res.writeHead(500);
                res.end('Server error');
                return;
            }

            res.writeHead(200, { 'Content-Type': contentType });
            res.end(data);
        });
    });
});

server.listen(PORT, HOST, () => {
    console.log(`🚀 Space Chicken game server running at http://${HOST}:${PORT}`);
    console.log(`🎮 Open your browser and navigate to http://${HOST}:${PORT}`);
});
