const { WrapQuery: TransformQuery } = require('graphql-tools');
const { makeUpdater } = require('./make');

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
   * @param {object} [options.fragments] - a map of named fragment definitions that can be
   * be referenced within the selection set.
   * @param {string} [options.pseudoFragmentName=Original] - a string representing the fragment
   * name for the pseudo-fragment representing the original selection set.
   * @param {function} [options.extractor] - a function to process the result from the modified request.

   * @returns {Transform} a graphql-tools Transform instance
   * */
  constructor({
    path,
    selectionSet,
    fragments = {},
    pseudoFragmentName = 'Original',
    extractor = result => result
  }) {
    this.updater =
      typeof selectionSet === 'function'
        ? selectionSet
        : makeUpdater(selectionSet, pseudoFragmentName);

    this.transformer = new TransformQuery(
      path,
      selectionSet => this.updater(selectionSet, fragments),
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
