const { ApolloLink, fromPromise } = require('apollo-link');
const { getMainDefinition } = require('apollo-utilities');

/**
 * Class representing a link with management of queries by an Apollo Client layer, for use with
 * server-to-server graphql requests. In particular, when using makeRemoteExecutableSchema, graphql
 * requests are executed directly from a link without an intervening Apollo Client; use of
 * ApolloClientLink opens up the ability to use the Apollo Client cache to reduce unnecessary requests.
 * @memberof module:apollo-stitcher
 */
class ApolloClientLink extends ApolloLink {
  /**
   * @param {object} options - options for the link.
   * @param {object} options.client - an Apollo Client instance.
   */
  constructor({ client }) {
    super();
    this.client = client;
  }
  request(operation) {
    const { query, variables } = operation;
    const { kind, operation: operationType } = getMainDefinition(query);
    if (kind === 'OperationDefinition') {
      switch (operationType) {
        case 'query':
          return fromPromise(this.client.query({ query, variables }));
        case 'mutation':
          return fromPromise(
            this.client.mutate({ mutation: query, variables })
          );
        case 'subscription':
          return fromPromise(this.client.subscribe({ query, variables }));
      }
    }
  }
}

module.exports = {
  ApolloClientLink
};
