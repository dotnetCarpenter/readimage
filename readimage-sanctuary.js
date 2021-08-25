"use strict";

process.env.NODE_ENV = 'production'

const S           = require ("sanctuary")
const jpeg        = require ("jpeg-js")
const png         = require ("pngparse")
const gif         = require ("omggif")
const bufferEqual = require ("buffer-equal")

module.exports = read
module.exports.Image = Image
module.exports.Frame = Frame

const debug = msg => x => {
  let output
  if (Array.isArray (x.value) && x.value[0] instanceof Buffer) {
    output = S.map (S.map (S.K ('<Buffer>'))) (x)
  }
  console.debug (`[${msg}]`, output || x)

  return x
}

const gifHeader = Buffer.from ("GIF8")
const pngHeader = Buffer.from ([137, 80, 78, 71])
const jpgHeader = Buffer.from ([255, 216, 255])

//    isNumber :: Any -> Boolean
const isNumber = (
  S.compose
    (S.lift2
      (S.and)
      (S.complement (Number.isNaN))
      (Number.isFinite))
    (Number.parseFloat)
);

//    swap :: Either a b -> Either b a
const swap = S.either (S.Right) (S.Left);

//    firstFourBytes :: Buffer -> Maybe Buffer
const firstFourBytes = S.pipe ([
  Array.from,
  S.take (4),
  S.map (Buffer.from),
])

//    firstThreeBytes :: Buffer -> Maybe Buffer
const firstThreeBytes = S.pipe ([
  Array.from,
  S.take (3),
  S.map (Buffer.from),
])

//    bufferEqual_ :: Buffer -> Buffer -> Boolean
const bufferEqual_ = S.curry2 (bufferEqual)

// isBuffer :: Buffer -> Maybe Buffer -> Boolean
const isBuffer = S.pipe ([
  bufferEqual_,
  S.maybe (false)
])

const isGif = S.compose (isBuffer (gifHeader))
                        (firstFourBytes) // (S.take (4))

const isPng = S.compose (isBuffer (pngHeader))
                        (firstFourBytes) // (S.take (4))

const isJpg = S.compose (isBuffer (jpgHeader))
                        (firstThreeBytes) // (S.take (3))

const parsePng2 = S.flip (S.curry2 (parsePngOld))
const parseJpg2 = S.flip (S.curry2 (parseJpg))

// gifReader :: Buffer -> Either (Error Gif)
const gifReader = S.encase (buffer => new gif.GifReader (buffer))

// image :: Number -> Number -> Either (Error Image)
const image = height => S.encase (width => new Image (height, width))

// IMPURE_decodeAndBlitFrameRGBA :: Gif -> Buffer -> Number -> Either Error Undefined
const IMPURE_decodeAndBlitFrameRGBA = gif => buffer => S.encase (S.flip (S.curry2 (gif.decodeAndBlitFrameRGBA.bind (gif))) (buffer))

// IMPURE_gifRgba :: Gif -> Buffer -> Number -> Either Error Buffer
const IMPURE_gifRgba = gif => buffer => S.pipe ([
  IMPURE_decodeAndBlitFrameRGBA (gif) (buffer),
  S.map (S.K (buffer)),
])

// getFrameInfo :: Gif -> Number -> Either (Error Pair (FrameInfo) (Number))
const getFrameInfo = gif => frameNumber => {
  let frameInfo
  try {
    frameInfo = gif.frameInfo (frameNumber)
  } catch (error) {
    return S.Nothing
  }
  return S.Just (S.Pair (frameInfo) (++frameNumber))
  // S.pipe ([S.encase (gif.frameInfo.bind (gif)), S.eitherToMaybe ]) // (frameNumber)
}

// allocRgbaBuffer :: Number -> Number -> Buffer
const allocRgbaBuffer = width => height => Buffer.alloc (width * height * 4)

// gifReader          :: Buffer -> Either Gif
// image              :: Number -> Number -> Either Image

// *getFrameInfo      :: Gif -> Number -> Either FrameInfo ({ delay, width, height })
// *allocRgbaBuffer   :: Number -> Number -> Buffer
// *IMPURE_gifRgba    :: Gif -> Buffer -> Number -> Either Buffer

