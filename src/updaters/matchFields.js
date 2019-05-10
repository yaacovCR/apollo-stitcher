const { Kind } = require('graphql');
const { collectFields } = require('./collectFields');

function matchFields(selectionSet, fragments, pattern, replace) {
  selectionSet = collectFields(selectionSet, fragments);

  const newSelections = [];

  selectionSet.selections.forEach(selection => {
    if (selection.name.value.match(pattern)) {
      if (replace) {
        newSelections.push({
          ...selection,
          name: {
            ...selection.name,
            value: selection.name.value.replace(pattern, replace)
          }
        });
      } else {
        newSelections.push(selection);
      }
    }
  });

  if (newSelections.length) {
    return {
      kind: Kind.SELECTION_SET,
      selections: newSelections
    };
  }
}

module.exports = {
  matchFields
};
