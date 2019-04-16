const {
  makeExecutableSchema,
  addMockFunctionsToSchema,
  mergeSchemas
} = require('graphql-tools');
const gql = require('graphql-tag');
const { PubSub } = require('graphql-subscriptions');

const chirpSchema = makeExecutableSchema({
  typeDefs: gql`
    type Chirp {
      id: ID!
      text: String
      authorId: ID!
    }

    type Query {
      chirpById(id: ID!): Chirp
      chirpsByAuthorId(authorId: ID!): [Chirp]
    }
  `
});

addMockFunctionsToSchema({ schema: chirpSchema });

const authorSchema = makeExecutableSchema({
  typeDefs: gql`
    type User {
      id: ID!
      email: String
    }

    type Query {
      userById(id: ID!): User
    }
  `
});

addMockFunctionsToSchema({ schema: authorSchema });

const linkTypeDefs = gql`
  extend type User {
    chirps: [Chirp]
  }

  extend type Chirp {
    author: User
  }
`;

const mergedSchema = mergeSchemas({
  schemas: [chirpSchema, authorSchema, linkTypeDefs],
  resolvers: {
    User: {
      chirps: {
        fragment: `... on User { id }`,
        resolve(user, args, context, info) {
          return info.mergeInfo.delegateToSchema({
            schema: chirpSchema,
            operation: 'query',
            fieldName: 'chirpsByAuthorId',
            args: {
              authorId: user.id
            },
            context,
            info
          });
        }
      }
    },
    Chirp: {
      author: {
        fragment: `... on Chirp { authorId }`,
        resolve(chirp, args, context, info) {
          return info.mergeInfo.delegateToSchema({
            schema: authorSchema,
            operation: 'query',
            fieldName: 'userById',
            args: {
              id: chirp.authorId
            },
            context,
            info
          });
        }
      }
    }
  }
});

const subscriptionTypeDefs = gql`
  type Notification {
    text: String
    throwError: String
  }
  type Query {
    notifications: Notification
  }
  type Subscription {
    notifications: Notification
  }
`;

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
  },
  Notification: {
    throwError: () => {
      throw new Error('subscription field error');
    }
  }
};

const subscriptionSchema = makeExecutableSchema({
  typeDefs: subscriptionTypeDefs,
  resolvers: subscriptionResolvers
});

const mergedSubscriptionSchema = mergeSchemas({
  schemas: [subscriptionSchema]
});

module.exports = {
  chirpSchema,
  authorSchema,
  mergedSchema,
  subscriptionPubSub,
  subscriptionPubSubTrigger,
  subscriptionSchema,
  mergedSubscriptionSchema
};