// *Image ~> addFrame :: FrameInfo -> Buffer -> Image -> Undefined

// decodeAndBlitFrameRGBA :: Number -> StrMap Number -> Either Buffer
const decodeAndBlitFrameRGBA = frameNumber =>
  S.compose
    (S.encase (S.curry2 (gif.decodeAndBlitFrameRGBA) (frameNumber)))
    (({width, height}) => Buffer.alloc (width * height * 4));

// getRgbaBuffer :: Gif -> Number -> Either Buffer
const getRgbaBuffer = gif => frameNumber => S.pipe ([
  S.chain (S.encase (gif.frameInfo.bind (gif)) (frameNumber)),
  S.chain (decodeAndBlitFrameRGBA (frameNumber)),
]);



// parseGif :: ((a, b) -> c) -> Buffer -> c
const parseGif = callback => S.pipe ([
  gifReader,
  // Either (Gif)

  // ?
  //


  // S.map (gif => getRgbaBuffer (gif) (0)),
  // debug ('one buffer?'),

  S.map (gif => S.Pair (image (gif.height) (gif.width)) (gif)),
  // Either (Pair (Either (Image) Gif))


  S.map (S.pair (eitherImage => gif => {

    if (S.isLeft (eitherImage)) return eitherImage

    let frameNumber = 0
    return S.pipe ([

      S.unfoldr (n => getFrameInfo (gif) (n)),
      // Array (FrameInfo)

      S.map (frameInfo => S.Pair (frameInfo.delay)
                                 (allocRgbaBuffer (frameInfo.width) (frameInfo.height))),
      // Array (Pair (Number Buffer))

      S.map (S.map (buffer => IMPURE_gifRgba (gif) (buffer) (frameNumber++))),
      // Array (Pair (Number Either (Error Buffer)))

      S.map (S.sequence (S.Either)),
      // Array (Either (Error Pair (Number Buffer)))

      // safe as long as eitherImage error case has been handled
      S.map (S.map (S.pair (frameDelay => rgba => eitherImage.value.addFrame (rgba, frameDelay * 10)))),
      // Array (Either (Error Number))

      S.ifElse (S.all (S.isRight))
               (S.K (eitherImage))
               (S.compose (errors => S.Left (new AggregateError (errors))) (S.lefts)),
      // Left (AggregateError) | Right (Image)
    ])
    (0)
  })),
  // Either (Error Either (Error Image))

  S.join,
  // Right (Image) | Left (Error)

  S.either (callback) (image => callback (null, image)),
  // Any
]);

const parsePng_ = S.flip (S.curry2 (png.parse))
const packPng = (err, image) => {
  if (err) return S.Left (err)
}
const parsePng = callback => pngParse (packPang)

const read2 = callback =>
  S.ifElse (isGif)
    (parseGif (callback))
    (S.ifElse (isPng)
              (parsePng2 (callback))
              (S.ifElse (isJpg)
                        (parseJpg2 (callback))
                        (_ => callback (new Error ('Image format is not recognized or supported')))))

function read (buffer, callback) {
  return read2 (callback) (buffer)
}

function parsePngOld(buffer, callback) {
  png.parse(buffer, function (err, image) {
    if (err) {
      return callback(err)
    }
    var rgba = image.data
    if (image.channels === 1) {
      rgba = Buffer.alloc (image.height * image.width * 4)
      for (var i = 0; i < image.data.length; i++) {
        var idx = i * 4
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = image.data[i]
        rgba[idx + 3] = 0xff
      }
    }
    if (image.channels === 2) {
      rgba = Buffer.alloc (image.height * image.width * 4)
      for (var i = 0; i < image.data.length; i += 2) {
        var idx = (i/2) * 4
        rgba[idx] = rgba[idx + 1] = rgba[idx + 2] = image.data[i]
        rgba[idx + 3] = image.data[i + 1]
      }
    }
    if (image.channels === 3) {
      rgba = Buffer.alloc (image.height * image.width * 4)
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
  if (!isNumber(height) || !isNumber(width)) {
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
