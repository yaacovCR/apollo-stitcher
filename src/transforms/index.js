const { StitchQuery } = require('./StitchQuery');
const { ExtractFields } = require('./ExtractFields');
const { UpdateSelectionSet } = require('./UpdateSelectionSet');
const { makeUpdater } = require('./makeUpdater');

module.exports = {
  StitchQuery,
  ExtractFields,
  UpdateSelectionSet,
  makeUpdater
};
