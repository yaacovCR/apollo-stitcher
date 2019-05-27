##### Goals

1. Refactor away repetitive referencing of the target schema and context for every delegation.
2. Provide a central location to define the transforms necessary to succesfully delegate to the target schema.
3. Provide a powerful and simple abstraction for transforming selection sets.
4. Support selection set (and result) transformation chaining, so that specific resolvers could add any additional necessary transformations.

##### Demonstration

If you extend the Stitcher class and define a transformation and method specific to your data model...

```javascript
const wrapInsert = {
  selectionSet: stitch`{
    affected_rows
    returning {
      ...PreStitch
    }
  }`,
  result: result =>
    result && result.affected_rows ? result.returning[0] : null
};

class DbStitcher extends Stitcher {
  delegateToInsertUser(args) {
    return this.transform(wrapInsert).delegateTo({
      operation: 'mutation',
      fieldName: 'insert_user',
      args: {
        objects: [args]
      }
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
const addPassword = stitch`{
  ...PreStitch @extract(path: ["session", "loggedInUser"])
  password
}`;

const user = await context.dataSources.db
  .from(info)
  .transform({ selectionSet: addPassword })
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

The `selectionSet` tagged string literal and its `PreStitch` pseudo-fragment provide a simple abstraction for extracting, adding and wrapping fields, allowing combination of a password check and return of the logged in user details.

See sample repository [yaacovCR/nextjs-graphql-starter](https://github.com/yaacovCR/nextjs-graphql-starter) for a working example.