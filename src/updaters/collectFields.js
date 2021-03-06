const { Kind } = require('graphql');

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

module.exports = {
  collectFields
};
