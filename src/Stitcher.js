const { Kind } = require('graphql');
const { DataSource } = require('apollo-datasource');
const { delegateToSchema, createRequest, delegateRequest } = require('@graphql-tools/delegate');
const { makeUpdater, selectionSetToAST } = require('./updaters');
const { TransformQuery } = require('./transforms/TransformQuery');

/**
 * Class encapsulating interactions with a graphql data source.
 * @memberof module:apollo-stitcher
 * @example
 * // execute query on targetSchema directly without working from current
 * // info object.
 * myStitcher.execute({operation, fieldName, selectionSet, args})
 * @example
 * // stitch current query to targetSchema, i.e. pass the remaining
 * // selectionSet to the target schema
 * myStitcher.from(info).delegateTo({operation, fieldName, args})
 * @example
 * // stitch current query to targetSchema, transform prior to delegation
 * myStitcher.from(info).transform({selectionSet, result}).delegateTo({operation, fieldName, args})
 * @example
 * // For code re-use:
 * // 1. derive a custom Stitcher class from the base Stitcher class
 * // 2. add a custom delegator with any required transforms
 * myStitcher.from(info).delegateToFieldWithTransforms(args)
 */
class Stitcher extends DataSource {
  /**
   * @param {object} options - options for interacting with the graphql data source.
   * @param {object} options.schema - an executable schema providing access to the graphql data source,
   * possibly created via use of makeExecutableSchema or makeRemoteExecutableSchema from the
   * graphql-tools package.
   * @param {object[]} [options.transforms] - additional transforms to be added on schema delegation.
   * Transforms can be added here on initial Stitcher creation or later on a per "stitch" basis.
   * @param {string} [options.preStitchFragmentName=PreStitch] - a string representing the fragment
   * name for the pseudo-fragment representing the pre-"stitch" selection set, to be used in
   * conjunction with the selectionSet option within the "from" and "to" methods.
   */
  constructor({
    schema,
    context,
    info,
    preStitchFragmentName = 'PreStitch',
    transforms = []
  }) {
    super();
    this.stitchOptions = {
      schema,
      context,
      info,
      transforms
    };

    this.preStitchFragmentName = preStitchFragmentName;
    this.queryTransformers = [];
    this.resultTransformers = [];
  }

  initialize(config) {
    this.stitchOptions.context = config.context;
  }

  /** Transform the selection set prior to delegation. Options can be specified to transform the
   * requested selection set prior to delegation and/or to reverse the transformation on receipt of
   * the result. Multiple transformations can be performed; selection set transformations are applied
   * sequentially, while result tranformation reversals are processed in reverse order.
   * @param {object} options - options for selectionSet transformation.
   * @param {string|object|function} options.selectionSet - a selection set specified as graphql SDL
   * or as an AST, in which references to a pseudo-fragment named PreStitch will be expanded with the
   * pre-"stitch" selection set. Alternatively, selectionSet may represent a function that takes the
   * pre-"stitch" selection set AST as an argument and returns a post-"stitch" selection set. For
   * example, a selection set can be specified to wrap fields prior to delegation, or to add fields.
   * @param {function} [options.result] - an optional function to reverse the transformation. For
   * example, if the selection set transformation involves wrapping the selection set prior to
   * delegation, this option can be used to automatically unwrap the result.
   * @returns {Stitcher} a Stitcher object instance for chaining.
   * @example
   * myStitcher.from(info).transform({selectionSet, result}).delegateTo({operation, fieldName, args})
   * * */
  transform({ selectionSet, result }) {
    selectionSet =
      typeof selectionSet === 'function'
        ? selectionSet
        : makeUpdater(selectionSet, this.preStitchFragmentName);

    this.queryTransformers.push(selectionSet);
    if (result) {
      this.resultTransformers.push(result);
    }

    return this;
  }

