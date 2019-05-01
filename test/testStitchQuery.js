const { expect } = require('chai');
const { parse, print } = require('graphql');
const { StitchQuery } = require('../src/transforms/StitchQuery');

describe('stitcher', () => {
  describe('StitchQuery Transform', () => {
    it('should be instantiatable', () => {
      expect(() => new StitchQuery()).to.not.throw;
    });

    it('should work when all options are null', () => {
      const document = parse(`
      query customerQuery($id: ID!) {
        customerById(id: $id) {
          id
          name
          address {
            planet
          }
        }
      }
      `);

      const transform = new StitchQuery({ path: ['customerById'] });

      const transformedOperation = transform.transformRequest({
        document,
        variables: {
          id: 'c1'
        }
      });

      expect(print(transformedOperation.document)).to.equal(print(document));
    });

    it('should work when using a fromStitch to extract a selection set', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            address {
              planet
            }
          }
        }
        `);

      const transform = new StitchQuery({
        path: ['customerById'],
        fromStitch: {
          path: ['address']
        }
      });

      const transformedOperation = transform.transformRequest({
        document,
        variables: {
          id: 'c1'
        }
      });

      const expectedDocument = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            planet
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    const stitchTypes = ['fromStitch', 'toStitch'];

    stitchTypes.forEach(stitchType =>
      describe(stitchType, () =>
        it('should work when adding fields', () => {
          const document = parse(`
            query customerQuery($id: ID!) {
              customerById(id: $id) {
                id
                name
                address {
                  planet
                }
              }
            }
            `);

          const options = {
            path: ['customerById', 'address']
          };

          options[stitchType] = {
            selectionSet: `{
              id
              ...PreStitch
            }`
          };

          const transform = new StitchQuery(options);

          const transformedOperation = transform.transformRequest({
            document,
            variables: {
              id: 'c1'
            }
          });

          const expectedDocument = parse(`
            query customerQuery($id: ID!) {
              customerById(id: $id) {
                id
                name
                address {
                  id
                  planet
                }
              }
            }`
          );

          expect(print(transformedOperation.document)).to.equal(
            print(expectedDocument)
          );
        })
      )
    );
  });
});
