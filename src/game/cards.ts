import { Card } from './types'

let cardIdCounter = 0
function makeId() {
  return `card_${++cardIdCounter}_${Math.random().toString(36).slice(2, 7)}`
}

export const DEFENSE_CARDS: Omit<Card, 'id'>[] = [
  {
    name: 'Repair',
    nameJa: '修復',
    type: 'defense',
    description: 'Target section HP +2',
    descriptionJa: '対象セクション耐久度+2',
    effect: 'repair',
  },
  {
    name: 'Fortify',
    nameJa: '迎撃',
    type: 'defense',
    description: 'Next damage to target section is halved',
    descriptionJa: '対象セクションへの次のダメージを半減する',
    effect: 'fortify',
  },
  {
    name: 'Scout',
    nameJa: '偵察',
    type: 'defense',
    description: 'See 1 card from any player\'s hand',
    descriptionJa: '任意のプレイヤーの手札を1枚見る',
    effect: 'scout',
  },
  {
    name: 'Encourage',
    nameJa: '激励',
    type: 'defense',
    description: 'Target player draws 2 and plays 2 next turn',
    descriptionJa: '対象プレイヤーは次のターンに2枚引いて2枚プレイできる',
    effect: 'encourage',
  },
  {
    name: 'Capture',
    nameJa: '捕縛',
    type: 'defense',
    description: 'Target player is action-locked for 3 turns',
    descriptionJa: '対象プレイヤーを3ターン行動制限する（稀）',
    effect: 'capture',
  },
  {
    name: 'Release',
    nameJa: '解放',
    type: 'defense',
    description: 'Free 1 captured player',
    descriptionJa: '拘束中のプレイヤー1人を解放する',
    effect: 'release',
  },
]

export const CURSED_CARDS: Omit<Card, 'id'>[] = [
  {
    name: 'Emergency Repair',
    nameJa: '応急修復',
    type: 'cursed',
    description: 'Immediate HP+3, but next turn repair cards disabled on same section',
    descriptionJa: '即座に耐久度+3、ただし次のターンその同じセクションへの修復カードが無効になる',
    effect: 'emergency_repair',
  },
  {
    name: 'Emergency Lockdown',
    nameJa: '緊急封鎖',
    type: 'cursed',
    description: 'This turn enemy damage = 0, but next turn damage ×2',
    descriptionJa: 'このターンの敵襲ダメージを0にするが、次のターンの敵襲ダメージが×2になる',
    effect: 'emergency_lockdown',
  },
  {
    name: 'Conscription',
    nameJa: '徴用令',
    type: 'cursed',
    description: 'Draw 2 extra this turn (3 choices total), but next turn carryover = 0',
    descriptionJa: 'このターンさらに2枚引き最良の1枚を選ぶ（計3択）、ただし次ターンの持ち越しが0になる',
    effect: 'conscription',
  },
  {
    name: 'Forced Release',
    nameJa: '力任せの解放',
    type: 'cursed',
    description: 'Release 1 captured player, but that player discards 1 random card',
    descriptionJa: '拘束中のプレイヤー1人を解放するが、そのプレイヤーは手札をランダムに1枚捨てる',
    effect: 'forced_release',
  },
]

export const TRANSFORMATION_CARDS: Omit<Card, 'id'>[] = [
  {
    name: 'Breath',
    nameJa: 'ブレス',
    type: 'transformation',
    description: 'Target section HP -3',
    descriptionJa: '対象セクション耐久度-3',
    effect: 'breath',
  },
  {
    name: 'Crack',
    nameJa: 'クラック',
    type: 'transformation',
    description: 'Permanently reduce target section max HP by 1',
    descriptionJa: '対象セクションの最大耐久度を永続的に1減少させる',
    effect: 'crack',
  },
  {
    name: 'Raid',
    nameJa: 'レイド',
    type: 'transformation',
    description: 'This round, all repair cards on target section are nullified',
    descriptionJa: 'このラウンド、対象セクションへの修復カードをすべて無効にする',
    effect: 'raid',
  },
  {
    name: 'Stun',
    nameJa: 'スタン',
    type: 'transformation',
    description: 'Restrict 1 defender for 1 turn (capture/release cards only)',
    descriptionJa: '防衛者1人を1ターン制限する（捕縛/解放カードのみ使用可）',
    effect: 'stun',
  },
  {
    name: 'Rampage',
    nameJa: 'ランページ',
    type: 'transformation',
    description: 'This round\'s enemy damage ×1.5 (round down)',
    descriptionJa: 'このラウンドの敵ダメージを×1.5（切り捨て）にする',
    effect: 'rampage',
  },
  {
    name: 'Escape',
    nameJa: 'エスケープ',
    type: 'transformation',
    description: 'Free 1 captured player',
    descriptionJa: '拘束中のプレイヤー1人を解放する',
    effect: 'escape',
  },
  {
    name: 'Invisible',
    nameJa: 'インビジブル',
    type: 'transformation',
    description: 'This turn, cannot be captured',
    descriptionJa: 'このターン、捕縛されない',
    effect: 'invisible',
  },
]

function instantiate(template: Omit<Card, 'id'>): Card {
  return { ...template, id: makeId() }
}

/** Build the shared deck for a game (defense + cursed, no transformation) */
export function buildDeck(playerCount: number): Card[] {
  const deck: Card[] = []

  // Weights: defense cards get multiple copies, cursed ~15-20%
  const totalCards = playerCount * 8 // rough target
  const cursedTarget = Math.floor(totalCards * 0.18)
  const defenseTarget = totalCards - cursedTarget

  // Distribute defense cards roughly evenly
  const perDefense = Math.ceil(defenseTarget / DEFENSE_CARDS.length)
  for (const template of DEFENSE_CARDS) {
    let count = perDefense
    // capture is rare
    if (template.effect === 'capture') count = Math.max(1, Math.floor(perDefense / 3))
    for (let i = 0; i < count; i++) deck.push(instantiate(template))
  }

  // Add cursed cards
  const perCursed = Math.ceil(cursedTarget / CURSED_CARDS.length)
  for (const template of CURSED_CARDS) {
    for (let i = 0; i < perCursed; i++) deck.push(instantiate(template))
  }

  return shuffle(deck)
}

/** Build the transformation deck (one set per game, shared by traitors) */
export function buildTransformationDeck(): Card[] {
  const deck: Card[] = []
  for (const template of TRANSFORMATION_CARDS) {
    for (let i = 0; i < 3; i++) deck.push(instantiate(template))
  }
  return shuffle(deck)
}

export function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
