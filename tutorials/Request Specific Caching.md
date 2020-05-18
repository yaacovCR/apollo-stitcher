In graphql-tools v6, wrapping a remote schema can be easily accomplished by specifying executor and subscriber functions that target a remote schema. graphql-tools provides helper functions that convert Apollo-style links to executors and subscriber functions; simple fetcher functions can also be used.

To accomplish per-request batching or caching, the executor must be customized on a per-request basis. This is easily done via the context object, which the custom executor can access. The HTTPLinkDataloader link by the Prisma team enables batching and caching; if a new HttpLinkDataloader object is added to each context, the specified executor function can easily use that function to provide per request batching and caching.

Setup is roughly as follows, with per request caching enabled only for queries and mutations.

```javascript
const { wrapSchema } = require('@graphql-tools/wrap');
const { linkToExecutor, linkToSubscriber } = require('@graphql-tools/links');
const { HTTPLinkDataloader } = require('http-link-dataloader');
const { WebSocketLink } = require('apollo-link-ws');

const schema = wrapSchema({
  schema: await createDbSchema(),
  executor: ({ document, variables, context, info }) => context.executor({ document, variables, context, info}),
  subscriber: linkToSubscriber(new WebSocketLink({ uri, /* additional options */ }),
});

const context = () => {
  return {
    executor: linkToExecutor(new HTTPLinkDataloader({ uri, /* additional options */ })),
  };
};
```

apollo-stitcher also provides a special link that uses Apollo Client to cache results, only sending queries on to the remote if the requested fields are not all in the cache. This can be combined with the above as follows:

```javascript
const { ApolloClientLink } = require('apollo-stitcher');
const { ApolloClient } = require('apollo-client');
const { InMemoryCache } = require('apollo-cache-inmemory');

const context = () => {
  return {
    executor: linkToExecutor(new ApolloClientLink({
      client: new ApolloClient({
        ssrMode: true
        cache: new InMemoryCache(),
        link: linkToRemote
      })
    }))
  };
}
```

See sample repository [yaacovCR/nextjs-graphql-starter](https://github.com/yaacovCR/nextjs-graphql-starter) for additional details.