const { visit, Kind, BREAK } = require('graphql');

// See https://github.com/apollographql/graphql-tools/blob/master/src/transforms/ExtractField.ts
// Below code: 
// 1. Collects first instead of all matching fields.
// 2. Does not work with named fragments along the extraction path.
function extractFields(selectionSet, path) {
  let newSelectionSet;
  const ourPath = JSON.stringify(path);
  const fieldPath = [];
  visit(selectionSet, {
    [Kind.FIELD]: {
      enter: node => {
        fieldPath.push(node.name.value);
        if (ourPath === JSON.stringify(fieldPath)) {
          newSelectionSet = node.selectionSet;
          return BREAK;
        }
      },
      leave: () => {
        fieldPath.pop();
      }
    }
  });
  if (!newSelectionSet) {
    throw `Could not find path ${ourPath}.`;
  }
  return newSelectionSet;
}

module.exports = {
  extractFields
};
