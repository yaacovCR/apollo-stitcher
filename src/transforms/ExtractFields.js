const { Kind } = require('graphql');
const { WrapQuery: TransformQuery } = require('graphql-tools');

function extractOneLevelOfFields(fieldNodes, fieldName, fragments) {
  let newFieldNodes = [];

  fieldNodes.forEach(node => {
    let possibleNodes;
    switch (node.kind) {
      case Kind.FIELD:
        possibleNodes = [node];
        break;
      case Kind.INLINE_FRAGMENT:
        possibleNodes = node.selectionSet.selections;
        break;
      case Kind.FRAGMENT_SPREAD:
        possibleNodes = fragments[node.name.value].selectionSet.selections;
        break;
    }

    if (possibleNodes) {
      possibleNodes.forEach(node => {
        if (
          node.kind === Kind.FIELD &&
          node.name.value === fieldName &&
          node.selectionSet
        )
          newFieldNodes = newFieldNodes.concat(node.selectionSet.selections);
      });
    }
  });

  return newFieldNodes;
}

function extractFields(selectionSet, extractionPath, fragments) {
  let newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: []
  };

  selectionSet.selections.forEach(node => {
    let possibleNodes;
    switch (node.kind) {
      case Kind.FIELD:
        possibleNodes = [node];
        break;
      case Kind.INLINE_FRAGMENT:
        possibleNodes = node.selectionSet.selections;
        break;
      case Kind.FRAGMENT_SPREAD:
        possibleNodes = fragments[node.name.value].selectionSet.selections;
        break;
    }

    if (possibleNodes) {
      possibleNodes.forEach(node => {
        if (
          node.kind === Kind.FIELD &&
          node.name.value === extractionPath[0] &&
          node.selectionSet
        ) {
          newSelectionSet.selections = newSelectionSet.selections.concat(
            node.selectionSet.selections
          );
        } else {
          newSelectionSet.selections.push(node);
        }
      });
    }
  });

  return newSelectionSet;
}

/**
 * Transform for extracting fields nested within a request to higher up within the selection set
 * hierarchy.
 * @memberof module:apollo-stitcher
 */
class ExtractFields {
  /**
   * @param {object} options - options for the transform.
   * @param {string[]} options.initialPath - initial portion of path to source fields; target for
   * extracted fields.
   * @param {string[]} options.extractionPath - additional path to source fields; this path will not
   * appear within the request after the transformation.
   * @param {object} [options.fragments] - fragment definitions, necessary to allow field extraction if
   * fields are specified as fragments.
   *
   * @returns {Transform} a graphql-tools Transform instance
   * */
  constructor({ initialPath, extractionPath, fragments = {} }) {
    this.transformer = new TransformQuery(initialPath, selectionSet => {
      return extractFields(selectionSet, extractionPath, fragments);
    });
  }

  transformRequest(request) {
    return this.transformer.transformRequest(request);
  }
}

module.exports = { ExtractFields };
