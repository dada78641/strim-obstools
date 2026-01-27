// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {uniq} from 'lodash-es'
import type {Constructor} from '../../util/mixins.ts'
import type {HasObs} from '../../obstools/base.ts'
import type {SceneItem, SceneWithSceneItems} from '../../obs/types.ts'
import {UtilMixin} from '../util/index.ts'
import {extractGameSceneLabel, extractGameTag} from './util.ts'
import {extractTag} from '../util/util.ts'

const SCENE_GAME_IDENTIFIER = '[[Game]]'

export interface GameScene {
  label: string
  primary: boolean
  scene: SceneWithSceneItems
}

export function GamesMixin<TBase extends Constructor<HasObs>>(Base: TBase) {
  return class extends UtilMixin(Base) {
    /**
     * Returns all game output scenes.
     * 
     * These are the primary output scenes, such as A1, A2, B1, B2, etc.
     * All these scenes must be tagged with "[[Game]]" in the name.
     */
    public async getGameScenes(): Promise<GameScene[]> {
      const scenes = await this.getCollectionScenesWithSceneItems()
      const gameScenes: GameScene[] = scenes
        .filter(scene => scene!.sceneName.includes(SCENE_GAME_IDENTIFIER))
        .map(scene => {
          const label = extractGameSceneLabel(scene.sceneName)
          return {
            label,
            primary: label === 'A1',
            scene,
          }
        })
        .sort((a, b) => a.label > b.label ? 1 : -1)

      return gameScenes
    }

    /**
     * Returns a list of games that we have scenes for.
     */
    public async getGames(): Promise<string[]> {
      const scenes = await this.getCollectionScenes()
      const names = scenes.map(scene => extractGameTag(scene.sceneName))
      return uniq(names).filter(name => name != null)
    }
    
    /**
     * Returns the currently active game.
     * 
     * Specific game scenes will have a tag such as [[Game:Starcraft]].
     * This function returns only the string inside that tag, e.g. "Starcraft".
     * If no active game can be found, null is returned.
     */
    public async getActiveGame(): Promise<string | null> {
      const gameScenes = await this.getGameScenes()
      const primaryScene = gameScenes.find(gameScene => gameScene.primary)
      if (!primaryScene) {
        throw new Error('No primary game scene found')
      }
      const scene = primaryScene.scene
      const res = await this.obs.call('GetSceneItemList', {sceneUuid: scene.sceneUuid})
      const sceneItems = res.sceneItems
      const activeSceneItem = sceneItems.find(sceneItem => sceneItem.sceneItemEnabled) as unknown as SceneItem
      if (!activeSceneItem || !activeSceneItem?.sourceName) {
        throw new Error('No primary game scene found')
      }
      return extractGameTag(activeSceneItem.sourceName)
    }

    /**
     * Sets a new active game.
     * 
     * Basically, this runs through all scenes, and checks all scene items for the [[Game]] tag.
     * If the game tag exists, the scene item is either made visible or invisible, depending on
     * whether the tag value is our desired game. Scene items that just have a [[Game]] tag
     * without value are left alone.
     * 
     * TODO: also set filters on/off.
     */
    public async switchActiveGame(game: string): Promise<void> {
      this.logger.log('switching to game %o', game)
      
      const games = await this.getGames()
      if (!games.includes(game)) {
        throw new Error(`Game not found: ${game}`)
      }

      const todoEnableActions = []

      const scenes = await this.getCollectionScenesWithSceneItems()
      for (const scene of scenes) {
        for (const sceneItem of scene.sceneItems) {
          const tag = extractTag(sceneItem.sourceName)
          if (tag.key === null || tag.key.toLowerCase() !== 'game' || tag.value === null) {
            continue
          }
          todoEnableActions.push({
            sceneUuid: scene.sceneUuid,
            sceneItemId: sceneItem.sceneItemId,
            sceneItemEnabled: tag.value === game,
          })
        }
      }

      await this.obs.callBatch(todoEnableActions.map(requestData => ({requestType: 'SetSceneItemEnabled', requestData})))
    }

    /**
     * Switches scenes to a given game scene by code (e.g. A1, B2, etc).
     */
    public async switchToGameScene(_code: string): Promise<void> {
      const code = _code.toUpperCase()
      this.logger.log('switching to game scene %o', code)
      const scenes = await this.getGameScenes()
      const reqScene = scenes.find(scene => scene.label === code)
      if (reqScene == null) {
        throw new Error(`Requested game scene not found: ${code}`)
      }
      await this.obs.call('SetCurrentProgramScene', {sceneUuid: reqScene.scene.sceneUuid})
    }
  }
}
