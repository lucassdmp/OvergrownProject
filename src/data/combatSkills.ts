// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Combat Skill Data
// Includes Melee Habilidades, Ranged Habilidades, and Mecânicas de Esforço
// ─────────────────────────────────────────────────────────────────────────────

import type { CombatSkill } from '../types/game'

// ── Melee Habilidades ─────────────────────────────────────────────────────────

export const MELEE_SKILLS: CombatSkill[] = [
  {
    id: 'furia',
    name: 'Fúria',
    cost: '2',
    category: 'melee',
    description:
      'Você entra em um estado de Luta ou Fuga instintivo. Seu personagem fica compelido a atacar quem considera inimigo, ganhando mais um ataque por turno e RD contra danos físicos durante 1D6+1 rodadas. Toda lógica cede ao instinto.',
  },
  {
    id: 'furia-descontrolada',
    name: 'Fúria Descontrolada',
    cost: '3',
    category: 'melee',
    description:
      'Requer Fúria ativa. Ascende o estado de fúria ao limite absoluto: aumenta a duração em +3 rodadas, concede mais um ataque por turno e estende a RD para danos mágicos. A violência desse estado cobra um custo em vida a cada rodada que permanece ativo.',
  },
  {
    id: 'pontos-fatais',
    name: 'Pontos Fatais',
    cost: '3',
    category: 'melee',
    description:
      'Gaste sua Reação para realizar um teste de Discernimento contra a DT do alvo. Ao passar, você identifica uma abertura em suas defesas, reduzindo sua RD apenas para os seus ataques. Se a redução ultrapassar a RD total, você também ganha +2 na Margem de Ameaça contra esse alvo.',
  },
  {
    id: 'hemorragia-interna',
    name: 'Hemorragia Interna',
    cost: '1',
    category: 'melee',
    description:
      'Ao acertar um ataque em um inimigo que já está Sangrando, você aprofunda o ferimento girando a lâmina. O alvo sofre imediatamente 1 tique do sangramento como dano extra, adicional ao dano do ataque.',
  },
  {
    id: 'garrote',
    name: 'Garrote',
    cost: '2',
    category: 'melee',
    description:
      'O primeiro Ataque Furtivo bem-sucedido contra um alvo o deixa Silenciado por 2 turnos, incapaz de conjurar magias ou emitir sons que pudessem alertar aliados.',
  },
  {
    id: 'emboscar',
    name: 'Emboscar',
    cost: '3',
    category: 'melee',
    description:
      'O primeiro Ataque Furtivo bem-sucedido contra um alvo inflige 1,5× o dano normal. A surpresa transforma o primeiro golpe em uma execução quase perfeita.',
  },
  {
    id: 'marcar-para-a-morte',
    name: 'Marcar para a Morte',
    cost: '4',
    category: 'melee',
    description:
      'Você foca toda sua letalidade em um único alvo. Ganha bônus em acerto, Margem de Ameaça e dano contra ele. Em contrapartida, o dano recebido de todas as outras fontes aumenta e você não pode desviar ou resistir ao que não vem do alvo marcado. Aprimorado: As penalidades são progressivamente removidas conforme a habilidade é refinada na Árvore de Talentos.',
  },
  {
    id: 'ultima-resistencia',
    name: 'Última Resistência',
    cost: '5 por turno',
    category: 'melee',
    description:
      'Ao receber um dano que seria fatal, ao invés de entrar em Morrendo, você permanece com 1 de vida, zerando seus PC. Role 1D4+X: durante esses turnos você está imune à condição Morrendo. Sobreviver tem um preço.',
  },
  {
    id: 'vicio-em-sangue',
    name: 'Vício em Sangue',
    cost: '2',
    category: 'melee',
    description:
      'Se um alvo com metade da vida ou menos estiver em alcance médio, você se arremessa até ele sem gastar sua Ação de Movimento. O cheiro de sangue aguça o instinto predatório.',
  },
  {
    id: 'sede-de-sangue',
    name: 'Sede de Sangue',
    cost: '3',
    category: 'melee',
    description:
      'Ao executar um inimigo, você canaliza o ímpeto da matança em vitalidade. Cure uma quantidade de pontos de vida igual ao dano do seu último ataque contra o alvo abatido.',
  },
  {
    id: 'instinto-sanguinario',
    name: 'Instinto Sanguinário',
    cost: '4',
    category: 'melee',
    description:
      'Você abandona a capacidade de Reagir em troca de instinto puro. Ganha bônus de dano progressivo baseado no estado físico de todos os envolvidos no combate — quanto mais feridos todos estiverem, mais letal você se torna.',
  },
  {
    id: 'elipse-carmesim',
    name: 'Elipse Carmesim',
    cost: '3 / 5',
    category: 'melee',
    description:
      'Você gira e corta tudo ao seu redor: causa o dano da arma em todos os inimigos em alcance curto que estejam Sangrando. Aprimorado (5 PC): O ataque pode resultar em crítico em cada inimigo acertado, não apenas no alvo principal.',
  },
]

