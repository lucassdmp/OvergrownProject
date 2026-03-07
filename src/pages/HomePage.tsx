import CharacterHeader from '../features/character/components/CharacterHeader'
import AttributePentagon from '../features/character/components/AttributePentagon'
import SpellList from '../features/character/components/SpellList'
import AttackList from '../features/character/components/AttackList'
import Inventory from '../features/character/components/Inventory'
import SkillList from '../features/character/components/SkillList'

export default function HomePage() {
  return (
    <div className="min-h-screen pb-16">
      <div className="mx-auto max-w-5xl px-4 py-6 flex flex-col gap-6">
        {/* ── Header ── */}
        <CharacterHeader />

        {/* ── Attribute Pentagon ── */}
        <section className="rounded-xl border border-amber-200 dark:border-amber-900/20 bg-amber-50/40 dark:bg-gray-900/50 px-4 py-6">
          <AttributePentagon />
        </section>

        {/* ── Spells & Attacks ── */}
        <div className="grid gap-6 md:grid-cols-2">
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
            <SpellList />
          </section>
          <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
            <AttackList />
          </section>
        </div>

        {/* ── Perícias ── */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <SkillList />
        </section>

        {/* ── Inventory ── */}
        <section className="rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900/50 px-4 py-4">
          <Inventory />
        </section>
      </div>
    </div>
  )
}
