### Features

* Apollo datasource approach to schema stitching.
* Straightforward abstraction for extracting, adding and wrapping fields prior to delegation.
* Per-request caching using Apollo Client.

### Installation

`npm install graphql apollo-stitcher`

### Quick Start

Extend the Stitcher class and define methods specific to your data model...

```javascript
const { Stitcher, stitch } = require('apollo-stitcher');

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

### API and Demo

API: [yaacovcr.github.io/apollo-stitcher](https://yaacovcr.github.io/apollo-stitcher).

Demo: [yaacovCR/nextjs-graphql-starter](https://github.com/yaacovCR/nextjs-graphql-starter).
