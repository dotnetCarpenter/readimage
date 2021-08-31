Hi all!

I'm still having a lot of difficulties using combinators.

Given these simple functions:

```haskell
gifReader :: Buffer -> Either GifReader

frameInfo :: GifReader -> Number -> Either FrameInfo

decodeAndBlitFrameRGBA :: GifReader -> Number -> FrameInfo -> Either Buffer
```

I have found some abstrations that I think are easier to combine (I might be mistaken):

```js
//    getFrameInfo :: Either GifReader -> Either Number -> Either FrameInfo
const getFrameInfo = S.compose (S.compose (S.join))
                               (S.lift2 (frameInfo));

//    getRgbaBuffer :: Either GifReader -> Either Number -> Either FrameInfo -> Either Buffer
const getRgbaBuffer = S.compose (S.compose (S.compose (S.join)))
                                (S.lift3 (decodeAndBlitFrameRGBA));
```

The naive implementation of getting a `Buffer` from a `Number` is:

```js
getRgbaBuffer (gifReader (buffer))
              (S.Right (0))
              (getFrameInfo (gifReader (buffer))
                            (S.Right (0)));
```

I would love to not add the same arguments twice but I can not figure out a correct combinator for this.

The procedual implementation would be:

```js
let gifReader_     = gifReader (buffer);
let frameNumber    = S.Right (0);
let getRgbaBuffer_ = getRgbaBuffer (gifReader_);
let getFrameInfo_  = getFrameInfo  (gifReader_);
//  result :: Right Buffer
let result = S.ap (getRgbaBuffer_) (getFrameInfo_) (frameNumber);
```

I would really like to combine `getRgbaBuffer` and `getFrameInfo`, so I can call them with two arguments; `Either GifReader` and `Either Number`.

```haskell
dream :: (a -> b -> c -> d) -> (a -> b -> c) -> f a -> f b -> f d
dream getRgbaBuffer getFrameInfo Either (GifReader) Either (Number) = Either Buffer
```

I have tried too many things to mention here but I am thoroughly confused at this point. I thought that I could simply `lift4 (getRgbaBuffer)` and got a `lift4` implementation but I _simply_ can not follow the flow of the program with so many parameters.

```js
//    lift4 :: Apply f => (a -> b -> c -> d -> e) -> f a -> f b -> f c -> f d -> f e
const lift4 = f => a => b => c => d => S.ap (S.lift3 (f) (a) (b) (c)) (d);
```

PS. I want to use the resulting combination inside a `S.unfoldr` to generate an Array of RGBA blitted (animated) GIF frames.
