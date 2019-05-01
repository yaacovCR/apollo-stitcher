const { StitchQuery } = require('./StitchQuery');
const { UpdateSelectionSet } = require('./UpdateSelectionSet');
const make = require('./make');

module.exports = {
  StitchQuery,
  UpdateSelectionSet,
  ...make
};
