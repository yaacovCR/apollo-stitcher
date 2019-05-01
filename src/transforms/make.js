const { Kind, visit, parse } = require('graphql');

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

function makeUpdaterFromPseudoFragment(node) {
  return selectionSet => selectionSet;
}

function selectionSetToAST(selectionSet) {
  const document = parse(selectionSet);
  return document.definitions[0].selectionSet;
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

/**
 * Function that precompiles a selection set updater SDL string into a function.
 * @memberof module:apollo-stitcher
 * @param {string} selectionSetUpdater - an SDL string that updates a selection set using a
 * pseudo-fragment to represent the pre-stitch selection set.
 * @param {string} pseudoFragmentName - the pseudo-fragment name to use when updating.
 * @returns {function} a function that updates a selection set.
 * @example
 * const { Stitcher, makeUpdater } = require('apollo-stitcher');
 *
 * const addInsertFields = makeUpdater(`{
 *   affected_rows
 *   returning {
 *     ...PreStitch
 *   }
 * }`, 'PreStitch');
 *
 * class DbStitcher extends Stitcher {
 *   toInsertUser(args) {
 *     return this.to({
 *       operation: 'mutation',
 *       fieldName: 'insert_user',
 *       args: {
 *         objects: [args]
 *       },
 *       selectionSet: addInsertFields,
 *       extractor: result =>
 *         result && result.affected_rows ? result.returning[0] : null
 *     });
 *   }
 * }
 **/
function makeUpdater(selectionSetUpdater, pseudoFragmentName) {
  if (typeof selectionSetUpdater === 'string')
    selectionSetUpdater = selectionSetToAST(selectionSetUpdater);

  return makeUpdaterFromAST(selectionSetUpdater, pseudoFragmentName);
}

/**
 * Function that creates a tag for use with a template literal to precompile a selection set
 * updater SDL string into a function with the specified pseudo-fragment name.
 * @memberof module:apollo-stitcher
 * @param {string} pseudoFragmentName - the pseudo-fragment name to use when updating.
 * @returns {function} a tag function that can parse a selection set SDL string template literal.
 * @example
 * const { Stitcher, makeTag } = require('apollo-stitcher');
 *
 * const stitch = makeTag('PreStitch');
 *
 * const addInsertFields = stitch`{
 *   affected_rows
 *   returning {
 *     ...PreStitch
 *   }
 * }`;
 *
 * class DbStitcher extends Stitcher {
 *   toInsertUser(args) {
 *     return this.to({
 *       operation: 'mutation',
 *       fieldName: 'insert_user',
 *       args: {
 *         objects: [args]
 *       },
 *       selectionSet: addInsertFields,
 *       extractor: result =>
 *         result && result.affected_rows ? result.returning[0] : null
 *     });
 *   }
 * }
 **/
function makeTag(pseudoFragmentName) {
  return function(strings, ...expressions) {
    const sdl = String.raw(strings, ...expressions);
    const ast = selectionSetToAST(sdl);
    return makeUpdaterFromAST(ast, pseudoFragmentName);
  };
}

module.exports = {
  makeUpdater,
  makeTag
};
