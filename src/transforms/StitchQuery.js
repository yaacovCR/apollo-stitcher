const { Kind, visit } = require('graphql');
const gql = require('graphql-tag');
const { WrapQuery } = require('graphql-tools');

function extractOneLevelOfFields(fieldNodes, fieldName, fragments) {
  const newFieldNodes = fieldNodes
    .map(selection => {
      switch (selection.kind) {
        case Kind.INLINE_FRAGMENT:
          return selection.selectionSet.selections;
        case Kind.FRAGMENT_SPREAD:
          return fragments[selection.name.value].selectionSet.selections;
        case Kind.FIELD:
        default:
          return selection;
      }
    })
    .flat()
    .filter(
      selection =>
        selection.kind === Kind.FIELD &&
        selection.name.value === fieldName &&
        selection.selectionSet &&
        selection.selectionSet.selections
    )
    .map(selection => selection.selectionSet.selections)
    .flat();

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
      const document = gql(selectionSet);
      selectionSet = document.definitions[0].selectionSet;
    default:
      return mergeSelectionSets(
        oldSelectionSet,
        selectionSet,
        preStitchFragmentName
      );
  }
}

class StitchQuery extends WrapQuery {
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
