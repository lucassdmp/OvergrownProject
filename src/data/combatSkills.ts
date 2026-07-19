// ─────────────────────────────────────────────────────────────────────────────
// OverGrown – Combat Skill Data
// Includes Melee Habilidades, Ranged Habilidades, and Mecânicas de Esforço
// ─────────────────────────────────────────────────────────────────────────────

import type { CombatSkill } from '../types/game'

// ── Melee Habilidades ─────────────────────────────────────────────────────────

function bookCombatSkill(
  id: string,
  name: string,
  cost: string,
  requirement: string,
  action: string,
  purpose: string,
  effect: string,
  category: CombatSkill['category'] = 'melee',
): CombatSkill {
  return { id, name, cost, requirement, action, purpose, effect, description: effect, category }
}

export const MELEE_SKILLS: CombatSkill[] = [
  bookCombatSkill(
    'furia',
    'Fúria',
    '12',
    'MIG 10 e FOR 10',
    'Padrão',
    'Romper uma linha inimiga quando cautela já não basta',
    'Ao ativar, realize um ataque básico. Até o fim dos seus próximos 2 turnos, quando usar sua Ação Padrão para atacar, realize um ataque básico adicional. Durante o efeito, receba 3 RD física e aproxime-se e ataque um inimigo quando puder. Não pode usar Guarda Total ou Postura de Muralha. Os ataques gerados não concedem outros ataques extras.',
  ),
  bookCombatSkill(
    'furia-descontrolada',
    'Fúria Descontrolada',
    '12',
    'MIG 15, FOR 15 e Fúria',
    'Livre, durante Fúria',
    'Transformar uma Fúria comum em uma aposta extrema de sobrevivência',
    'Estenda a Fúria em 2 rodadas e eleve a RD para 6 contra dano físico e mágico. No final de cada um dos seus turnos, perca 1D4 HP; essa perda ignora Bloqueio e RD. Concede outro ataque além daquele fornecido por Fúria.',
  ),
  bookCombatSkill(
    'pontos-fatais',
    'Pontos Fatais',
    '6',
    'SEN 10 e Discernimento treinado',
    'Movimento',
    'Superar inimigos protegidos por estudo, não por força bruta',
    'Escolha um alvo visível e dispute Discernimento contra a Percepção dele. Em caso de sucesso, seus ataques ignoram 3 RD desse alvo até o fim da cena. Só pode obter sucesso uma vez por alvo em cada combate.',
  ),
  bookCombatSkill(
    'hemorragia-interna',
    'Hemorragia Interna',
    '4',
    '(MIG 10 ou GRA 10) e arma cortante ou perfurante',
    'Livre, após acertar',
    'Punir um alvo cujo sangramento já foi estabelecido',
    'Uma vez por turno, ao acertar um alvo com Sangramento Ardiloso ou Brutal, provoque imediatamente um tique do sangramento ativo. O ataque normal ainda causa dano.',
  ),
  bookCombatSkill(
    'golpe-perfurante',
    'Golpe Perfurante',
    '6',
    'MIG 15 e arma perfurante',
    'Livre, antes de atacar',
    'Abrir armaduras pesadas sem invalidar escudos',
    'Se o ataque acertar e o alvo Bloquear, o VB da armadura é 0 contra esse ataque; bônus de escudo, arma e habilidade permanecem. Não pode ser combinado com Postura de Muralha ou outro efeito que ignore VB.',
  ),
  bookCombatSkill(
    'golpe-duplo',
    'Golpe Duplo',
    '4',
    'GRA 10 e duas armas leves',
    'Padrão',
    'Trocar precisão por duas oportunidades de acerto',
    'Realize um ataque com cada arma contra o mesmo alvo. Ambos sofrem −2 de acerto, podem resultar em crítico e são instâncias separadas. Não pode ser combinado com Ataque Secundário.',
  ),
  bookCombatSkill(
    'ataque-secundario',
    'Ataque Secundário',
    '5',
    'MIG 15 ou GRA 15',
    'Livre, após um ataque básico',
    'Investir PC para pressionar um único alvo sem depender de duas armas',
    'Uma vez por turno, realize um segundo ataque básico contra o mesmo alvo. Esse ataque não pode ativar Golpe Duplo, Comando de Assalto, Contra-Ataque ou outro efeito que conceda ataque adicional.',
  ),
  bookCombatSkill(
    'garrote',
    'Garrote',
    '6',
    'GRA 10, SEN 10 e Furtividade treinada',
    'Padrão',
    'Impedir que sentinelas ou conjuradores deem o alarme',
    'Realize um ataque corpo a corpo contra um alvo Desprevenido usando arma leve ou garrote. Ao acertar, cause o dano normal e aplique Silenciado por 1 rodada. Depois de sofrer este efeito, o alvo fica imune a Garrote até o fim da cena.',
  ),
  bookCombatSkill(
    'emboscar',
    'Emboscar',
    '8',
    'GRA 15, SEN 10 e Furtividade treinada',
    'Padrão',
    'Converter preparação furtiva em dano inicial, sem repetir a explosão',
    'Uma vez por combate, ataque um alvo que ainda não tenha percebido você. Ao acertar, aumente cada grupo de dados base da arma em 50%, arredondando a quantidade de dados adicionais para baixo. MOD e danos adicionais não são multiplicados.',
  ),
  bookCombatSkill(
    'marcar-para-a-morte',
    'Marcar para a Morte',
    '12',
    'SEN 15 e (MIG 15 ou GRA 15)',
    'Movimento',
    'Criar um duelo de alto risco contra um inimigo prioritário',
    'Marque um alvo visível até o fim da cena. Em ataques corpo a corpo contra ele, receba +2 no acerto, +1 na Margem de Ameaça e +1D6 de dano uma vez por turno. Dano de outras fontes contra você aumenta 25%, arredondado para cima, e você não pode usar Esquiva ou Bloqueio contra essas fontes. Só um alvo pode estar marcado.',
  ),
  bookCombatSkill(
    'execucao',
    'Execução',
    '10',
    '(MIG 20 ou GRA 20) e Marcar para a Morte',
    'Padrão',
    'Finalizar o alvo do duelo sem multiplicar todos os bônus da construção',
    'Ataque corpo a corpo o alvo marcado quando ele estiver com 25% ou menos do HP máximo. O ataque tem Vantagem e, ao acertar, dobra somente os dados base da arma. MOD e dano adicional não dobram. Só pode ser tentada uma vez por alvo em cada combate.',
  ),
  bookCombatSkill(
    'vicio-em-sangue',
    'Vício em Sangue',
    '4',
    'MIG 10 e SEN 10',
    'Livre, antes de mover',
    'Alcançar rapidamente um inimigo ferido sem ganhar mobilidade irrestrita',
    'Uma vez por turno, escolha um inimigo visível com metade do HP ou menos. Mova até 3 unidades em direção a ele; esse deslocamento não consome seu Movimento, mas provoca ataques de oportunidade normalmente.',
  ),
  bookCombatSkill(
    'sede-de-sangue',
    'Sede de Sangue',
    '8',
    'FOR 15 e Vício em Sangue',
    'Livre, ao reduzir um inimigo a 0 HP',
    'Converter uma vitória perigosa em sustentação limitada',
    'Uma vez por combate, ao derrotar um inimigo que tenha causado dano a você na cena, cure metade do dano do golpe final, limitado a 2 × FOR. Não ativa ao derrotar aliado, invocação própria ou alvo indefeso criado para esse fim.',
  ),
  bookCombatSkill(
    'instinto-sanguinario',
    'Instinto Sanguinário',
    '7',
    'SEN 15 e Fúria',
    'Livre, durante Fúria',
    'Acelerar o fim de um combate quando o sangue já domina o campo',
    'Até a Fúria terminar, uma vez por turno cause +1D4 de dano se houver inimigo com metade do HP ou menos; cause +2D4 em vez disso se você também estiver com metade do HP ou menos.',
  ),
  bookCombatSkill(
    'elipse-carmesim',
    'Elipse Carmesim',
    '10',
    'GRA 15 e Hemorragia Interna; arma cortante',
    'Padrão',
    'Transformar sangramentos preparados em pressão contra vários inimigos',
    'Ataque separadamente todos os inimigos adjacentes que tenham Sangramento Ardiloso ou Brutal. Cada acerto causa apenas os dados base da arma, sem MOD, e não pode resultar em crítico.',
  ),
  bookCombatSkill(
    'elipse-carmesim-suprema',
    'Elipse Carmesim Suprema',
    '15',
    'GRA 20 e Elipse Carmesim',
    'Padrão',
    'Evoluir a técnica de área para confrontos avançados',
    'Ataque separadamente inimigos com Sangramento a até 2 unidades. Use o dano normal da arma e permita críticos. Cada alvo só pode ser atingido uma vez e ataques gerados não ativam Hemorragia Interna.',
  ),
  bookCombatSkill(
    'pisada-de-impacto',
    'Pisada de Impacto',
    '8',
    'MIG 15 e Fúria',
    'Padrão',
    'Quebrar formações frágeis durante uma investida',
    'Cause 1D6 + MOD de MIG em cone de 3 unidades. Cada alvo disputa FOR contra seu teste de MIG; quem perder fica Derrubado. Um alvo que resistir fica imune à sua Pisada até o início do próximo turno.',
  ),
  bookCombatSkill(
    'controle-de-zona',
    'Controle de Zona',
    '8',
    'MIG 15 e SEN 10',
    'Movimento',
    'Punir deslocamento inimigo sem conceder ataques ilimitados',
    'Até o início do próximo turno, crie zona de 2 unidades ao redor de você. Quando um inimigo entrar, sair ou mover-se dentro dela, você pode gastar uma Reação para realizar um ataque de oportunidade. Cada Reação permite somente um ataque.',
  ),
  bookCombatSkill(
    'golpe-atordoante',
    'Golpe Atordoante',
    '8',
    'MIG 15 e arma de impacto',
    'Padrão',
    'Trocar dano por controle contra um inimigo perigoso',
    'Realize um ataque que não causa dano. Se acertar, o alvo disputa FOR contra o resultado do ataque; se perder, sofre Concussão. Depois do teste, fica imune a Golpe Atordoante por 1 rodada.',
  ),
]

