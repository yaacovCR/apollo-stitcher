const { ApolloLink, fromPromise } = require('apollo-link');
const { getMainDefinition } = require('apollo-utilities');

class ApolloClientLink extends ApolloLink {
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
