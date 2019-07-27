const {
  readFileSync,
  createReadStream,
  createWriteStream,
  writeFileSync,
} = require('fs');
const ImagePreviewStream = require('./parser');

const filePath = process.argv[2];

const imageStream = createReadStream(filePath);
const getPreviewImage = new ImagePreviewStream();
const previewStream = createWriteStream(__dirname + '/../preview.jpg');

imageStream.pipe(getPreviewImage).pipe(previewStream);

// const directories = parseDirectories(image);
//
// const {
//   idf0: {t273, t279},
// } = directories;
//
// var TAG_LENGTH = 12;
// var DIR_LENGTH_BYTES = 2;
// var FIRST_IDF_OFFSET = 0x0004;
// var TAG_ID_OFFSET = 0;
// var TAG_TYPE_OFFSET = 2;
// var TAG_LENGTH_OFFSET = 4;
// var TAG_VALUE_OFFSET = 8;
//
// // returns map of Image File Directories: { idf0: {}, ifd1: {}, ifd2: {}, ifd3: {} }
// function parseDirectories(imageBuffer) {
//   // start with first directory offset, 4 bytes from the start of the buffer, 4 bytes long
//   let currentDirectory = 0;
//   let directoryMap = {};
//   let offset = imageBuffer.readIntLE(0x0004, 4);
//
//   while (offset != 0) {
//     const {directory, dirLength} = getTags(imageBuffer, offset);
//
//     directoryMap[`idf${currentDirectory}`] = directory;
//     currentDirectory++;
//
//     offset = imageBuffer.readIntLE(offset + 2 + 12 * dirLength, 4); // new offset based on number of tag entries & current offset
//   }
//
//   return directoryMap;
// }
//
// function getTags(imageBuffer, offset) {
//   const dirLength = imageBuffer.readUIntLE(offset, 2);
//   let directory = {};
//
//   for (let i = 0; i < dirLength; i++) {
//     const tagOffset = offset + 2 + 12 * i;
//     const tag = image.slice(tagOffset, tagOffset + 12);
//     const id = tag.readUIntLE(0, 2);
//     const type = tag.readUIntLE(2, 2);
//     const length = tag.readUIntLE(4, 4);
//     const valueOffset = tag.readUIntLE(8, 4);
//     const value = getValueForType(
//       imageBuffer,
//       type,
//       length,
//       valueOffset,
//       tagOffset,
//     ); // get based on tag type
//
//     directory[`t${id}`] = {
//       id: '0x' + id.toString(16),
//       type,
//       length,
//       valueOffset,
//       value: value.length === 1 ? value[0] : value,
//     };
//
//     if (id === 34665) {
//       const {directory: exifDirectory} = getTags(imageBuffer, valueOffset);
//       directory.exif = exifDirectory;
//     }
//
//     if (id === 37500) {
//       const {directory: makerNotes} = getTags(imageBuffer, valueOffset);
//       directory.makerNotes = makerNotes;
//     }
//   }
//
//   return {
//     directory,
//     dirLength,
//   };
// }
//
// function getValueForType(imageBuffer, type, length, valueOffset, tagOffset) {
//   let offset = length < 5 ? tagOffset + 8 : valueOffset;
//   let size;
//   switch (type) {
//     case 1:
//     case 7:
//       // read slice from buffer
//       return imageBuffer.slice(offset, offset + length);
//     case 2:
//       // parse string from buffer
//       return imageBuffer.slice(offset, offset + length - 1).toString();
//     case 5:
//       return new Array(length)
//         .fill(0)
//         .map(
//           (_, index) =>
//             imageBuffer.readUIntLE(valueOffset + index * 8, 4) /
//             imageBuffer.readUIntLE(valueOffset + index * 8 + 4, 4),
//         );
//     case 8:
//     case 9:
//       // readIntLE
//       size = type === 8 ? 2 : 4;
//       if (type === 8) {
//         offset = length < 3 ? tagOffset + 8 : valueOffset;
//       } else {
//         offset = length < 2 ? tagOffset + 8 : valueOffset;
//       }
//
//       return new Array(length)
//         .fill(0)
//         .map((_, index) => imageBuffer.readIntLE(offset + size * index, size));
//     case 10:
//       return new Array(length)
//         .fill(0)
//         .map(
//           (_, index) =>
//             imageBuffer.readIntLE(valueOffset + index * 8, 4) /
//             imageBuffer.readIntLE(valueOffset + index * 8 + 4, 4),
//         );
//     case 11:
//       // readFloatLE
//       return new Array(length)
//         .fill(0)
//         .map((_, index) => imageBuffer.readFloatLE(valueOffset + 4 * index));
//     case 12:
//       // readDoubleLE
//       return new Array(length)
//         .fill(0)
//         .map((_, index) => imageBuffer.readDuobleLE(valueOffset + 8 * index));
//     default:
//       // readUIntLE
//       size = type === 3 ? 2 : 4;
//       if (type === 3) {
//         offset = length < 3 ? tagOffset + 8 : valueOffset;
//       } else {
//         offset = length < 2 ? tagOffset + 8 : valueOffset;
//       }
//
//       return new Array(length)
//         .fill(0)
//         .map((_, index) => imageBuffer.readUIntLE(offset + size * index, size));
//   }
// }
