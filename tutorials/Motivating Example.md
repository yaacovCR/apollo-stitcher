##### Goals
1. Refactor away repetitive referencing of the target schema and context for every delegation.
2. Provide a central location to define the transforms necessary to succesfully delegate to the target schema.
3. Provide a powerful and simple abstraction for transforming selection sets.
4. Ensure that selection set (and result) transformation can be chained, so that specific resolvers could add any additional necessary transformations.

##### Demonstration of transformations with extracting, wrapping, and adding fields.

If you extend the Stitcher class and define a method specific to your data model...

```javascript
const wrapInsert = stitch`{
  affected_rows
  returning {
    ...PreStitch
  }
}`;

const unwrapInsert = result =>
  result && result.affected_rows ? result.returning[0] : null

class DbStitcher extends Stitcher {
  delegateToInsertUser(args) {
    return this.transform({
      selectionSet: wrapInsert
      result: unwrapInsert
    }).delegateTo({
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
}`;

const user = await context.dataSources.db
  .from(info)
  .transform({
    selectionSet: addPassword
  })
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

The `selectionSet` tagged string literal with its `PreStitch` pseudo-fragment provides a simple abstraction for adding and wrapping fields.