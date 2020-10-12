const fs = require('fs');
const path = require('path');
const Emitter = require('events');
const puppeteer = require('puppeteer');
const { createCanvas, loadImage } = require('canvas');

const SNAP_DIR = './snaps';
const TR_DIR = './tmp';
const ANIMATION_URL = 'http://127.0.0.1:5500/client-static';
const SELECTOR = '#animation';

const emitter = new Emitter();

emitter.on('finishScreenShots', handleScreenShotFinish);

emitter.on('start', takeScreenShots);

main();

function main() {
  console.log('start');
  createDirs();

  emitter.emit('start', 0);
}

function createDirs() {
  if (!fs.existsSync(SNAP_DIR)) {
    fs.mkdirSync(SNAP_DIR);
  }

  if (!fs.existsSync(TR_DIR)) {
    fs.mkdirSync(TR_DIR);
  }
}

function handleScreenShotFinish() {
  fs.readdir(SNAP_DIR, async (err, items) => {
    if (err) {
      throw err;
    }

    const data = {};

    for (var i = 0; i < items.length; i++) {
      const pic = await getTransparentBackground(`${SNAP_DIR}/${items[i]}`);
      data[items[i].split('.')[0]] = pic;

      base64ToPNG(pic, items[i], TR_DIR);
    }

    console.log('success');
  });
}

async function getTransparentBackground(imgURL) {
  const image = await loadImage(imgURL);
  const canvas = createCanvas(800, 350);
  const ctx = canvas.getContext('2d');

  ctx.drawImage(image, 0, 0);

  const imgd = ctx.getImageData(0, 0, 800, 350),
    pix = imgd.data,
    newColor = { r: 0, g: 0, b: 0, a: 0 };

  for (let i = 0, n = pix.length; i < n; i += 4) {
    const r = pix[i],
      g = pix[i + 1],
      b = pix[i + 2];

    if (r === 255 && g === 255 && b === 255) {
      pix[i] = newColor.r;
      pix[i + 1] = newColor.g;
      pix[i + 2] = newColor.b;
      pix[i + 3] = newColor.a;
    }
  }

  ctx.putImageData(imgd, 0, 0);

  const dataURL = canvas.toDataURL();

  return dataURL;
}

async function takeScreenShots(delay) {
  if (delay < 3) {
    try {
      const browser = await puppeteer.launch();
      const page = await browser.newPage();

      await page.goto(ANIMATION_URL);
      await page.setViewport({ width: 800, height: 350 });

      await page.waitForSelector(SELECTOR, { visible: true });
      await page.click(SELECTOR);

      const startDate = Date.now();
      setTimeout(async () => {
        const arr = [];

        while ((await page.$('.done')) === null) {
          arr.push(
            await page.screenshot({
              path: `${SNAP_DIR}/${Date.now() - startDate}.png`,
            })
          );
        }

        await Promise.all(arr);

        process.nextTick(async () => {
          await browser.close();
          takeScreenShots(++delay);
        });
      }, delay);
    } catch (err) {
      console.log(err);
    }
  } else {
    emitter.emit('finishScreenShots');
  }
}

function base64ToPNG(data, fileName, dirName) {
  data = data.replace(/^data:image\/png;base64,/, '');

  fs.writeFile(
    path.resolve(__dirname, `${dirName}/${fileName}`),
    data,
    'base64',
    (err) => {
      if (err) throw err;
    }
  );
}
