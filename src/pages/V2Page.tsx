import CharacterHeaderV2 from '../features/characterV2/components/CharacterHeaderV2'
import AttributePentagonV2 from '../features/characterV2/components/AttributePentagonV2'
import AttributeModifiersPanelV2 from '../features/characterV2/components/AttributeModifiersPanelV2'
import SpellListV2 from '../features/characterV2/components/SpellListV2'
import AttackListV2 from '../features/characterV2/components/AttackListV2'
import SkillListV2 from '../features/characterV2/components/SkillListV2'
import InventoryV2 from '../features/characterV2/components/InventoryV2'
import NotesPanelV2 from '../features/characterV2/components/NotesPanelV2'
import DiceRoller from '../features/character/components/DiceRoller'

export default function V2Page() {
  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col gap-6">
        {/* V2 badge */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold text-white uppercase tracking-widest">
              Ficha V2
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Atributos, magias e ataques provenientes da Árvore de Talento
            </span>
          </div>
          <a
            href="/talent-tree-builder"
            className="text-xs text-amber-500 hover:text-amber-400 font-semibold hover:underline"
          >
            Abrir Builder →
          </a>
        </div>

        {/* Header */}
        <CharacterHeaderV2 />

        {/* Attribute Pentagon – read-only, click to go to /arvore */}
        <section className="rounded-xl border border-amber-200 dark:border-amber-900/20 bg-amber-50/40 dark:bg-gray-900/50 px-4 py-6">
          <AttributePentagonV2 />
        </section>

        {/* Attribute Modifiers */}
        <AttributeModifiersPanelV2 />

        {/* Spells & Attacks */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
            <SpellListV2 />
          </section>
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
            <AttackListV2 />
          </section>
        </div>

        {/* Dice Roller – stateless, can be shared from v1 */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <DiceRoller />
        </section>

        {/* Skills */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <SkillListV2 />
        </section>

        {/* Inventory */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <InventoryV2 />
        </section>

        {/* Notes */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <NotesPanelV2 />
        </section>
      </div>
    </div>
  )
}
