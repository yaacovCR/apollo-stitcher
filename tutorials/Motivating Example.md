graphql-tools's [delegateToSchema](https://www.apollographql.com/docs/graphql-tools/schema-delegation) method and the [ExtractField and WrapQuery transforms](https://www.apollographql.com/docs/graphql-tools/schema-transforms#other) make schema delegation a snap, but provide little in the way of code organization and modularization.

##### Goals

1. Refactor away repetitive referencing of the target schema and context for every delegation.
2. Provide a powerful but simple abstraction for transforming selection sets.
3. Support selection set (and result) transformation chaining, so that specific resolvers could add any additional necessary transformations.

##### Sample Repository

See sample repository [yaacovCR/nextjs-graphql-starter](https://github.com/yaacovCR/nextjs-graphql-starter),from which the below examples were extracted.

##### Initial Demonstration

If you extend the Stitcher class and define a method specific to your data model...

```javascript
class DbStitcher extends Stitcher {
  delegateToInsertUser(args) {
    return this
      .delegateTo({
        operation: 'mutation',
        fieldName: 'insert_user',
        args: {
          objects: [args]
        }
      });
  }
}
```

...you can just add the datasource to your server...

```javascript
const dataSources = () => {
  return {
    db: new DbStitcher({ dbSchema })
  };
};
```

...and do this in your resolver:

```javascript
const user = await context.dataSources.db
  .from(info)
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

This approach adds little functionality over direct use of delegateToSchema from graphql-tools, but sets the stage for larger gains.

##### Selection Set and Result Transformations

If you need to transform the selection set prior to delegation, this can be easily accomplished using the 
`stitch` string literal tag with its `PreStitch` pseudo-fragment. The `stitch` tag returns a function capable of transforming a selection set by adding, wrapping, renaming, and/or extracting fields. The following example wraps the initial selection set and adds a single field:

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
```

The custom method above must be modified only to include the transformation prior to delegation:

```javascript
class DbStitcher extends Stitcher {
  delegateToInsertUser(args) {
    return this
      .transform(wrapInsert) // <==== add this line
      .delegateTo({
        operation: 'mutation',
        fieldName: 'insert_user',
        args: {
          objects: [args]
        }
      });
  }
}
```

##### Transformation Chaining

Chaining allows you to add additional transformations from within your custom method or from within your resolver as necessary, allowing for code reuse. Moreover, the latter approach allows individual resolvers to customize your generic pre-specified methods.

For example, if you have a signUp root field which returns a session as well as the currently logged in user, you may have to extract the selection set for the logged in user prior to using the custom method you have defined. You can use graphql directives with the `PreStitch` pseudo-fragment to do so, and just add the additional transformation prior to calling your custom method.

```javascript
const extractLoggedInUser = {
  selectionSet: stitch`{
    ...PreStitch @extract(path: ["session", "loggedInUser"])          
  }`
};

const user = await context.dataSources.db
  .from(info)
  .transform(extractLoggedInUser) // <==== transform from resolvers as needed!
  .delegateToInsertUser({
    email: lowerCaseEmail,
    password: hashedPassword
  });
```

You can add as many transformations as you need. For example, a login root field might want to combine a password check with retrieval of the user details as follows:

```javascript
const addPassword = {
  selectionSet: stitch`{
    ...PreStitch
    password          
  }`
};

const user = await context.dataSources.db
  .from(info)
  .transform(extractLoggedInUser) // 1. extract what you would like to delegate
  .transform(addPassword)         // 2. add additional fields
  .delegateToGetUser({ email: lowerCaseEmail });
```

##### Extracting and Renaming fields 

The `stitch` tag and `PreStitch` pseudofragment can also be used to match particular fields from the selection set, renaming them as desired. Consider the following example, taken from [graphql-tools issue #901](https://github.com/apollographql/graphql-tools/issues/901).

```javascript
const prependAddress = {
  selectionSet: stitch`{
    ...PreStitch @match(pattern: "streetAddress", replace: "addressStreetAddress")
    ...PreStitch @match(pattern: "zip", replace: "addressZip")
  }`,
  result: result => ({
    streetAddress: result.addressStreetAddress,
    zip: result.addressZip
  })
};
```

Compare the above in terms of readability with the implementation via the WrapQuery transform, depicted in [the second WrapQuery example provided by the graphql-tools documentation](https://www.apollographql.com/docs/graphql-tools/schema-transforms#other).


The match directive can use regular expressions to match and replace field names.

```javascript
const prependAddress = {
  selectionSet: stitch`{
    ...PreStitch @match(pattern: "(^streetAddress$|^zip$)", replace: "address_$1")
  }` 
};
```

Note:
1. The regular expression approach does not allow for appropriately camelcasing the new field names.
2. In general, this approach is not as versatile as [type transformation](https://github.com/apollographql/graphql-tools/pull/1131), as only the fields for the root query are renamed in the above example. 