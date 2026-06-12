'use client'

import { useState, useEffect, useRef } from 'react'
import { PlayerView, SectionId, GamePhase } from '@/game/types'
import FortressMap from './FortressMap'
import SectionCard from './SectionCard'
import CardReference from './CardReference'
import RulebookModal from './RulebookModal'
import PlayerHand from './PlayerHand'
import PlayerList from './PlayerList'
import PhaseIndicator from './PhaseIndicator'

const SECTION_ORDER: SectionId[] = ['watchtower', 'gate', 'armory', 'barracks']

interface Props {
  state: PlayerView
  onVote: (sectionId: SectionId) => void
  onAction: (cardId: string, targetSection: SectionId, sabotageSection?: SectionId) => void
  onTransform: () => void
  onLeave: () => void
  onRematch: () => void
}

export default function GameBoard({ state, onVote, onAction, onTransform, onLeave, onRematch }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null)
  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<string | null>(null)
  const [selectedSabotageSection, setSelectedSabotageSection] = useState<SectionId | null>(null)
  const [voteSubmitted, setVoteSubmitted] = useState(false)
  const [actionSubmitted, setActionSubmitted] = useState(false)
  const [transformBanner, setTransformBanner] = useState<string | null>(null)
  const logRef = useRef<HTMLDivElement>(null)

  // Show transform banner when announcement arrives
  useEffect(() => {
    if (state.transformAnnouncement) {
      setTransformBanner(state.transformAnnouncement)
      const t = setTimeout(() => setTransformBanner(null), 3000)
      return () => clearTimeout(t)
    }
  }, [state.transformAnnouncement])

  // Reset selections on phase change
  useEffect(() => {
    setSelectedCardId(null)
    setSelectedSection(null)
    setSelectedTargetPlayerId(null)
    setSelectedSabotageSection(null)
    if (state.phase === 'traitor-voting') setVoteSubmitted(false)
    if (state.phase === 'action') setActionSubmitted(false)
  }, [state.phase])

  // Scroll log to bottom
  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight
    }
  }, [state.log])

  const isMyTurn = !state.actionsSubmitted.includes(state.myPlayer.id)
  const isTraitor = state.myPlayer.role === 'traitor'
  const isTransformed = state.myPlayer.isTransformed
  const isCapturedOrStunned = state.myPlayer.isCaptured || state.myPlayer.isStunned

  // Cards that target players (not sections)
  const playerTargetEffects = ['encourage', 'capture', 'stun', 'escape', 'scout', 'release', 'forced_release']
  // Cards that require no target (self-affecting)
  const selfTargetEffects = ['conscription', 'invisible', 'rampage']
  const selectedCard = state.myPlayer.hand.find((c) => c.id === selectedCardId)
  const needsPlayerTarget = selectedCard && playerTargetEffects.includes(selectedCard.effect)
  const isSelfTarget = selectedCard && selfTargetEffects.includes(selectedCard.effect)

  const canSubmitAction =
    state.phase === 'action' &&
    !actionSubmitted &&
    selectedCardId !== null &&
    (isSelfTarget || (needsPlayerTarget ? selectedTargetPlayerId !== null : selectedSection !== null))

  function handleSubmitAction() {
    if (!selectedCardId) return
    const sabotage = isTraitor && !isTransformed ? selectedSabotageSection ?? undefined : undefined
    if (needsPlayerTarget && selectedTargetPlayerId) {
      onAction(selectedCardId, selectedTargetPlayerId as unknown as SectionId, sabotage)
    } else if (isSelfTarget) {
      onAction(selectedCardId, 'watchtower' as SectionId, sabotage)
    } else if (selectedSection) {
      onAction(selectedCardId, selectedSection, sabotage)
    }
    setActionSubmitted(true)
    setSelectedCardId(null)
    setSelectedSection(null)
    setSelectedTargetPlayerId(null)
    setSelectedSabotageSection(null)
  }

  function handleVote(sectionId: SectionId) {
    if (voteSubmitted) return
    onVote(sectionId)
    setVoteSubmitted(true)
  }

  const winner = state.winner
  const sectionNames: Record<SectionId, string> = {
    watchtower: '見張り塔',
    gate: '城門',
    armory: '武器庫',
    barracks: '兵舎',
  }

  return (
    <div className="flex flex-col h-screen bg-dark-bg text-white overflow-hidden">
      {/* Transform reveal overlay */}
      {transformBanner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="animate-pulse text-center">
            <div className="text-6xl mb-4">💀</div>
            <div className="text-4xl font-extrabold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] tracking-wide">
              {transformBanner}は
            </div>
            <div className="text-4xl font-extrabold text-red-500 drop-shadow-[0_0_20px_rgba(239,68,68,0.9)] tracking-wide mt-1">
              モンスターだった！
            </div>
          </div>
        </div>
      )}
      {/* Header */}
      <div className="flex-shrink-0 px-4 py-2 border-b border-dark-border">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex flex-col">
            <span className="text-xs text-gray-500">ルーム</span>
            <span className="text-sm font-mono font-bold text-amber-glow">{state.roomId}</span>
          </div>
          <div className="flex-1">
            <PhaseIndicator
              phase={state.phase}
              round={state.round}
              dawnCounter={state.dawnCounter}
            />
          </div>
          {/* Crisis indicator */}
          {state.collapsedCount >= 1 && (
            <div className="bg-red-900/80 border border-red-600 rounded-lg px-3 py-1 text-sm font-bold text-red-400 animate-pulse">
              ⚠ クライシス！
            </div>
          )}
          {/* My role badge */}
          <div
            className={`rounded-lg px-3 py-1 text-sm font-bold ${
              isTraitor
                ? isTransformed
                  ? 'bg-red-900 text-red-300 border border-red-600'
                  : 'bg-red-950 text-red-400 border border-red-800'
                : 'bg-blue-950 text-blue-300 border border-blue-800'
            }`}
          >
            {isTraitor ? (isTransformed ? '👹 変身済み' : '🐍 裏切り者') : '⚔️ 防衛者'}
          </div>
          <RulebookModal />
          <CardReference />
        </div>
      </div>

      {/* Game Over Banner */}
      {winner && (
        <div
          className={`flex-shrink-0 py-6 text-center ${
            winner === 'defenders' ? 'bg-blue-900/80' : 'bg-red-900/80'
          }`}
        >
          <div className="text-3xl font-bold mb-1">
            {winner === 'defenders' ? '🌅 防衛者の勝利！' : '🌑 裏切り者の勝利！'}
          </div>
          <div className="text-gray-300 text-sm mb-4">
            {winner === 'defenders'
              ? '夜明けまで砦を守り切った！'
              : '2つのセクションが崩壊した…'}
          </div>
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={onLeave}
              className="px-5 py-2 rounded-xl text-sm font-bold bg-dark-card border border-dark-border text-gray-300 hover:text-white hover:border-gray-500 transition-all"
            >
              ロビーへ戻る
            </button>
            {state.myPlayer.id === state.hostId && (
              <button
                onClick={onRematch}
                className="px-5 py-2 rounded-xl text-sm font-bold bg-amber-glow text-black hover:bg-gold-light transition-all"
              >
                もう一戦
              </button>
            )}
          </div>
        </div>
      )}

      {/* Main content */}
      <div className="flex flex-1 overflow-hidden gap-0">
        {/* Center: Map fills full height, sections + hand overlaid */}
        <div className="flex flex-col flex-1 overflow-hidden relative">
          {/* Map background fills entire area */}
          <FortressMap className="absolute inset-0" />
          {/* Phase-specific tint */}
          <div className={`absolute inset-0 pointer-events-none transition-colors duration-700 ${
            state.phase === 'enemy-attack'        ? 'bg-red-900/25' :
            state.phase === 'traitor-voting'      ? 'bg-purple-950/25' :
            state.phase === 'watchtower-reveal'   ? 'bg-yellow-900/20' :
            state.phase === 'action'              ? 'bg-blue-950/15' :
            state.phase === 'immediate-effects'   ? 'bg-purple-900/20' :
            'bg-transparent'
          }`} />

          {/* Overlay layout */}
          <div className="relative flex-1 flex flex-col overflow-hidden">
            {/* Top: Section cards */}
            {(() => {
              const selectable =
                (state.phase === 'action' && !needsPlayerTarget && !actionSubmitted) ||
                (isTraitor && state.phase === 'traitor-voting' && !voteSubmitted)
              const showAttackTarget =
                state.phase === 'watchtower-reveal' ||
                state.phase === 'enemy-attack' ||
                state.phase === 'marker-visualization' ||
                (isTraitor && state.phase === 'action')
              const awaitingSectionPick =
                state.phase === 'action' && !actionSubmitted &&
                selectedCardId !== null && !needsPlayerTarget && !isSelfTarget && !selectedSection
              return (
                <div className="flex-shrink-0 px-3 pt-3 pb-6 flex justify-center gap-3 bg-gradient-to-b from-black/70 to-transparent">
                  {SECTION_ORDER.map((id) => {
                    const section = state.sections.find((s) => s.id === id)!
                    return (
                      <SectionCard
                        key={id}
                        section={section}
                        isSelected={selectedSection === id}
                        isAttackTarget={showAttackTarget && state.attackTarget === id}
                        selectable={selectable}
                        isHinted={awaitingSectionPick && !section.isCollapsed}
                        onClick={() => {
                          if (isTraitor && state.phase === 'traitor-voting' && !voteSubmitted) {
                            handleVote(id)
                          } else if (state.phase === 'action' && !needsPlayerTarget) {
                            setSelectedSection(id)
                          }
                        }}
                      />
                    )
                  })}
                </div>
              )
            })()}

            {/* Middle: Status messages (scrollable, transparent) */}
            <div className="flex-1 overflow-y-auto py-2 flex flex-col items-center gap-2">
              {/* Watchtower reveal */}
              {state.phase === 'watchtower-reveal' && state.watchtowerRevealTarget && (
                <div className="bg-yellow-900/60 border border-yellow-500/50 rounded-xl p-3 text-center animate-fade-in backdrop-blur-sm w-fit max-w-xs">
                  <div className="text-base font-bold text-yellow-300 mb-0.5">🗼 見張り塔の啓示</div>
                  <div className="text-gray-300 text-sm">
                    敵の攻撃目標：
                    <span className="font-bold text-yellow-200 ml-1">
                      {sectionNames[state.watchtowerRevealTarget]}
                    </span>
                  </div>
                </div>
              )}

              {/* Traitor voting UI */}
              {isTraitor && state.phase === 'traitor-voting' && (
                <div className="bg-red-950/70 border border-red-800/50 rounded-xl p-3 backdrop-blur-sm w-fit max-w-xs">
                  <div className="text-sm font-bold text-red-400 mb-1">
                    🗳️ 裏切り者の秘密投票
                    {voteSubmitted && <span className="ml-2 text-green-400">✓ 投票済み</span>}
                  </div>
                  {!voteSubmitted ? (
                    <div className="text-xs text-gray-400">上のセクションカードをクリックして攻撃目標に投票</div>
                  ) : (
                    <div className="text-xs text-gray-500">
                      他の裏切り者の投票を待っています… ({state.traitorVotesSubmitted.length}/{
                        state.players.filter(p => state.traitorAllies.includes(p.id) || p.id === state.myPlayer.id).length
                      })
                    </div>
                  )}
                  {state.traitorVotes && (
                    <div className="mt-2 flex gap-2 flex-wrap">
                      {Object.entries(state.traitorVotes).map(([pid, sid]) => {
                        const pName = state.players.find(p => p.id === pid)?.name ?? pid
                        return (
                          <span key={pid} className="text-xs bg-red-900/40 text-red-300 px-2 py-1 rounded">
                            {pName} → {sectionNames[sid]}
                          </span>
                        )
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Waiting for others to vote */}
              {!isTraitor && state.phase === 'traitor-voting' && (
                <div className="bg-black/50 border border-dark-border rounded-xl p-3 text-center text-gray-400 text-sm backdrop-blur-sm w-fit max-w-xs">
                  <div className="animate-pulse">🌙 裏切り者が密かに謀議中…</div>
                </div>
              )}

              {/* Auto-processing phase indicator */}
              {(state.phase === 'immediate-effects' ||
                state.phase === 'marker-visualization' ||
                state.phase === 'enemy-attack' ||
                state.phase === 'draw') && (
                <div className="flex items-center justify-center gap-2 py-2">
                  <div className="flex gap-1">
                    {[0,1,2].map(i => (
                      <div key={i} className="w-2 h-2 rounded-full bg-amber-glow animate-bounce"
                        style={{ animationDelay: `${i * 0.15}s` }} />
                    ))}
                  </div>
                  <span className="text-sm text-gray-400">
                    {state.phase === 'immediate-effects' ? 'カード効果を処理中…' :
                     state.phase === 'marker-visualization' ? 'マーカーを確認中…' :
                     state.phase === 'enemy-attack' ? '敵が攻撃中…' :
                     'カードを配布中…'}
                  </span>
                </div>
              )}

              {/* Resolved actions display */}
              {(state.phase === 'immediate-effects' ||
                state.phase === 'marker-visualization' ||
                state.phase === 'enemy-attack' ||
                state.phase === 'draw') &&
                Object.keys(state.playedCards).length > 0 && (
                  <div className="bg-black/60 border border-dark-border rounded-xl p-3 backdrop-blur-sm w-fit max-w-sm">
                    <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">今ラウンドの行動</div>
                    <div className="space-y-1">
                      {Object.entries(state.playedCards).map(([pid, action]) => {
                        const pInfo = state.players.find((p) => p.id === pid)
                        return (
                          <div key={pid} className="flex items-center gap-2 text-sm">
                            <span className="text-gray-400">{pInfo?.name ?? pid}</span>
                            <span className="text-amber-glow font-medium">{action.card.nameJa}</span>
                            {!selfTargetEffects.includes(action.card.effect) && (
                              <>
                                <span className="text-gray-500 text-xs">→</span>
                                <span className="text-gray-400 text-xs">
                                  {sectionNames[action.targetSection] ??
                                    state.players.find((p) => p.id === action.targetSection)?.name ??
                                    action.targetSection}
                                </span>
                              </>
                            )}
                          </div>
                        )
                      })}
                    </div>
                  </div>
                )}
            </div>

            {/* Bottom: Hand + action UI overlay */}
            <div className="flex-shrink-0 px-3 pt-6 pb-3 bg-gradient-to-t from-black/85 via-black/60 to-transparent space-y-3">
              {/* Predicted damage banner */}
              {state.phase === 'action' && !winner && state.attackTarget && state.predictedAttackDamage !== null && (
                <div className="bg-red-950/70 border border-red-800/50 rounded-xl px-3 py-2 flex items-center justify-between text-sm backdrop-blur-sm">
                  <span className="text-red-400">
                    ⚔️ 次の敵襲 → <span className="font-bold text-white">{sectionNames[state.attackTarget]}</span>
                  </span>
                  <span className="text-red-300 font-bold">
                    予想ダメージ <span className="text-red-400 text-base">{state.predictedAttackDamage}</span>
                    <span className="text-xs text-gray-500 ml-1">※カード効果前</span>
                  </span>
                </div>
              )}

              {/* Hand */}
              {state.phase === 'action' && !winner && (
                <>
                  <PlayerHand
                    hand={state.myPlayer.hand}
                    selectedCardId={selectedCardId}
                    onSelectCard={setSelectedCardId}
                    phase={state.phase}
                    myPlayer={state.myPlayer}
                    canPlay={!actionSubmitted}
                  />

                  {selectedCard && (
                    <div className="bg-black/70 border border-dark-border rounded-xl p-3 backdrop-blur-sm">
                      <div className="text-xs text-gray-500 mb-1">選択中のカード</div>
                      <div className="text-sm font-bold text-white">{selectedCard.nameJa}</div>
                      <div className="text-xs text-gray-400 mt-1">{selectedCard.descriptionJa}</div>
                      {!isSelfTarget && needsPlayerTarget && (
                        <div className="mt-2 text-xs text-amber-400">右のプレイヤーリストから対象を選択してください</div>
                      )}
                      {!isSelfTarget && !needsPlayerTarget && !selectedSection && (
                        <div className="mt-2 text-xs text-amber-400">上のセクションカードから対象を選択してください</div>
                      )}
                      {!isSelfTarget && selectedSection && !needsPlayerTarget && (
                        <div className="mt-2 text-xs text-green-400">対象: {sectionNames[selectedSection]}</div>
                      )}
                    </div>
                  )}

                  {/* Sabotage picker — un-transformed traitors only */}
                  {isTraitor && !isTransformed && !actionSubmitted && (
                    <div className="bg-red-950/60 border border-red-800/50 rounded-xl p-3 backdrop-blur-sm">
                      <div className="text-xs font-bold text-red-400 mb-2">🔧 秘密の破壊工作（任意）</div>
                      <div className="flex gap-2 flex-wrap">
                        {SECTION_ORDER.map((id) => {
                          const sec = state.sections.find((s) => s.id === id)!
                          const isSelected = selectedSabotageSection === id
                          return (
                            <button
                              key={id}
                              disabled={sec.isCollapsed}
                              onClick={() => setSelectedSabotageSection(isSelected ? null : id)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all border ${
                                sec.isCollapsed
                                  ? 'opacity-30 cursor-not-allowed border-gray-700 text-gray-600'
                                  : isSelected
                                  ? 'bg-red-700 border-red-500 text-white shadow-[0_0_8px_rgba(239,68,68,0.5)]'
                                  : 'bg-red-950/40 border-red-800/40 text-red-300 hover:bg-red-900/50'
                              }`}
                            >
                              {sec.emoji} {sec.nameJa}
                            </button>
                          )
                        })}
                      </div>
                      {selectedSabotageSection && (
                        <div className="mt-1.5 text-[10px] text-red-400">
                          工作先: {state.sections.find(s => s.id === selectedSabotageSection)?.nameJa} — 1ダメージ（発覚しない）
                        </div>
                      )}
                    </div>
                  )}

                  {!actionSubmitted && (
                    <button
                      onClick={handleSubmitAction}
                      disabled={!canSubmitAction}
                      className={`w-full py-3 rounded-xl font-bold text-sm transition-all ${
                        canSubmitAction
                          ? 'bg-amber-glow text-black hover:bg-gold-light'
                          : 'bg-dark-border text-gray-600 cursor-not-allowed'
                      }`}
                    >
                      {selectedCard ? `「${selectedCard.nameJa}」を使用する` : 'カードを使用する'}
                    </button>
                  )}

                  {actionSubmitted && (
                    <div className="text-center text-green-400 text-sm py-1 animate-fade-in">
                      ✓ 行動送信済み。他のプレイヤーを待っています…
                    </div>
                  )}

                  {isCapturedOrStunned && (
                    <div className="text-xs text-yellow-400 text-center">
                      {state.myPlayer.isCaptured ? '⛓ 拘束中' : '⚡ スタン中'}
                      — 捕縛/解放/エスケープ/力任せの解放のみ使用可
                    </div>
                  )}
                </>
              )}

              {/* Transform button */}
              {isTraitor && !isTransformed && !winner && (
                <button
                  onClick={onTransform}
                  className="w-full py-2 rounded-xl font-bold text-sm bg-red-900/70 border border-red-700 text-red-400 hover:bg-red-800/70 transition-all backdrop-blur-sm"
                >
                  💀 変身する（裏切り者カードを使用可能に）
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Right sidebar: Player list + Log */}
        <div className="flex flex-col w-64 flex-shrink-0 border-l border-dark-border overflow-hidden">
          {/* Players */}
          <div className="flex-shrink-0 p-3 border-b border-dark-border">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">プレイヤー</div>
            <PlayerList
              players={state.players}
              myId={state.myPlayer.id}
              traitorAllies={state.traitorAllies}
              actionsSubmitted={state.actionsSubmitted}
              onSelectTarget={
                state.phase === 'action' && selectedCard && needsPlayerTarget
                  ? setSelectedTargetPlayerId
                  : undefined
              }
              selectedTargetId={selectedTargetPlayerId}
            />
          </div>

          {/* Log */}
          <div className="flex flex-col flex-1 overflow-hidden p-3">
            <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">イベントログ</div>
            <div
              ref={logRef}
              className="flex-1 overflow-y-auto space-y-1 text-xs font-mono"
            >
              {state.log.map((entry, i) => {
                const color =
                  /崩壊|ダメージ|攻撃|ブレス|クラック|レイド|スタン|ランページ/.test(entry) ? 'text-red-400' :
                  /修復|耐久度\+|解放|激励/.test(entry) ? 'text-green-400' :
                  /拘束|捕縛/.test(entry) ? 'text-yellow-400' :
                  /裏切り者|モンスター|変身/.test(entry) ? 'text-purple-400' :
                  /見張り塔|啓示/.test(entry) ? 'text-amber-300' :
                  'text-gray-400'
                return (
                  <div key={i} className={`leading-relaxed ${color}`}>
                    <span className="text-gray-600 mr-1">[{i + 1}]</span>
                    {entry}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
