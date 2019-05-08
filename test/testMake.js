const { expect } = require('chai');
const { parse, print } = require('graphql');
const { TransformQuery } = require('../src/transforms/TransformQuery');
const { makeUpdater, makeTag, stitch } = require('../src');

describe('stitcher', () => {
  describe('makeUpdater', () => {
    it('should work', () => {
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
        queryTransformer: makeUpdater(
          `
          {
            outerAddressWrapper {
              outerAdditionalField
              innerAddressWrapper {
                innerAdditionalField
                ...Test
              }
              ...Test
            }
          }
          `,
          'Test'
        )
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
  });

  describe('makeTag', () => {
    it('should work', () => {
      const tag = makeTag('Test');

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
        queryTransformer: tag`{
          outerAddressWrapper {
            outerAdditionalField
            innerAddressWrapper {
              innerAdditionalField
              ...Test
            }
            ...Test
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
  });

  describe('stitch', () => {
    it('should work', () => {
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
  });

  describe('stitching directives', () => {
    it('should not work when using stitching directives with unknown arguments', () => {
      expect(() => {
        stitch`{
          ...PreStitch @from(unknownArgument: "value")
        }`;
      }).to.throw();
    });

    it('should not work when using stitching directives with arguments of the wrong type', () => {
      expect(() => {
        stitch`{
          ...PreStitch @from(path: [1, 2, 3])
        }`;
      }).to.throw();
    });

    it('should work when using stitching directives with the from argument', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            id
            name
            address {
              outer {
                inner1
              }
              outer {
                inner2
              }
            }
            address {
              outer {
                inner3
              }
              outer {
                inner4
              }
            }
            telephone
          }
        }
      `);

      const options = {
        path: ['customerById'],
        queryTransformer: stitch`{
          ...PreStitch @from(path: ["address", "outer"])
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
            inner1
            inner2
            inner3
            inner4
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });

    it('should work when using stitching directives and fragments', () => {
      const document = parse(`
        query customerQuery($id: ID!) {
          customerById(id: $id) {
            ...OuterFragment
          }
        }
      `);

      const fragmentDocument = parse(`
        fragment OuterFragment on Customer {
          outer {
            inner1
          }
          ...InnerFragment
        }
        fragment InnerFragment on Customer {
          outer {
            inner2
          }
        }
      `);

      fragments = {};

      fragmentDocument.definitions.forEach(def => {
        fragments[def.name.value] = def;
      });

      const options = {
        path: ['customerById'],
        queryTransformer: stitch`{
          ...PreStitch @from(path: ["outer"])
        }`,
        fragments
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
            inner1
            inner2
          }
        }
      `);

      expect(print(transformedOperation.document)).to.equal(
        print(expectedDocument)
      );
    });
  });
});
