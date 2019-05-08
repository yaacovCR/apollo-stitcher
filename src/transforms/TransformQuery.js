const { visit, Kind } = require('graphql');

/**
 * Transform to update a selection set, useful for wrapping fields or adding additional fields.
 * @memberof module:apollo-stitcher
 */
class TransformQuery {
  /**
   * @param {object} options - options for the transform.
   * @param {string[]} options.path - path to apply selectionSet changes.
   * @param {function} options.queryTransformer - a query transformer function that takes
   * the original selection set AST and a map of the query fragments as arguments and returns a
   * new selection set.
   * @param {function} [options.resultTransformer] - an optional function that processes the
   * result of the transformed query.
   * @param {object} [options.fragments] - a map of named fragment definitions that can be
   * be referenced within the selection set.
   *
   * @returns {Transform} a graphql-tools Transform instance
   * */
  constructor({
    path,
    queryTransformer,
    resultTransformer = resultTransformer => resultTransformer,
    fragments = {},
  }) {
    this.path = path;
    this.queryTransformer = queryTransformer;
    this.resultTransformer = resultTransformer;
    this.fragments = fragments;
  }

  transformRequest(originalRequest) {
    const document = originalRequest.document;

    const pathLength = this.path.length;
    let index = 0;
    const newDocument = visit(document, {
      [Kind.FIELD]: {
        enter: node => {
          if (index === pathLength || node.name.value !== this.path[index]) {
            return false;
          }

          index++;

          if (index === pathLength) {
            const selectionSet = this.queryTransformer(
              node.selectionSet,
              this.fragments
            );

            return {
              ...node,
              selectionSet
            };
          }
        },
        leave: () => {
          index--;
        }
      }
    });
    return {
      ...originalRequest,
      document: newDocument
    };
  }

  transformResult(originalResult) {
    let index = 0;
    let leafIndex = this.path.length - 1;

    const rootData = originalResult.data;
    if (rootData) {
      let data = rootData;
      while (index < leafIndex) {
        const next = this.path[index];
        if (data[next]) {
          data = data[next];
        } else {
          break;
        }
        index++;
      }
      const next = this.path[leafIndex];
      data[next] = this.resultTransformer(data[next]);
    }

    return {
      data: rootData,
      errors: originalResult.errors
    };
  }
}

module.exports = { TransformQuery };
