[![TypeScript](https://img.shields.io/badge/TypeScript-3178C6?logo=typescript&logoColor=fff)](https://www.typescriptlang.org/) [![MIT license](https://img.shields.io/badge/license-MIT-brightgreen.svg)](https://opensource.org/licenses/MIT) [![npm version](https://badge.fury.io/js/@dada78641%2Fstrim-obstools.svg)](https://badge.fury.io/js/@dada78641%2Fstrim-obstools)

# @dada78641/strim-obstools

This library wraps [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js) and provides a number of higher level operations.

The functionality provided by this library is specific to my personal OBS setup, and most of the functions don't work if the scenes aren't set up in a particular way.

## Usage

Install via npm:

```bash
npm i @dada78641/strim-obstools
```

Basic usage is as follows:

```js
import {ObsTools} from '@dada78641/strim-obstools'

const ot = new ObsTools({address: 'ws://obs.local:4455', password: 'my_password'})
ot.once('ready', async () => {
  // OBS is connected and ready to do stuff.
  const game = await ot.getActiveGame()
  // Direct access to the obs-websocket-js instance:
  const scenes = await ot.obs.call('GetSceneList')
})
```

The `ready` event is fired when OBS is ready to start handling requests (which might be some time after it successfully connects). See the `ConnectionEvents` type to find out which events get fired.

This library is designed to be used both on server and browser.

### Tags

This library is based around the concept of "tags" in scene names and source names. Tags take on the following form:

* A single tag: `[[TestItem]]`
* A key-value tag: `[[Game:StarCraft]]`

This is used to find specific types of scenes and sources and do stuff with them (e.g. hide/unhide them).

### Triggers

Triggers are a little hack. Very simply put, they're placeholder sources that, when hidden, fire a callback and then unhide themselves. The sources themselves are never seen—they're purely there for the callbacks.

A trigger either just sends a single signal (it's always visible; fires a callback when hidden, and then instantly unhides itself), or can be used as a binary toggle (it can be hidden or visible and fires a callback when toggled).

The reason triggers are used is because it's an easy way to send custom events without your tool needing to be websocket aware. For example, the Elgato Stream Deck can't send websocket events, but it can hide sources; so using triggers, the Stream Deck can be purposed to directly send events.

## See also

* [OBS Websocket v5 protocol reference](https://github.com/obsproject/obs-websocket/blob/master/docs/generated/protocol.md)

## License

MIT licensed.
