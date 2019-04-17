const { expect } = require('chai');
const { execute, subscribe, parse } = require('graphql');
const {
  subscriptionPubSub,
  subscriptionPubSubTrigger,
  mergedSchema,
  chirpSchema,
  authorSchema,
  subscriptionSchema,
  delegatingSubscriptionSchema
} = require('./testingSchemas');
const gql = require('graphql-tag');
const { Stitcher } = require('../src/Stitcher');

describe('stitcher', () => {
  describe('base Stitcher class', () => {
    it('should be instantiatable', () => {
      expect(() => new Stitcher()).to.not.throw;
    });

    it('should be instantiatable with a target schema', () => {
      expect(() => new Stitcher({ schema: mergedSchema })).to.not.throw;
    });

    it('should work', async () => {
      const document = gql`
        query ChirpById($id: ID!) {
          chirpById(id: $id) {
            id
            text
            author {
              id
              email
              chirps {
                id
                text
                author {
                  id
                  email
                }
              }
            }
          }
        }
      `;

      const result = await execute({
        schema: mergedSchema,
        document,
        contextValue: {
          chirpStitcher: new Stitcher({ schema: chirpSchema }),
          authorStitcher: new Stitcher({ schema: authorSchema })
        },
        variableValues: {
          id: '0'
        }
      });

      expect(result).to.exist;
      expect(result.data).to.exist;
      expect(result.data.chirpById).to.exist;
      expect(result.data.chirpById.id).to.exist;
      expect(result.data.chirpById.text).to.exist;
      expect(result.data.chirpById.author).to.exist;
      expect(result.data.chirpById.author.id).to.exist;
      expect(result.data.chirpById.author.email).to.exist;
    });

    it('should allow direct execution', async () => {
      const stitcher = new Stitcher({ schema: mergedSchema });
      const result = await stitcher.execute({
        operation: 'query',
        fieldName: 'chirpById',
        args: { id: '0' },
        selectionSet: `{
          id
          text
          authorId
        }`
      });

      expect(result).to.exist;
      expect(result.id).to.exist;
      expect(result.text).to.exist;
      expect(result.authorId).to.exist;
    });

    it('works with subscriptions', async () => {
      const mockNotification = {
        notifications: {
          text: 'Hello world'
        }
      };

      const document = gql`
        subscription Notifications {
          notifications {
            text
          }
        }
      `;

      const subIterator = await subscribe({
        schema: delegatingSubscriptionSchema,
        document,
        contextValue: {
          subscriptionStitcher: new Stitcher({ schema: subscriptionSchema })
        }
      });

      const promiseIterableResult = subIterator.next();
      subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
      const result = (await promiseIterableResult).value;
      
      expect(result).to.have.property('data');
      expect(result.data).to.deep.equal(mockNotification);
    });
  });
});
