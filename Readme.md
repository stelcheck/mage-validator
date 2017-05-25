mage-validator
==============

** Under heavy development **

Validation system for MAGE topics and user command input types (TypeScript).

Installation
-------------

```shell
npm install --save mage-validator
```

You will also likely want to install `class-validator` so that you may add 
validation decorators to your data class, and `class-transformer` to
have more control over datastructure of user commands incoming data.

```shell
npm install --save class-validator class-transformer
```

Usage
-----

### (Optional) Project structure

In normal MAGE projects, you need to put all your topics configuration under
`./lib/archivist/index.ts`. However, this quickly becomes hard to manage as
the number of topics grows.

Instead, we recommend using the following file structure:

```plaintext
lib/
  archivist/
    index.ts
  modules/
    modulename/
      topics/
        Players.ts
      types/
        PlayerConfig.ts
        SomethingElse.ts
      usercommands/
        addGems.ts
        commandTwo.ts
      index.ts
  index.ts
```

In other words, we recommend to separate MAGE topics and attach them to their
related modules under the `topics` folder; we also recommend to put other 
types (example: user command custom parameter type) under a `types` folder.

To make it easier for you to set this up, `mage-validator` comes with a method you
can simply drop into `./lib/archivist/index.ts`; it will scan each one of your
modules and attempt to load all topics defined in them.

> `./lib/archivist/index.ts`

```typescript
import * as mage from 'mage'
import { loadTopicsFromModules } from 'mage-validator'

loadTopicsFromModules(exports)
```

### User command parameters and return data validation

Validation works by encapsulating messages into types:

> `./lib/modules/modulename/types/PlayerData.ts`

```typescript
import { IsInt, Max } from 'class-validator';

export default class {
    @IsInt()
    @Max(5)
    public count: gems = 1
}
```

Which then can be used as user commands types:

> `./lib/modules/modulename/usercommands/addGems.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import { IsInt, Max, ValidateNested } from 'class-validator';
import PlayerData from '../types/PlayerData'

export default class {
    @IsInt()
    @Min(1)
    public gemRegisterBonus: number

    @ValidateNested()
    public data: PlayerData

    @Acl('*')
    public static async execute(state: mage.core.IState, data: PlayerData, gemRegisterBonus: number) {
        data.gems += gemRegisterBonus
        return data
    }
}
```

In this case, both `data` and `gemRegisterBonus` will be validated prior to execution, and
`data` will be validated once again once it is returned.

### Topics

#### Topic definition

Topics work the same way as types, except that they contain the topic 
configuration as static parameters:

> `./lib/modules/modulename/topics/Player.ts`

```typescript
import { ValidatedTopic } from 'mage-validator'
import { ValidateNested, Validator, IsUUID, IsAlpha } from 'class-validator';
import { Type } from 'class-transforme';
import PlayerData from '../types/PlayerData'

const validator = new Validator()

export class extends ValidatedTopic {
    // Topic configuration is statically set
    public static readonly index = ['playerId']
    public static readonly vaults = { /* add your vault configuration here*/ }

    @IsAlpha()
    public name: string

    @ValidateNested()
    @Type(() => PlayerData)
    public data: PlayerData

    setIndex(index: { playerId: string }) {
        validator.isUUID(index.playerId, 5)
        super.setIndex(index)
    }
}
```

#### Loading topics

> `./lib/modules/modulename/usercommands/getPlayer.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import Player from '../topics/Player'

export default class {
    @IsUUID(5)
    public id: string

    @Acl('*')
    public static async execute(state: mage.core.IState, id: string) {
        return await Player.get(state, { playerId: id })
    }
}
```

#### Storing topics

Topic instances also work as state wrappers:

> `./lib/modules/modulename/usercommands/createPlayer.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import PlayerData from '../types/PlayerData'
import Player from '../topics/Player'

export default class {
    @Acl('*')
    public static async execute(state: mage.core.IState, name: string) {
        const index = { playerId: '123' }
        const player = new Player(state, index)

        player.name = name
        player.data = new PlayerData()
        player.data.gems = 5
        player.add() // Same a state.archivist.add()

        return player
    }
}
```

In this particular case, you could even simply put the player
topic directly as you user command parameter; all you will 
then need to do is to set the index at some point before you attempt
to record any operations:

#### Topics as user command parameters

> `./lib/modules/modulename/usercommands/createPlayer.ts`

```typescript
import * as mage from 'mage'
import { Acl } from 'mage-validator'
import { ValidateNested } from 'class-validator'
import PlayerData from '../types/PlayerData'
import Player from '../topics/Player'

export default class {
    @ValidateNested()
    public player: Player

    @Acl('*')
    public static async execute(state: mage.core.IState, player: Player) {
        player.setIndex({ playerId: '123' })
        player.name = name
        player.data = new PlayerData()
        player.data.gems = 5
        player.add()

        return player
    }
}
```

License
-------

MIT.
