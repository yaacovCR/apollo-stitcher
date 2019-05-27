You can use apollo-stitcher without Apollo data sources or without Apollo Server!

##### Without Apollo Data Sources

If you do not use Apollo data sources, you must add your stitcher to the context directly instead of the dataSources function.

```javascript
const context = () => {
  return {
    db: new DbStitcher({ dbSchema })
  };
};
```

Within your resolver, reference your stitcher directly from the context, and you are done.

```javascript
const user = await context.db // <===== instead of context.db.dataSources
  .from(info)
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

If you need to pass the resolver context to your stitcher, do so within the from method, which can take either the info object itself, or an object with info and context properties.

```javascript
const user = await context.db
  .from({ info, context })  // <===== that's this here!
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

##### Without Apollo Server

apollo-stitcher uses Apollo in the following senses:
1. Schema delegation relies on the `delegateToSchema` method from graphql-tools, provided by the Apollo team.
2. When used as a data source, the context will be added automatically as above.
3. That's it!

The above approach therefore works without Apollo Server without additional modification. In fact, the test suite uses vanilla GraphQL.