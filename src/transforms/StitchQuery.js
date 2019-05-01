const { ExtractField } = require('graphql-tools');
const { UpdateSelectionSet } = require('./UpdateSelectionSet');

/**
 * Transform handling common stitching requirements, used by the Stitcher class.
 * @memberof module:apollo-stitcher
 */
class StitchQuery {
  /**
   * @param {object} options - options for the transform.
   * @param {string[]} options.path - path to apply selectionSet and result changes.
   * @param {object} [options.fromStitch] - options for field extraction and modification.
   * @param {string[]} [options.fromStitch.path] - path to extract.
   * @param {string|object|function} [options.fromStitch.selectionSet] - a selection set specified as
   * graphql SDL or as an AST, in which references to a pseudo-fragment named PreStitch will be
   * expanded with the pre-"stitch" selection set. Alternatively, selectionSet may represent a function
   * that takes the pre-"stitch" selection set AST as an argument and returns a post-"stitch" selection
   * set. This is useful for adding required fields on a per resolver basis.
   * @param {object} [options.toStitch] - options for selectionSet modification.
   * @param {string|object|function} [options.toStitch.selectionSet] - a selection set specified as
   * graphql SDL or as an AST, in which references to a pseudo-fragment named PreStitch will be
   * expanded with the pre-"stitch" selection set. Alternatively, selectionSet may represent a function
   * that takes the pre-"stitch" selection set AST as an argument and returns a post-"stitch" selection
   * set.
   * @param {function} [options.toStitch.extractor] - a function to process the result from the modified
   * request.
   * @param {string} [options.preStitchFragmentName=PreStitch] - a string representing the fragment
   * name for the pseudo-fragment representing the pre-"stitch" selection set, to be used in
   * conjunction with the selectionSet option within the "from" and "to" methods.
   *
   * @returns {Transform} a graphql-tools Transform instance
   * */
  constructor({
    path,
    fromStitch = {},
    toStitch = {},
    preStitchFragmentName = 'PreStitch'
  }) {
    this.transforms = [];

    if (fromStitch.path) {
      this.transforms.push(
        new ExtractField({
          from: path.concat(fromStitch.path),
          to: path
        })
      );
    }

    [fromStitch, toStitch].forEach(stitch => {
      if (stitch.selectionSet) {
        this.transforms.push(
          new UpdateSelectionSet({
            path,
            selectionSet: stitch.selectionSet,
            pseudoFragmentName: preStitchFragmentName,
            extractor: stitch.extractor
          })
        );
      }
    });
  }

  transformRequest(originalRequest) {
    return this.transforms.reduce(
      (request, transform) =>
        transform.transformRequest
          ? transform.transformRequest(request)
          : request,
      originalRequest
    );
  }

  transformResult(originalResult) {
    return this.transforms.reduce(
      (result, transform) =>
        transform.transformResult ? transform.transformResult(result) : result,
      originalResult
    );
  }
}

module.exports = { StitchQuery };
