const { visit, Kind } = require('graphql');
const { collectFields } = require('./collectFields');

function extractFields(selectionSet, path, fragments) {
  let newSelections = [];

  let index = 0;
  const lastIndex = path.length - 1;

  visit(selectionSet, {
    [Kind.SELECTION_SET]: {
      enter: node => collectFields(node, fragments)
    },
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
