// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Origens do Pináculo
// Source: Contents/origens.tex
// ─────────────────────────────────────────────────────────────────────────────

export interface OriginDefinition {
  id: string
  name: string
  description: string
  /** The skill id granted for free at Mastery I */
  skillId: string
}

export const ALL_ORIGINS: OriginDefinition[] = [
  {
    id: 'andarilho',
    name: 'Andarilho',
    description: 'Acostumado a conduzir transportes e caravanas por estradas perigosas e rotas comerciais.',
    skillId: 'conducao',
  },
  {
    id: 'atento',
    name: 'Atento',
    description: 'Seus sentidos são aguçados; você ouve o que ninguém ouve e vê o que está oculto no horizonte.',
    skillId: 'percepcao',
  },
  {
    id: 'bestial',
    name: 'Bestial',
    description: 'Sempre teve uma conexão inexplicável com as feras, sentindo-se mais confortável entre animais do que entre pessoas.',
    skillId: 'adestramento',
  },
  {
    id: 'curativo',
    name: 'Curativo',
    description: 'Sua compreensão sobre o corpo e fármacos permitiu que você trouxesse muitos de volta da beira da morte.',
    skillId: 'medicina',
  },
  {
    id: 'diplomatico',
    name: 'Diplomático',
    description: 'Você possui o dom da palavra e sabe como navegar em conflitos usando apenas a razão e o carisma.',
    skillId: 'eloquencia',
  },
  {
    id: 'dissimulado',
    name: 'Dissimulado',
    description: 'Mestre em ocultar a verdade, você tece mentiras tão naturais quanto a própria respiração.',
    skillId: 'enganacao',
  },
  {
    id: 'engenhoso',
    name: 'Engenhoso',
    description: 'Sempre teve facilidade em entender como as coisas funcionam, de polias complexas a fortificações.',
    skillId: 'engenharia',
  },
  {
    id: 'erudito',
    name: 'Erudito',
    description: 'Sua curiosidade o levou a acumular vasto conhecimento sobre a história, línguas e costumes do mundo.',
    skillId: 'cultura',
  },
  {
    id: 'estoico',
    name: 'Estóico',
    description: 'Sua mente é uma fortaleza; você permanece calmo e sob controle mesmo diante do horror psicológico.',
    skillId: 'temperanca',
  },
  {
    id: 'exibicionista',
    name: 'Exibicionista',
    description: 'O palco é seu lar; você sabe exatamente como prender a atenção de uma multidão e entretê-la.',
    skillId: 'performance',
  },
  {
    id: 'gastronomico',
    name: 'Gastronômico',
    description: 'Você entende a química dos sabores e como uma refeição bem preparada pode restaurar o espírito e o corpo.',
    skillId: 'chef',
  },
  {
    id: 'imponente',
    name: 'Imponente',
    description: 'Sua mera presença física ou o peso de suas palavras é o suficiente para dobrar a vontade alheia pelo medo.',
    skillId: 'intimidacao',
  },
  {
    id: 'instintivo',
    name: 'Instintivo',
    description: 'Seus reflexos são puramente medulares; você reage a perigos antes mesmo da sua mente processá-los.',
    skillId: 'reflexos',
  },
  {
    id: 'invisivel',
    name: 'Invisível',
    description: 'Você aprendeu cedo que a melhor forma de sobreviver é não ser notado, movendo-se como uma sombra.',
    skillId: 'furtividade',
  },
  {
    id: 'irritante',
    name: 'Irritante',
    description: 'Mestre na arte de tirar os outros do sério, você usa o escárnio para desestabilizar qualquer oponente.',
    skillId: 'provocacao',
  },
  {
    id: 'marginal',
    name: 'Marginal',
    description: 'Sua vida foi pautada por regras próprias, agindo à margem da sociedade e quebrando trincas.',
    skillId: 'crime',
  },
  {
    id: 'metodico',
    name: 'Metódico',
    description: 'Sua atenção aos detalhes permite que você encontre rastros, provas e tesouros onde outros veriam apenas caos.',
    skillId: 'investigacao',
  },
  {
    id: 'naturalista',
    name: 'Naturalista',
    description: 'Criado sob as leis da fauna e flora, seu conhecimento sobre o mundo científico e selvagem é orgânico.',
    skillId: 'natureza',
  },
  {
    id: 'navegante',
    name: 'Navegante',
    description: 'Sente-se em casa apenas sob o balanço das águas ou o fluxo dos ventos em grandes embarcações.',
    skillId: 'navegacao',
  },
  {
    id: 'perspicaz',
    name: 'Perspicaz',
    description: 'Nada escapa ao seu olhar; você lê as pessoas através de microexpressões e hesitações.',
    skillId: 'discernimento',
  },
  {
    id: 'resiliente',
    name: 'Resiliente',
    description: 'Sua resistência física ultrapassa o comum; você suporta privações e dores que derrubariam outros.',
    skillId: 'constituicao',
  },
  {
    id: 'runico',
    name: 'Rúnico',
    description: 'Suas mãos possuem o toque sagrado necessário para gravar runas e moldar materiais condutores.',
    skillId: 'xilografia',
  },
  {
    id: 'rustico',
    name: 'Rústico',
    description: 'Capaz de encontrar sustento e abrigo no mais hostil dos biomas, você é um sobrevivente nato.',
    skillId: 'sobrevivencia',
  },
  {
    id: 'sedutor',
    name: 'Sedutor',
    description: 'Seu magnetismo é uma arma; você sabe como despertar desejos e influenciar emoções com um olhar.',
    skillId: 'seducao',
  },
  {
    id: 'tatico',
    name: 'Tático',
    description: 'Sua mente trabalha em prol da vantagem; você enxerga o campo de batalha como um tabuleiro.',
    skillId: 'estrategia',
  },
  {
    id: 'vigoroso',
    name: 'Vigoroso',
    description: 'Seu corpo foi forjado pelo esforço físico constante, tornando-o capaz de superar qualquer barreira natural.',
    skillId: 'atletismo',
  },
  {
    id: 'zeloso',
    name: 'Zeloso',
    description: 'Você possui um cuidado nato com suas ferramentas, sabendo exatamente como manter o metal afiado e o couro firme.',
    skillId: 'manutencao',
  },
]
