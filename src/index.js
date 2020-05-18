const { Stitcher } = require('./Stitcher');
const { ApolloClientLink } = require('./ApolloClientLink');
const updaters = require('./updaters');
const Transforms = require('./transforms');

/** @module apollo-stitcher */
module.exports = {
  Stitcher,
  ApolloClientLink,
  ...updaters,
  ...Transforms
};
