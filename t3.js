'use strict'

const S = require ("sanctuary");

const { add, compose, join, Just, lift2, pipe } = S;

const maybeAdd = a => b => Just (add (a) (b));

const test1 = lift2 (maybeAdd);
const test2 = lift2 (pipe ([maybeAdd, join]));   // error - pipe returns unary function
const test3 = pipe ([lift2 (maybeAdd), join]);   // error - pipe returns unary function
const test4 = lift2 (compose (join) (maybeAdd)); // error - compose returns unary function
const test5 = compose (join) (lift2 (maybeAdd)); // error - compose returns unary function
const test6 = compose (compose (join) (lift2 (maybeAdd)));
const test7 = compose (compose (join) (maybeAdd));
const test8 = compose (compose (join)) (lift2 (maybeAdd));

let result = test1 (Just (2)) (Just (2)); // Just (Just 4)
    console.log (result);

    result = pipe ([test1 (Just (2)), join]) (Just (2)); // Just 4
    console.log (result);

    // result = test2 (Just (2)) (Just (2)); // TypeError: f(...) is not a function -> return function(x) { return f (chain (x)) (x); };
    // result = test3 (Just (2)) (Just (2)); // TypeError: f(...) is not a function -> return function(x) { return f (chain (x)) (x); };
    // result = test4 (Just (2)) (Just (2)); // TypeError: f(...) is not a function -> return function(x) { return f (chain (x)) (x); };
    // result = test5 (Just (2)) (Just (2)); // TypeError: f(...) is not a function -> return function(x) { return f (chain (x)) (x); };
    // result = test6 (Just (2)) (Just (2)); // TypeError: Invalid value
    // result = test7 (Just (2)) (Just (2)); // TypeError: Invalid value
    result = test8 (Just (2)) (Just (2)); // TypeError: Invalid value
    console.log (result);
// For test8:
// Aldwin @avaq:matrix.org [m] 08:50
// @dotnetCarpenter Yes, that's possible, and more generally, it's possible to compose any arity of (curried) function by using a trick where you partially apply the compose function itself: compose (compose (join)) (maybeAdd).
// This reads like: compose maybeAdd so that the unary function it returns is composed with join.
// If maybeAdd were a ternary function, you'd just add another partial application of compose around join, et cetera.
