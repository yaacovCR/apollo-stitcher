const { Kind } = require('graphql');
const { WrapQuery: TransformQuery } = require('graphql-tools');

function selectionHasFieldWithSelections(selection, fieldName) {
  return (
    selection.kind === Kind.FIELD &&
    selection.name.value === fieldName &&
    selection.selectionSet &&
    selection.selectionSet.selections
  );
}

function extractOneLevelOfFields(fieldNodes, fieldName, fragments) {
  let newFieldNodes = [];

  fieldNodes.forEach(node => {
    if (node.kind === Kind.FIELD) {
      if (selectionHasFieldWithSelections(node, fieldName))
        newFieldNodes = newFieldNodes.concat(node.selectionSet.selections);
      return;
    }

    let newNodes;
    switch (node.kind) {
      case Kind.INLINE_FRAGMENT:
        newNodes = node.selectionSet.selections;
      case Kind.FRAGMENT_SPREAD:
        newNodes = fragments[node.name.value].selectionSet.selections;
    }

    if (newNodes) {
      newNodes.forEach(node => {
        if (selectionHasFieldWithSelections(node, fieldName))
          newFieldNodes = newFieldNodes.concat(node.selectionSet.selections);
      });
    }
  });

  return newFieldNodes;
}

function extractFields(selectionSet, extractionPath, fragments) {
  let newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: selectionSet ? selectionSet.selections : []
  };

  newSelectionSet.selections = extractionPath.reduce(
    (acc, fieldName) => extractOneLevelOfFields(acc, fieldName, fragments),
    newSelectionSet.selections
  );

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
