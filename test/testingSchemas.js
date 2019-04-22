const {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas
} = require('graphql-tools');
const { parse } = require('graphql');
const { PubSub } = require('graphql-subscriptions');

const chirpSchema = makeExecutableSchema({
  typeDefs: parse(`
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `)
});

addMockFunctionsToSchema({ schema: chirpSchema });

const authorSchema = makeExecutableSchema({
  typeDefs: parse(`
    type User {
      id: ID!
      email: String
      demographics: Demographics
    }

    type Demographics {
      address: Address
    }

    type Address {
      street: String
      city: String
      state: String
      country: String
      zipCode: String
    }

    type Query {
      userById(id: ID!): User
    }
  `)
});

addMockFunctionsToSchema({ schema: authorSchema });

const linkTypeDefs = parse(`
  extend type User {
    chirps: [Chirp]
    latestDetails: Details
  }

  type Details {
    address: Address
  }

  extend type Chirp {
    author: User
  }
`);

const mergedSchema = mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkTypeDefs],
  resolvers: {
    User: {
      chirps: {
        fragment: `... on User { id }`,
        resolve(user, args, context, info) {
          return context.chirpStitcher.stitch({ info, context }).to({
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId: user.id
            }
          });
        }
      },
      latestDetails: {
        fragment: `... on User { id }`,
        resolve(user, args, context, info) {
          return {
            address: context.authorStitcher
              .stitch({ info, context })
              .from({
                path: ['address']
              })
              .to({
                operation: 'query',
                fieldName: 'userById',
                args: {
                  id: user.id
                },
                selectionSet: `{
                  demographics {
                    address {
                      ...PreStitch
                    }
                  }
                }`,
                extractor: result => result && result.demographics && result.demographics.address
              })
          };
        }
      }
    },
    Chirp: {
      author: {
        fragment: `... on Chirp { authorId }`,
        resolve(chirp, args, context, info) {
          return context.authorStitcher.stitch({ info, context }).to({
            operation: 'query',
            fieldName: 'userById',
            args: {
              id: chirp.authorId
            }
          });
        }
      }
    }
  }
});

const subscriptionTypeDefs = parse(`
  type Notification {
    text: String
  }
  type Query {
    notifications: Notification
  }
  type Subscription {
    notifications: Notification
  }
`);

const subscriptionPubSub = new PubSub();
const subscriptionPubSubTrigger = 'pubSubTrigger';

const subscriptionResolvers = {
  Query: {
    notifications: () => ({ text: 'Hello world' })
  },
  Subscription: {
    notifications: {
      subscribe: () =>
        subscriptionPubSub.asyncIterator(subscriptionPubSubTrigger)
    }
  }
};

const subscriptionSchema = makeExecutableSchema({
  typeDefs: subscriptionTypeDefs,
  resolvers: subscriptionResolvers
});

const delegatingSubscriptionSchema = makeExecutableSchema({
  typeDefs: subscriptionTypeDefs,
  resolvers: {
    Query: {
      notifications: () => ({ text: 'Hello world' })
    },
    Subscription: {
      notifications: {
        subscribe: (user, arg, context, info) => {
          return context.subscriptionStitcher.stitch({ info, context }).to({
            operation: 'subscription',
            fieldName: 'notifications'
          });
        }
      }
    }
  }
});

module.exports = {
  chirpSchema,
  authorSchema,
  mergedSchema,
  subscriptionPubSub,
  subscriptionPubSubTrigger,
  subscriptionSchema,
  delegatingSubscriptionSchema
};
