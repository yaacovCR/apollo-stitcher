The selectionSet updater argument to the from and to methods can be used to modify an existing selection set using a pseudo-fragment named PreStitch by default. Under the hood, this is accomplished by converting the SDL string into a function that replaces the PreStitch fragment with the PreStitch selection set.

This means that on each request, a search is performed within the statically defined selection set for the pseudo-fragment, an operation which is in theory wasteful when done dynamically. The exported makeUpdater, makeTag, and stitch functions allow the static generation of this function, so that the precompiled function can be based as the selection set updater argument.

Note that the performance benefit of this approach is likely negligible, but that some may also prefer the static approach for code readability.

### Example Using stitch

```javascript
const { Stitcher, stitch } = require('apollo-stitcher');

// OLD: const toInsertUserSelectionSet = `{
// NEW:                  VVVV
const addInsertFields = stitch`{
  affected_rows
  returning {
    ...PreStitch
  }
}`;

class DbStitcher extends Stitcher {
  toInsertUser(args) {
    return this.to({
      operation: 'mutation',
      fieldName: 'insert_user',
      args: {
        objects: [args]
      },
      selectionSet: addInsertFields,
      extractor: result =>
        result && result.affected_rows ? result.returning[0] : null
    });
  }
}
```

### Example Using makeTag

```javascript
const { Stitcher, makeTag } = require('apollo-stitcher');

// define the pseudo-fragment name
const myTag = makeTag('MyPseudoFragmentNamea');

// use the custom tag name instead of stitch
const addInsertFields = myTag`{
  affected_rows
  returning {
    ...MyPseudoFragmentName
  }
}`;

class DbStitcher extends Stitcher {
  toInsertUser(args) {
    return this.to({
      operation: 'mutation',
      fieldName: 'insert_user',
      args: {
        objects: [args]
      },
      selectionSet: addInsertFields,
      extractor: result =>
        result && result.affected_rows ? result.returning[0] : null
    });
  }
}
```

### Example Using makeUpdater

```javascript
const { Stitcher, makeUpdater } = require('apollo-stitcher');

// use makeUpdater instead of makeTag if you prefer using a regular function
// instead of a tagged template literal. 
const addInsertFields = makeUpdater(`{
  affected_rows
  returning {
    ...MyPseudoFragmentName
  }
}`, 'MyPseudoFragmentName');

class DbStitcher extends Stitcher {
  toInsertUser(args) {
    return this.to({
      operation: 'mutation',
      fieldName: 'insert_user',
      args: {
        objects: [args]
      },
      selectionSet: addInsertFields,
      extractor: result =>
        result && result.affected_rows ? result.returning[0] : null
    });
  }
}
```

