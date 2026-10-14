import * as esbuild from 'esbuild';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function buildProduction() {
  const distDir = path.join(__dirname, 'dist');
  if (!fs.existsSync(distDir)) {
    fs.mkdirSync(distDir, { recursive: true });
  }

  console.log('Building CLARIO production bundle...');
  await esbuild.build({
    entryPoints: [path.join(__dirname, 'src/main.tsx')],
    bundle: true,
    outfile: path.join(distDir, 'bundle.js'),
    minify: true,
    sourcemap: true,
    jsx: 'automatic',
    define: {
      'process.env.NODE_ENV': '"production"',
      'import.meta.env.VITE_API_URL': '""'
    },
    loader: {
      '.tsx': 'tsx',
      '.ts': 'ts',
      '.css': 'css',
      '.svg': 'text'
    }
  });

  // Prepare production index.html
  const indexHtmlPath = path.join(__dirname, 'index.html');
  let html = fs.readFileSync(indexHtmlPath, 'utf8');
  html = html.replace(
    '<script type="module" src="/src/main.tsx"></script>',
    '<link rel="stylesheet" href="./bundle.css">\n    <script src="./bundle.js"></script>'
  );
  fs.writeFileSync(path.join(distDir, 'index.html'), html);

  console.log('Production build completed successfully in dist/');
}

buildProduction().catch((err) => {
  console.error('Production build failed:', err);
  process.exit(1);
});
