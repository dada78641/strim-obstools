// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import type {OBSEventTypes} from 'obs-websocket-js'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {SceneItem} from '../../obs/types.ts'
import {extractTag} from '../util/util.ts'
import {UtilMixin} from '../util/index.ts'

export interface GlobalState {
  registeredManagers: Set<string>
}

export interface TriggerManagerState {
  sceneUuid: string | null
  sceneItems: SceneItem[]
  triggers: Map<string, Trigger>
  map: Map<number, string>
  active: boolean
}

export type Trigger = {
  name: string
  type: 'trigger'
  callback: TriggerCallback
} | {
  name: string
  type: 'toggle'
  callback: ToggleCallback
}

export type ToggleCallback = (state: boolean) => void

export type TriggerCallback = () => void

export function TriggersMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends UtilMixin(Base) {
    public globalState: GlobalState = {
      registeredManagers: new Set(),
    }

    /**
     * Returns true if a given manager has already been instantiated by the given name.
     */
    public hasTriggerManager(managerName: string) {
      return this.globalState.registeredManagers.has(managerName)
    }

    /**
     * Registers a trigger manager by a given name.
     */
    public registerTriggerManager(managerName: string) {
      return this.globalState.registeredManagers.add(managerName)
    }

    /**
     * Unregisters a trigger manager by a given name.
     */
    public unregisterTriggerManager(managerName: string) {
      return this.globalState.registeredManagers.delete(managerName)
    }

    /**
     * Returns a trigger manager.
     * 
     * Each trigger manager has its own state, but you typically want to only make one.
     * 
     * See the readme.md file for what a trigger manager is. This supports both
     * triggers and toggles.
     */
    public async createTriggerManager(managerName: string) {
      this.logger.log('created TriggerManager: %o', managerName)

      const state: TriggerManagerState = {
        sceneUuid: null,
        sceneItems: [],
        triggers: new Map(),
        map: new Map(),
        active: false,
      }

      /**
       * Initializes the trigger manager by finding the scene and its scene items.
       */
      const _initTriggerManager = async () => {
        if (this.hasTriggerManager(managerName)) {
          throw new Error(`TriggerManager already instantiated by this name: ${managerName}`)
        }

        this.registerTriggerManager(managerName)
        state.active = true
        _addObsListener()
        return _findScene()
      }

      /**
       * Destroys the trigger manager.
       * 
       * Normally a trigger manager is initialized and kept around for the lifetime of the script.
       */
      const _destroyTriggerManager = () => {
        state.active = false
        _removeObsListener()
      }

      /**
       * Sets the new state of a trigger source.
       * 
       * This runs on initialization, and as callback. This runs the callback, and for triggers,
       * this also sets the trigger source back to be visible.
       */
      const _setState = (trigger: Trigger, sceneItemId: number, enabled: boolean) => {
        if (!state.active || state.sceneUuid == null) {
          return
        }
        
        this.logger.log('running %o callback: %o (state: %o)', trigger.type, trigger.name, enabled)

        if (trigger.type === 'trigger' && enabled === false) {
          trigger.callback()
        }

        if (trigger.type === 'toggle') {
          trigger.callback(enabled)
        }

        if (trigger.type === 'trigger') {
          this.obs.call('SetSceneItemEnabled', {sceneUuid: state.sceneUuid, sceneItemId, sceneItemEnabled: true})
        }
      }

      /**
       * Runs the trigger callback once upon initialization.
       * 
       * This is used to ensure that the trigger is in the correct state from the start.
       */
      const _runInitialCallback = (trigger: Trigger) => {
        for (const sceneItem of state.sceneItems) {
          const tag = extractTag(sceneItem.sourceName, 'Trigger')
          if (tag.value !== trigger.name) {
            continue
          }
          _setState(trigger, sceneItem.sceneItemId, sceneItem.sceneItemEnabled)
        }
      }

      /**
       * Callback for when a scene item changes visibility.
       * 
       * If the event pertains to any of our trigger sources, this runs the callback.
       */
      const _stateCallback = (ev: OBSEventTypes['SceneItemEnableStateChanged']) => {
        if (!state.active || ev.sceneUuid !== state.sceneUuid) {
          return
        }
        const target = state.map.get(ev.sceneItemId)
        if (!target) {
          return
        }
        const trigger = state.triggers.get(target)
        if (!trigger) {
          return
        }

        return _setState(trigger, ev.sceneItemId, ev.sceneItemEnabled)
      }

      /**
       * Adds the callback listener.
       */
      const _addObsListener = () => {
        this.obs.addListener('SceneItemEnableStateChanged', _stateCallback)
      }

      /**
       * Removes the callback listener.
       */
      const _removeObsListener = () => {
        this.obs.removeListener('SceneItemEnableStateChanged', _stateCallback)
      }

      /**
       * Finds the trigger scene and enumerates its items.
       * 
       * Currently, this only occurs once on startup, and we don't support live adding items.
       * But, if needed, this can always be called again later on.
       */
      const _findScene = async () => {
        const scenes = await this.findScenes({tag: {key: 'HotkeyTriggers'}})
        if (scenes.length === 0) {
          return
        }
        const sceneItems = await this.obs.call('GetSceneItemList', {sceneUuid: scenes[0].sceneUuid})
        
        state.sceneUuid = scenes[0].sceneUuid
        state.sceneItems = sceneItems.sceneItems as unknown as SceneItem[]
        
        state.map.clear()
        for (const sceneItem of state.sceneItems) {
          const tag = extractTag(sceneItem.sourceName, 'Trigger')
          if (!tag.value) {
            continue
          }
          state.map.set(sceneItem.sceneItemId, tag.value)
        }
      }

      /**
       * Adds a trigger item to our list of known triggers.
       */
      const _addTriggerItem = (trigger: Trigger) => {
        if (!state.active) {
          throw new Error(`TriggerManager is not active`)
        }
        if (state.triggers.has(trigger.name)) {
          throw new Error(`TriggerManager already has a callback for this trigger: ${trigger.name}`)
        }
        state.triggers.set(trigger.name, trigger)
        _runInitialCallback(trigger)
      }

      /**
       * Adds a new toggle with callback.
       */
      const addToggle = (triggerName: string, callback: ToggleCallback) => {
        return _addTriggerItem({name: triggerName, type: 'toggle', callback})
      }

      /**
       * Adds a new trigger with callback.
       */
      const addTrigger = (triggerName: string, callback: TriggerCallback) => {
        return _addTriggerItem({name: triggerName, type: 'trigger', callback})
      }

      await _initTriggerManager()

      return {
        name: managerName,
        addTrigger,
        addToggle,
        destroyTriggerManager: _destroyTriggerManager
      }
    }
  }
}
