const { parse, buildASTSchema, validate } = require('graphql');

const pseudoFragmentSchema = buildASTSchema(
  parse(`
  directive @from(path: [String!]!) on FRAGMENT_SPREAD

  type Query {
    domain: Boolean
  }
`)
);

const {
  //FieldsOnCorrectTypeRule,
  FragmentsOnCompositeTypesRule,
  KnownArgumentNamesRule,
  //KnownDirectivesRule,
  KnownFragmentNamesRule,
  //KnownTypeNamesRule,
  LoneAnonymousOperationRule,
  NoFragmentCyclesRule,
  NoUndefinedVariablesRule,
  //NoUnusedFragmentsRule,
  NoUnusedVariablesRule,
  OverlappingFieldsCanBeMergedRule,
  PossibleFragmentSpreadsRule,
  ProvidedRequiredArgumentsRule,
  ScalarLeafsRule,
  SingleFieldSubscriptionsRule,
  UniqueArgumentNamesRule,
  UniqueDirectivesPerLocationRule,
  UniqueFragmentNamesRule,
  UniqueInputFieldNamesRule,
  UniqueOperationNamesRule,
  UniqueVariableNamesRule,
  ValuesOfCorrectTypeRule,
  VariablesAreInputTypesRule,
  VariablesInAllowedPositionRule
} = require('graphql');

const rules = [
  //FieldsOnCorrectTypeRule,
  FragmentsOnCompositeTypesRule,
  KnownArgumentNamesRule,
  //KnownDirectivesRule,
  KnownFragmentNamesRule,
  //KnownTypeNamesRule,
  LoneAnonymousOperationRule,
  NoFragmentCyclesRule,
  NoUndefinedVariablesRule,
  //NoUnusedFragmentsRule,
  NoUnusedVariablesRule,
  OverlappingFieldsCanBeMergedRule,
  PossibleFragmentSpreadsRule,
  ProvidedRequiredArgumentsRule,
  ScalarLeafsRule,
  SingleFieldSubscriptionsRule,
  UniqueArgumentNamesRule,
  UniqueDirectivesPerLocationRule,
  UniqueFragmentNamesRule,
  UniqueInputFieldNamesRule,
  UniqueOperationNamesRule,
  UniqueVariableNamesRule,
  ValuesOfCorrectTypeRule,
  VariablesAreInputTypesRule,
  VariablesInAllowedPositionRule
];

function validatePseudoFragment(pseudoFragment) {
  const document = parse(`
    fragment ${pseudoFragment.name.value} on AllTypes {
      anyFieldName
    }
  `);
  document.definitions.push(pseudoFragment);
  const errors = validate(pseudoFragmentSchema, document, rules);
  if (errors.length) throw errors;
}

module.exports = {
  validatePseudoFragment
};
