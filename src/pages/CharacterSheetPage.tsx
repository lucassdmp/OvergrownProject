import CharacterHeader from '../features/character/components/CharacterHeader'
import AttributePentagon from '../features/character/components/AttributePentagon'
import AttributeModifiersPanel from '../features/character/components/AttributeModifiersPanel'
import SpellList from '../features/character/components/SpellList'
import AttackList from '../features/character/components/AttackList'
import SkillList from '../features/character/components/SkillList'
import Inventory from '../features/character/components/Inventory'
import NotesPanel from '../features/character/components/NotesPanel'
import DiceRoller from '../features/character/components/DiceRoller'
import { useFirebaseTalentTreeSync } from '../features/talentTree/useFirebaseTalentTreeSync'

function FirebaseSheetTreeSync() {
  useFirebaseTalentTreeSync({ readOnly: true })
  return null
}

export default function CharacterSheetPage() {
  return (
    <div className="min-h-screen pb-16">
      <FirebaseSheetTreeSync />
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
        {/* V2 badge */}
        <div className="flex items-center">
          <div className="flex items-center gap-2">
            <span className="rounded-full bg-amber-500 px-3 py-0.5 text-xs font-bold tracking-widest text-white uppercase">
              Ficha
            </span>
            <span className="text-xs text-gray-400 dark:text-gray-500">
              Atributos, magias e ataques provenientes da Árvore de Talento
            </span>
          </div>
        </div>

        {/* Header */}
        <CharacterHeader />

        {/* Attribute Pentagon – read-only, click to go to /arvore */}
        <section className="rounded-xl border border-amber-200 bg-amber-50/40 px-4 py-6 dark:border-amber-900/20 dark:bg-gray-900/50">
          <AttributePentagon />
        </section>

        {/* Attribute Modifiers */}
        <AttributeModifiersPanel />

        {/* Spells & Attacks */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
            <SpellList />
          </section>
          <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
            <AttackList />
          </section>
        </div>

        {/* Dice Roller – stateless, can be shared from v1 */}
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
          <DiceRoller />
        </section>

        {/* Skills */}
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
          <SkillList />
        </section>

        {/* Inventory */}
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
          <Inventory />
        </section>

        {/* Notes */}
        <section className="rounded-xl border border-gray-200 bg-white px-4 py-4 dark:border-gray-800 dark:bg-gray-900/50">
          <NotesPanel />
        </section>
      </div>
    </div>
  )
}
