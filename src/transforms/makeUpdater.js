const { Kind, visit, parse } = require('graphql');

function updateSelectionSet(
  originalSelectionSet,
  staticSelectionSet,
  fieldLists
) {
  const newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: staticSelectionSet.selections
  };

  fieldLists.forEach(fieldList => {
    const node = fieldList.reduceRight((acc, field) => {
      return {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            ...field,
            selectionSet: acc
          }
        ]
      };
    }, originalSelectionSet);

    newSelectionSet.selections = newSelectionSet.selections.concat(
      node.selections
    );
  });

  return newSelectionSet;
}

function selectionSetToAST(selectionSet) {
  const document = parse(selectionSet);
  return document.definitions[0].selectionSet
}

function makeUpdater(selectionSetUpdater, pseudoFragmentName) {
  if (typeof selectionSetUpdater === 'string')
    selectionSetUpdater = selectionSetToAST(selectionSetUpdater);

  return makeASTUpdater(selectionSetUpdater, pseudoFragmentName)
}

function makeASTUpdater(selectionSetUpdater, pseudoFragmentName) {
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

  return originalSelectionSet =>
    updateSelectionSet(originalSelectionSet, staticSelectionSet, fieldLists);
}

module.exports = { makeUpdater };
