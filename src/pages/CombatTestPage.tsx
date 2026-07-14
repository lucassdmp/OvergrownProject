import { useMemo, useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCharacterStore } from '../features/character/store/characterStore'
import {
  analyzeResult,
  averageInitiative,
  buildGenericCombatant,
  buildSavedCombatant,
  COMBAT_TEST_ARMORS,
  COMBAT_TEST_SPELLS,
  COMBAT_TEST_WEAPONS,
  compareResults,
  createCharacterFromGeneric,
  runSimulation,
  sideMetrics,
} from '../features/combatTest/engine'
import type {
  BalanceFinding,
  DefensePolicy,
  GenericProfileConfig,
  SimCombatant,
  SimulationResult,
} from '../features/combatTest/types'
import { downloadTextFile } from '../utils/downloadFile'

type SourceMode = 'saved' | 'generic'

interface SideSetup {
  mode: SourceMode
  savedId: string
  policy: DefensePolicy
  generic: GenericProfileConfig
}

const inputClass = 'w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 outline-none transition focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 dark:border-gray-700 dark:bg-gray-950 dark:text-gray-100'
const panelClass = 'rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900'

function percent(value: number) {
  return `${(value * 100).toFixed(1)}%`
}

function number(value: number) {
  return value.toLocaleString('pt-BR', { maximumFractionDigits: 2 })
}

function createSetup(side: 'A' | 'B', savedId: string): SideSetup {
  return {
    mode: savedId ? 'saved' : 'generic',
    savedId,
    policy: 'optimal',
    generic: {
      name: `Combatente ${side}`,
      divinity: 10,
      focus: side === 'A' ? 'weapon' : 'spell',
      optionId: side === 'A' ? (COMBAT_TEST_WEAPONS[0]?.id ?? '') : (COMBAT_TEST_SPELLS[0]?.id ?? ''),
      defenseStyle: 'balanced',
      armorId: COMBAT_TEST_ARMORS.find((armor) => armor.label.includes('Couro'))?.id ?? '',
    },
  }
}

