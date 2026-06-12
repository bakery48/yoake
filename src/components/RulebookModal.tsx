'use client'

import { useState } from 'react'

interface Section {
  title: string
  icon: string
  content: React.ReactNode
}

export default function RulebookModal() {
  const [open, setOpen] = useState(false)
  const [tab, setTab] = useState(0)

  const sections: Section[] = [
    {
      title: '概要',
      icon: '📖',
      content: (
        <div className="space-y-4">
          <p className="text-gray-300 text-sm leading-relaxed">
            <span className="text-amber-glow font-bold">夜が明けるまで</span> は 4〜8人用の隠し役職×タワーディフェンス型カードゲームです。
            プレイヤーは<span className="text-blue-300 font-bold">防衛者</span>か<span className="text-red-400 font-bold">裏切り者</span>に割り当てられ、
            互いの正体を隠しながら戦います。
          </p>
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-blue-950/40 border border-blue-700/40 rounded-xl p-3">
              <div className="text-blue-300 font-bold text-sm mb-1">⚔️ 防衛者の目標</div>
              <div className="text-gray-400 text-xs leading-relaxed">
                8ラウンド砦のセクションを守り抜く。<br/>
                2つ崩壊する前に夜明けを迎えれば勝利。
              </div>
            </div>
            <div className="bg-red-950/40 border border-red-700/40 rounded-xl p-3">
              <div className="text-red-400 font-bold text-sm mb-1">🐍 裏切り者の目標</div>
              <div className="text-gray-400 text-xs leading-relaxed">
                任意の2つのセクションを崩壊させれば勝利。<br/>
                変身して直接破壊するか、秘密の工作で弱らせる。
              </div>
            </div>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-3">
            <div className="text-amber-glow font-bold text-sm mb-2">👥 人数と裏切り者の数</div>
            <div className="grid grid-cols-5 gap-1 text-center text-xs">
              {[
                ['4人', '1人'],
                ['5人', '2人'],
                ['6人', '2人'],
                ['7人', '2人'],
                ['8人', '3人'],
              ].map(([p, t]) => (
                <div key={p} className="bg-dark-bg rounded-lg py-1.5">
                  <div className="text-gray-300">{p}</div>
                  <div className="text-red-400 font-bold">{t}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'フェーズ',
      icon: '🔄',
      content: (
        <div className="space-y-2">
          {[
            {
              phase: '① 裏切り者投票',
              color: 'text-red-400',
              bg: 'bg-red-950/30 border-red-800/40',
              icon: '🗳️',
              desc: '裏切り者全員が秘密裏に「今ラウンドの敵の攻撃目標」を投票する。過半数のセクションが攻撃目標になる。防衛者にはわからない。',
            },
            {
              phase: '② 見張り塔の啓示',
              color: 'text-yellow-300',
              bg: 'bg-yellow-900/20 border-yellow-700/40',
              icon: '🗼',
              desc: '見張り塔が耐久度MAX（ボーナス有効）の場合のみ発動。全員に今ラウンドの攻撃目標が公開される。',
            },
            {
              phase: '③ 行動フェーズ',
              color: 'text-blue-400',
              bg: 'bg-blue-950/30 border-blue-800/40',
              icon: '⚔️',
              desc: '全員が同時に1枚カードを使用する。カードの効果対象（セクションまたはプレイヤー）を選択して送信。裏切り者（変身前）は追加で秘密の破壊工作（1ダメージ）を行える。',
            },
            {
              phase: '④ 即時効果解決',
              color: 'text-purple-400',
              bg: 'bg-purple-950/30 border-purple-800/40',
              icon: '✨',
              desc: '全員のカード効果が一斉に解決される。修復・応急修復が最優先で処理される。レイドは修復を無効化する。',
            },
            {
              phase: '⑤ 敵の攻撃',
              color: 'text-red-500',
              bg: 'bg-red-950/30 border-red-700/40',
              icon: '💥',
              desc: '投票で決まった目標セクションに敵がダメージを与える。基本ダメージはラウンドが進むと増加する（1〜3R:2、4〜6R:3、7R〜:4）。',
            },
            {
              phase: '⑥ ドロー',
              color: 'text-green-400',
              bg: 'bg-green-950/20 border-green-800/40',
              icon: '🃏',
              desc: '各プレイヤーが1枚カードを引く。手持ち上限（持ち越し1枚＋引き1枚）を超えたカードは捨てられる。',
            },
          ].map((item) => (
            <div key={item.phase} className={`rounded-xl border p-3 ${item.bg}`}>
              <div className={`font-bold text-sm mb-1 ${item.color}`}>{item.icon} {item.phase}</div>
              <div className="text-gray-400 text-xs leading-relaxed">{item.desc}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'セクション',
      icon: '🏰',
      content: (
        <div className="space-y-3">
          <p className="text-gray-400 text-xs">各セクションは最大耐久度8。HPが0になると崩壊。2つ崩壊で裏切り者の勝利。HPがMAXになると特殊ボーナスが発動する。</p>
          {[
            {
              id: '🗼 見張り塔',
              bonus: 'MAX時：攻撃目標を全員に公開',
              color: 'border-yellow-600/50 bg-yellow-950/20',
              labelColor: 'text-yellow-300',
              desc: '耐久度がMAXの間、裏切り者の投票後に攻撃目標が全員に明かされる。防衛者にとって最重要施設。',
            },
            {
              id: '🚪 城門',
              bonus: 'MAX時：敵襲ダメージ-1',
              color: 'border-blue-600/50 bg-blue-950/20',
              labelColor: 'text-blue-300',
              desc: '耐久度がMAXの間、毎ラウンドの敵攻撃ダメージが1軽減される。長期戦で効果を発揮する。',
            },
            {
              id: '⚔️ 武器庫',
              bonus: 'MAX時：持ち越し枚数+1',
              color: 'border-orange-600/50 bg-orange-950/20',
              labelColor: 'text-orange-300',
              desc: '耐久度がMAXの間、ドロー時の手札持ち越し上限が2枚になる。戦略の幅が広がる。',
            },
            {
              id: '🏥 兵舎',
              bonus: 'MAX時：毎ラウンド最低耐久セクションに+1',
              color: 'border-green-600/50 bg-green-950/20',
              labelColor: 'text-green-300',
              desc: '耐久度がMAXの間、各ラウンドの敵攻撃後に最も耐久度が低いセクションに1耐久度を自動補充する。',
            },
          ].map((sec) => (
            <div key={sec.id} className={`rounded-xl border p-3 ${sec.color}`}>
              <div className={`font-bold text-sm mb-0.5 ${sec.labelColor}`}>{sec.id}</div>
              <div className="text-amber-400/80 text-[10px] font-bold mb-1">{sec.bonus}</div>
              <div className="text-gray-400 text-xs leading-relaxed">{sec.desc}</div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: 'カード',
      icon: '🃏',
      content: (
        <div className="space-y-4">
          {[
            {
              type: '防衛カード',
              color: 'text-blue-400',
              bg: 'bg-blue-950/30 border-blue-700/40',
              note: '防衛者・裏切り者（変身前）共通の手札',
              cards: [
                ['修復', '対象セクション 耐久度+2'],
                ['迎撃', '対象セクションへの次のダメージを半減'],
                ['偵察', '任意プレイヤーの手札を1枚確認'],
                ['激励', '対象プレイヤーは次ターン2枚プレイ可能'],
                ['捕縛', '対象プレイヤーを3ターン行動制限（稀）'],
                ['解放', '拘束中のプレイヤーを1人解放'],
              ],
            },
            {
              type: '呪いカード',
              color: 'text-purple-400',
              bg: 'bg-purple-950/30 border-purple-700/40',
              note: 'リスクとリターンを伴う両刃カード',
              cards: [
                ['応急修復', '即座に耐久度+3 / 次ターンそのセクションへの修復無効'],
                ['緊急封鎖', '今ターンの敵ダメージ0 / 次ターンの敵ダメージ×2'],
                ['徴用令', 'さらに2枚引いて最良1枚選ぶ / 次ターンの持ち越し0'],
                ['力任せの解放', '拘束中プレイヤーを解放 / そのプレイヤーは手札1枚捨て'],
              ],
            },
            {
              type: '変身カード',
              color: 'text-red-400',
              bg: 'bg-red-950/30 border-red-700/40',
              note: '変身済み裏切り者専用の手札',
              cards: [
                ['ブレス', '対象セクション 耐久度-3'],
                ['クラック', '対象セクションの最大耐久度を永続-1'],
                ['レイド', '今ラウンド、対象セクションへの修復カードをすべて無効'],
                ['スタン', '防衛者1人を3ターン拘束'],
                ['ランページ', '今ラウンドの敵ダメージを×1.5（切り捨て）'],
                ['エスケープ', '拘束中のプレイヤーを1人解放'],
                ['インビジブル', '自分はこのターン捕縛されない'],
              ],
            },
          ].map((group) => (
            <div key={group.type} className={`rounded-xl border p-3 ${group.bg}`}>
              <div className={`font-bold text-sm mb-0.5 ${group.color}`}>{group.type}</div>
              <div className="text-gray-500 text-[10px] mb-2">{group.note}</div>
              <div className="space-y-1">
                {group.cards.map(([name, desc]) => (
                  <div key={name} className="flex gap-2 text-xs">
                    <span className="text-white font-bold flex-shrink-0 w-24">{name}</span>
                    <span className="text-gray-400">{desc}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ),
    },
    {
      title: '裏切り者',
      icon: '🐍',
      content: (
        <div className="space-y-3">
          <div className="bg-red-950/30 border border-red-800/40 rounded-xl p-3">
            <div className="text-red-400 font-bold text-sm mb-2">🐍 変身前（潜伏）</div>
            <ul className="text-gray-400 text-xs space-y-1.5 list-disc list-inside">
              <li>防衛者と同じ手札（防衛・呪いカード）を使う</li>
              <li>毎ラウンドの<span className="text-red-300 font-bold">秘密投票</span>で攻撃目標を決める</li>
              <li>行動フェーズに<span className="text-red-300 font-bold">破壊工作</span>（任意）：任意のセクションに1ダメージを与えられる。誰が工作したかは公開されない</li>
              <li>正体は他の防衛者にわからない</li>
            </ul>
          </div>
          <div className="bg-red-900/20 border border-red-700/40 rounded-xl p-3">
            <div className="text-red-300 font-bold text-sm mb-2">👹 変身（覚醒）</div>
            <ul className="text-gray-400 text-xs space-y-1.5 list-disc list-inside">
              <li>任意のタイミングで変身ボタンを押して覚醒できる</li>
              <li>変身すると正体が全員に公開される</li>
              <li>手札が<span className="text-red-300 font-bold">変身カード</span>（ブレス等）に入れ替わる</li>
              <li>変身カードで直接セクションを攻撃できる</li>
              <li>変身カードを初めて使用したときに「◯◯はモンスターだった！」と全員に告知される</li>
            </ul>
          </div>
          <div className="bg-dark-card border border-dark-border rounded-xl p-3">
            <div className="text-gray-300 font-bold text-sm mb-2">💡 戦略のヒント</div>
            <ul className="text-gray-500 text-xs space-y-1 list-disc list-inside">
              <li>変身前は防衛者のふりをして疑惑を避けるべし</li>
              <li>見張り塔を壊すと攻撃目標が隠せるようになる</li>
              <li>城門を壊すとダメージが増える</li>
              <li>仲間の裏切り者とは投票で暗黙の連携ができる</li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: '特殊状態',
      icon: '⚡',
      content: (
        <div className="space-y-3">
          {[
            {
              title: '⛓ 拘束（捕縛・スタン）',
              color: 'text-yellow-400',
              bg: 'bg-yellow-900/20 border-yellow-700/40',
              items: [
                '捕縛カードまたはスタンカードで3ターン発動',
                '拘束中は通常のカードが使用不可',
                '使えるカード：捕縛 / 解放 / エスケープ / 力任せの解放',
                '変身済みプレイヤーは捕縛されない',
                'インビジブル使用中は捕縛を回避できる',
              ],
            },
            {
              title: '🛡️ 要塞強化（迎撃）',
              color: 'text-teal-400',
              bg: 'bg-teal-900/20 border-teal-700/40',
              items: [
                '迎撃カードで対象セクションに設置',
                '次に受けるダメージを半減（切り捨て）',
                '1回使われると効果消滅',
              ],
            },
            {
              title: '⚠️ 呪いカードの副作用',
              color: 'text-orange-400',
              bg: 'bg-orange-900/20 border-orange-700/40',
              items: [
                '応急修復：対象セクションは次ターンの修復カードが無効',
                '緊急封鎖：使用セクションは次ターンの敵ダメージが×2',
                '徴用令：使用者の次ターンの手札持ち越しが0',
              ],
            },
          ].map((item) => (
            <div key={item.title} className={`rounded-xl border p-3 ${item.bg}`}>
              <div className={`font-bold text-sm mb-2 ${item.color}`}>{item.title}</div>
              <ul className="text-gray-400 text-xs space-y-1 list-disc list-inside">
                {item.items.map((i) => <li key={i}>{i}</li>)}
              </ul>
            </div>
          ))}
        </div>
      ),
    },
  ]

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="text-xs text-gray-400 hover:text-white border border-dark-border px-2 py-1 rounded-lg transition-all hover:border-gray-500"
        title="ルールブック"
      >
        📋 ルール
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/70 flex items-center justify-center p-4"
          onClick={() => setOpen(false)}
        >
          <div
            className="bg-[#12121e] border border-dark-border rounded-2xl w-full max-w-lg max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-3 border-b border-dark-border flex-shrink-0">
              <h2 className="text-base font-bold text-amber-glow">📋 ルールブック</h2>
              <button onClick={() => setOpen(false)} className="text-gray-500 hover:text-white text-lg leading-none">✕</button>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-dark-border flex-shrink-0 overflow-x-auto">
              {sections.map((s, i) => (
                <button
                  key={i}
                  onClick={() => setTab(i)}
                  className={`px-3 py-2 text-xs font-bold whitespace-nowrap transition-all flex-shrink-0 ${
                    tab === i
                      ? 'text-amber-glow border-b-2 border-amber-glow'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {s.icon} {s.title}
                </button>
              ))}
            </div>

            {/* Content */}
            <div className="overflow-y-auto p-5 flex-1">
              {sections[tab].content}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
