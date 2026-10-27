const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const projectRoot = path.resolve(__dirname, '..');
const appSource = fs.readFileSync(path.join(projectRoot, 'app.js'), 'utf8');

function readRadioFiles(constantName, nextConstantName) {
  const start = appSource.indexOf(`const ${constantName} = [`);
  const end = appSource.indexOf(`const ${nextConstantName} = [`, start);
  assert.notEqual(start, -1, `Could not find ${constantName} in app.js`);
  const section = appSource.slice(start, end === -1 ? appSource.length : end);
  return [...section.matchAll(/file:\s*'([^']+)'/g)].map((match) => match[1]);
}

const songs = readRadioFiles('radioTracks', 'radioAds');
const ads = readRadioFiles('radioAds', 'if');
const radioFiles = [...songs, ...ads];

function hasAudioSignature(filePath) {
  const header = fs.readFileSync(filePath).subarray(0, 12);
  const extension = path.extname(filePath).toLowerCase();
  if (extension === '.mp3') return header.subarray(0, 3).toString() === 'ID3' || header[0] === 0xff;
  if (extension === '.ogg' || extension === '.oga' || extension === '.opus') return header.subarray(0, 4).toString() === 'OggS';
  if (extension === '.flac') return header.subarray(0, 4).toString() === 'fLaC';
  if (extension === '.wav') return header.subarray(0, 4).toString() === 'RIFF' && header.subarray(8, 12).toString() === 'WAVE';
  return false;
}

for (const relativePath of radioFiles) {
  test(`radio asset is playable: ${relativePath}`, () => {
    const filePath = path.join(projectRoot, relativePath);
    assert.equal(fs.existsSync(filePath), true, `${relativePath}: missing`);
    assert.notEqual(fs.statSync(filePath).size, 0, `${relativePath}: empty`);
    assert.equal(hasAudioSignature(filePath), true, `${relativePath}: unrecognized audio format`);
  });
}

