const { Stitcher } = require('./Stitcher');
const { StitchQuery } = require('./transforms/StitchQuery');
const { makeRemoteExecutableSchema } = require('./makeRemoteExecutableSchema');
const { ApolloClientLink } = require('./ApolloClientLink');

/** @module apollo-stitcher */
module.exports = {
  Stitcher,
  StitchQuery,
  makeRemoteExecutableSchema,
  ApolloClientLink
};
