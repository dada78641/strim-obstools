// @dada78641/strim-obstools <https://github.com/dada78641/strim-obstools>
// © MIT license

import {extractTag} from '../util/util.ts'

/**
 * Returns a game scene label from a scene name.
 * 
 * This is used for scenes that have a label like A1, A2, B1, B2, etc.
 * 
 * If no label is found, "xx" is returned.
 */
export function extractGameSceneLabel(sceneName: string): string {
  const label = sceneName.match(/[ABC][0-9]/)?.[0] ?? 'xx'
  return label
}

/**
 * Extracts the game tag from a scene or source name.
 * 
 * E.g. for a scene named "StarCraft 4:3 Gameplay [[Game:StarCraft]]", this returns "StarCraft".
 * 
 * If the scene does not have a game tag at all, or has no value, this returns null.
 */
export function extractGameTag(itemName: string): string | null {
  const tag = extractTag(itemName)
  if (tag.key === null || tag.key.toLowerCase() !== 'game') {
    return null
  }
  return tag.value ?? null
}

/**
 * Checks whether a given scene or source name has a specific game tag in it.
 * 
 * If the item does not have a game tag at all, this returns null.
 */
export function hasGameTag(itemName: string, game: string): boolean | null {
  const sceneGame = extractGameTag(itemName)
  if (sceneGame == null) {
    return null
  }
  return sceneGame === game
}
