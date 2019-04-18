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
};
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
