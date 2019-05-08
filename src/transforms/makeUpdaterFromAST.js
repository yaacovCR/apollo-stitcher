const { Kind, visit, valueFromASTUntyped } = require('graphql');
const { validatePseudoFragment } = require('./validatePseudoFragment');
const { extractFields } = require('./extractFields');

function updateSelectionSet(
  originalSelectionSet,
  fragments,
  staticSelectionSet,
  updateInstructions
) {
  const newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: staticSelectionSet.selections
  };

  updateInstructions.forEach(updateInstruction => {
    const node = updateInstruction.fields.reduceRight((acc, field) => {
      return {
        kind: Kind.SELECTION_SET,
        selections: [
          {
            ...field,
            selectionSet: acc
          }
        ]
      };
    }, updateInstruction.updater(originalSelectionSet, fragments));

    newSelectionSet.selections = newSelectionSet.selections.concat(
      node.selections
    );
  });

  return newSelectionSet;
}

function getOptions(pseudoFragment) {
  const options = {};

  let directiveName;
  visit(pseudoFragment, {
    [Kind.DIRECTIVE]: {
      enter: node => {
        directiveName = node.name.value;
        options[directiveName] = {};
      },
      leave: () => {
        directiveName = null;
      }
    },
    [Kind.ARGUMENT]: node => {
      options[directiveName][node.name.value] = valueFromASTUntyped(node.value);
    }
  });

  return options;
}

function makeUpdaterFromPseudoFragment(pseudoFragment) {
  validatePseudoFragment(pseudoFragment);

  const options = getOptions(pseudoFragment);

  return (selectionSet, fragments) => {
    if (options.from) {
      selectionSet = extractFields(selectionSet, options.from.path, fragments);
    }
    return selectionSet;
  };
}

function makeUpdaterFromAST(selectionSetUpdater, pseudoFragmentName) {
  const updateInstructions = [];
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
        updateInstructions.push({
          fields: [].concat(ourFields),
          updater: makeUpdaterFromPseudoFragment(node)
        });
      }
      return null;
    }
  });

  return (originalSelectionSet, fragments) =>
    updateSelectionSet(
      originalSelectionSet,
      fragments,
      staticSelectionSet,
      updateInstructions
    );
}

module.exports = {
  makeUpdaterFromAST
};
