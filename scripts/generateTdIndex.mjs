import { promises as fs } from 'node:fs';
import path from 'node:path';

const root = path.resolve(process.cwd());
const publicDir = path.join(root, 'public');
const tdDir = path.join(publicDir, 'td');
const outputFile = path.join(tdDir, 'index.json');

function mapYear(dirName) {
  const lower = dirName.toLowerCase();
  if (lower.includes('year3') || lower.includes('3')) return '3eme';
  if (lower.includes('year4') || lower.includes('4')) return '4eme';
  if (lower.includes('year5') || lower.includes('5')) return '5eme';
  return '';
}

function getExt(fileName) {
  const idx = fileName.lastIndexOf('.');
  return idx >= 0 ? fileName.slice(idx + 1).toLowerCase() : '';
}

async function main() {
  const entries = [];
  try {
    const years = await fs.readdir(tdDir, { withFileTypes: true });
    for (const dirent of years) {
      if (!dirent.isDirectory()) continue;
      const yearDirName = dirent.name;
      const yearPath = path.join(tdDir, yearDirName);
      const files = await fs.readdir(yearPath, { withFileTypes: true });
      for (const f of files) {
        if (!f.isFile()) continue;
        const ext = getExt(f.name);
        if (!['pdf', 'ppt', 'pptx'].includes(ext)) continue;
        const abs = path.join(yearPath, f.name);
        const stat = await fs.stat(abs);
        const relUrl = `/td/${encodeURIComponent(yearDirName)}/${encodeURIComponent(f.name)}`
          .replace(/%2F/gi, '/');
        entries.push({
          name: f.name,
          url: relUrl,
          size: stat.size,
          uploadedAt: new Date(stat.mtimeMs).toISOString(),
          year: mapYear(yearDirName),
          ext: ext === 'pptx' ? 'ppt' : ext,
        });
      }
    }

    entries.sort((a, b) => (a.uploadedAt < b.uploadedAt ? 1 : -1));
    await fs.mkdir(tdDir, { recursive: true });
    await fs.writeFile(outputFile, JSON.stringify(entries, null, 2), 'utf8');
  } catch (err) {
    console.error('Failed to generate TD index:', err);
    process.exitCode = 1;
  }
}

main();


