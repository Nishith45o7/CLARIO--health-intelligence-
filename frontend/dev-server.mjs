import * as esbuild from 'esbuild';
import http from 'http';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = 3000;

async function start() {
  // Build and watch client code
  const ctx = await esbuild.context({
    entryPoints: [path.join(__dirname, 'src/main.tsx')],
    bundle: true,
    outfile: path.join(__dirname, 'dist/bundle.js'),
    sourcemap: true,
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"development"',
      'import.meta.env.VITE_API_URL': '"http://localhost:8000"'
    },
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css',
      '.svg': 'text'
    }
  });

  await ctx.watch();
  console.log('esbuild watching src/main.tsx...');

  // Simple static HTTP server for SPA
  const server = http.createServer((req, res) => {
    let reqPath = req.url.split('?')[0];
    if (reqPath === '/' || reqPath === '') {
      reqPath = '/index.html';
    }

    let filePath;
    if (reqPath === '/dist/bundle.js' || reqPath === '/dist/bundle.js.map') {
      filePath = path.join(__dirname, reqPath);
    } else if (reqPath === '/dist/bundle.css') {
      filePath = path.join(__dirname, 'dist/bundle.css');
    } else if (fs.existsSync(path.join(__dirname, reqPath))) {
      filePath = path.join(__dirname, reqPath);
    } else {
      filePath = path.join(__dirname, 'index.html');
    }

    if (!fs.existsSync(filePath)) {
      filePath = path.join(__dirname, 'index.html');
    }

    const ext = path.extname(filePath);
    const contentTypes = {
      '.html': 'text/html',
      '.js': 'application/javascript',
      '.css': 'text/css',
      '.json': 'application/json',
      '.svg': 'image/svg+xml',
      '.map': 'application/json'
    };

    const contentType = contentTypes[ext] || 'text/plain';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500);
        res.end('Error loading file');
        return;
      }

      const securityHeaders = {
        'Content-Type': contentType,
        'X-Content-Type-Options': 'nosniff',
        'X-Frame-Options': 'DENY',
        'X-XSS-Protection': '1; mode=block',
        'Referrer-Policy': 'strict-origin-when-cross-origin'
      };

      // If serving index.html, inject bundle scripts
      if (filePath.endsWith('index.html')) {
        let html = data.toString();
        // Replace /src/main.tsx with /dist/bundle.js and add /dist/bundle.css
        html = html.replace(
          '<script type="module" src="/src/main.tsx"></script>',
          '<link rel="stylesheet" href="/dist/bundle.css">\n    <script src="/dist/bundle.js"></script>'
        );
        res.writeHead(200, { ...securityHeaders, 'Content-Type': 'text/html' });
        res.end(html);
        return;
      }

      res.writeHead(200, securityHeaders);
      res.end(data);
    });
  });

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`CLARIO frontend dev server running on http://localhost:${PORT}`);
  });
}

start().catch((err) => {
  console.error('Failed to start dev server:', err);
  process.exit(1);
});
