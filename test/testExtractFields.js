const { expect } = require('chai');
const { parse, print, Kind } = require('graphql');
const { ExtractFields } = require('../src/transforms/ExtractFields');

describe('stitcher', () => {
  describe('ExtractFields Transform', () => {
    it('should be instantiable', () => {
      expect(() => new ExtractFields()).to.not.throw;
    });

    it('should work when extracting fields', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            data {
              id
              name
              street
            }
          }
        }
      `);

      const options = {
        initialPath: ['customerById'],
        extractionPath: ['data']
      };

      const transform = new ExtractFields(options);

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
            street
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should preserve other fields when extracting fields', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name {
              firstName
              lastName
            } 
            details {
              street
            }
          }
        }
      `);

      const options = {
        initialPath: ['customerById'],
        extractionPath: ['details']
      };

      const transform = new ExtractFields(options);

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
            name {
              firstName
              lastName
            } 
            street
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should work when extracting a selection set from a fragment', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            ...CustomerFragment
          }
        }
        fragment CustomerFragment on Customer {
          address {
            planet
          }
        }
      `);

      const fragments = document.definitions
        .filter(def => def.kind === Kind.FRAGMENT_DEFINITION)
        .reduce((acc, def) => {
          acc[def.name.value] = def;
          return acc;
        }, {});

      const transform = new ExtractFields({
        initialPath: ['customerById'],
        extractionPath: ['address'],
        fragments
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
            id
            name
            planet
          }
        }
        fragment CustomerFragment on Customer {
          address {
            planet
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });
  });
});
