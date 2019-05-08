const { StitchQuery } = require('./StitchQuery');
const { UpdateSelectionSet } = require('./UpdateSelectionSet');
const { TransformQuery } = require('./TransformQuery');
const make = require('./make');

module.exports = {
  StitchQuery,
  UpdateSelectionSet,
  TransformQuery,
  ...make
};
