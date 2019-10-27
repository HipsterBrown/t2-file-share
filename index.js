const fs = require('fs');
const {extname} = require('path');
const {promisify} = require('util');
const tessel = require('tessel');

const express = require('express');
const handlebars = require('express-handlebars');

const stat = promisify(fs.stat);
const readDir = promisify(fs.readdir);

const PreviewImageParser = require('./lib/parser');

const app = express();

const PORT = 80;
const ROOT = '/mnt';

app.engine('handlebars', handlebars());
app.set('views', `${__dirname}/views`);
app.set('view engine', 'handlebars');

app.use('/public', express.static('public'));
app.get('/external/:packageName', ({params}, response) => {
  const {packageName} = params;
  response.sendFile(require.resolve(packageName));
});

app.get('/thumbnail/*', async ({path}, response) => {
  path = path.split('/');
  path.shift();
  path.shift();
  path = path.join('/');

  const mountPath = ROOT + '/' + path;
  try {
    const pathStats = await stat(mountPath);

    if (pathStats.isFile() && fs.existsSync(mountPath)) {
      const fileName = path.split('/').pop();

      if (fileName.endsWith('CR2') && !fileName.startsWith('.')) {
        const fileStream = fs.createReadStream(mountPath);
        console.log(mountPath);
        fileStream
          .pipe(new PreviewImageParser({previewType: 'thumbnail'}))
          .pipe(response);
      } else if (
        fileName.endsWith('jpg') ||
        fileName.endsWith('jpeg') ||
        fileName.endsWith('png') ||
        fileName.endsWith('tiff') ||
        fileName.endsWith('webp')
      ) {
        response.sendFile(mountPath);
      } else {
        response.sendStatus(204);
      }
    } else {
      // send header no_content
      response.sendStatus(204);
    }
  } catch (error) {
    console.error(error);
    response.sendStatus(204);
  }
});

app.get('/*', async ({path}, response) => {
  const mountPath = ROOT + path;
  try {
    const pathStats = await stat(mountPath);

    // if directory, render directory view
    if (pathStats.isDirectory()) {
      const dirFiles = await readDir(mountPath);
      const files = dirFiles.map(file => ({
        text: file,
        url: `${path}/${file}`,
      }));
      response.render('index', {files, path});
    }

    // if file, res.sendFile
    if (pathStats.isFile()) {
      response.sendFile(mountPath);
    }
  } catch (error) {
    console.error(error);
    response.sendStatus(204);
  }
});

app.listen(PORT, () => {
  console.log(`App now running on port ${PORT}`);
  setInterval(function() {
    tessel.led[2].toggle();
  }, 100);
});
