const { expect } = require('chai');
const { forAwaitEach } = require('iterall');
const { subscribe, parse } = require('graphql');
const {
  subscriptionPubSub,
  subscriptionPubSubTrigger,
  mergedSchema,
  mergedSubscriptionSchema
} = require('./testingSchemas');
const { Stitcher } = require('../src/Stitcher');

describe('stitcher', () => {
  describe('base Stitcher class', () => {
    it('should be instantiatable', () => {
      expect(() => new Stitcher()).to.not.throw;
    });

    it('should be instantiatable with a target schema', () => {
      expect(() => new Stitcher({ schema: mergedSchema })).to.not.throw;
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

    it('works with subscriptions', done => {
      const mockNotification = {
        notifications: {
          text: 'Hello world'
        }
      };

      const subscription = parse(`
        subscription Subscription {
          notifications {
            text
          }
        }
      `);

      let notificationCnt = 0;
      subscribe(mergedSubscriptionSchema, subscription).then(results => {
        forAwaitEach(results, result => {
          expect(result).to.have.property('data');
          expect(result.data).to.deep.equal(mockNotification);
          !notificationCnt++ ? done() : null;
        });
      }).then(() => {
        subscriptionPubSub.publish(subscriptionPubSubTrigger, mockNotification);
      });
    });
  });
});
