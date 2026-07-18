// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Árvore oficial embarcada + auto-load
//
// src/data/defaultTalentTree.json é a fonte da verdade da árvore oficial.
// Ao entrar no builder ou na página do jogador, a árvore embarcada é carregada
// automaticamente quando:
//   • não existe árvore local (primeiro acesso), ou
//   • a árvore local é a oficial e o arquivo embarcado tem versão maior
//     (deploy novo → todos os jogadores recebem a atualização).
//
// Para publicar uma nova versão: use "Salvar Oficial" no builder (baixa o
// defaultTalentTree.json com a versão incrementada) e substitua o arquivo em
// src/data/ manualmente — na Vercel não é possível gravar no servidor.
// ─────────────────────────────────────────────────────────────────────────────

import { useEffect } from 'react'
import defaultTreeJson from '../../data/defaultTalentTree.json'
import type { TalentTree } from '../../types/talentTree'
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

/** Carrega a árvore oficial automaticamente após a hidratação do store */
export function useDefaultTreeAutoLoad() {
  const importTree = useTalentTreeStore((s) => s.importTree)

  useEffect(() => {
    const check = () => {
      const { tree } = useTalentTreeStore.getState()
      if (shouldLoadDefaultTree(tree)) importTree(DEFAULT_TREE)
    }
    if (useTalentTreeStore.persist.hasHydrated()) {
      check()
      return
    }
    return useTalentTreeStore.persist.onFinishHydration(check)
  }, [importTree])
}
