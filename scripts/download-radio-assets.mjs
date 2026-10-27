import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const outputDirectory = path.join(projectRoot, 'assets/radio/audio');
const force = process.argv.includes('--force');

// Keep the source filename separate from the local filename: Commons uses
// human-readable names, while the player uses short stable asset names.
const downloads = [
  ['Mary Stafford and Her Jazz Band - Royal Garden Blues.mp3', 'royal-garden-blues.mp3'],
  ['Blue Streak by Roy Bargy (1921).opus', 'blue-streak.opus'],
  ['April Showers (1921, Paul Whiteman).mp3', 'april-showers-1921.mp3'],
  ['Downhearted Blues - Alberta Hunter.ogg', 'downhearted-blues-alberta-hunter.ogg'],
  ['Lovable Eyes (1922, The Columbians).mp3', 'lovable-eyes.mp3'],
  ['On the Alamo (1922, Benson Orchestra of Chicago).mp3', 'on-the-alamo.mp3'],
  ['Panama (1922 sound recording).mp3', 'panama-new-orleans-rhythm-kings.mp3'],
  ["Runnin' Wild (1922) The Virginians.mp3", 'runnin-wild-virginians.mp3'],
  ['My isle of golden dreams (1920 recording).mp3', 'my-isle-of-golden-dreams.mp3'],
  ['Mamie Smith, Crazy Blues.ogg', 'crazy-blues-mamie-smith.ogg'],
  ["Collins & Harlan - Everybody's Jazzin' It (1917).ogg", 'everybodys-jazzin-it.ogg'],
  ['Advertising Record.ogg', 'advertising-record.ogg'],
];

const sleep = (milliseconds) => new Promise((resolve) => setTimeout(resolve, milliseconds));

function request(url, redirects = 0) {
  return new Promise((resolve, reject) => {
    const requestHandle = https.get(url, { headers: { 'User-Agent': 'blue-travels-radio-downloader/1.0' } }, (response) => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode) && response.headers.location) {
        response.resume();
        if (redirects >= 8) return reject(new Error('too many redirects'));
        return resolve(request(new URL(response.headers.location, url), redirects + 1));
      }
      if (response.statusCode !== 200) {
        response.resume();
        return reject(new Error(`HTTP ${response.statusCode}`));
      }
      resolve(response);
    });
    requestHandle.setTimeout(45_000, () => requestHandle.destroy(new Error('request timed out')));
    requestHandle.on('error', reject);
  });
}

async function download(sourceFile, localFile) {
  const destination = path.join(outputDirectory, localFile);
  if (!force && fs.existsSync(destination) && fs.statSync(destination).size > 0) {
    console.log(`skip ${localFile} (already present)`);
    return true;
  }

  const sourceUrl = `https://commons.wikimedia.org/wiki/Special:FilePath/${encodeURIComponent(sourceFile)}?download=1`;
  for (let attempt = 1; attempt <= 4; attempt += 1) {
    try {
      const response = await request(sourceUrl);
      await new Promise((resolve, reject) => {
        const temporaryPath = `${destination}.part`;
        const output = fs.createWriteStream(temporaryPath);
        response.pipe(output);
        output.on('finish', () => {
          output.close(() => {
            if (!fs.statSync(temporaryPath).size) return reject(new Error('empty response'));
            fs.renameSync(temporaryPath, destination);
            resolve();
          });
        });
        output.on('error', reject);
        response.on('error', reject);
      });
      console.log(`downloaded ${localFile}`);
      return true;
    } catch (error) {
      try { fs.unlinkSync(`${destination}.part`); } catch {}
      if (attempt === 4) {
        console.error(`failed ${localFile}: ${error.message}`);
        return false;
      }
      const delay = attempt * attempt * 2_000;
      console.warn(`retrying ${localFile} in ${delay / 1000}s (${error.message})`);
      await sleep(delay);
    }
  }
  return false;
}

fs.mkdirSync(outputDirectory, { recursive: true });
let failures = 0;
for (const [sourceFile, localFile] of downloads) {
  if (!(await download(sourceFile, localFile))) failures += 1;
  await sleep(750);
}

if (failures) {
  console.error(`${failures} download(s) failed; rerun the command to resume.`);
  process.exitCode = 1;
} else {
  console.log('radio download queue is complete');
}
