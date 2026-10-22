import { describe, it, expect } from 'vitest';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { digest, fingerprint, sameFingerprint, localDirectory } from '../scripts/real-ai-pilot/local.mjs';
describe('local pilot safeguards', () => {
  it('rejects artifacts outside the ignored corpus', async () => {
    await expect(localDirectory('scripts')).rejects.toThrow('ignored dev-corpus');
  });
  it('detects changed blind labels, reports and original PDF bytes', async () => {
    const directory = await mkdtemp(join(tmpdir(), 'pdf-pilot-seal-'));
    try {
      const sourcePath = join(directory, 'source.pdf'), reportPath = join(directory, 'report.json');
      await writeFile(sourcePath, 'fixed source bytes'); await writeFile(reportPath, '{}');
      const files = { 'protocol.json': '{}', 'inventory.json': JSON.stringify([{ id: 'source', sourcePath, reportPath, sha256: digest('fixed source bytes') }]), 'cases-labelled.json': '[{"expected":"support"}]', 'photos-labelled.json': '[]' };
      for (const [name, bytes] of Object.entries(files)) await writeFile(join(directory, name), bytes);
      const before = await fingerprint(directory);
      expect(sameFingerprint(before, await fingerprint(directory))).toBe(true);
      await writeFile(join(directory, 'cases-labelled.json'), '[{"expected":"mismatch"}]');
      expect(sameFingerprint(before, await fingerprint(directory))).toBe(false);
      await writeFile(join(directory, 'cases-labelled.json'), files['cases-labelled.json']);
      await writeFile(reportPath, '{"changed":true}');
      expect(sameFingerprint(before, await fingerprint(directory))).toBe(false);
      await writeFile(sourcePath, 'replacement bytes');
      await expect(fingerprint(directory)).rejects.toThrow('source PDF changed');
    } finally { await rm(directory, { recursive: true, force: true }); }
  });
});
