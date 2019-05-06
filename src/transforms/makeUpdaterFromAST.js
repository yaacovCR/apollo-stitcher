const { Kind, visit } = require('graphql');
const { validatePseudoFragment } = require('./validatePseudoFragment');
const { extractFields } = require('./extractFields');

function updateSelectionSet(
  originalSelectionSet,
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
    }, updateInstruction.updater(originalSelectionSet));

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
    //parse one level of list values
    [Kind.ARGUMENT]: node => {
      options[directiveName][node.name.value] = node.value.values
        ? node.value.values.map(value => value.value)
        : node.value.value;
    }
  });

  return options;
}

function makeUpdaterFromPseudoFragment(pseudoFragment) {
  validatePseudoFragment(pseudoFragment);

  const options = getOptions(pseudoFragment);

  return selectionSet => {
    if (options.from) {
      selectionSet = extractFields(selectionSet, options.from.path);
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

  return originalSelectionSet =>
    updateSelectionSet(
      originalSelectionSet,
      staticSelectionSet,
      updateInstructions
    );
}

module.exports = {
  makeUpdaterFromAST
};
