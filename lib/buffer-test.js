const {createReadStream, createWriteStream} = require('fs');
const ImagePreviewStream = require('./parser');

const filePath = process.argv[2];

const imageStream = createReadStream(filePath);
// const getPreviewImage = new ImagePreviewStream({previewType: 'thumbnail'});
const getPreviewImage = new ImagePreviewStream();
const previewStream = createWriteStream(__dirname + '/../preview.jpg');

imageStream
  .pipe(getPreviewImage)
  .on('error', console.error)
  .pipe(previewStream);
