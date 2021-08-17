readimage
=========

> ===============================================
>
> Fork of https://github.com/revisitors/readimage
>
> ===============================================


Preliminary results from running _t.js_ 3bea5ab

Without type checking (`process.env.NODE_ENV = 'production'`):

```
real    0m0.359s
user    0m0.359s
sys     0m0.062s
```

With type checking, it did not even finish the first run (_/examples/doge_jump2.gif_) before I killed it:

```
real    11m26.276s
user    7m1.722s
sys     5m47.781s
```

----------------------------------------


Read an image into memory converting from whatever format it is in to a consistent set of RGBA frames independent on input format.

Why? Because image formats are a pain to worry about.

How fast is it? Not really sure. I don't need it to be fast.

How robust is it? Not really sure, if you have issues please file them!


```javascript

var fs = require("fs")
var readimage = require("readimage")

var filedata = fs.readFileSync("cat.png")

readimage(filedata, function (err, image) {
  if (err) {
    console.log("failed to parse the image")
    console.log(err)
  }
  console.log(image)
})

```

API
===

`require("readimage")(imageBuffer, callback)`
---

Read a buffer containing an image in PNG, GIF, or JPG format into a consistent RGBA format.

FORMAT
===

height, width, and an array of sequential frames. Non-animated images will have a single frame.

```js
{
  height: 100, // pixels
  width: 100, // pixels
  frames: [
    {
      data: ... // RGBA buffer
      delay: 100 // milliseconds before switching to next frame. OPTIONAL
    },
    {
      data: ...
      delay: 10
    }
  ]
}
```

LICENSE
=======

MIT