function SetupPanel({
  label,
  setup,
  setSetup,
  savedCharacters,
  profile,
  onExport,
}: {
  label: string
  setup: SideSetup
  setSetup: (value: SideSetup) => void
  savedCharacters: ReturnType<typeof useCharacterStore.getState>['characters'][string][]
  profile: SimCombatant
  onExport: () => void
}) {
  const options = setup.generic.focus === 'weapon' ? COMBAT_TEST_WEAPONS : COMBAT_TEST_SPELLS
  const updateGeneric = (patch: Partial<GenericProfileConfig>) => setSetup({ ...setup, generic: { ...setup.generic, ...patch } })

  return (
    <section className={`${panelClass} overflow-hidden`}>
      <div className="border-b border-gray-200 bg-gray-50 px-5 py-4 dark:border-gray-800 dark:bg-gray-900/80">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">{label}</p>
            <h2 className="mt-1 text-xl font-bold">{profile.name}</h2>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-900 dark:bg-amber-950 dark:text-amber-200">{profile.sourceLabel}</span>
        </div>
      </div>

      <div className="space-y-4 p-5">
        <div className="grid grid-cols-2 gap-2 rounded-xl bg-gray-100 p-1 dark:bg-gray-950">
          {(['saved', 'generic'] as const).map((mode) => (
            <button
              key={mode}
              type="button"
              onClick={() => setSetup({ ...setup, mode })}
              className={`rounded-lg px-3 py-2 text-sm font-semibold transition ${setup.mode === mode ? 'bg-white text-amber-800 shadow-sm dark:bg-gray-800 dark:text-amber-300' : 'text-gray-600 hover:text-gray-900 dark:text-gray-400 dark:hover:text-white'}`}
            >
              {mode === 'saved' ? 'Ficha V0' : 'Perfil genérico'}
            </button>
          ))}
        </div>

        {setup.mode === 'saved' ? (
          <label className="block text-sm font-semibold">
            Personagem salvo
            <select className={`${inputClass} mt-1.5`} value={setup.savedId} onChange={(event) => setSetup({ ...setup, savedId: event.target.value })}>
              {savedCharacters.length === 0 && <option value="">Nenhuma ficha encontrada</option>}
              {savedCharacters.map((character) => <option key={character.id} value={character.id}>{character.name || 'Ficha sem nome'}, DIV {character.divinity}</option>)}
            </select>
          </label>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-sm font-semibold sm:col-span-2">
              Nome do perfil
              <input className={`${inputClass} mt-1.5`} value={setup.generic.name} onChange={(event) => updateGeneric({ name: event.target.value })} />
            </label>
            <label className="text-sm font-semibold">
              DIV
              <input className={`${inputClass} mt-1.5`} type="number" min={0} max={100} value={setup.generic.divinity} onChange={(event) => updateGeneric({ divinity: Number(event.target.value) })} />
            </label>
            <label className="text-sm font-semibold">
              Defesa do perfil
              <select className={`${inputClass} mt-1.5`} value={setup.generic.defenseStyle} onChange={(event) => updateGeneric({ defenseStyle: event.target.value as GenericProfileConfig['defenseStyle'] })}>
                <option value="balanced">Equilibrada</option>
                <option value="evasion">Esquiva</option>
                <option value="block">Bloqueio</option>
              </select>
            </label>
            <label className="text-sm font-semibold sm:col-span-2">
              Armadura equipada
              <select className={`${inputClass} mt-1.5`} value={setup.generic.armorId} onChange={(event) => updateGeneric({ armorId: event.target.value })}>
                {COMBAT_TEST_ARMORS.map((armor) => <option key={armor.id || 'none'} value={armor.id}>{armor.label}</option>)}
              </select>
            </label>
            <label className="text-sm font-semibold">
              Foco ofensivo
              <select
                className={`${inputClass} mt-1.5`}
                value={setup.generic.focus}
                onChange={(event) => {
                  const focus = event.target.value as GenericProfileConfig['focus']
                  updateGeneric({ focus, optionId: focus === 'weapon' ? (COMBAT_TEST_WEAPONS[0]?.id ?? '') : (COMBAT_TEST_SPELLS[0]?.id ?? '') })
                }}
              >
                <option value="weapon">Arma</option>
                <option value="spell">Magia</option>
              </select>
            </label>
            <label className="text-sm font-semibold">
              {setup.generic.focus === 'weapon' ? 'Arma principal' : 'Magia principal'}
              <select className={`${inputClass} mt-1.5`} value={setup.generic.optionId} onChange={(event) => updateGeneric({ optionId: event.target.value })}>
                {options.map((option) => <option key={option.id} value={option.id}>{option.label}</option>)}
              </select>
            </label>
          </div>
        )}

        <label className="block text-sm font-semibold">
          Uso da Reação defensiva
          <select className={`${inputClass} mt-1.5`} value={setup.policy} onChange={(event) => setSetup({ ...setup, policy: event.target.value as DefensePolicy })}>
            <option value="optimal">Escolher menor dano esperado</option>
            <option value="dodge">Priorizar Esquiva</option>
            <option value="block">Priorizar Bloqueio</option>
            <option value="none">Não reagir</option>
          </select>
        </label>

        <ProfileSummary profile={profile} />
        {setup.mode === 'generic' && (
          <button type="button" onClick={onExport} className="w-full rounded-xl border border-amber-500 px-4 py-2.5 text-sm font-black text-amber-900 transition hover:bg-amber-50 dark:text-amber-200 dark:hover:bg-amber-950">
            Criar e abrir como ficha V0
          </button>
        )}
      </div>
    </section>
  )
}