// ── Mecânicas de Esforço ───────────────────────────────────────────────────────

export const EFFORT_SKILLS: CombatSkill[] = [
  bookCombatSkill(
    'provocacao',
    'Provocação',
    '2',
    'SEN 5 e Intimidação treinada',
    'Movimento',
    'Fazer um inimigo inteligente escolher o defensor ou atacar com menor eficiência',
    'Escolha um inimigo inteligente a até 8 unidades e dispute Intimidação contra Temperança. Até o início do seu próximo turno, ele sofre Desvantagem em ataques que não incluam você como alvo. Depois, fica imune à sua Provocação por 1 rodada.',
    'effort',
  ),
  bookCombatSkill(
    'pressao-constante',
    'Pressão Constante',
    '5 por rodada',
    'MIG 15 e FOR 10',
    'Padrão para ativar; Livre para manter',
    'Proteger uma formação contra vários inimigos próximos',
    'Enquanto mantida, inimigos adjacentes gastam +2 unidades de movimento para se afastar de você e sofrem Desvantagem ao atacar seus aliados adjacentes. Pague o custo no início de cada turno; termina se você ficar Incapacitado ou deixar de pagar.',
    'effort',
  ),
  bookCombatSkill(
    'ultima-resistencia',
    'Última Resistência',
    'Todos (mín. 10)',
    'FOR 20',
    'Reação, ao sofrer dano fatal',
    'Comprar uma última oportunidade de resgate para um defensor veterano',
    'Gaste todos os PC restantes, exigindo pelo menos 10. Permaneça com 1 HP em vez de entrar em Morrendo. Até o fim do seu próximo turno, não pode entrar em Morrendo novamente. Uma vez por combate; não funciona contra efeitos que matem sem reduzir HP.',
    'effort',
  ),
  bookCombatSkill(
    'escudo-humano',
    'Escudo Humano',
    '5',
    'FOR 15 e Guarda Total',
    'Reação',
    'Interpor o próprio corpo quando um aliado adjacente seria atingido',
    'Depois que um aliado adjacente for atingido, mas antes do dano, torne-se o alvo. Faça um Bloqueio como parte da mesma Reação. Você sofre todo o dano restante e efeitos associados; o aliado não sofre esse ataque.',
    'effort',
  ),
  bookCombatSkill(
    'guarda-total',
    'Guarda Total',
    '0',
    'FOR 5 e armadura com VB ou escudo',
    'Padrão',
    'Trocar toda a ofensiva por sobrevivência e mais respostas defensivas',
    'Até o início do próximo turno, você não pode atacar nem causar dano, recebe +5 VB e uma Reação adicional exclusiva para Bloqueio. Não acumula consigo mesma ou com a Reação adicional de Postura de Muralha.',
    'effort',
  ),
  bookCombatSkill(
    'desarmar',
    'Desarmar',
    '3',
    'MIG 5 e uma mão livre ou arma corpo a corpo',
    'Padrão',
    'Retirar armas perigosas sem causar dano',
    'Dispute MIG contra MIG de um alvo adjacente empunhando arma. Se vencer, não cause dano: a arma cai em espaço adjacente e o alvo fica Desprevenido até o início do próprio turno. Após resistir ou sofrer o efeito, fica imune a Desarmar por 1 rodada.',
    'effort',
  ),
  bookCombatSkill(
    'desarranjar',
    'Desarranjar',
    '3',
    'GRA 5',
    'Padrão',
    'Abrir uma rota curta de retirada através de pressão ofensiva',
    'Realize um ataque corpo a corpo. Ao acertar, mova até 2 unidades sem provocar ataques de oportunidade do alvo atingido. Não amplia seu Movimento e não remove Reações de outros inimigos.',
    'effort',
  ),
  bookCombatSkill(
    'agarrar',
    'Agarrar',
    '3',
    'MIG 5 e uma mão livre',
    'Padrão',
    'Imobilizar um alvo móvel sem depender de dano',
    'Dispute MIG contra GRA de um alvo adjacente. Se vencer, ele fica Segurado e você deve manter uma mão ocupada. No início de cada turno, o alvo pode gastar Movimento para disputar MIG ou GRA contra seu MIG e escapar. Você pode soltá-lo como Ação Livre.',
    'effort',
  ),
  bookCombatSkill(
    'impulsao',
    'Impulsão',
    '2',
    'MIG 5 ou GRA 5',
    'Livre, antes de mover',
    'Cobrir uma distância curta sem substituir técnicas completas de retirada',
    'Uma vez por turno, aumente em 3 unidades uma Ação de Movimento realizada neste turno. Não concede nova ação, não evita ataques de oportunidade e não se combina com Recuar Estratégico ou Desengajar.',
    'effort',
  ),
  bookCombatSkill(
    'contra-ataque',
    'Contra-Ataque',
    '6',
    'GRA 15',
    'Reação',
    'Punir um erro inimigo em vez de evitar o golpe por Esquiva',
    'Quando um inimigo errar um ataque corpo a corpo contra você, realize um ataque básico contra ele. Não pode ser usado se você declarou Esquiva ou Bloqueio contra o mesmo ataque, e o ataque gerado não concede ataques extras.',
    'effort',
  ),
  bookCombatSkill(
    'recuar-estrategico',
    'Recuar Estratégico',
    '3',
    'GRA 5',
    'Movimento',
    'Abandonar completamente um engajamento perigoso',
    'Mova até o dobro do seu Movimento, apenas para se afastar dos inimigos visíveis. Esse deslocamento não provoca ataques de oportunidade. Você não pode se aproximar de nenhum inimigo durante a ação.',
    'effort',
  ),
  bookCombatSkill(
    'inabalavel',
    'Inabalável',
    '5',
    'FOR 15',
    'Reação',
    'Preservar posição e turno contra deslocamento ou perda de ação',
    'Quando receber Atordoado ou Derrubado, ignore a condição. Deve ser declarado depois da falha no teste, antes da condição entrar em efeito. Uma vez por rodada.',
    'effort',
  ),
  bookCombatSkill(
    'estocada-interruptora',
    'Estocada Interruptora',
    '8',
    'GRA 15 e arma perfurante',
    'Reação',
    'Interromper uma técnica ou magia a alcance corpo a corpo',
    'Quando um inimigo adjacente iniciar habilidade ou magia, realize um ataque básico. Se acertar, a ação e os recursos do inimigo são gastos sem efeito. O ataque não pode ser crítico nem gerar ataques adicionais.',
    'effort',
  ),
  bookCombatSkill(
    'comando-de-assalto',
    'Comando de Assalto',
    '10',
    'SEN 15',
    'Padrão',
    'Converter a própria ofensiva em uma oportunidade para o aliado melhor posicionado',
    'Escolha um aliado a até 8 unidades que possa ouvir você. Ele pode gastar a própria Reação para realizar um ataque básico contra um alvo válido. Cada aliado só pode atender um Comando de Assalto por rodada; o ataque não gera ataques adicionais.',
    'effort',
  ),
  bookCombatSkill(
    'analisar-padrao',
    'Analisar Padrão',
    '2',
    'SEN 5',
    'Movimento',
    'Preparar um golpe confiável contra um adversário difícil de ler',
    'Observe um alvo visível. Seu próximo ataque corpo a corpo contra ele, até o fim do próximo turno, recebe Vantagem. O benefício termina após um ataque, acerte ou erre.',
    'effort',
  ),
  bookCombatSkill(
    'postura-de-muralha',
    'Postura de Muralha',
    '5 por rodada',
    'FOR 15 e Guarda Total',
    'Padrão',
    'Evoluir a defesa pessoal para uma formação de linha de frente',
    'Até o início do próximo turno, você não pode atacar nem causar dano, recebe uma Reação adicional exclusiva para Bloqueio e dobra apenas o VB da armadura; bônus de escudo, arma e habilidade não dobram. Aliados adjacentes recebem +2 VB. Renove com Ação Padrão e novo pagamento. Não acumula com Guarda Total.',
    'effort',
  ),
  bookCombatSkill(
    'rasteira',
    'Rasteira',
    '3',
    'MIG 5 ou GRA 5',
    'Padrão',
    'Derrubar sem causar dano para criar vantagem coletiva',
    'Dispute MIG ou GRA, escolhido ao declarar, contra GRA do alvo adjacente. Se vencer, não cause dano e aplique Derrubado. Depois de resistir ou sofrer o efeito, o alvo fica imune à sua Rasteira por 1 rodada.',
    'effort',
  ),
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

function normalizeDependencyText(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR')
}

/**
 * Extrai somente dependências entre habilidades do requisito editorial do livro.
 * Atributos, equipamentos e perícias continuam no catálogo como referências de
 * balanceamento, mas não são pré-requisitos mecânicos da árvore de talentos.
 */
export function combatSkillDependencyRequirement(skill: CombatSkill): string | undefined {
  if (!skill.requirement) return undefined
  const requirement = normalizeDependencyText(skill.requirement)
  const dependencies = ALL_COMBAT_SKILLS.filter((candidate) => candidate.id !== skill.id)
    .map((candidate) => ({
      skill: candidate,
      position: requirement.indexOf(normalizeDependencyText(candidate.name)),
    }))
    .filter(({ position }) => position >= 0)
    .sort((a, b) => a.position - b.position || b.skill.name.length - a.skill.name.length)

  const uniqueNames = [...new Set(dependencies.map(({ skill: dependency }) => dependency.name))]
  return uniqueNames.length > 0 ? uniqueNames.join(' e ') : undefined
}
