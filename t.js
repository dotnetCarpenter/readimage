'use strict'

const fs        = require ("fs")
const readimage = require ("./readimage-sanctuary.js")
const readfile  = filename => fs.readFileSync(__dirname + "/" + filename)

testGif ()
testJpg ()
testPng ()

function testGif () {
	console.debug ('[testGif]')
	const buf = readfile ("./examples/doge_jump2.gif")

	readimage(buf, function (err, image) {
		if (err) {
			if (err instanceof AggregateError) {
				console.log(err.message); // ""
				console.log(err.name);    // "AggregateError"
				console.log(err.errors);  // [ Error: "some error" ]
			} else {
				console.error (err)
			}

			return
		}

		console.log ("yep, height", 101, image.height)
		console.log ("yep, width", 135, image.width)
		console.log ("frames length", 30, image.frames.length)
		console.log ("right data length", image.height * image.width * 4, image.frames[0].data.length)
	})
}

function testPng () {
	console.debug ('[testPng]')
	const buf = readfile("./examples/ravenwall.png")

	readimage(buf, function (err, image) {
		if (err) {
			console.error (err)
			return
		}

		console.log ("yep, height", 458, image.height)
		console.log ("yep, width", 270, image.width)
		console.log ("frames length", 1, image.frames.length)
		console.log ("right data length", image.height * image.width * 4, image.frames[0].data.length)
	})
}

function testJpg () {
	console.debug ('[testJpg]')
	const buf = readfile("./examples/autocorrect.jpg")

	readimage(buf, function (err, image) {
		if (err) {
			console.error (err)
			return
		}

		console.log ("yep, height", 640, image.height)
		console.log ("yep, width", 640, image.width)
		console.log ("frames length", 1, image.frames.length)
		console.log ("right data length", image.height * image.width * 4, image.frames[0].data.length)
	})
}
