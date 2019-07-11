const { makeRemoteExecutableSchema } = require('graphql-tools-fork');
const { ApolloLink, execute } = require('apollo-link');

class GraphQLContextLink extends ApolloLink {
  constructor(dispatcher) {
    super();
    this.dispatcher = dispatcher;
  }
  request(operation) {
    const context = operation.getContext();
    const dispatcher = this.dispatcher(context.graphqlContext);
    if (typeof dispatcher === 'function') {
      // dispatcher is a fetcher
      return dispatcher(operation);
    } else {
      // dispatcher ia a link
      return execute(dispatcher, operation);
    }
  }
}

/**
 * Polyfill for makeRemoteExecutableSchema from graphql-tools that allows specification of a context-dependent link or fetcher.
 * @memberof module:apollo-stitcher
 * @alias makeRemoteExecutableSchema
 * @param {object} options - standard options object for makeRemoteExecutableSchema.
 * @param {string} options.dispatcher - new property representing a function taking the graphql request
 * context as a single parameter and returning a link or fetcher, designed to be used instead of the
 * link and fetcher properties.
 * @returns {GraphQLSchema} executable graphql schema
 */
function makeContextualRemoteExecutableSchema({ link, dispatcher, ...rest }) {
  const options = {
    link: dispatcher ? new GraphQLContextLink(dispatcher) : link,
    ...rest
  };
  return makeRemoteExecutableSchema(options);
}

module.exports = {
  makeRemoteExecutableSchema: makeContextualRemoteExecutableSchema
};
