// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Perícias (Skills) static definitions
// Source: Contents/pericias_e_maestrias.tex
// ─────────────────────────────────────────────────────────────────────────────

export interface SkillDefinition {
  id: string
  name: string
  description: string
  /** True for skills marked with * – require formal training before use */
  requiresTraining: boolean
}

export const ALL_SKILLS: SkillDefinition[] = [
  {
    id: 'adestramento',
    name: 'Adestramento',
    description: 'Permite adestrar, acalmar ou controlar animais selvagens e montarias.',
    requiresTraining: false,
  },
  {
    id: 'arcanismo',
    name: 'Arcanismo',
    description: 'Define o conhecimento sobre magias, planos de existência e a manipulação da energia.',
    requiresTraining: false,
  },
  {
    id: 'atletismo',
    name: 'Atletismo',
    description: 'A capacidade física de superar obstáculos, envolvendo saltar, escalar, nadar e correr longas distâncias.',
    requiresTraining: false,
  },
  {
    id: 'conducao',
    name: 'Condução',
    description: 'A habilidade de operar veículos, desde carroças tradicionais até transportes movidos a engenharia rúnica.',
    requiresTraining: true,
  },
  {
    id: 'constituicao',
    name: 'Constituição',
    description: 'A resiliência física pura; a capacidade de resistir ao cansaço, privação de sono, dor extrema e status de efeito.',
    requiresTraining: false,
  },
  {
    id: 'crime',
    name: 'Crime',
    description: 'O domínio de atividades ilícitas, como arrombamento de fechaduras, prestidigitação e desarmar mecanismos de segurança.',
    requiresTraining: false,
  },
  {
    id: 'chef',
    name: 'Chef',
    description: 'A arte de preparar alimentos e misturar ingredientes para criar refeições que restauram o vigor, garantem bônus temporários ou neutralizam toxinas.',
    requiresTraining: true,
  },
  {
    id: 'cultura',
    name: 'Cultura',
    description: 'O acervo de conhecimentos sobre a história do mundo, etiquetas sociais, heráldica, línguas regionais e religiões.',
    requiresTraining: false,
  },
  {
    id: 'discernimento',
    name: 'Discernimento',
    description: 'A habilidade de ler as verdadeiras intenções de terceiros, identificando hesitações ou sinais de nervosismo.',
    requiresTraining: false,
  },
  {
    id: 'eloquencia',
    name: 'Eloquência',
    description: 'A arte da diplomacia e da persuasão, utilizada para convencer outros através de argumentos lógicos e carisma.',
    requiresTraining: false,
  },
  {
    id: 'enganacao',
    name: 'Enganação',
    description: 'A capacidade de tecer mentiras convincentes, omitir fatos e manter disfarces sem levantar suspeitas.',
    requiresTraining: false,
  },
  {
    id: 'engenharia',
    name: 'Engenharia',
    description: 'O conhecimento técnico sobre a construção de estruturas, mecanismos complexos e fortificações.',
    requiresTraining: true,
  },
  {
    id: 'estrategia',
    name: 'Estratégia',
    description: 'A capacidade de analisar o cenário em volta, identificar pontos cegos e planejar táticas de combate ou cerco.',
    requiresTraining: false,
  },
  {
    id: 'furtividade',
    name: 'Furtividade',
    description: 'A perícia de mover-se silenciosamente e utilizar o ambiente para ocultar sua própria presença.',
    requiresTraining: false,
  },
  {
    id: 'intimidacao',
    name: 'Intimidação',
    description: 'O uso da presença física ou ameaças diretas para dobrar a vontade de outros através do medo.',
    requiresTraining: false,
  },
  {
    id: 'investigacao',
    name: 'Investigação',
    description: 'A busca minuciosa por evidências e o gracioso loot, permitindo deduzir eventos passados através de pequenos detalhes ou encontrar itens específicos.',
    requiresTraining: false,
  },
  {
    id: 'luta',
    name: 'Luta',
    description: 'A proficiência no combate corpo a corpo, englobando o uso de armas brancas e técnicas de combate desarmado.',
    requiresTraining: false,
  },
  {
    id: 'manutencao',
    name: 'Manutenção',
    description: 'A habilidade de reparar, afiar lâminas e garantir que o inventário permaneça funcional.',
    requiresTraining: true,
  },
  {
    id: 'medicina',
    name: 'Medicina',
    description: 'O conhecimento de anatomia e farmacologia para tratar ferimentos, doenças e estabilizar aliados feridos gravemente.',
    requiresTraining: true,
  },
  {
    id: 'navegacao',
    name: 'Navegação',
    description: 'A capacidade de pilotar embarcações e dirigíveis.',
    requiresTraining: true,
  },
  {
    id: 'natureza',
    name: 'Natureza',
    description: 'O conhecimento sobre tudo que é natural e científico.',
    requiresTraining: false,
  },
  {
    id: 'percepcao',
    name: 'Percepção',
    description: 'A agudeza dos sentidos para notar detalhes ambientais, sons distantes e presenças ocultas.',
    requiresTraining: false,
  },
  {
    id: 'performance',
    name: 'Performance',
    description: 'A capacidade artística de impressionar ou distrair um público através de música, dança ou atuação.',
    requiresTraining: false,
  },
  {
    id: 'pontaria',
    name: 'Pontaria',
    description: 'A precisão técnica com armas de longo alcance, como arcos, bestas e armas de fogo rúnicas.',
    requiresTraining: false,
  },
  {
    id: 'provocacao',
    name: 'Provocação',
    description: 'A habilidade de insultar ou distrair oponentes, forçando-os a perder o foco tático ou atacar alvos específicos.',
    requiresTraining: false,
  },
  {
    id: 'reflexos',
    name: 'Reflexos',
    description: 'A rapidez de resposta a estímulos súbitos, essencial para reagir a armadilhas e projéteis inesperados.',
    requiresTraining: false,
  },
  {
    id: 'seducao',
    name: 'Sedução',
    description: 'O uso do magnetismo pessoal e charme para influenciar as emoções e desejos de outros indivíduos.',
    requiresTraining: false,
  },
  {
    id: 'sobrevivencia',
    name: 'Sobrevivência',
    description: 'A aptidão para encontrar água, comida, rastrear presas e sobreviver em biomas hostis.',
    requiresTraining: false,
  },
  {
    id: 'temperanca',
    name: 'Temperança',
    description: 'A resiliência mental e autocontrole, permitindo resistir ao pânico, tortura psicológica e corrupção mental.',
    requiresTraining: false,
  },
  {
    id: 'xilografia',
    name: 'Xilografia',
    description: 'A arte sagrada do RuneCrafting, permitindo a gravação de runas e o trabalho em materiais condutores.',
    requiresTraining: true,
  },
]