// ── Mecânicas de Esforço ───────────────────────────────────────────────────────

export const EFFORT_SKILLS: CombatSkill[] = [
  {
    id: 'agarrar',
    name: 'Agarrar',
    cost: '2',
    category: 'effort',
    description:
      'Realiza uma manobra de imobilização. Teste de Força contra o teste de Esquiva do alvo. Alvos agarrados não podem se mover, sofrem Desvantagem em ataques e precisam passar num teste de Força ou ser auxiliados por aliados para se libertar.',
  },
  {
    id: 'ataque-secundario',
    name: 'Ataque Secundário',
    cost: '2',
    category: 'effort',
    description:
      'Gaste PC para realizar um segundo ataque contra o mesmo alvo no mesmo turno, como uma ação adicional dentro da sua Ação Padrão.',
  },
  {
    id: 'impulsao',
    name: 'Impulsão',
    cost: '1',
    category: 'effort',
    description:
      'Gaste PC para ganhar +5 metros na sua Ação de Movimento neste turno, canalizando um burst de energia física para cobrir mais terreno.',
  },
  {
    id: 'contra-ataque',
    name: 'Contra-Ataque',
    cost: '2',
    category: 'effort',
    description:
      'Se um inimigo errar um ataque contra você, use sua Reação para responder imediatamente com um ataque contra ele.',
  },
  {
    id: 'desarranjar',
    name: 'Desarranjar',
    cost: '2',
    category: 'effort',
    description:
      'Realiza uma manobra de afastamento que nega ataques de oportunidade ao se reposicionar, quebrando o engajamento sem expor a guarda.',
  },
  {
    id: 'recuar-estrategico',
    name: 'Recuar Estratégico',
    cost: '2',
    category: 'effort',
    description:
      'Ao desengajar, use esta técnica para se afastar o dobro da distância normal, criando uma zona de segurança entre você e o oponente.',
  },
  {
    id: 'inabalavel',
    name: 'Inabalável',
    cost: '2',
    category: 'effort',
    description:
      'Use como Reação para consumir PC e prevenir as condições Atordoado ou Caído antes que entrem em efeito.',
  },
  {
    id: 'estocada-interruptora',
    name: 'Estocada Interruptora',
    cost: '3',
    category: 'effort',
    description:
      'Use sua Reação para interromper uma habilidade ou magia em execução pelo inimigo, forçando-o a gastar a ação sem efeito.',
  },
  {
    id: 'comando-de-assalto',
    name: 'Comando de Assalto',
    cost: '2',
    category: 'effort',
    description:
      'Gaste sua Ação de Movimento para emitir uma ordem tática a um aliado. Ele realiza um ataque fora do seu turno contra o inimigo de sua escolha.',
  },
  {
    id: 'analisar-padrao',
    name: 'Analisar Padrão',
    cost: '3',
    category: 'effort',
    description:
      'Gaste seu turno inteiro estudando os movimentos do inimigo. Até o final do próximo turno, todos os ataques contra ele têm Vantagem.',
  },
  {
    id: 'postura-de-muralha',
    name: 'Postura de Muralha',
    cost: '1 por rodada',
    category: 'effort',
    description:
      'Você não pode atacar, mas dobra sua Armadura até o início do seu próximo turno. Uma defesa impenetrável para quem sabe que o maior dano é o recebido.',
  },
  {
    id: 'desarmar',
    name: 'Desarmar',
    cost: '2',
    category: 'effort',
    description:
      'Tente arrancar a arma do alvo. Teste de Força contra o teste de Força do alvo. Se bem-sucedido, a arma cai no terreno adjacente.',
  },
  {
    id: 'rasteira',
    name: 'Rasteira',
    cost: '2',
    category: 'effort',
    description:
      'Tente derrubar o alvo aplicando a condição Derrubado. Teste de Esquiva do alvo contra o seu teste de Combate.',
  },
]

// ── Ranged Habilidades ────────────────────────────────────────────────────────

