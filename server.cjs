// Minimal development server for the browser game (run with `npm start`).
const http = require('http');
const fs = require('fs');
const path = require('path');
const { rootFiles, vendorFiles } = require('./config/runtime-assets.cjs');

const DEFAULT_PORT = 3000;
const DEFAULT_HOST = '0.0.0.0';
const PUBLIC_FILES = new Set([...rootFiles, ...Object.keys(vendorFiles)]);
const CONTENT_TYPES = {
    '.html': 'text/html; charset=utf-8',
    '.js': 'text/javascript; charset=utf-8',
};

function sendText(res, statusCode, message) {
    res.writeHead(statusCode, { 'Content-Type': 'text/plain; charset=utf-8' });
    res.end(message);
}

function createServer() {
    return http.createServer((req, res) => {
        res.setHeader('X-Content-Type-Options', 'nosniff');
        res.setHeader('Referrer-Policy', 'no-referrer');
        res.setHeader('Cache-Control', 'no-cache');

        if (req.method !== 'GET' && req.method !== 'HEAD') {
            res.setHeader('Allow', 'GET, HEAD');
            sendText(res, 405, 'Method not allowed');
            return;
        }

        let decodedPath;
        try {
            const pathOnly = (req.url || '/').split('?')[0];
            decodedPath = decodeURIComponent(pathOnly);
        } catch (error) {
            sendText(res, 400, 'Bad request');
            return;
        }

        const relativePath = decodedPath === '/' ? 'index.html' : decodedPath.replace(/^\/+/, '');
        if (!PUBLIC_FILES.has(relativePath)) {
            sendText(res, 404, 'File not found');
            return;
        }

        const sourcePath = vendorFiles[relativePath] || relativePath;
        const filePath = path.join(__dirname, sourcePath);
        fs.readFile(filePath, (error, data) => {
            if (error) {
                sendText(res, error.code === 'ENOENT' ? 404 : 500, 'Unable to read file');
                return;
            }

            const contentType = CONTENT_TYPES[path.extname(filePath)] || 'application/octet-stream';
            res.writeHead(200, {
                'Content-Type': contentType,
                'Content-Length': data.length,
            });
            res.end(req.method === 'HEAD' ? undefined : data);
        });
    });
}

if (require.main === module) {
    const configuredPort = Number(process.env.PORT);
    const port =
        Number.isInteger(configuredPort) && configuredPort > 0 ? configuredPort : DEFAULT_PORT;
    const host = process.env.HOST || DEFAULT_HOST;
    createServer().listen(port, host, () => {
        console.log(`🚀 Space Chicken game server running at http://${host}:${port}`);
    });
}

module.exports = { createServer, PUBLIC_FILES };
