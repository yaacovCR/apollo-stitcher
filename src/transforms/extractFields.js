const { visit, Kind } = require('graphql');

// Compare https://github.com/apollographql/graphql-tools/blob/master/src/transforms/ExtractField.ts
// Below code:
// 1. FIXED: Collects all matching fields instead of just the first field.
// 2. FIXME: Still Ddoes not work with named fragments along the extraction path.
function extractFields(selectionSet, path) {
  let newSelections = [];

  let index = 0;
  const lastIndex = path.length - 1;

  visit(selectionSet, {
    [Kind.FIELD]: {
      enter: node => {
        if (node.name.value !== path[index]) {
          return false;
        }

        if (index === lastIndex) {
          newSelections = newSelections.concat(node.selectionSet.selections);
          return false;
        }

        index++;
      },
      leave: () => {
        index--;
      }
    }
  });

  return {
    kind: Kind.SELECTION_SET,
    selections: newSelections
  };
}

module.exports = {
  extractFields
};
