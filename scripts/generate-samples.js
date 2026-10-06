import { mkdir, writeFile } from 'node:fs/promises';
import { makePdf } from '../test/fixtures.js';
await mkdir('public/samples', { recursive: true });
for (const [name, opts] of Object.entries({ clean: {}, untagged: { tagged: false }, 'wrong-title': { title: 'Flood Risk Report 2025' } })) {
  await writeFile(`public/samples/${name}.pdf`, await makePdf(opts));
}
