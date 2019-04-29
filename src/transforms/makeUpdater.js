const { Kind, visit } = require('graphql');

function makeUpdater(selectionSetUpdater, pseudoFragmentName) {
  const fieldLists = [];
  const ourFields = [];
  const staticSelectionSet = visit(selectionSetUpdater, {
    [Kind.FIELD]: {
      enter: node => {
        ourFields.push({
          ...node,
          selectionSet: undefined
        });
      },
      leave: node => {
        ourFields.pop();
        if (node.selectionSet && !node.selectionSet.selections.length)
          return null;
      }
    },
    [Kind.FRAGMENT_SPREAD]: node => {
      if (node.name && node.name.value === pseudoFragmentName) {
        fieldLists.push([].concat(ourFields));
      }
      return null;
    }
  });

  return originalSelectionSet => {
    const newSelectionSet = {
      kind: Kind.SELECTION_SET,
      selections: staticSelectionSet.selections
    };

    fieldLists.forEach(fieldList => {
      const node = fieldList.reduceRight((acc, field) => {
        return {
          kind: Kind.SELECTION_SET,
          selections: [{
            ...field,
            selectionSet: acc
          }]
        };
      }, originalSelectionSet);

      newSelectionSet.selections = newSelectionSet.selections.concat(
        node.selections
      );
    });

    return newSelectionSet;
  };
}

module.exports = { makeUpdater };
