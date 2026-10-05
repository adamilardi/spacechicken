const fs = require('node:fs/promises');
const path = require('node:path');
const { rootFiles, vendorFiles } = require('../config/runtime-assets.cjs');

const projectRoot = path.resolve(__dirname, '..');
const outputDirectory = path.join(projectRoot, 'dist');
const headers = `/*
  X-Content-Type-Options: nosniff
  X-Frame-Options: DENY
  Referrer-Policy: strict-origin-when-cross-origin
  Permissions-Policy: camera=(), microphone=(), geolocation=()
  Content-Security-Policy: default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https:; object-src 'none'; base-uri 'none'; frame-ancestors 'none'

/index.html
  Cache-Control: public, max-age=0, must-revalidate

/vendor/*
  Cache-Control: public, max-age=31536000, immutable
`;

async function buildStaticSite() {
    await fs.rm(outputDirectory, { recursive: true, force: true });
    await fs.mkdir(path.join(outputDirectory, 'vendor'), { recursive: true });

    await Promise.all(
        rootFiles.map(async (file) => {
            const destination = path.join(outputDirectory, file);
            await fs.mkdir(path.dirname(destination), { recursive: true });
            await fs.copyFile(path.join(projectRoot, file), destination);
        })
    );
    await Promise.all(
        Object.entries(vendorFiles).map(([destination, source]) =>
            fs.copyFile(path.join(projectRoot, source), path.join(outputDirectory, destination))
        )
    );
    await fs.writeFile(path.join(outputDirectory, '_headers'), headers, 'utf8');

    return { outputDirectory, runtimeFiles: [...rootFiles] };
}

if (require.main === module) {
    buildStaticSite()
        .then(({ outputDirectory: builtDirectory }) => {
            console.log(
                `Built Cloudflare Pages assets in ${path.relative(projectRoot, builtDirectory)}`
            );
        })
        .catch((error) => {
            console.error('Cloudflare build failed:', error);
            process.exitCode = 1;
        });
}

module.exports = { buildStaticSite, outputDirectory, runtimeFiles: rootFiles };
