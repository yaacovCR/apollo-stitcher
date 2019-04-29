const { parse } = require('graphql');
const { WrapQuery: TransformQuery } = require('graphql-tools');
const { makeUpdater } = require('./makeUpdater');

function getUpdater(selectionSetUpdater, pseudoFragmentName) {
  switch (typeof selectionSetUpdater) {
    case 'function':
      return selectionSet => selectionSetUpdater(selectionSet);
    case 'string':
      const document = parse(selectionSetUpdater);
      selectionSetUpdater = document.definitions[0].selectionSet;
    default:
      return makeUpdater(selectionSetUpdater, pseudoFragmentName);
  }
}

/**
 * Transform to update a selection set, useful for wrapping fields or adding additional fields.
 * @memberof module:apollo-stitcher
 */
class UpdateSelectionSet {
  /**
   * @param {object} options - options for the transform.
   * @param {string[]} options.path - path to apply selectionSet changes.
   * @param {string|object|function} [options.selectionSet] - a selection set specified as
   * graphql SDL or as an AST, in which references to a pseudo-fragment named Original will be
   * expanded with the original selection set. Alternatively, selectionSet may represent a function
   * that takes the original selection set AST as an argument and returns a new selection set.
   * @param {string} [options.pseudoFragmentName=Original] - a string representing the fragment
   * name for the pseudo-fragment representing the original selection set.
   * @param {function} [options.extractor] - a function to process the result from the modified request.

   * @returns {Transform} a graphql-tools Transform instance
   * */
  constructor({
    path,
    selectionSet,
    pseudoFragmentName = 'Original',
    extractor = result => result
  }) {
    this.updater = getUpdater(selectionSet, pseudoFragmentName);

    this.transformer = new TransformQuery(
      path,
      selectionSet => this.updater(selectionSet),
      extractor
    );
  }

  transformRequest(request) {
    return this.transformer.transformRequest(request);
  }

  transformResult(result) {
    return this.transformer.transformResult(result);
  }
}

module.exports = { UpdateSelectionSet };
