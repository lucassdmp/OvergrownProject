import CharacterHeader from '../features/character/components/CharacterHeader'
import AttributePentagon from '../features/character/components/AttributePentagon'
import AttributeModifiersPanel from '../features/character/components/AttributeModifiersPanel'
import SpellList from '../features/character/components/SpellList'
import AttackList from '../features/character/components/AttackList'
import SkillList from '../features/character/components/SkillList'
import Inventory from '../features/character/components/Inventory'
import NotesPanel from '../features/character/components/NotesPanel'
import { useDefaultTreeAutoLoad } from '../features/talentTree/defaultTree'

export default function CharacterSheetPage() {
  useDefaultTreeAutoLoad()

  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto flex max-w-5xl flex-col gap-6 px-4 py-6">
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
