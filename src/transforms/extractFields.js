const { visit, Kind } = require('graphql');

function collectFields(
  selectionSet,
  fragments,
  fields = [],
  visitedFragmentNames = {}
) {
  selectionSet.selections.forEach(selection => {
    switch (selection.kind) {
      case Kind.FIELD:
        fields.push(selection);
        break;
      case Kind.INLINE_FRAGMENT:
        collectFields(
          selection.selectionSet,
          fragments,
          fields,
          visitedFragmentNames
        );
        break;
      case Kind.FRAGMENT_SPREAD:
        const fragmentName = selection.name.value;
        if (!visitedFragmentNames[fragmentName]) {
          collectFields(
            fragments[fragmentName].selectionSet,
            fragments,
            fields,
            visitedFragmentNames
          );
        }
        break;
    }
  });

  return {
    kind: Kind.SELECTION_SET,
    selections: fields
  };
}

function extractFields(selectionSet, path, fragments) {
  let newSelections = [];

  let index = 0;
  const lastIndex = path.length - 1;

  visit(selectionSet, {
    [Kind.SELECTION_SET]: {
      enter: node => collectFields(node, fragments)
    },
    [Kind.FIELD]: {
      enter: node => {
        if (node.name.value !== path[index]) {
          return false;
        }

        if (index === lastIndex) {
          newSelections = newSelections.concat(node.selectionSet.selections);
          return false;
        }

        index++;
      },
      leave: () => {
        index--;
      }
    }
  });

  return {
    kind: Kind.SELECTION_SET,
    selections: newSelections
  };
}

module.exports = {
  extractFields
};
