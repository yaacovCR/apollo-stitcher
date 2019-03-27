const { expect } = require('chai');

const { Stitcher } = require('../src/Stitcher');

describe('stitcher', () => {
  describe('Stitcher class', () => {
    it('should be instantiatable', () => {
      const stitcher = new Stitcher({ schema: null });
      expect(stitcher).to.not.be.null;
    });
  });
});
