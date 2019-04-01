const { makeRemoteExecutableSchema } = require('graphql-tools');
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
