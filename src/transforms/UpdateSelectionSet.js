const { Kind, visit, parse } = require('graphql');
const { WrapQuery: TransformQuery } = require('graphql-tools');

function updateSelectionSetViaPseudoFragment(
  selectionSet,
  selectionSetUpdater,
  pseudoFragmentName
) {
  const newSelectionSet = visit(selectionSetUpdater, {
    
    [Kind.SELECTION_SET]: node => {
      let foundFragment = false;
      for (let selection of node.selections) {
        if (
          selection.kind === Kind.FRAGMENT_SPREAD &&
          selection.name.value === pseudoFragmentName
        ) {
          foundFragment = true;
          break;
        }
      }

      if (foundFragment)
        node.selections = node.selections.concat(selectionSet.selections);
      
      return node;
    },

    [Kind.FRAGMENT_SPREAD]: node => {
      if (node.name.value === pseudoFragmentName) return null;
    }

  });

  return newSelectionSet;
}

function updateSelectionSet(
  selectionSet,
  selectionSetUpdater,
  pseudoFragmentName
) {
  let newSelectionSet = {
    kind: Kind.SELECTION_SET,
    selections: selectionSet ? selectionSet.selections : []
  };

  switch (typeof selectionSetUpdater) {
    case 'function':
      newSelectionSet = selectionSetUpdater(newSelectionSet);
    case 'string':
      const document = parse(selectionSetUpdater);
      selectionSetUpdater = document.definitions[0].selectionSet;
    default:
      newSelectionSet = updateSelectionSetViaPseudoFragment(
        newSelectionSet,
        selectionSetUpdater,
        pseudoFragmentName
      );
  }

  return newSelectionSet;
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
    selectionSet: selectionSetUpdater,
    pseudoFragmentName = 'Original',
    extractor = result => result
  }) {
    this.transformer = new TransformQuery(
      path,
      selectionSet => {
        return updateSelectionSet(
          selectionSet,
          selectionSetUpdater,
          pseudoFragmentName
        );
      },
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