function ProfileSummary({ profile }: { profile: SimCombatant }) {
  const skillLabels = { luta: 'Luta', pontaria: 'Pontaria', arcanismo: 'Arcanismo' }
  const activeSkills = [...new Set(profile.actions.map((action) => action.combatSkill))]
  const stats = [
    ['HP', profile.maxHp], ['IEP', profile.maxIep], ['PC', profile.maxPc], ['RES', profile.resistance],
    ['ESQ', profile.dodge], ['VB', profile.blockValue], ['Inic.', averageInitiative(profile)],
  ]
  return (
    <div className="rounded-xl border border-gray-200 p-3 dark:border-gray-800">
      <div className="grid grid-cols-4 gap-2 sm:grid-cols-7">
        {stats.map(([label, value]) => (
          <div key={label} className="rounded-lg bg-gray-50 px-2 py-2 text-center dark:bg-gray-950">
            <div className="text-[10px] font-bold uppercase tracking-wide text-gray-500">{label}</div>
            <div className="mt-0.5 font-bold">{number(Number(value))}</div>
          </div>
        ))}
      </div>
      <p className="mt-3 text-xs text-gray-600 dark:text-gray-400">
        MIG {profile.attributes.might}, GRA {profile.attributes.grace}, WIS {profile.attributes.wisdom}, SEN {profile.attributes.sense}, FOR {profile.attributes.fortitude}
      </p>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {activeSkills.map((skill) => <span key={skill} className="rounded-md bg-sky-50 px-2 py-1 text-xs font-bold text-sky-900 dark:bg-sky-950/70 dark:text-sky-200">{skillLabels[skill]} +{profile.combatSkillBonuses[skill]}</span>)}
      </div>
      <div className="mt-3 flex flex-wrap gap-1.5">
        {profile.actions.slice(0, 6).map((action) => <span key={action.id} className="rounded-md bg-amber-50 px-2 py-1 text-xs font-medium text-amber-900 dark:bg-amber-950/70 dark:text-amber-200">{action.name}</span>)}
        {profile.actions.length > 6 && <span className="px-2 py-1 text-xs text-gray-500">+{profile.actions.length - 6} ações</span>}
      </div>
      {profile.warnings.map((warning) => <p key={warning} className="mt-2 text-xs font-medium text-orange-700 dark:text-orange-300">Atenção: {warning}</p>)}
    </div>
  )
}

function MetricCard({ title, value, caption }: { title: string; value: string; caption?: string }) {
  return <div className="rounded-xl border border-gray-200 bg-gray-50 p-3 dark:border-gray-800 dark:bg-gray-950"><p className="text-xs font-semibold uppercase tracking-wide text-gray-500">{title}</p><p className="mt-1 text-xl font-black">{value}</p>{caption && <p className="mt-1 text-xs text-gray-500">{caption}</p>}</div>
}

function FindingCard({ finding }: { finding: BalanceFinding }) {
  const colors = {
    positive: 'border-emerald-300 bg-emerald-50 text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/40 dark:text-emerald-100',
    warning: 'border-amber-300 bg-amber-50 text-amber-950 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-100',
    negative: 'border-red-300 bg-red-50 text-red-950 dark:border-red-900 dark:bg-red-950/40 dark:text-red-100',
    neutral: 'border-gray-300 bg-gray-50 text-gray-950 dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100',
  }
  return <div className={`rounded-xl border p-4 ${colors[finding.tone]}`}><p className="font-bold">{finding.title}</p><p className="mt-1 text-sm opacity-85">{finding.detail}</p></div>
}

