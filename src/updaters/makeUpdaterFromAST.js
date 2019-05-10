const { Kind, visit, valueFromASTUntyped } = require('graphql');
const { validatePseudoFragment } = require('./validatePseudoFragment');
const { extractFields } = require('./extractFields');
const { matchFields } = require('./matchFields');

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
    const updatedSelectionSet = updateInstruction.updater(
      originalSelectionSet,
      fragments
    );

    if (updatedSelectionSet) {
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
      }, updatedSelectionSet);

      newSelectionSet.selections = newSelectionSet.selections.concat(
        node.selections
      );
    }
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
      const argumentName = node.name.value;
      options[directiveName][argumentName] = valueFromASTUntyped(node.value);
      if (directiveName === 'match' && argumentName === 'pattern') {
        options.match.pattern = new RegExp(options.match.pattern);
      }
    }
  });

  return options;
}

function makeUpdaterFromPseudoFragment(pseudoFragment) {
  validatePseudoFragment(pseudoFragment);

  const options = getOptions(pseudoFragment);

  return (selectionSet, fragments) => {
    if (options.extract) {
      selectionSet = extractFields(
        selectionSet,
        options.extract.path,
        fragments
      );
    }
    if (options.match) {
      selectionSet = matchFields(
        selectionSet,
        fragments,
        options.match.pattern,
        options.match.replace
      );
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
