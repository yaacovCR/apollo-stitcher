const { parse } = require('graphql');
const { makeUpdaterFromAST } = require('./makeUpdaterFromAST');

/**
 * Function that converts a selection set updater SDL string into a parsed AST.
 * @memberof module:apollo-stitcher
 * @param {string} selectionSet - an SDL string.
 * @returns {object} a parsed AST.
 * @example
 * const ast = selectionSetToAST(`{
  *   affected_rows
  *   returning {
  *     ...MyPseudoFragmentName
  *   }
  * }`);
  **/ 
function selectionSetToAST(selectionSet) {
  const document = parse(selectionSet);
  return document.definitions[0].selectionSet;
}

/**
 * Function that precompiles a selection set updater SDL string into a function.
 * @memberof module:apollo-stitcher
 * @param {string} selectionSetUpdater - an SDL string that updates a selection set using a
 * pseudo-fragment to represent the pre-stitch selection set.
 * @param {string} pseudoFragmentName - the pseudo-fragment name to use when updating.
 * @returns {function} a function that updates a selection set.
 * @example
 * const addInsertFields = makeUpdater(`{
 *   affected_rows
 *   returning {
 *     ...MyPseudoFragmentName
 *   }
 * }`, 'MyPseudoFragmentName');
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
 * const addInsertFields = myTag`{
 *   affected_rows
 *   returning {
 *     ...MyPseudoFragmentName
 *   }
 * }`;
 **/
function makeTag(pseudoFragmentName) {
  return function(strings, ...expressions) {
    const sdl = String.raw(strings, ...expressions);
    const ast = selectionSetToAST(sdl);
    return makeUpdaterFromAST(ast, pseudoFragmentName);
  };
}

/**
 * Function that creates a tag for use with a template literal to precompile a selection set
 * updater SDL string into a function with the default pseudo-fragment name 'PreStitch'.
 * @memberof module:apollo-stitcher
 * @function
 * @returns {function} a tag function that can parse a selection set SDL string template literal.
 * @example
 * const addInsertFields = stitch`{
 *   affected_rows
 *   returning {
 *     ...PreStitch
 *   }
 * }`;
 **/
const stitch = makeTag('PreStitch');

module.exports = {
  selectionSetToAST,
  makeUpdater,
  makeTag,
  stitch
};