export const RANGED_SKILLS: CombatSkill[] = [
  {
    id: 'mira-focada',
    name: 'Mira Focada',
    cost: '2',
    category: 'ranged',
    description:
      'Gaste sua Ação de Movimento para travar o alvo em sua linha de mira. Seu próximo ataque contra ele ignora cobertura parcial. A preparação deliberada transforma incerteza em certeza.',
  },
  {
    id: 'flecha-de-arrasto',
    name: 'Flecha de Arrasto',
    cost: '2',
    category: 'ranged',
    description:
      'Ao acertar um inimigo que já está Sangrando, a flecha possui farpas internas que dilaceram o ferimento na saída. O alvo sofre o dano do sangramento imediatamente, além do dano normal do ataque.',
  },
  {
    id: 'tiro-de-supressao',
    name: 'Tiro de Supressão',
    cost: '3',
    category: 'ranged',
    description:
      'Use sua Reação para disparar um projétil no momento exato em que um alvo começa a conjurar. Ao acertar, a conjuração é interrompida e a ação gasta é perdida.',
  },
  {
    id: 'ponto-cego',
    name: 'Ponto Cego',
    cost: '2',
    category: 'ranged',
    description:
      'Ao atacar um alvo que está engajado em combate corpo a corpo com um aliado, você gasta PC para encontrar uma brecha. O ataque ignora a Esquiva do alvo (apenas a armadura base é aplicada) e elimina o risco de acertar seu aliado.',
  },
  {
    id: 'tiro-de-reacao',
    name: 'Tiro de Reação',
    cost: '3',
    category: 'ranged',
    description:
      'Quando um inimigo entrar no seu alcance de tiro curto, use sua Reação para disparar imediatamente. Se acertar, o inimigo interrompe o movimento e permanece onde está pelo restante do turno.',
  },
  {
    id: 'sniper-olho-por-olho',
    name: 'Sniper: Olho por Olho',
    cost: '4',
    category: 'ranged',
    description:
      'Após receber dano de um ataque à distância, seu próximo ataque contra quem te atirou ganha +4 na Margem de Ameaça. A vingança aguça a mira.',
  },
  {
    id: 'sniper-olhos-de-aguia',
    name: 'Sniper: Olhos de Águia',
    cost: 'X (máx. 10)',
    category: 'ranged',
    description:
      'Para cada PC gasto, você aumenta o alcance efetivo do seu ataque em +1 metro, ignorando penalidades por distância acima do alcance base. Custo máximo de 10 PC por ataque.',
  },
  {
    id: 'tiro-de-aviso',
    name: 'Tiro de Aviso',
    cost: '1',
    category: 'ranged',
    description:
      'Você atira propositalmente perto da cabeça do alvo. Realize um teste de Intimidação usando Graça contra a Temperança do alvo. Em caso de sucesso, o alvo hesita ou recua.',
  },
  {
    id: 'recarregar-sob-pressao',
    name: 'Recarregar Sob Pressão',
    cost: '3',
    category: 'ranged',
    description:
      'Ignore a penalidade de tempo de recarga de armas pesadas como bestas pesadas ou armas de fogo lentas, podendo atirar no mesmo turno em que recarregou.',
  },
  {
    id: 'mira-de-precisao',
    name: 'Mira de Precisão',
    cost: 'X',
    category: 'ranged',
    description:
      'Para cada PC gasto, você acumula +1 de acerto para um único tiro neste turno. Concentração total convertida em precisão absoluta.',
  },
  {
    id: 'olhar-de-rapina',
    name: 'Olhar de Rapina',
    cost: '4 por rodada',
    category: 'ranged',
    description:
      'Enquanto estiver parado, gaste PC por rodada para focar o mesmo alvo. A cada rodada consecutiva, sua Margem de Ameaça aumenta em +2 cumulativamente. Se você se mover ou trocar de alvo, o bônus acumulado zera.',
  },
  {
    id: 'tiro-ricochete',
    name: 'Tiro Ricochete',
    cost: '4',
    category: 'ranged',
    description:
      'O projétil ricocha uma vez em uma superfície antes de atingir o alvo, contornando cobertura parcial ou total. Ricochetes não podem resultar em crítico. Aprimorado: O tiro ricocheteado pode resultar em crítico normalmente.',
  },
  {
    id: 'tiro-destroçante',
    name: 'Tiro Destroçante',
    cost: '3',
    category: 'ranged',
    description:
      'Gaste PC para converter todo o dano do ataque em dano direto à Armadura do alvo ao invés de sua vida, reduzindo os PV da armadura e tornando-a menos efetiva para os demais combatentes.',
  },
  {
    id: 'desengajar',
    name: 'Desengajar',
    cost: '2',
    category: 'ranged',
    description:
      'Você chuta o inimigo mais próximo para se propulsionar para trás, ganhando distância sem provocar ataques de oportunidade. Ideal para manter o alcance seguro.',
  },
  {
    id: 'lobo-solitario',
    name: 'Lobo Solitário',
    cost: '5',
    category: 'ranged',
    description:
      'Você fecha sua mente para o grupo. Curas e Buffs aliados são reduzidos à metade em você, mas todos os seus ataques e habilidades ganham +1D6 de dano adicional. Aprimorado: O bônus de dano aumenta para +3D6 em todos os ataques e habilidades.',
  },
]

// ── Aggregated export ─────────────────────────────────────────────────────────

export const ALL_COMBAT_SKILLS: CombatSkill[] = [
  ...MELEE_SKILLS,
  ...EFFORT_SKILLS,
  ...RANGED_SKILLS,
]

export const COMBAT_SKILLS_MAP: Record<string, CombatSkill> = Object.fromEntries(
  ALL_COMBAT_SKILLS.map((skill) => [skill.id, skill]),
)
