/* tslint:disable:no-console */
import * as assert from 'assert'
import { createTopic } from './'
import * as mage from 'mage'

let state: mage.core.IState

function createTests(name: string, testCreateArgs: string[], assertions: (...args: any[]) => any) {
  describe(name, function () {
    beforeEach(() => {
      state = new mage.core.State()
    })

    async function setupTopic(data: any) {
      return createTopic(state, data, name, function (topicName: string, ...args: string[]) {
        assert.equal(topicName, 'TestTopic')
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
        const message = error.details[0].constraints.isUrl
        assert.equal(message, 'url must be an URL address')
      }
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
  assert.equal(index.id, 1)
  assert.deepEqual(addData, data)
})

createTests('set', ['application/json', 'utf8'], function (data: any, index: any, addData: any) {
  assert.equal(index.id, 1)
  assert.deepEqual(addData, data)
})

createTests('touch', [], function (data: any, index: any) {
  console.log(data)
  assert.equal(index.id, 1)
})
