const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');

const root = path.resolve(__dirname, '..');
const envPath = path.join(root, '.env.local');
const env = { ...process.env };

if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const equalsIndex = trimmed.indexOf('=');
    if (equalsIndex === -1) continue;
    const key = trimmed.slice(0, equalsIndex).trim();
    const value = trimmed.slice(equalsIndex + 1);
    env[key] = value;
  }
}

const args = process.argv.slice(2);
const cliPath = path.join(root, 'node_modules', 'prisma', 'build', 'index.js');
const result = spawnSync(process.execPath, [cliPath, ...args], {
  cwd: root,
  stdio: 'inherit',
  env
});

process.exit(result.status ?? 1);