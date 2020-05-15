const { makeExecutableSchema } = require('@graphql-tools/schema');
const { addMocksToSchema } = require('@graphql-tools/mock');
const { stitchSchemas } = require('@graphql-tools/stitch');
const { parse } = require('graphql');
const { PubSub } = require('graphql-subscriptions');

let chirpSchema = makeExecutableSchema({
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

chirpSchema = addMocksToSchema({ schema: chirpSchema });

let authorSchema = makeExecutableSchema({
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

authorSchema = addMocksToSchema({ schema: authorSchema });

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

const mergedSchema = stitchSchemas({
  subschemas: [chirpSchema, authorSchema, linkTypeDefs],
  resolvers: {
    User: {
      chirps: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return context.chirpStitcher.from({ info, context }).delegateTo({
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId: user.id
            }
          });
        }
      },
      latestDetails: {
        selectionSet: `{ id }`,
        resolve(user, args, context, info) {
          return {
            address: context.authorStitcher
              .from({ info, context })
              .transform({
                selectionSet: `{
                  demographics {
                    address {
                      ...PreStitch @extract(path: ["address"])
                    }
                  }
                }`,
                result: result =>
                  result && result.demographics && result.demographics.address
              })
              .delegateTo({
                operation: 'query',
                fieldName: 'userById',
                args: {
                  id: user.id
                }
              })
          };
        }
      }
    },
    Chirp: {
      author: {
        selectionSet: `{ authorId }`,
        resolve(chirp, args, context, info) {
          return context.authorStitcher.from({ info, context }).delegateTo({
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
          return context.subscriptionStitcher
            .from({ info, context })
            .delegateTo({
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
