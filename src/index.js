const { Stitcher } = require('./Stitcher');
const { makeRemoteExecutableSchema } = require('./makeRemoteExecutableSchema');
const { ApolloClientLink } = require('./ApolloClientLink');
const { Transforms } = require('./transforms');

/** @module apollo-stitcher */
module.exports = {
  Stitcher,
  makeRemoteExecutableSchema,
  ApolloClientLink,
  ...Transforms
};
