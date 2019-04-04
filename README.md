### Motivating Example

If you extend the Stitcher class and define a method specific to your data model...

```javascript
const { Stitcher } = require('apollo-stitcher');

class DbStitcher extends Stitcher {
  toInsertUser(args) {
    return this.to({
      operation: 'mutation',
      fieldName: 'insert_user',
      args: {
        objects: [args]
      },
      selectionSet: `{
        affected_rows
        returning {
          ...PreStitch
        }
      }`,
      extractor: result =>
        result && result.affected_rows ? result.returning[0] : null
    });
  }
}
```

...and just add the datasource to your server...

```javascript
const dataSources = () => {
  return {
    db: new DbStitcher({ dbSchema })
  };
};
```

...you can just do this in your resolver:

```javascript
const user = await context.dataSources.db
  .stitch(info)
  .from({ path: ['session', 'loggedInUser'] })
  .toInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

Without apollo-stitcher, the above can be accomplished via delegateToSchema and transforms directly (included for comparison below), so why use apollo-stitcher instead of just the StitchQuery transforms that it relies on?

1. Primarily, because apollo-stitcher gives you an (opinionated) approach to organize the required transforms and get them to your resolver.
2. As a side benefit, apollo-stitcher obviates the need to add the target schema to the resolver context, and automatically passes both the target schema and resolver context to delegateToSchema.

As in the above example, apollo-stitcher can be passed a selectionSet string literal which embeds the initial selection set using a fragment-like syntax. Currently, the StitchQuery transform that apollo-stitcher uses parses the string literal on each call. Initial testing demonstrates negligible overhead, however, a further optimization could include one-time generation of a custom transform based on the string literal.

### Request Specific Stitching Caching with Apollo Client

To accomplish per-request batching or caching, one should define the link used for a remote target schema on a per-request basis. Unfortunately, makeRemoteExecutableSchema from graphql-tools requires a link or fetcher to finish creating resolvers for the schema at the time of executable schema creation. Fortunately, those resolvers and the link provided to them have access to the graphql context, and if the true desired link is on the context, the request can be routed on dynamically with the proper setup. 

apollo-stitcher polyfills makeRemoteExecutableSchema to allow for dynamic specification of a link or fetcher on the context. The new dispatcher option should be set to a function that takes the graphql context as a parameter and returns the desired link or fetcher. Under the hood, the polyfill uses a special link that simply calls the dispatcher function at the time of delegation and routes the query to the context-specified link or fetcher. This functionality could be integrated within the graphql-tools library with conversion of the apollo-stitcher approach to TypeScript. Use is as follows:

```javascript
const { makeRemoteExecutableSchema } = require('apollo-stitcher');
const { HTTPLinkDataloader } = require('http-link-dataloader');

const schema = makeRemoteExecutableSchema({
  schema: await createDbSchema(),
  dispatcher: context => context.link
});

const context = () => {
  return {
    link: new HTTPLinkDataloader({ uri: endpoint })
  };
}
```

apollo-stitcher also provides a special link that uses Apollo Client to cache results, only sending queries on to the remote if the requested fields are not all in the cache. This can be combined with the above as follows:

```javascript
const { ApolloClientLink } = require('apollo-stitcher');
const { ApolloClient } = require('apollo-client');
const { InMemoryCache } = require('apollo-cache-inmemory');

const context = () => {
  return {
    link: new ApolloClientLink({
      client: new ApolloClient({
        ssrMode: true
        cache: new InMemoryCache(),
        link: linkToRemote
      })
    })
  };
}
```

##### Direct use of delegateToSchema

The below is provided for comparison to the initial apollo-stitcher motivating example:

```javascript
const fromLoginToInsertUserTransform = new ExtractField({
  from: ['insert_user', 'session', 'loggedInUser'],
  to: ['insert_user']
});

const toInsertUserTransform = new WrapQuery(
  ['insert_user'],
  subtree => ({
    kind: Kind.SELECTION_SET,
    selections: [
      {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'affected_rows'
        }
      },
      {
        kind: Kind.FIELD,
        name: {
          kind: Kind.NAME,
          value: 'returning'
        },
        selectionSet: subtree
      }
    ]
  }),
  result => (result && result.affected_rows ? result.returning[0] : null)
);

const user = delegateToSchema({
  schema: context.dbSchema,
  context,
  info,
  operation: 'mutation',
  fieldName: 'insert_user',
  args: {
    objects: [
      {
        email: lowerCaseEmail,
        password: hashedPassword
      }
    ]
  },
  transforms: [fromLoginToInsertUserTransform, toInsertUserTransform]
});
```