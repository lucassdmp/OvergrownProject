// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Árvore oficial embarcada + auto-load
//
// src/data/defaultTalentTree.json é a fonte da verdade da árvore oficial.
// Ao entrar no builder ou na página do jogador, a árvore embarcada é carregada
// automaticamente quando:
//   • não existe árvore local (primeiro acesso), ou
//   • a árvore local é a oficial e o arquivo embarcado tem versão maior
//     (deploy novo → todos recebem a atualização).
//
// No ambiente local, o builder salva cada alteração diretamente neste JSON por
// meio do middleware de desenvolvimento do Vite. Em produção o arquivo é
// somente leitura e continua sendo empacotado no build.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import defaultTreeJson from '../../data/defaultTalentTree.json'
import type { TalentTree } from '../../types/talentTree'
import type { Character } from '../../types/game'
import { useCharacterStore } from '../character/store/characterStore'
import { useTalentTreeStore } from './store/talentTreeStore'

export const DEFAULT_TREE = defaultTreeJson as unknown as TalentTree

export function shouldLoadDefaultTree(current: TalentTree): boolean {
  // Primeiro acesso / árvore vazia
  if (!current.nodes || current.nodes.length === 0) return true
  // Árvore oficial desatualizada (deploy novo)
  if (current.id === DEFAULT_TREE.id && (DEFAULT_TREE.version ?? 0) > (current.version ?? 0))
    return true
  // Árvore legada (pré-oficial, sem version) → substitui pela oficial.
  // Rascunhos exportados continuam recuperáveis via "Importar" no builder.
  if (current.version == null && current.id !== DEFAULT_TREE.id) return true
  return false
}

function nodeSignature(node: TalentTree['nodes'][number]) {
  if (node.data.type === 'attribute') return `attribute:${node.data.attribute ?? 'choice'}`
  if (node.data.type === 'combatAbility') return `ability:${node.data.skillId}`
  if (node.data.type === 'magic') return `magic:${node.data.name}`
  if (node.data.type === 'player') return `player:${node.data.name.toLowerCase()}`
  return node.data.type
}

/** Best-effort, deterministic migration from any prior official topology. */
export function migrateCharacterTalentNodes(
  character: Character,
  previousTree: TalentTree,
  nextTree: TalentTree,
): Character {
  const previousById = new Map(previousTree.nodes.map((node) => [node.id, node]))
  const nextById = new Map(nextTree.nodes.map((node) => [node.id, node]))
  const legacy = new Map(
    nextTree.nodes.flatMap((node) => (node.legacyIds ?? []).map((id) => [id, node.id] as const)),
  )
  const candidates = new Map<string, string[]>()
  for (const node of nextTree.nodes) {
    const signature = nodeSignature(node)
    candidates.set(signature, [...(candidates.get(signature) ?? []), node.id])
  }
  const consumed = new Set<string>()
  const mapping = new Map<string, string>()

  for (const oldId of character.acquiredNodeIds) {
    let nextId = nextById.has(oldId) ? oldId : legacy.get(oldId)
    const oldNode = previousById.get(oldId)
    if (!nextId && oldNode?.data.type === 'player') {
      const name = oldNode.data.name.toLowerCase()
      if (name.includes('mago') || name.includes('curandeiro') || name.includes('wisdom'))
        nextId = 'wisdom-start'
    }
    if (!nextId && oldNode) {
      const pool = candidates.get(nodeSignature(oldNode)) ?? []
      const oldClass = oldId.split('-')[0]
      nextId =
        pool.find((id) => id.startsWith(`${oldClass}-`) && !consumed.has(id)) ??
        pool.find((id) => !consumed.has(id))
    }
    if (!nextId) continue
    consumed.add(nextId)
    mapping.set(oldId, nextId)
  }

  const nodeConfigs = Object.fromEntries(
    Object.entries(character.nodeConfigs ?? {})
      .map(([oldId, config]) => [mapping.get(oldId), config] as const)
      .filter(
        (
          entry,
        ): entry is readonly [string, { attribute?: import('../../types/game').AttributeName }] =>
          Boolean(entry[0]),
      ),
  )
  return {
    ...character,
    acquiredNodeIds: [...new Set(mapping.values())],
    nodeConfigs,
  }
}

function migrateAllCharacters(previousTree: TalentTree) {
  const state = useCharacterStore.getState()
  const characters = Object.fromEntries(
    Object.entries(state.characters).map(([id, character]) => [
      id,
      migrateCharacterTalentNodes(character, previousTree, DEFAULT_TREE),
    ]),
  )
  const character =
    characters[state.character.id] ??
    migrateCharacterTalentNodes(state.character, previousTree, DEFAULT_TREE)
  useCharacterStore.setState({ characters, character })
}

export function useDefaultTreeAutoLoad() {
  const importTree = useTalentTreeStore((state) => state.importTree)

  useEffect(() => {
    const loadWhenNeeded = () => {
      const { tree } = useTalentTreeStore.getState()
      if (shouldLoadDefaultTree(tree)) {
        migrateAllCharacters(tree)
        importTree(structuredClone(DEFAULT_TREE))
      }
    }

    if (useTalentTreeStore.persist.hasHydrated()) {
      loadWhenNeeded()
      return
    }
    return useTalentTreeStore.persist.onFinishHydration(loadWhenNeeded)
  }, [importTree])
}
