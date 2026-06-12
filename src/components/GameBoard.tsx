'use client'

import { useState, useEffect, useRef } from 'react'
import { PlayerView, SectionId, GamePhase } from '@/game/types'
import FortressMap from './FortressMap'
import SectionCard from './SectionCard'
import CardReference from './CardReference'
import PlayerHand from './PlayerHand'
import PlayerList from './PlayerList'
import PhaseIndicator from './PhaseIndicator'

const SECTION_ORDER: SectionId[] = ['watchtower', 'gate', 'armory', 'barracks']

interface Props {
  state: PlayerView
  onVote: (sectionId: SectionId) => void
  onAction: (cardId: string, targetSection: SectionId) => void
  onTransform: () => void
  onLeave: () => void
  onRematch: () => void
}

export default function GameBoard({ state, onVote, onAction, onTransform, onLeave, onRematch }: Props) {
  const [selectedCardId, setSelectedCardId] = useState<string | null>(null)
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(null)
  const [selectedTargetPlayerId, setSelectedTargetPlayerId] = useState<string | null>(null)
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
    if (needsPlayerTarget && selectedTargetPlayerId) {
      // Use targetPlayerId as targetSection for these cards (server decodes)
      onAction(selectedCardId, selectedTargetPlayerId as unknown as SectionId)
    } else if (isSelfTarget) {
      // Self-targeting card: pass a dummy section (server ignores it)
      onAction(selectedCardId, 'watchtower' as SectionId)
    } else if (selectedSection) {
      onAction(selectedCardId, selectedSection)
    }
    setActionSubmitted(true)
    setSelectedCardId(null)
    setSelectedSection(null)
    setSelectedTargetPlayerId(null)
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
        {/* Center: Map → Sections → Hand */}
        <div className="flex flex-col flex-1 overflow-y-auto p-4 gap-4">
          {/* Fortress map (background only) */}
          <FortressMap className="h-32 flex-shrink-0" />

          {/* Section cards row */}
          {(() => {
            const selectable =
              (state.phase === 'action' && !needsPlayerTarget && !actionSubmitted) ||
              (isTraitor && state.phase === 'traitor-voting' && !voteSubmitted)
            const showAttackTarget =
              state.phase === 'watchtower-reveal' ||
              state.phase === 'enemy-attack' ||
              state.phase === 'marker-visualization' ||
              (isTraitor && state.phase === 'action')
            return (
              <div className="flex justify-center gap-3 flex-shrink-0">
                {SECTION_ORDER.map((id) => {
                  const section = state.sections.find((s) => s.id === id)!
                  return (
                    <SectionCard
                      key={id}
                      section={section}
                      isSelected={selectedSection === id}
                      isAttackTarget={showAttackTarget && state.attackTarget === id}
                      selectable={selectable}
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

          {/* Watchtower reveal */}
          {state.phase === 'watchtower-reveal' && state.watchtowerRevealTarget && (
            <div className="bg-yellow-900/30 border border-yellow-500/50 rounded-xl p-4 text-center animate-fade-in">
              <div className="text-xl font-bold text-yellow-300 mb-1">
                🗼 見張り塔の啓示
              </div>
              <div className="text-gray-300">
                敵の攻撃目標：
                <span className="font-bold text-yellow-200 ml-1">
                  {sectionNames[state.watchtowerRevealTarget]}
                </span>
              </div>
            </div>
          )}

          {/* Traitor voting UI */}
          {isTraitor && state.phase === 'traitor-voting' && (
            <div className="bg-red-950/40 border border-red-800/50 rounded-xl p-4">
              <div className="text-sm font-bold text-red-400 mb-2">
                🗳️ 裏切り者の秘密投票
                {voteSubmitted && <span className="ml-2 text-green-400">✓ 投票済み</span>}
              </div>
              {!voteSubmitted ? (
                <div className="text-xs text-gray-400">
                  上のセクションカードをクリックして攻撃目標に投票してください
                </div>
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
            <div className="bg-dark-card border border-dark-border rounded-xl p-4 text-center text-gray-500 text-sm">
              <div className="animate-pulse">🌙 裏切り者が密かに謀議中…</div>
            </div>
          )}

          {/* Action phase: hand + section selection */}
          {state.phase === 'action' && !winner && (
            <div className="space-y-4 flex flex-col items-center">
              {state.attackTarget && state.predictedAttackDamage !== null && (
                <div className="bg-red-950/40 border border-red-800/50 rounded-xl px-3 py-2 flex items-center justify-between text-sm">
                  <span className="text-red-400">
                    ⚔️ 次の敵襲 → <span className="font-bold text-white">{sectionNames[state.attackTarget]}</span>
                  </span>
                  <span className="text-red-300 font-bold">
                    予想ダメージ <span className="text-red-400 text-base">{state.predictedAttackDamage}</span>
                    <span className="text-xs text-gray-500 ml-1">※カード効果前</span>
                  </span>
                </div>
              )}
              <PlayerHand
                hand={state.myPlayer.hand}
                selectedCardId={selectedCardId}
                onSelectCard={setSelectedCardId}
                phase={state.phase}
                myPlayer={state.myPlayer}
                canPlay={!actionSubmitted}
              />

              {selectedCard && (
                <div className="bg-dark-card border border-dark-border rounded-xl p-3">
                  <div className="text-xs text-gray-500 mb-1">選択中のカード</div>
                  <div className="text-sm font-bold text-white">{selectedCard.nameJa}</div>
                  <div className="text-xs text-gray-400 mt-1">{selectedCard.descriptionJa}</div>

                  {!isSelfTarget && needsPlayerTarget && (
                    <div className="mt-2 text-xs text-amber-400">
                      右のプレイヤーリストから対象を選択してください
                    </div>
                  )}
                  {!isSelfTarget && !needsPlayerTarget && !selectedSection && (
                    <div className="mt-2 text-xs text-amber-400">
                      上のセクションカードから対象を選択してください
                    </div>
                  )}
                  {!isSelfTarget && selectedSection && !needsPlayerTarget && (
                    <div className="mt-2 text-xs text-green-400">
                      対象: {sectionNames[selectedSection]}
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
                  カードを使用する
                </button>
              )}

              {actionSubmitted && (
                <div className="text-center text-green-400 text-sm py-2 animate-fade-in">
                  ✓ 行動送信済み。他のプレイヤーを待っています…
                </div>
              )}

              {isCapturedOrStunned && (
                <div className="text-xs text-yellow-400 text-center">
                  {state.myPlayer.isCaptured ? '⛓ 拘束中' : '⚡ スタン中'}
                  — 捕縛/解放/エスケープ/力任せの解放のみ使用可
                </div>
              )}
            </div>
          )}

          {/* Action phase: transform button for traitors */}
          {isTraitor && !isTransformed && !winner && (
            <button
              onClick={onTransform}
              className="w-full py-2 rounded-xl font-bold text-sm bg-red-900/60 border border-red-700 text-red-400 hover:bg-red-800/60 transition-all"
            >
              💀 変身する（裏切り者カードを使用可能に）
            </button>
          )}

          {/* Resolved actions display */}
          {(state.phase === 'immediate-effects' ||
            state.phase === 'marker-visualization' ||
            state.phase === 'enemy-attack' ||
            state.phase === 'draw') &&
            Object.keys(state.playedCards).length > 0 && (
              <div className="bg-dark-card border border-dark-border rounded-xl p-3">
                <div className="text-xs text-gray-500 uppercase tracking-wider mb-2">
                  今ラウンドの行動
                </div>
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
              className="flex-1 overflow-y-auto space-y-1 text-xs text-gray-400 font-mono"
            >
              {state.log.map((entry, i) => (
                <div key={i} className="leading-relaxed">
                  <span className="text-gray-600 mr-1">[{i + 1}]</span>
                  {entry}
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
