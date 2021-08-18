```js
//    type ImageType = "gif" | "png" | "jpeg"

//    type Image = { type :: ImageType, data :: String }

//    swap :: Either a b -> Either b a
const swap = S.either (S.Right) (S.Left);

//    parseImageType :: ImageType -> String -> Either String Image
const parseImageType = type => s => (
  S.maybe (S.Left (s))
          (data => S.Right ({type, data}))
          (S.stripPrefix (type + ':') (s))
);

//    parseGif2 :: String -> Either String Image
const parseGif2 = parseImageType ('gif');

//    parsePng2 :: String -> Either String Image
const parsePng2 = parseImageType ('png');

//    parseJpg2 :: String -> Either String Image
const parseJpg2 = parseImageType ('jpeg');

//    parseImage :: String -> Either String Image
const parseImage = S.pipe ([
  S.Right,
  S.chain (S.compose (swap) (parseGif2)),
  S.chain (S.compose (swap) (parsePng2)),
  S.chain (S.compose (swap) (parseJpg2)),
  swap,
]);

parseImage ('png:abc123'); // Right ({"data": "abc123", "type": "png"})
```

David Chambers @davidchambers 13:49
 @dotnetCarpenter, here is one way to combine the parsers.
We place the result of a successful parse in a Left so subsequent parsers are skipped