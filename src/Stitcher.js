const { DataSource } = require('apollo-datasource');
const { delegateToSchema } = require('graphql-tools');
const { StitchQuery } = require('./transforms/StitchQuery');

class Stitcher extends DataSource {
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

  from(options) {
    this.fromStitch = options;
    return this;
  }

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

  stitch(options) {
    if (!options.info) options = { info: options };
    return new this.constructor({
      ...this.stitchOptions,
      ...options
    });
  }

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
