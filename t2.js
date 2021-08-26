// @ts-check
'use strict';

// process.env.NODE_ENV = 'production';

const S = require ("sanctuary");
const gif = require ("omggif");
const fs = require ("fs");

const showBuffer = buffer => buffer instanceof Buffer ? `<Buffer(${buffer.byteLength})>` : buffer;
const writeln = console.log;

//    unfoldr_ :: (b -> Either (Pair a b)) -> b -> Array a
const unfoldr_ = f => x => {
  const result = [];
  for (var m = f (x); m.isRight; m = f (m.value.snd)) {
    result.push (m.value.fst);
  }
  return result;
}

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

S.pipe
  ([ readFile, main ])
  ('./examples/doge_jump2.gif')

/** @param {Buffer} buffer */
function main (buffer) {
  //    gifReader :: Buffer -> Either GifReader
  const gifReader = S.encase (buffer => new gif.GifReader (buffer));

  //    image :: Number -> Number -> Either Image
  const image = height => S.encase (width => new Image (height, width));

  //    frameInfo :: GifReader -> Number -> Either FrameInfo
  const frameInfo = gifReader => S.encase (gifReader.frameInfo.bind (gifReader));

  //    decodeAndBlitFrameRGBA :: GifReader -> frameInfo -> Number -> Buffer
  const decodeAndBlitFrameRGBA = gifReader => frameInfo => frameNumber =>
    S.encase (buffer => (gifReader.decodeAndBlitFrameRGBA (frameNumber, buffer), buffer))
      (Buffer.alloc (frameInfo.height * frameInfo.width * 4));

  //    decodeAndBlitFrameRGBA2 :: GifReader -> Number -> frameInfo -> Buffer
  const decodeAndBlitFrameRGBA2 = gifReader => frameNumber => frameInfo =>
    S.encase (buffer => (gifReader.decodeAndBlitFrameRGBA (frameNumber, buffer), buffer))
      (Buffer.alloc (frameInfo.height * frameInfo.width * 4));

  //    IMPURE_addFrame :: FrameInfo -> Buffer -> Image -> Image
  const IMPURE_addFrame = frameInfo => rgbaBuffer => image => (image.addFrame (rgbaBuffer, frameInfo.delay * 10), image);

  //  result1 :: Right (Right FrameInfo)
  let result1 = S.lift2
    (frameInfo)
    (gifReader (buffer))
    (S.Right (0))

  //  result2 :: Right (Right Buffer)
  let result2 = S.lift3
    (decodeAndBlitFrameRGBA)
    (gifReader (buffer))
    (S.join (result1))
    (S.Right (0))

  //  result3 :: Right Image
  let result3 = S.pipe
    ([
      gifReader,
      S.chain (gifReader => image (gifReader.height) (gifReader.width)),
      S.ap (S.lift2 (IMPURE_addFrame) (S.join (result1)) (S.join (result2))),
    ])
    (buffer)

  const fakeRgbaBuffer = frameNumber => frameNumber < 30
                                          ? S.Right (Buffer.alloc (1))
                                          : S.Left (new Error ("Frame index out of range."));
  //  result4 :: Array Buffer
  let result4 = unfoldr_ (n => {
    let buffer = fakeRgbaBuffer (n)
    return S.isRight (buffer) ? S.map (buf => S.Pair (buf) (n + 1)) (buffer) : buffer
  }) (0);

  //    getFrameInfo :: Either Number -> Either FrameInfo
  const getFrameInfo = S.compose (S.join)
                                 (S.lift2
                                   (frameInfo)
                                   (gifReader (buffer)));

  //  How do I `S.join` the output of a partially applied function?
  //    getRgbaBuffer :: Either FrameInfo -> Either Number -> Either (Either Buffer)
  const getRgbaBuffer = S.lift3 (decodeAndBlitFrameRGBA)
                                (gifReader (buffer));

  //    getRgbaBuffer2 :: Either Number -> Either FrameInfo -> Either (Either Buffer)
  const getRgbaBuffer2 = S.lift3 (decodeAndBlitFrameRGBA2)
                                 (gifReader (buffer));

  // Won't work since `S.compose` returns an unary function and we need to take 2 functions for `S.lift3`
  //    getRgbaBuffer3 :: Either Number -> Either FrameInfo -> Either Buffer
  const getRgbaBuffer3 = S.compose (S.join)
                                   (S.lift3 (decodeAndBlitFrameRGBA2)
                                            (gifReader (buffer)));

  const camouflageInnerBuffer = S.map (S.map (showBuffer));
  writeln (result1);
  writeln ();
  writeln (camouflageInnerBuffer (result2));
  writeln ();
  writeln (result3);
  writeln ();
  writeln (result4);

  writeln ();
  writeln (getFrameInfo (S.Right (29)));

  writeln ();
  writeln (camouflageInnerBuffer (getRgbaBuffer (getFrameInfo (S.Right (29))) (S.Right (29))));
  writeln ();
  //                                   (a -> b -> c) -> (a -> b) ->     a -> c
  writeln (camouflageInnerBuffer (S.ap (getRgbaBuffer2) (getFrameInfo) (S.Right (0))));

  const lift4 = g => f1 => f2 => f3 => f4 => S.ap (S.ap (S.ap (S.map (g) (f1)) (f2)) (f3)) (f4);
  writeln (
    lift4 (a => b => c => d => (a + a + b + b + c + c) / d) (S.Just (1)) (S.Just (2)) (S.Just (3)) (S.Just (4))
  );

  // writeln ();
  // writeln (S.map (showBuffer) (S.ap (getRgbaBuffer3) (getFrameInfo) (S.Right (0))));


  // S.pipe
  //   ([
  //     gifReader,
  //     S.map (unfoldr_ ()),
  //   ])
  //   (buffer)
}