function ResultSide({ result, side }: { result: SimulationResult; side: SimulationResult['sideA'] }) {
  const metrics = sideMetrics(side, result)
  const actions = Object.values(side.actionUsage).sort((a, b) => b.uses - a.uses)
  return (
    <div className={`${panelClass} p-5`}>
      <h3 className="text-lg font-black">{side.name}</h3>
      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <MetricCard title="Vitórias" value={percent(metrics.winRate)} caption={`IC 95% ${percent(metrics.winRateLow)} a ${percent(metrics.winRateHigh)}`} />
        <MetricCard title="Dano por turno" value={number(metrics.dpr)} />
        <MetricCard title="Acerto" value={percent(metrics.hitRate)} />
        <MetricCard title="Crítico" value={percent(metrics.critRate)} />
        <MetricCard title="Dano por luta" value={number(metrics.averageDamage)} caption={`P10 ${number(metrics.p10Damage)}, P50 ${number(metrics.medianDamage)}, P90 ${number(metrics.p90Damage)}`} />
        <MetricCard title="Recurso gasto" value={`${number(side.pcSpent / result.runs)} PC`} caption={`${number(side.iepSpent / result.runs)} IEP, recuperou ${number(side.iepRestored / result.runs)}`} />
      </div>
      <div className="mt-5 overflow-x-auto">
        <table className="w-full min-w-[520px] text-left text-sm">
          <thead className="text-xs uppercase text-gray-500"><tr><th className="pb-2">Ação escolhida</th><th className="pb-2">Usos</th><th className="pb-2">Acerto</th><th className="pb-2">Dano/uso</th><th className="pb-2">Recurso</th></tr></thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-800">
            {actions.map((action) => <tr key={action.id}><td className="py-2 pr-3 font-semibold">{action.name}</td><td>{action.uses}</td><td>{percent(action.hits / Math.max(1, action.attacks))}</td><td>{number(action.damage / Math.max(1, action.uses))}</td><td>{number(action.resourceSpent / result.runs)}</td></tr>)}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function Results({ result, baseline, setBaseline }: { result: SimulationResult; baseline: SimulationResult | null; setBaseline: (result: SimulationResult | null) => void }) {
  const findings = analyzeResult(result)
  const comparison = baseline ? compareResults(baseline, result) : null
  const winA = result.sideA.wins / result.runs
  const winB = result.sideB.wins / result.runs
  return (
    <section className="mt-8 space-y-6" aria-live="polite">
      <div className={`${panelClass} p-5 sm:p-6`}>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-700 dark:text-amber-400">Resultado agregado</p><h2 className="mt-1 text-2xl font-black">{result.runs.toLocaleString('pt-BR')} combates simulados</h2><p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Semente {result.config.seed}, até {result.config.maxRounds} rodadas, média de {number(result.averageRounds)} rodadas.</p></div>
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setBaseline(result)} className="rounded-lg border border-amber-500 px-3 py-2 text-sm font-bold text-amber-800 hover:bg-amber-50 dark:text-amber-300 dark:hover:bg-amber-950">Salvar como referência</button>
            {baseline && <button type="button" onClick={() => setBaseline(null)} className="rounded-lg border border-gray-300 px-3 py-2 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Limpar referência</button>}
            <button type="button" onClick={() => downloadTextFile(JSON.stringify(result, null, 2), `combat-test-${result.config.seed}.json`)} className="rounded-lg bg-gray-900 px-3 py-2 text-sm font-bold text-white hover:bg-gray-700 dark:bg-white dark:text-gray-950 dark:hover:bg-gray-200">Exportar JSON</button>
          </div>
        </div>
        <div className="mt-6 flex h-4 overflow-hidden rounded-full bg-gray-200 dark:bg-gray-800" title={`${result.draws} empates`}>
          <div className="bg-sky-500" style={{ width: `${winA * 100}%` }} />
          <div className="bg-gray-400" style={{ width: `${(result.draws / result.runs) * 100}%` }} />
          <div className="bg-rose-500" style={{ width: `${winB * 100}%` }} />
        </div>
        <div className="mt-2 flex justify-between text-sm font-semibold"><span className="text-sky-700 dark:text-sky-300">{result.sideA.name}: {percent(winA)}</span><span className="text-gray-500">Empates: {percent(result.draws / result.runs)}</span><span className="text-rose-700 dark:text-rose-300">{result.sideB.name}: {percent(winB)}</span></div>
      </div>

      <div className="grid gap-6 xl:grid-cols-2"><ResultSide result={result} side={result.sideA} /><ResultSide result={result} side={result.sideB} /></div>

      <div className={`${panelClass} p-5 sm:p-6`}>
        <h2 className="text-xl font-black">Leitura automática da mudança</h2>
        <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">Alertas estatísticos são triagem, não substituem propósito, alcance, controle ou teste de mesa.</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">{findings.map((finding) => <FindingCard key={`${finding.tone}-${finding.title}`} finding={finding} />)}</div>
      </div>

      {comparison && <div className={`${panelClass} p-5 sm:p-6`}><h2 className="text-xl font-black">Comparação com a referência</h2><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><MetricCard title="Vitórias A" value={`${comparison.winRateDeltaA >= 0 ? '+' : ''}${(comparison.winRateDeltaA * 100).toFixed(1)} pp`} /><MetricCard title="DPR A" value={`${comparison.dprDeltaA >= 0 ? '+' : ''}${number(comparison.dprDeltaA)}`} /><MetricCard title="DPR B" value={`${comparison.dprDeltaB >= 0 ? '+' : ''}${number(comparison.dprDeltaB)}`} /><MetricCard title="Rodadas" value={`${comparison.roundsDelta >= 0 ? '+' : ''}${number(comparison.roundsDelta)}`} /></div><div className="mt-4 grid gap-3 md:grid-cols-2">{comparison.findings.map((finding) => <FindingCard key={finding.title} finding={finding} />)}</div></div>}

      <details className={`${panelClass} p-5`}><summary className="cursor-pointer font-bold">Ver log completo da primeira luta</summary><div className="mt-4 overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="text-xs uppercase text-gray-500"><tr><th>Rodada</th><th>Ator</th><th>Ação</th><th>Rolagem total</th><th>Defesa</th><th>Dano</th><th>HP alvo</th></tr></thead><tbody className="divide-y divide-gray-200 dark:divide-gray-800">{result.sampleLog.map((entry, index) => <tr key={`${index}-${entry.actor}`}><td className="py-2">{entry.round}</td><td>{entry.actor}</td><td>{entry.action}{entry.critical ? ' (crítico)' : ''}</td><td>{entry.attackRoll}{entry.hit ? '' : ' (errou)'}</td><td>{entry.defense}</td><td>{entry.finalDamage}{entry.blocked ? `, ${entry.blocked} bloqueado` : ''}</td><td>{number(entry.targetHp)}</td></tr>)}</tbody></table></div></details>

      <details className={`${panelClass} p-5`}><summary className="cursor-pointer font-bold">Premissas e limites desta versão</summary><ul className="mt-3 list-disc space-y-2 pl-5 text-sm text-gray-700 dark:text-gray-300">{result.warnings.map((warning) => <li key={warning}>{warning}</li>)}</ul></details>
    </section>
  )
}

export default function CombatTestPage() {
  const navigate = useNavigate()
  const charactersRecord = useCharacterStore((state) => state.characters)
  const loadCharacter = useCharacterStore((state) => state.loadCharacter)
  const savedCharacters = useMemo(() => Object.values(charactersRecord), [charactersRecord])
  const firstId = savedCharacters[0]?.id ?? ''
  const secondId = savedCharacters[1]?.id ?? firstId
  const [sideA, setSideA] = useState(() => createSetup('A', firstId))
  const [sideB, setSideB] = useState(() => createSetup('B', secondId))
  const [runs, setRuns] = useState(1000)
  const [maxRounds, setMaxRounds] = useState(10)
  const [seed, setSeed] = useState(20260714)
  const [result, setResult] = useState<SimulationResult | null>(null)
  const [baseline, setBaseline] = useState<SimulationResult | null>(null)

  const profileA = useMemo(() => {
    const character = charactersRecord[sideA.savedId]
    return sideA.mode === 'saved' && character ? buildSavedCombatant(character, sideA.policy) : buildGenericCombatant(sideA.generic, sideA.policy)
  }, [sideA, charactersRecord])
  const profileB = useMemo(() => {
    const character = charactersRecord[sideB.savedId]
    return sideB.mode === 'saved' && character ? buildSavedCombatant(character, sideB.policy) : buildGenericCombatant(sideB.generic, sideB.policy)
  }, [sideB, charactersRecord])

  const simulate = () => setResult(runSimulation(profileA, profileB, { runs, maxRounds, seed, criticalRule: 'double-base' }))
  const exportToSheet = (setup: SideSetup, profile: SimCombatant) => {
    loadCharacter(createCharacterFromGeneric(setup.generic, profile))
    navigate('/')
  }

  return (
    <main className="min-h-screen pb-16">
      <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6">
        <Link to="/" className="inline-flex items-center gap-2 text-sm font-bold text-amber-800 hover:text-amber-600 dark:text-amber-300 dark:hover:text-amber-200">← Voltar para a ficha</Link>
        <header className="mt-5 max-w-4xl">
          <p className="text-xs font-bold uppercase tracking-[0.22em] text-amber-700 dark:text-amber-400">Overgrown, laboratório de balanceamento</p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-5xl">Teste de combate</h1>
          <p className="mt-3 text-base leading-relaxed text-gray-600 dark:text-gray-300">Compare duas construções em centenas de duelos reproduzíveis. Cada turno escolhe a ação acessível com maior dano esperado, enquanto as rolagens, iniciativa e dano continuam aleatórios.</p>
        </header>

        <div className="mt-7 grid gap-6 xl:grid-cols-2">
          <SetupPanel label="Lado A" setup={sideA} setSetup={setSideA} savedCharacters={savedCharacters} profile={profileA} onExport={() => exportToSheet(sideA, profileA)} />
          <SetupPanel label="Lado B" setup={sideB} setSetup={setSideB} savedCharacters={savedCharacters} profile={profileB} onExport={() => exportToSheet(sideB, profileB)} />
        </div>

        <section className={`${panelClass} mt-6 p-5 sm:p-6`}>
          <div className="grid gap-4 sm:grid-cols-3">
            <label className="text-sm font-semibold">Quantidade de runs<input className={`${inputClass} mt-1.5`} type="number" min={100} max={10000} step={100} value={runs} onChange={(event) => setRuns(Number(event.target.value))} /></label>
            <label className="text-sm font-semibold">Máximo de rodadas<input className={`${inputClass} mt-1.5`} type="number" min={1} max={50} value={maxRounds} onChange={(event) => setMaxRounds(Number(event.target.value))} /></label>
            <label className="text-sm font-semibold">Semente aleatória<input className={`${inputClass} mt-1.5`} type="number" value={seed} onChange={(event) => setSeed(Number(event.target.value))} /></label>
          </div>
          <div className="mt-5 flex flex-wrap items-center gap-3">
            <button type="button" onClick={simulate} className="rounded-xl bg-amber-500 px-6 py-3 font-black text-gray-950 shadow-sm transition hover:bg-amber-400 focus:outline-none focus:ring-4 focus:ring-amber-500/30">Executar simulação</button>
            <button type="button" onClick={() => setSeed(Math.floor(Math.random() * 2_147_483_647))} className="rounded-xl border border-gray-300 px-4 py-3 text-sm font-bold hover:bg-gray-100 dark:border-gray-700 dark:hover:bg-gray-800">Nova semente</button>
            <p className="text-xs text-gray-500">Mesma semente e mesmas fichas produzem o mesmo combate.</p>
          </div>
        </section>

        {result ? <Results result={result} baseline={baseline} setBaseline={setBaseline} /> : <div className="mt-8 rounded-2xl border border-dashed border-gray-300 p-10 text-center text-gray-500 dark:border-gray-700"><p className="text-lg font-bold text-gray-700 dark:text-gray-300">Configure os dois lados e execute a primeira amostra.</p><p className="mt-2 text-sm">Use 1.000 runs para iteração rápida e 10.000 para validar uma decisão final.</p></div>}
      </div>
    </main>
  )
}
