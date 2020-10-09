const fs = require('fs');
const express = require('express');
const puppeteer = require('puppeteer');
const { createCanvas, loadImage } = require('canvas');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;
const { Image } = require('image-js');

const app = express();

const PORT = process.env.PORT || 5000;

app.use(
  express.json({
    extended: false,
  })
);

app.get('/', (req, res) => res.json({ msg: 'anime' }));

app.get('/anime', async (req, res) => {
  const width = 1024;
  const height = 1024;

  const browser = await puppeteer.launch();
  const page = await browser.newPage();

  await page.goto('http://127.0.0.1:5500/client-static/index.html');

  await page.waitForSelector('#animation');
  const element = await page.$('#animation');

  await element.screenshot({ path: 'example.png' });
  setTimeout(async () => {
    // await element.screenshot({ path: 'exampleq.png' });

    await browser.close();

    loadImage('./example.png').then((image) => {
      const canvas = createCanvas(800, 800);
      const ctx = canvas.getContext('2d');

      ctx.drawImage(image, 0, 0);

      const imgd = ctx.getImageData(0, 0, 800, 800),
        pix = imgd.data,
        newColor = { r: 0, g: 0, b: 0, a: 0 };

      for (let i = 0, n = pix.length; i < n; i += 4) {
        const r = pix[i],
          g = pix[i + 1],
          b = pix[i + 2];

        if (r == 255 && g == 255 && b == 255) {
          // Change the white to the new color.
          pix[i] = newColor.r;
          pix[i + 1] = newColor.g;
          pix[i + 2] = newColor.b;
          pix[i + 3] = newColor.a;
        }
      }

      ctx.putImageData(imgd, 0, 0);

      const dataURL = canvas.toDataURL();

      res.send(dataURL);
    });
  }, 1000);
});

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));
