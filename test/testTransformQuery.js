const { expect } = require('chai');
const { parse, print } = require('graphql');
const { TransformQuery, stitch } = require('../src');

describe('stitcher', () => {
  describe('TransformQuery Transform', () => {
    it('should be instantiable', () => {
      expect(() => new TransformQuery()).to.not.throw;
    });

    it('should work when wrapping fields', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            address {
              street
            }
          }
        }
      `);

      const options = {
        path: ['customerById', 'address'],
        queryTransformer: stitch`{
          addressWrapper {
            ...PreStitch
          }
        }`
      };

      const transform = new TransformQuery(options);

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
              addressWrapper {
                street
              }
            }
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should work when wrapping fields multiple times', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            address {
              street
            }
          }
        }
      `);

      const options = {
        path: ['customerById', 'address'],
        queryTransformer: stitch`{
          outerAddressWrapper {
            innerAddressWrapper {
              ...PreStitch
            }
            ...PreStitch
          }
        }`
      };

      const transform = new TransformQuery(options);

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
              outerAddressWrapper {
                innerAddressWrapper {
                  street
                }
              }
              outerAddressWrapper {
                street
              }
            }
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

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
        path: ['customerById', 'address'],
        queryTransformer: stitch`{
          id
          ...PreStitch
        }`
      };

      const transform = new TransformQuery(options);

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
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should work when wrapping fields multiple times and adding fields', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            address {
              street
            }
          }
        }
      `);

      const options = {
        path: ['customerById', 'address'],
        queryTransformer: stitch`{
          outerAddressWrapper {
            outerAdditionalField
            innerAddressWrapper {
              innerAdditionalField
              ...PreStitch
            }
            ...PreStitch
          }
        }`
      };

      const transform = new TransformQuery(options);

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
              outerAddressWrapper {
                outerAdditionalField
                innerAddressWrapper {
                  innerAdditionalField
                }
              }
              outerAddressWrapper {
                innerAddressWrapper {
                  street
                }
              }
              outerAddressWrapper {
                street
              }
            }
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should work when transforming a result', () => {
      const result = {
        data: {
          test1: {
            test2: {
              test3: 4
            }
          }
        }
      };

      const options = {
        path: ['test1', 'test2'],
        resultTransformer: () => 'transformed!'
      };

      const transform = new TransformQuery(options);

      const transformedResult = transform.transformResult(result);

      const expectedResult = {
        data: {
          test1: {
            test2: 'transformed!'
          }
        },
        errors: undefined
      };

      expect(transformedResult).to.deep.equal(expectedResult);
    });
  });
});
