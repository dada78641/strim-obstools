// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {omitBy} from 'lodash-es'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {SceneWithSceneItems} from '../../obs/types.ts'
import {hasTag} from '../util/util.ts'
import {UtilMixin} from '../util/index.ts'
import {TAG_DEBUG_SOURCE} from '../util/tags.ts'

export function DebugMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends UtilMixin(Base) {
    /**
     * Sets the debug mode on or off.
     * 
     * When debug mode is on, a bunch of testing sources are made visible.
     * Browser sources are set to ?simulate mode.
     */
    public async setDebugMode(value: boolean) {
      this.logger.log('setting debug mode: %o', value)

      await this.setBrowserSourceSimulation(value)

      const scenes = await this.getDebugScenes()
      const sceneData = scenes
        .flatMap(scene => scene.sceneItems
          .map(sceneItem => ({
            sceneUuid: scene.sceneUuid,
            sceneItemId: sceneItem.sceneItemId,
            sceneItemEnabled: value
          })))
      
      await this.obs.callBatch(sceneData.map(requestData => ({requestType: 'SetSceneItemEnabled', requestData})))
    }

    /**
     * Sets "simulate" value for all browser sources.
     * 
     * Browser sources that are capable of running a simulation for testing purposes will have
     * either a &simulate parameter, or a &_simulate parameter. The latter turns the parameter off,
     * while retaining information that it supports this parameter.
     * 
     * This causes all browser sources with either of these parameters to refresh.
     */
    public async setBrowserSourceSimulation(value: boolean) {
      this.logger.log('setting browser sources to &simulate: %o', value)

      // Filter browser sources to ones that have aren't local.
      const browserSources = (await this.getCollectionBrowserSources())
        .filter(source => source.inputSettings?.url != null)
      
      // Get only the ones that have &simulate or &_simulate set.
      const simulatableBrowserSources = browserSources.filter(source => {
        const url = new URL(source.inputSettings.url)
        return url.searchParams.has('simulate') || url.searchParams.has('_simulate')
      })

      // Generate a new URL for the browser source, with either &simulate or &_simulate set.
      const todoSetInputSettings = simulatableBrowserSources
        .map(source => {
          const url = new URL(source.inputSettings.url)
          url.searchParams.delete('simulate')
          url.searchParams.delete('_simulate')
          url.searchParams.set(value ? 'simulate' : '_simulate', '1')
          if (String(url) === source.inputSettings.url) {
            return null
          }
          return {
            inputName: source.sourceName,
            inputSettings: {
              ...source.inputSettings,
              url: String(url),
            }
          }
        })
        .filter(requestData => requestData != null)

      await this.obs.callBatch(todoSetInputSettings.map(requestData => ({requestType: 'SetInputSettings', requestData})))
    }

    /**
     * Returns whether debug mode is enabled or not.
     * 
     * If any of the testing inputs are enabled, this returns true.
     */
    public async getDebugMode() {
      const sceneItems = await this.getDebugSceneItems()
      const enabledSceneItem = sceneItems.find(sceneItem => sceneItem.sceneItemEnabled)
      return enabledSceneItem != null
    }

    /**
     * Returns all debug scene items.
     */
    public async getDebugSceneItems() {
      const scenes = await this.getDebugScenes()
      const sceneItems = scenes.map(scene => scene.sceneItems).flat()
      return sceneItems
    }

    /**
     * Returns scenes with debug scene items.
     * 
     * All scene items that are not debug items are filtered out.
     */
    public async getDebugScenes(): Promise<SceneWithSceneItems[]> {
      const scenes = (await this.getCollectionScenesWithSceneItems())
        .map(scene => ({
          ...scene,
          sceneItems: Object.values(omitBy(scene.sceneItems, (item => !hasTag(item.sourceName, TAG_DEBUG_SOURCE))))
        }))
        .filter(scene => scene.sceneItems.length)
      return scenes
    }
  }
}
