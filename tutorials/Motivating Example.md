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

The `selectionSet` string literal and `PreStitch` pseudo-fragment within the `to` method provides a simple abstraction for adding and wrapping fields.

Without apollo-stitcher, the above can be accomplished via delegateToSchema and transforms directly (included for comparison below), so why use apollo-stitcher instead of just the StitchQuery transforms that it relies on?

1. You don't have to, the StitchQuery transform is also exported. :)
2. apollo-stitcher follows the `apollo-datasource` pattern, automatically adding the resolver context and the target schema to `delegateToSchema`.

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