  /** Delegates to the configured target schema.
   * @param {object} options - options for schema delegation to the specified target field.
   * @param {string} options.operation - one of 'query', 'mutation', or 'subscription'.
   * @param {string} options.fieldName - root field name on target schema.
   * @param {object} [options.args] named arguments for the query.
   * @param {object[]} [options.transforms] - additional transforms to be added for this "stitch."
   * @returns {Promise} a promise that will resolve to the graphql result.
   */
  delegateTo(options) {
    const delegationOptions = {
      ...this.stitchOptions,
      ...options,
      transforms: []
    };

    const { queryTransformers, resultTransformers } = this;
    if (queryTransformers.length) {
      const composedQueryTransformer = queryTransformers.reduce(
        (acc, queryTransformer) => (selectionSet, fragments) =>
          queryTransformer(acc(selectionSet, fragments), fragments)
      );

      const composedResultTransformer = resultTransformers.length
        ? resultTransformers.reduce((acc, resultTransformer) => result =>
            acc(resultTransformer(result))
          )
        : result => result;

        delegationOptions.transforms.push(
        new TransformQuery({
          path: [delegationOptions.fieldName],
          queryTransformer: composedQueryTransformer,
          resultTransformer: composedResultTransformer,
          fragments: delegationOptions.info && delegationOptions.info.fragments
        })
      );
    }

    delegationOptions.transforms.concat(delegationOptions.transforms, options.transforms);

    if (delegationOptions.request) {
      return delegateRequest({
        ...delegationOptions,
      });
    }

    return delegateToSchema(delegationOptions);
  }

  /** Creates a new Stitcher object based on the original Stitcher object settings. This function is
   * designed to allow adding the query information prior to stitching. It takes a single parameter,
   * either an info object or an options object with the info property set. When specifying no other
   * options, one can pass the info object itself instead of the options object.
   * @param {object} [info] - a graphql info object providing information about the query execution.
   * @param {object} [options] - an options object with an info property set to the graphql info object.
   * @param {object} options.info - a graphql info object providing information about the query
   * execution.
   * @param {object} [options.context] - a graphql context object to be passed to the executable schema.
   * If the Stitcher class is used as a datasource, the context will be automatically provided on data
   * source initialization, but can be overridden.
   * @returns {Stitcher} a Stitcher object instance for chaining.
   */
  from(options) {
    if (!options.info) options = { info: options };
    return new this.constructor({
      ...this.stitchOptions,
      ...options
    });
  }

  /** Directly executes a query without stitching an info object.
   * @param {object} options - options for schema delegation to the specified target field.
   * @param {string} options.operation - one of 'query', 'mutation', or 'subscription'.
   * @param {string} options.fieldName - root field name on target schema.
   * @param {object} [options.args] named arguments for the query.
   * @param {string|object|function} [options.selectionSet] - a selection set specified as graphql SDL
   * or as an AST.
   * @param {function} [options.result] - an optional function to transform the result.
   * @param {object[]} [options.transforms] - additional transforms to be added for this "stitch."
   * @returns {Promise} a promise that will resolve to the graphql result.
   */
  execute(options) {
    const schema = this.stitchOptions.schema;
    
    let returnType;

    if (options.operation === 'query') {
      returnType = schema.getQueryType().getFields()[options.fieldName].type;
    } else if (options.operation === 'mutation') {
      returnType = schema.getMutationType().getFields()[options.fieldName].type;
    } else if (options.operation === 'mutation') {
      returnType = schema.getSubscriptionType().getFields()[options.fieldName].type;
    }

    const { operation, fieldName, selectionSet, result, ...rest } = options;

    const request = createRequest({
      targetOperation: operation,
      targetFieldName: fieldName,
      selectionSet: [{
        kind: Kind.SELECTION_SET,
        selections: []
      }],
    });
    
    const stitch = new this.constructor({
      ...this.stitchOptions,
      ...options,
      request,
      returnType,
    });

    if (selectionSet) {
      stitch.transform({
        selectionSet:
          typeof selectionSetUpdater === 'string'
            ? selectionSetToAST(selectionSet)
            : selectionSet,
        result: result
      });
    }

    return stitch.delegateTo({
      request,
      returnType,
      info: {
        schema: stitch.stitchOptions.schema
      },
      operation,
      fieldName,
      ...rest
    });
  }
}

module.exports = {
  Stitcher
};
