const { DataSource } = require('apollo-datasource');
const { delegateToSchema } = require('graphql-tools');
const { StitchQuery } = require('./transforms/StitchQuery');

/**
 * Class encapsulating interactions with a graphql data source.
 * @memberof module:apollo-stitcher
 * @example
 * // execute query on targetSchema directly without working from current
 * // info object.
 * myStitcher.execute(args, ...options)
 * @example
 * // stitch current query to targetSchema, e.g. (a) pass the remaining
 * // selectionSet to the target schema, (b) pass any fragment definitions
 * // to the target schema, etc.
 * myStitcher.stitch(info).to({args, ...options})
 * @example
 * // For code re-use:
 * // 1. derive a custom Stitcher class from the base Stitcher class
 * // 2. add a toCustomMethod that calls the "to" method with predefined options
 * // 3. use the parent from() method to add resolver-specific options
 * myStitcher.stitch(info).from(options).toCustomMethod(args)
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
    this.fromStitch = {};
  }

  initialize(config) {
    this.stitchOptions.context = config.context;
  }

  /** Adds additional options to the stitch in progress, designed for adding resolver-specific
   * stitching options to the stitch in progress. In particular, users may extend the Stitcher class
   * and add methods that call the "to" method with pre-defined options, particular to their use cases.
   * Resolver-specific options may then be passed to the custom "to" method using this "from" method.
   * @param {object} options - options for schema delegation from a specific resolver.
   * @param {object} [options.path] - root field name on target schema.
   * @param {string|object|function} [options.selectionSet] - a selection set specified as graphql SDL
   * or as an AST, in which references to a pseudo-fragment named PreStitch will be expanded with the
   * pre-"stitch" selection set. Alternatively, selectionSet may represent a function that takes the
   * pre-"stitch" selection set AST as an argument and returns a post-"stitch" selection set.
   * @returns {Stitcher} a Stitcher object instance for chaining.
   * @example
   * myStitcher.stitch(info).from(options).toCustomMethod(args)
   * */
  from(options) {
    this.fromStitch = options;
    return this;
  }

  /** Stitches to the configured target schema.
   * @param {object} options - options for schema delegation to the specified target field.
   * @param {string} options.operation - one of 'query', 'mutation', or 'subscription'.
   * @param {string} options.fieldName - root field name on target schema.
   * @param {object} [options.args] named arguments for the query.
   * @param {string|object|function} [options.selectionSet] - a selection set specified as graphql SDL
   * or as an AST, in which references to a pseudo-fragment named PreStitch will be expanded with the
   * pre-"stitch" selection set. Alternatively, selectionSet may represent a function that takes the
   * pre-"stitch" selection set AST as an argument and returns a post-"stitch" selection set.
   * @param {function} [options.extractor] - a function that takes the result as a parameter and
   * returns the desired result, for use in combination with selectionSet to wrap queries prior to
   * stitching and unwrap the result.
   * @param {object[]} [options.transforms] - additional transforms to be added for this "stitch."
   * @returns {Promise} a promise that will resolve to the graphql result.
   */
  to({ operation, fieldName, args, selectionSet, extractor, transforms }) {
    this.stitchOptions.operation = operation;
    this.stitchOptions.fieldName = fieldName;
    this.stitchOptions.args = args;

    this.stitchOptions.transforms = [
      new StitchQuery({
        path: [this.stitchOptions.fieldName],
        fromStitch: this.fromStitch,
        toStitch: { selectionSet, extractor },
        fragments: this.stitchOptions.info.fragments,
        preStitchFragmentName: this.preStitchFragmentName
      }),
      ...this.stitchOptions.transforms
    ];

    if (transforms) {
      this.stitchOptions.transforms = [
        ...this.stitchOptions.transforms,
        ...transforms
      ];
    }

    return this.delegate();
  }

  delegate() {
    return delegateToSchema(this.stitchOptions);
  }

  /** Creates a new Stitcher object based on the original Stitcher object settings. This function is
   * designed to allow adding the query information prior to stitching. It takes a single parameter,
   * either an info object or an options object with the info property set.
   * @param {object} info|options - Either a graphql info object providing information about the query
   * execution, or an options object with an info property set to the graphql info object, see below.
   * @param {object} info.info - a graphql info object providing information about the query execution.
   * When specifying no other options, one can pass the info object itself instead of the options
   * object.
   * @param {object} [info.context] - a graphql context object to be passed to the executable schema.
   * If the Stitcher class is used as a datasource, the context will be automatically provided on data
   * source initialization, but can be overridden.
   * @returns {Stitcher} a Stitcher object instance for chaining.
   */
  stitch(options) {
    if (!options.info) options = { info: options };
    return new this.constructor({
      ...this.stitchOptions,
      ...options
    });
  }

  /** Creates a new Stitcher object based on the original Stitcher object settings. This function is
   * designed to allow adding the query information prior to stitching. It takes a single parameter,
   * either an info object or an options object with the info property set.
   * @param {object} info|options - Either a graphql info object providing information about the query
   * execution, or an options object with an info property set to the graphql info object, see below.
   * @param {object} info.info - a graphql info object providing information about the query execution.
   * When specifying no other options, one can pass the info object itself instead of the options
   * object.
   * @param {object} [info.context] - a graphql context object to be passed to the executable schema.
   * If the Stitcher class is used as a datasource, the context will be automatically provided on data
   * source initialization, but can be overridden.
   * @returns {Promise} a promise that will resolve to the graphql result.
   */
  execute(options) {
    return this.stitch({
      fieldNodes: [],
      schema: this.stitchOptions.schema,
      fragments: {},
      operation: {
        variableDefinitions: []
      },
      variableValues: {}
    }).to(options);
  }
}

module.exports = {
  Stitcher
};
