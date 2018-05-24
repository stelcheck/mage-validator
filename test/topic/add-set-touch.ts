/* tslint:disable:no-console */
import * as assert from 'assert'
import { TestTopic, createTopic } from './'
import * as mage from 'mage'

let state: mage.core.IState

function createTests(name: string, testCreateArgs: string[], assertions: (...args: any[]) => any) {
  describe(name, function () {
    beforeEach(() => {
      state = new mage.core.State()
    })

    async function setupTopic(data: any) {
      return createTopic(state, data, name, function (topicName: string, ...args: string[]) {
        assert.strictEqual(topicName, 'TestTopic')
        assertions(data, ...args)
      })
    }

    it('Validation is triggered', async function () {
      const topic = await setupTopic({
        name: 'hello',
        url: 'not a url'
      })

      try {
        await (<any> topic)[name](...testCreateArgs)
      } catch (error) {
        const message = error.validationErrors[0].constraints.isUrl

        return assert.strictEqual(message, 'url must be an URL address')
      }

      throw new Error('Did not fail')
    })

    it('Valid call works correctly', async function () {
      const topic = await setupTopic({
        name: 'hello',
        url: 'https://www.google.com'
      })

      await (<any> topic)[name](...testCreateArgs)
    })
  })
}

createTests('add', ['application/json', 'utf8'], function (data: any, index: any, addData: any) {
  assert.strictEqual(index.id, '1')
  assert.deepStrictEqual(addData, Object.assign(new TestTopic(), data))
})

createTests('set', ['application/json', 'utf8'], function (data: any, index: any, addData: any) {
  assert.strictEqual(index.id, '1')
  assert.deepStrictEqual(addData, Object.assign(new TestTopic(), data))
})

createTests('touch', [], function (data: any, index: any) {
  console.log(data)
  assert.strictEqual(index.id, '1')
})
