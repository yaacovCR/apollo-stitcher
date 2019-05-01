const { expect } = require('chai');
const { parse, print } = require('graphql');
const { UpdateSelectionSet } = require('../src/transforms/UpdateSelectionSet');
const { makeUpdater, makeTag } = require('../src');

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
        selectionSet: makeUpdater(`{
          outerAddressWrapper {
            outerAdditionalField
            innerAddressWrapper {
              innerAdditionalField
              ...Test
            }
            ...Test
          }
        }`, 'Test')
      };

      const transform = new UpdateSelectionSet(options);

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

  describe('makeUpdater', () => {
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
        selectionSet: tag`{
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

      const transform = new UpdateSelectionSet(options);

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
});
