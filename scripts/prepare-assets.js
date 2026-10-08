import { cp, mkdir, readFile, writeFile } from 'node:fs/promises';
for (const folder of ['standard_fonts', 'cmaps', 'wasm']) {
  await mkdir(`public/pdfjs/${folder}`, { recursive: true });
  await cp(`node_modules/pdfjs-dist/${folder}`, `public/pdfjs/${folder}`, { recursive: true });
}
await mkdir('public/licenses', { recursive: true });
for (const [pkg, file] of [['pdfjs-dist', 'LICENSE'], ['pdf-lib', 'LICENSE.md'],
  ['@huggingface/transformers', 'LICENSE'], ['@xmldom/xmldom', 'LICENSE']]) {
  await cp(`node_modules/${pkg}/${file}`, `public/licenses/${pkg.replaceAll('/', '-')}.txt`);
}
// This ONNX npm distribution omits its license file; preserve the upstream one.
await cp('third-party/onnxruntime-LICENSE.txt', 'public/licenses/onnxruntime-web.txt');
await cp('THIRD-PARTY-NOTICES.md', 'public/licenses/REFERENCES.md');
await cp('LICENSE', 'public/licenses/pdf-signal-check-LICENSE.txt');
await cp('NOTICE', 'public/licenses/pdf-signal-check-NOTICE.txt');

// Fontkit omits a standalone license file. Preserve its declared MIT README and
// the actual bundled legal comment blocks without inventing copyright dates.
await cp('node_modules/@pdf-lib/fontkit/README.md', 'public/licenses/fontkit-README.txt');
const fontkitSource = await readFile('node_modules/@pdf-lib/fontkit/dist/fontkit.es.js', 'utf8');
const legalComments = (fontkitSource.match(/\/\*[\s\S]*?\*\/|(?:\/\/[^\n]*\n)+/g) || [])
  .filter(comment => /copyright|permission is hereby|licensed under|license, version/i.test(comment));
await writeFile('public/licenses/fontkit-bundled-NOTICES.txt', [...new Set(legalComments)].join('\n\n'));
