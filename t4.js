'use strict';

// process.env.NODE_ENV = 'production';

const S = require ("sanctuary");
const gif = require ("omggif");
const fs = require ("fs");

const consoleFriendlyBuffer = buffer => buffer instanceof Buffer ? `<Buffer(${buffer.byteLength})>` : buffer;
const writeln = (...xs) => (console.log (...xs), xs[0]);

//    unfoldr_ :: (b -> Either e (Pair a b)) -> b -> Array a
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
  this.data = consoleFriendlyBuffer (rgba) // because seeing a Buffer in the terminal sucks
  this.delay = delay
}

const readFile = filename => fs.readFileSync(__dirname + "/" + filename);

// Semigroupoid s => s b c -> s a b -> s a c
// join :: Chain m => m (m a) -> m a

//    joinAfter :: Semigroupoid s, Chain m => s b c -> s m a m (m b) -> s m a m c
const joinAfter = S.compose (S.compose (S.join));

//    gifReader :: Buffer -> Either Error GifReader
const gifReader = S.encase (buffer => new gif.GifReader (buffer));

//    image :: Number -> Number -> Either Error Image
const image = height => S.encase (width => new Image (height, width));

//    frameInfo :: GifReader -> Number -> Either Error FrameInfo
const frameInfo = gifReader => S.encase (gifReader.frameInfo.bind (gifReader));

//    decodeAndBlitFrameRGBA :: GifReader -> Number -> FrameInfo -> Either Error Buffer
const decodeAndBlitFrameRGBA = gifReader => frameNumber => frameInfo =>
  S.encase (buffer => (gifReader.decodeAndBlitFrameRGBA (frameNumber, buffer), buffer))
    (Buffer.alloc (frameInfo.height * frameInfo.width * 4));

//    IMPURE_addFrame :: FrameInfo -> Buffer -> Image -> Image
const IMPURE_addFrame = frameInfo => rgbaBuffer => image => (image.addFrame (rgbaBuffer, frameInfo.delay * 10), image);

//    getFrameInfo :: Either Error GifReader -> Either Void Number -> Either Error FrameInfo
const getFrameInfo = joinAfter (S.lift2 (frameInfo));

//    getRgbaBuffer :: Either Error GifReader -> Either Void Number -> Either Error FrameInfo -> Either Error Buffer
const getRgbaBuffer = S.compose (joinAfter)
                                (S.lift3 (decodeAndBlitFrameRGBA));

//    blitFrame :: Either Error GifReader -> Either Void Number -> Either Error Buffer
const blitFrame = S.lift2 (S.ap) (getRgbaBuffer) (getFrameInfo);


/** @param {Buffer} buffer */
function main (buffer) {
  //    blitGifFrame :: Either Void Number -> Either Error Buffer
  const blitGifFrame = blitFrame (gifReader (buffer));
  // return S.map (consoleFriendlyBuffer) (blitGifFrame (S.Right (0)));

  let result = unfoldr_ (n => (
    S.map (buffer => S.Pair (buffer)
                            (n + 1))
          (blitGifFrame (S.Right (n))))
  )
  (0);

  // return result;
  return S.map (consoleFriendlyBuffer) (result);
}

S.pipe ([ readFile, main, writeln ])
       ('./examples/doge_jump2.gif');
