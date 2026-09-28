// Builds the generated docs/ tree from the repository's public documentation.
// Only the sources classified public or public-normalize in content-sources.yaml
// are read here. docs/sessions/ and docs/README.md are never copied.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const site = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const repoDocs = path.resolve(site, '../docs');
const out = path.join(site, 'docs');
const staticArch = path.join(site, 'static/architecture');

const REPORT = 'architecture/knowme-decision-layer.html';
const REPORT_LINK = 'pathname:///architecture/knowme-decision-layer.html';

function frontmatter(fields) {
  const lines = Object.entries(fields).map(([k, v]) => `${k}: ${JSON.stringify(v)}`);
  return `---\n${lines.join('\n')}\n---\n\n`;
}

function write(rel, body) {
  const file = path.join(out, rel);
  fs.mkdirSync(path.dirname(file), {recursive: true});
  fs.writeFileSync(file, body);
}

function rewriteLinks(text) {
  if (/\]\((?:\.\/)?sessions\//.test(text)) {
    throw new Error('public doc links to excluded sessions/ content');
  }
  return text
    .replaceAll(`](${REPORT})`, `](${REPORT_LINK})`)
    .replace(/\]\((\.\.\/|\.\/)?PLAYBOOK\.md(#[^)]*)?\)/g, (_, dir = './', hash = '') => `](${dir}playbook.md${hash})`);
}

fs.rmSync(out, {recursive: true, force: true});
fs.rmSync(staticArch, {recursive: true, force: true});

// Hand-written, site-owned pages.
for (const entry of fs.readdirSync(path.join(site, 'content'), {recursive: true, withFileTypes: true})) {
  if (!entry.isFile()) continue;
  const src = path.join(entry.parentPath, entry.name);
  write(path.relative(path.join(site, 'content'), src), fs.readFileSync(src, 'utf8'));
}

// public-normalize: the playbook.
write(
  'playbook.md',
  frontmatter({sidebar_position: 3, sidebar_label: 'Build playbook', description: 'Production build playbook: invariants, contracts, milestones M0–M10 and gates.'}) +
    rewriteLinks(fs.readFileSync(path.join(repoDocs, 'PLAYBOOK.md'), 'utf8')),
);

// public-normalize: research notes.
const research = [
  ['jev-escalation-viability.md', 1, 'Why not Jev'],
  ['open-decision-models-2026-09.md', 2, 'Open decision models (Sep 2026)'],
];
for (const [file, position, label] of research) {
  write(
    `research/${file}`,
    frontmatter({sidebar_position: position, sidebar_label: label}) +
      rewriteLinks(fs.readFileSync(path.join(repoDocs, 'research', file), 'utf8')),
  );
}

// public: the standalone architecture report is served as a static page.
fs.mkdirSync(staticArch, {recursive: true});
fs.copyFileSync(path.join(repoDocs, REPORT), path.join(staticArch, 'knowme-decision-layer.html'));
fs.copyFileSync(
  path.join(repoDocs, 'architecture/knowme-decision-layer-og.png'),
  path.join(staticArch, 'knowme-decision-layer-og.png'),
);

console.log('docs synced from ../docs (sessions/ excluded)');
