import { Type } from '../../src'

/**
 * Test class for nesting
 */
class Nested {
  public id: string
}

describe('@Type decorator', function () {
  it('accepts a function (normal behavior)', () => { Type(() => Nested) })
  it('accepts a class (custom behavior)', () => { Type(Nested) })
})
