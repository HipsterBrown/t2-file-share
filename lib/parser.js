const {Transform} = require('stream');

// reference
// TAG_LENGTH = 12;
// DIR_LENGTH_BYTES = 2;
// FIRST_IDF_OFFSET = 0x0004;
// TAG_ID_OFFSET = 0;
// TAG_TYPE_OFFSET = 2;
// TAG_LENGTH_OFFSET = 4;
// TAG_VALUE_OFFSET = 8;

/*
 * pipe: imageStream (file read stream)
 * options: { previewType: 'full' | 'thumbnail' }
 * returns preview image data stream
 */

class PreviewImageParser extends Transform {
  constructor(options = {}) {
    super(options);

    this.previewType = options.previewType || 'full';
    this.bytesRead = 0;
    this.previewIDFOffset = null;
    this.previewOffset = null;
    this.previewBytes = 0;
    this.previewRead = false;

    if (!['full', 'thumbnail'].includes(this.previewType)) {
      throw new Error(
        'Option "previewType" must be either "full" or "thumbnail"',
      );
    }
  }

  _transform(data, encoding, callback) {
    this.bytesRead += data.length;

    if (!this.previewIDFOffset) {
      // make sure this is a CR2 file
      if (data.slice(0x0008, 10).toString() !== 'CR') {
        this.emit('error', new Error('Image stream must be of type .CR2'));
        return;
      }

      if (this.previewType === 'full') {
        this.previewIDFOffset = data.readIntLE(0x0004, 4);

        const {directory} = getTags(data, this.previewIDFOffset);
        const {t273: previewOffset, t279: previewBytes} = directory;

        this.previewOffset = previewOffset.value;
        this.previewBytes = previewBytes.value;
      } else {
        const firstIDFOffset = data.readIntLE(0x0004, 4);
        const {dirLength} = getTags(data, firstIDFOffset);

        this.previewIDFOffset = data.readIntLE(
          firstIDFOffset + 2 + 12 * dirLength,
          4,
        );

        const {directory} = getTags(data, this.previewIDFOffset);
        const {t513: previewOffset, t514: previewBytes} = directory;

        this.previewOffset = previewOffset.value;
        this.previewBytes = previewBytes.value;
      }
    }

    if (this.previewOffset && !this.previewRead) {
      const endOffset = this.previewOffset + this.previewBytes;

      if (this.bytesRead > this.previewOffset) {
        if (this.bytesRead < endOffset) {
          if (this.bytesRead < this.previewOffset + data.length) {
            this.push(
              data.slice(this.previewOffset - (this.bytesRead - data.length)),
            );
          } else {
            this.push(data);
          }
        } else if (this.bytesRead > endOffset) {
          this.push(data.slice(0, this.bytesRead - endOffset));
          this.previewRead = true;
        }
      }
    }

    callback();
  }

  _flush(callback) {
    callback();
  }

  _final(callback) {
    callback();
  }
}

function getTags(imageBuffer, offset) {
  const dirLength = imageBuffer.readUIntLE(offset, 2);
  let directory = {};

  for (let i = 0; i < dirLength; i++) {
    const tagOffset = offset + 2 + 12 * i;
    const tag = imageBuffer.slice(tagOffset, tagOffset + 12);
    const id = tag.readUIntLE(0, 2);
    const type = tag.readUIntLE(2, 2);
    const length = tag.readUIntLE(4, 4);
    const valueOffset = tag.readUIntLE(8, 4);
    const value = getValueForType(
      imageBuffer,
      type,
      length,
      valueOffset,
      tagOffset,
    ); // get based on tag type

    directory[`t${id}`] = {
      id: '0x' + id.toString(16),
      type,
      length,
      valueOffset,
      value: value.length === 1 ? value[0] : value,
    };

    if (id === 34665) {
      const {directory: exifDirectory} = getTags(imageBuffer, valueOffset);
      directory.exif = exifDirectory;
    }

    if (id === 37500) {
      const {directory: makerNotes} = getTags(imageBuffer, valueOffset);
      directory.makerNotes = makerNotes;
    }
  }

  return {
    directory,
    dirLength,
  };
}

function getValueForType(imageBuffer, type, length, valueOffset, tagOffset) {
  let offset = length < 5 ? tagOffset + 8 : valueOffset;
  let size;
  switch (type) {
    case 1:
    case 7:
      // read slice from buffer
      return imageBuffer.slice(offset, offset + length);
    case 2:
      // parse string from buffer
      return imageBuffer.slice(offset, offset + length - 1).toString();
    case 5:
      return new Array(length)
        .fill(0)
        .map(
          (_, index) =>
            imageBuffer.readUIntLE(valueOffset + index * 8, 4) /
            imageBuffer.readUIntLE(valueOffset + index * 8 + 4, 4),
        );
    case 8:
    case 9:
      // readIntLE
      size = type === 8 ? 2 : 4;
      if (type === 8) {
        offset = length < 3 ? tagOffset + 8 : valueOffset;
      } else {
        offset = length < 2 ? tagOffset + 8 : valueOffset;
      }

      return new Array(length)
        .fill(0)
        .map((_, index) => imageBuffer.readIntLE(offset + size * index, size));
    case 10:
      return new Array(length)
        .fill(0)
        .map(
          (_, index) =>
            imageBuffer.readIntLE(valueOffset + index * 8, 4) /
            imageBuffer.readIntLE(valueOffset + index * 8 + 4, 4),
        );
    case 11:
      // readFloatLE
      return new Array(length)
        .fill(0)
        .map((_, index) => imageBuffer.readFloatLE(valueOffset + 4 * index));
    case 12:
      // readDoubleLE
      return new Array(length)
        .fill(0)
        .map((_, index) => imageBuffer.readDuobleLE(valueOffset + 8 * index));
    default:
      // readUIntLE
      size = type === 3 ? 2 : 4;
      if (type === 3) {
        offset = length < 3 ? tagOffset + 8 : valueOffset;
      } else {
        offset = length < 2 ? tagOffset + 8 : valueOffset;
      }

      return new Array(length)
        .fill(0)
        .map((_, index) => imageBuffer.readUIntLE(offset + size * index, size));
  }
}

module.exports = PreviewImageParser;
