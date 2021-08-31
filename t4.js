'use strict';

// process.env.NODE_ENV = 'production';

const S = require ("sanctuary");
const gif = require ("omggif");
const fs = require ("fs");

const showBuffer = buffer => buffer instanceof Buffer ? `<Buffer(${buffer.byteLength})>` : buffer;
const writeln = (...xs) => (console.log (...xs), xs[0]);

//    unfoldr_ :: (b -> Either (Pair a b)) -> b -> Array a
const unfoldr_ = f => x => {
  const result = [];
  for (var m = f (x); m.isRight; m = f (m.value.snd)) {
    result.push (m.value.fst);
  }
  return result;
}

//    lift4 :: Apply f => (a -> b -> c -> d -> e) -> f a -> f b -> f c -> f d -> f e
const lift4 = f => a => b => c => d => S.ap (S.lift3 (f) (a) (b) (c)) (d);

//    isNumber :: Any -> Boolean
const isNumber = (
  S.compose
    (S.lift2
      (S.and)
      (S.complement (Number.isNaN))
      (Number.isFinite))
    (Number.parseFloat)
);

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
  this.data = showBuffer (rgba) // because seeing a Buffer in the terminal sucks
  this.delay = delay
}

const readFile = filename => fs.readFileSync(__dirname + "/" + filename);


//    gifReader :: Buffer -> Either GifReader
const gifReader = S.encase (buffer => new gif.GifReader (buffer));

//    image :: Number -> Number -> Either Image
const image = height => S.encase (width => new Image (height, width));

//    frameInfo :: GifReader -> Number -> Either FrameInfo
const frameInfo = gifReader => S.encase (gifReader.frameInfo.bind (gifReader));

//    decodeAndBlitFrameRGBA :: GifReader -> Number -> FrameInfo -> Either Buffer
const decodeAndBlitFrameRGBA = gifReader => frameNumber => frameInfo =>
  S.encase (buffer => (gifReader.decodeAndBlitFrameRGBA (frameNumber, buffer), buffer))
    (Buffer.alloc (frameInfo.height * frameInfo.width * 4));

//    IMPURE_addFrame :: FrameInfo -> Buffer -> Image -> Image
const IMPURE_addFrame = frameInfo => rgbaBuffer => image => (image.addFrame (rgbaBuffer, frameInfo.delay * 10), image);

//    getFrameInfo :: Either GifReader -> Either Number -> Either FrameInfo
const getFrameInfo = S.compose (S.compose (S.join))
                               (S.lift2 (frameInfo));

//    getRgbaBuffer :: Either GifReader -> Either Number -> Either FrameInfo -> Either Buffer
const getRgbaBuffer = S.compose (S.compose (S.compose (S.join)))
                                (S.lift3 (decodeAndBlitFrameRGBA));


/** @param {Buffer} buffer */
function main (buffer) {
  // //  result1 :: Right FrameInfo
  // let result1 = getFrameInfo (gifReader (buffer)) (S.Right (0));
  // return result1

  // //  result2 :: Buffer
  let result2 = getRgbaBuffer (gifReader (buffer))
                              (S.Right (0))
                              (getFrameInfo (gifReader (buffer))
                                            (S.Right (0)));
  // return result2

  let gifReader_     = gifReader (buffer);
  let frameNumber    = S.Right (0);
  let getRgbaBuffer_ = getRgbaBuffer (gifReader_);
  let getFrameInfo_  = getFrameInfo (gifReader_);
  //  result3 :: Right Buffer
  let result3 = S.ap (getRgbaBuffer_) (getFrameInfo_) (frameNumber);
  return result3

  // (a -> b -> d -> c) -> (a -> b -> d) -> a -> b -> c
  // (a -> b -> c -> d) -> (a -> b -> c) -> a -> b -> d

  // let gifReader_  = gifReader (buffer);
  // let frameNumber = S.Right (0);
  // let blitBuffer  = S.ap (getRgbaBuffer) (getFrameInfo) (gifReader_);
  //  result3 :: Buffer
  // let result3 = S.ap (blitBuffer) (frameNumber);
  // return result3;

  // ap    ::
  //          (a -> b -> c) -> f a -> f b -> f c
  // lift2 :: (b -> c -> d) -> (a -> b) -> (a -> c) -> a -> d
  //          (b -> c -> d -> e) -> (a -> b -> c) -> (a -> d) -> a -> e
}


S.pipe ([ readFile, main, writeln ])
       ('./examples/doge_jump2.gif');
