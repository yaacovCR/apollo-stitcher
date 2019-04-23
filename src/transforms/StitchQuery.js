const { Kind, visit, parse } = require('graphql');
const { WrapQuery } = require('graphql-tools');

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
        newFieldNodes.push(node.selectionSet.selections);
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
          newFieldNodes.push(node.selectionSet.selections);
      });
    }
  });

  return newFieldNodes;
}

function extractFields(fieldNodes, fromPath, fragments) {
  const newFieldNodes = fromPath.reduce(
    (acc, fieldName) => extractOneLevelOfFields(acc, fieldName, fragments),
    fieldNodes
  );

  return newFieldNodes;
}

function mergeSelectionSets(
  oldSelectionSet,
  newSelectionSet,
  preStitchFragmentName
) {
  const mergedSelectionSet = visit(newSelectionSet, {
    [Kind.SELECTION_SET]: node => {
      let foundFragment = false;
      for (let selection of node.selections) {
        if (
          selection.kind === Kind.FRAGMENT_SPREAD &&
          selection.name.value === preStitchFragmentName
        ) {
          foundFragment = true;
          break;
        }
      }
      if (foundFragment)
        node.selections = [...node.selections, ...oldSelectionSet.selections];
      return node;
    },
    [Kind.FRAGMENT_SPREAD]: node => {
      if (node.name.value === preStitchFragmentName) return null;
    }
  });

  return mergedSelectionSet;
}

function updateSelectionSet(
  oldSelectionSet,
  selectionSet,
  preStitchFragmentName
) {
  switch (typeof selectionSet) {
    case 'function':
      return selectionSet(oldSelectionSet);
    case 'string':
      const document = parse(selectionSet);
      selectionSet = document.definitions[0].selectionSet;
    default:
      return mergeSelectionSets(
        oldSelectionSet,
        selectionSet,
        preStitchFragmentName
      );
  }
}

/**
 * Transform handling common stitching requirements, used by the Stitcher class.
 * @memberof module:apollo-stitcher
 */
class StitchQuery extends WrapQuery {
  /**
   * @param {object} options - options for the transform.
   * @param {string} options.path - path to apply selectionSet and result changes.
   * @param {object} [options.fromStitch] - options for field extraction and modification.
   * @param {object} [options.fromStitch.path] - path to extract.
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
   * @param {object} [options.fragments] - fragment definitions, necessary to allow field extraction if
   * fields are specified as fragments.
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
    fragments = {},
    preStitchFragmentName = 'PreStitch'
  }) {
    super(
      path,
      selectionSet => {
        let newSelectionSet = {
          kind: Kind.SELECTION_SET,
          selections: selectionSet ? selectionSet.selections : []
        };

        if (fromStitch.path) {
          newSelectionSet.selections = extractFields(
            newSelectionSet.selections,
            fromStitch.path,
            fragments
          );
        }

        for (const stitch of [fromStitch, toStitch]) {
          if (stitch.selectionSet) {
            newSelectionSet = updateSelectionSet(
              newSelectionSet,
              stitch.selectionSet,
              preStitchFragmentName
            );
          }
        }

        return newSelectionSet;
      },
      toStitch.extractor ? toStitch.extractor : selectionSet => selectionSet
    );
  }
}

module.exports = { StitchQuery };
