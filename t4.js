'use strict';

// process.env.NODE_ENV = 'production';

const S    = require ("sanctuary");
const gif  = require ("omggif");
const fs   = require ("fs");

const bufferToString = function () { return `<toStringBuffer(${this.byteLength})>`; };
Buffer.prototype[Symbol.for ('nodejs.util.inspect.custom')] = bufferToString;
Buffer.prototype.toString = bufferToString;

const writeln = x => (console.log (S.show (x)), x);
const trace = msg => x => (console.log (`[${msg}]`, x), x);

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
    return new Image(height, width);
  }
  if (!isNumber(height) || !isNumber(width)) {
    throw new Error("Image height and width must be numbers.");
  }
  this.height = +height;
  this.width = +width;
  this.frames = [];
}
Image.prototype.addFrame = function (rgba, delay) {
  this.frames.push(new Frame(rgba, delay));
}

function Frame(rgba, delay) {
  if (!(this instanceof Frame)) {
    return new Frame(rgba, delay);
  }
  this.data = rgba; //consoleFriendlyBuffer (rgba) // because seeing a Buffer in the terminal sucks
  this.delay = delay;
}

const readFile = filename => fs.readFileSync(__dirname + "/" + filename);

// Semigroupoid s => s b c -> s a b -> s a c
// join :: Chain m => m (m a) -> m a

//    joinAfter :: Semigroupoid s, Chain m => s b c -> s m a m (m b) -> s m a m c
const joinAfter = S.compose (S.compose (S.join));

//    gifReader :: Buffer -> Either Error GifReader
const gifReader = S.encase (buffer => new gif.GifReader (buffer));

//    image :: Number -> Number -> Either Error Image
const image = S.encase (({width, height}) => new Image (height, width));

//    frameInfo :: GifReader -> Number -> Either Error FrameInfo
const frameInfo = gifReader => S.encase (gifReader.frameInfo.bind (gifReader));

//    decodeAndBlitFrameRGBA :: GifReader -> Number -> FrameInfo -> Either Error Buffer
const decodeAndBlitFrameRGBA = gifReader => frameNumber => S.pipe ([
  S.encase (frameInfo => Buffer.alloc (frameInfo.height * frameInfo.width * 4)),
  S.chain (S.encase (buffer => (gifReader.decodeAndBlitFrameRGBA (frameNumber, buffer), buffer))),
]);

//    IMPURE_addFrame :: Image -> FrameInfo -> Buffer -> Image
const IMPURE_addFrame = image => frameInfo => rgbaBuffer => (image.addFrame (rgbaBuffer, frameInfo.delay * 10), image);

//    STATE_addFrame :: Either Error GifReader → Either Error FrameInfo → Either Error Buffer → Either Error Image
const STATE_addFrame = S.pipe ([S.chain (image), S.lift3 (IMPURE_addFrame)]);

//    getFrameInfo :: Either Error GifReader -> Either Void Number -> Either Error FrameInfo
const getFrameInfo = S.compose (S.compose (S.join))
                               (S.lift2 (frameInfo));

//    getRgbaBuffer :: Either Error GifReader -> Either Void Number -> Either Error FrameInfo -> Either Error Buffer
const getRgbaBuffer = S.compose (S.compose (S.compose (S.join)))
                                (S.lift3 (decodeAndBlitFrameRGBA));

//    blitFrame :: Either Error GifReader -> Either Void Number -> Either Error Buffer
const blitFrame = S.lift2 (S.ap) (getRgbaBuffer) (getFrameInfo);


const program1 = S.map (gifReader => {
  let frameNumber      = 0;
  let eitherImage      = image (gifReader);
  let eitherFrameInfo  = frameInfo (gifReader) (frameNumber);
  let eitherRgbaBuffer = S.compose (S.join)
                                   (S.map (decodeAndBlitFrameRGBA (gifReader) (frameNumber)))
                                   (eitherFrameInfo);

  return S.lift3 (IMPURE_addFrame) (eitherImage) (eitherFrameInfo) (eitherRgbaBuffer);
});

//    J :: (a → b → c → e) → (a → d → b → c) → (a → d → b) → a → d → e
const J = f1 => f2 => f3 => a => d => {
  let b = f3 (a) (d);
  let c = f2 (a) (d) (b);
  return  f1 (a) (b) (c);
}
//    add1f :: Functor a => a Number -> a Number
const add1f = S.map (S.add (1))
//    program2 :: Either Error GifReader -> Either Void Number -> Either Error Image
const program2 = a => (d, lastResult) => {
  // a = GifReader
  // b = FrameInfo
  // c = Buffer
  // d = Number
  // e = Image
  // FIXME: addFrame only keeps state when GifReader is applied...
  let result = J (STATE_addFrame) (getRgbaBuffer) (getFrameInfo) (a) (d)
  return S.isRight (result) ? program2 (a) (add1f (d), result) : lastResult
};

//    J2 :: addFrame → getRgbaBuffer → getFrameInfo → GifReader → Number → Image
//    J2 :: (c → d → e) → (a → b → c → d) → (a → b → c) → a → b → e
const J2 = f1 => f2 => f3 => a => b => {
  let c = f3 (a) (b);
  let d = f2 (a) (b) (c);
  return  f1 (c) (d);
};
const addFrame = eitherFrameNumber => f => image => {
  let eitherImage = f (add1f (eitherFrameNumber))
  if (S.isLeft (eitherImage)) return image;

  return addFrame (add1f (eitherFrameNumber)) (f) (image)
};
const program3 = eitherGifReader => eitherFrameNumber => {
  let addFrameToImage = STATE_addFrame (eitherGifReader);
  let addFrame_ = J2 (addFrameToImage) (getRgbaBuffer) (getFrameInfo) (eitherGifReader);
  return addFrame (eitherFrameNumber) (addFrame_) (addFrame_ (eitherFrameNumber));
};

/** @param {Buffer} buffer */
function main (buffer) {
  // return program1 (gifReader (buffer));
  return program3 (gifReader (buffer)) (S.Right (0));

  return S.join (S.add) (21)


  //    blitGifFrame :: Either Void Number -> Either Error Buffer
  const blitGifFrame = blitFrame (gifReader (buffer));
  // return S.map (consoleFriendlyBuffer) (blitGifFrame (S.Right (0)));

  let result = unfoldr_ (n => (
    S.map (buffer => S.Pair (buffer)
                            (n + 1))
          (blitGifFrame (S.Right (n))))
  )
  (0);

  return result;
}

S.pipe ([ readFile, main, writeln ])
       ('./examples/doge_jump2.gif');
