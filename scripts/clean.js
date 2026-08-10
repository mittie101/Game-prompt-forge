const { execSync } = require('child_process');
const fs = require('fs');

console.log('Removing node_modules and dist directories (if present)...');
try {
  execSync('rimraf node_modules dist build', { stdio: 'inherit' });
} catch (e) {
  console.warn('rimraf not available, attempting manual removal');
  try { fs.rmSync('node_modules', { recursive: true, force: true }); } catch {}
  try { fs.rmSync('dist', { recursive: true, force: true }); } catch {}
  try { fs.rmSync('build', { recursive: true, force: true }); } catch {}
}
console.log('Clean complete.');
