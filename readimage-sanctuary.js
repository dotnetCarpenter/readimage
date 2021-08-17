"use strict";

const S           = require ("sanctuary")
const jpeg        = require ("jpeg-js")
const png         = require ("pngparse")
const gif         = require ("omggif")
const bufferEqual = require ("buffer-equal")
const isnumber    = require ("isnumber")

module.exports = read
module.exports.Image = Image
module.exports.Frame = Frame

const gifHeader = Buffer.from ("GIF8")
const pngHeader = Buffer.from ([137, 80, 78, 71])
const jpgHeader = Buffer.from ([255, 216, 255])

function read(buffer, callback) {
  // detect type, convert to format
  var head = buffer.slice(0, 4)
  if (bufferEqual(head, gifHeader)) {
    return parseGif(buffer, callback)
  }
  if (bufferEqual(head, pngHeader)) {
    return parsePng(buffer, callback)
  }
  if (bufferEqual(head.slice (0, 3), jpgHeader)) {
    return parseJpg(buffer, callback)
  }
  throw new Error ('Image format is not recognized or supported')
}

function parseGif(buffer, callback) {
  var image
  try {
    image = new gif.GifReader(buffer)
  } catch (e) {
    return callback(e)
  }
  var img = new Image(image.height, image.width)
  var frameCount = image.numFrames()
  for (var i = 0; i < frameCount; i++) {
    var frameInfo = image.frameInfo(i)
    var rgba = Buffer.allocUnsafe (frameInfo.width * frameInfo.height * 4)
    image.decodeAndBlitFrameRGBA(i, rgba)
    img.addFrame(rgba, frameInfo.delay * 10)
  }
  return callback(null, img)
}

function parsePng(buffer, callback) {
  png.parse(buffer, function (err, image) {
    if (err) {
      return callback(err)
    }
    var rgba = image.data
    if (image.channels === 1) {
      rgba = Buffer.allocUnsafe (image.height * image.width * 4)
      for (var i = 0; i < image.data.length; i++) {
        var idx = i * 4
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = image.data[i]
        rgba[idx + 3] = 0xff
      }
    }
    if (image.channels === 2) {
      rgba = Buffer.allocUnsafe (image.height * image.width * 4)
      for (var i = 0; i < image.data.length; i += 2) {
        var idx = (i/2) * 4
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = image.data[i]
        rgba[idx + 3] = image.data[i + 1]
      }
    }
    if (image.channels === 3) {
      rgba = Buffer.allocUnsafe (image.height * image.width * 4)
      for (var i = 0; i < image.data.length; i += 3) {
        var idx = (i/3) * 4
        rgba[idx] = image.data[i]
        rgba[idx + 1] = image.data[i + 1]
        rgba[idx + 2] = image.data[i + 2]
        rgba[idx + 3] = 0xff
      }
    }
    var img = new Image(image.height, image.width)
    img.addFrame(rgba)
    return callback(null, img)
  })
}

function parseJpg(buffer, callback) {
  var image
  try {
    image = jpeg.decode(buffer)
  } catch (e) {
    return callback(e)
  }
  var img = new Image(image.height, image.width)
  img.addFrame(image.data)
  return callback(null, img)
}

function Image(height, width) {
  if (!(this instanceof Image)) {
    return new Image(height, width)
  }
  if (!isnumber(height) || !isnumber(width)) {
    throw new Error("Image height and width must be numbers.")
  }
  this.height = +height
  this.width = +width
  this.frames = []
}
Image.prototype.addFrame = function (rgba, delay) {
  this.frames.push(new Frame(rgba, delay))
}

function Frame(rgba, delay) {
  if (!(this instanceof Frame)) {
    return new Frame(rgba, delay)
  }
  this.data = rgba
  this.delay = delay
}
