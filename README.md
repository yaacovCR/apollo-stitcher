### Features

* Apollo datasource approach to schema stitching.
* Provides straightforward abstraction for adding and wrapping fields prior to delegation.
* Extract fields as necessary from the source query, including from fragments.
* Provides simple method for per-request caching using Apollo Client.

### Installation

`npm install graphql apollo-stitcher`

### Getting Started

Extend the Stitcher class and define methods specific to your data model...

```javascript
const { Stitcher, stitch } = require('apollo-stitcher');

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
      selectionSet: wrapInsert,
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

...and just add the datasource to your server.

```javascript
const dataSources = () => {
  return {
    db: new DbStitcher({ dbSchema })
  };
};
```

Now you can just do this in your resolver:

```javascript
const user = await context.dataSources.db.delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

### API and Tutorials

See [yaacovcr.github.io/apollo-stitcher](https://yaacovcr.github.io/apollo-stitcher).