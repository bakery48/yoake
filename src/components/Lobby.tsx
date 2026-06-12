'use client'

import { useState, useEffect } from 'react'

interface PlayerInfo {
  id: string
  name: string
  cardCount: number
  isReady: boolean
  isBot?: boolean
  preferredRole?: 'defender' | 'traitor'
}

interface RoomInfo {
  roomId: string
  playerCount: number
  maxPlayers: number
  hostName: string
  started: boolean
}

interface Props {
  onCreateRoom: (playerName: string) => void
  onJoinRoom: (roomId: string, playerName: string) => void
  onListRooms: () => void
  rooms: RoomInfo[]
  error: string | null
  connected: boolean
  inRoom: boolean
  roomId: string | null
  players: PlayerInfo[]
  myId: string | null
  hostId: string | null
  onStartGame: (roomId: string) => void
  onAddCpu: (roomId: string) => void
  onRemoveCpu: (roomId: string, cpuId: string) => void
  onSetRole: (roomId: string, role: 'defender' | 'traitor' | null) => void
}

export default function Lobby({
  onCreateRoom,
  onJoinRoom,
  onListRooms,
  rooms,
  error,
  connected,
  inRoom,
  roomId,
  players,
  myId,
  hostId,
  onStartGame,
  onAddCpu,
  onRemoveCpu,
  onSetRole,
}: Props) {
  const [playerName, setPlayerName] = useState('')
  const [joinCode, setJoinCode] = useState('')
  const [tab, setTab] = useState<'create' | 'join' | 'list'>('create')

  useEffect(() => {
    if (tab === 'list') onListRooms()
  }, [tab])

  if (inRoom && roomId) {
    const isHost = myId === hostId
    const canStart = players.length >= 4
    const canAddCpu = players.length < 8

    return (
      <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
        <div className="w-full max-w-lg">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-amber-glow mb-1">夜が明けるまで</h1>
            <p className="text-gray-500 text-sm">Until Dawn Breaks</p>
          </div>

          <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">ルームで待機中</h2>
              <div className="font-mono text-2xl font-bold text-amber-glow tracking-widest">
                {roomId}
              </div>
            </div>

            <div className="flex items-center justify-between mb-2">
              <div className="text-xs text-gray-500">参加者 ({players.length}/8)</div>
              {isHost && canAddCpu && (
                <button
                  onClick={() => onAddCpu(roomId)}
                  className="text-xs bg-blue-900/40 text-blue-400 border border-blue-700/50 px-3 py-1 rounded-lg hover:bg-blue-900/60 transition-all"
                >
                  + CPU を追加
                </button>
              )}
            </div>

            <div className="space-y-2 mb-4">
              {players.map((p) => (
                <div
                  key={p.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    p.id === myId
                      ? 'bg-amber-glow/10 border border-amber-glow/30'
                      : p.isBot
                      ? 'bg-blue-950/30 border border-blue-800/40'
                      : 'bg-dark-bg border border-dark-border'
                  }`}
                >
                  <div
                    className={`w-2 h-2 rounded-full ${
                      p.id === hostId ? 'bg-amber-glow' : p.isBot ? 'bg-blue-500' : 'bg-gray-600'
                    }`}
                  />
                  <span className="text-sm text-white flex-1">{p.name}</span>
                  {p.isBot && (
                    <span className="text-[10px] text-blue-400 bg-blue-900/30 px-1.5 py-0.5 rounded">
                      CPU
                    </span>
                  )}
                  {p.id === hostId && (
                    <span className="text-[10px] text-amber-glow">ホスト</span>
                  )}
                  {p.id === myId && (
                    <span className="text-[10px] text-gray-500">あなた</span>
                  )}
                  {isHost && p.isBot && (
                    <button
                      onClick={() => onRemoveCpu(roomId, p.id)}
                      className="text-[10px] text-red-500 hover:text-red-400 ml-1"
                    >
                      ✕
                    </button>
                  )}
                </div>
              ))}
            </div>

            {/* Role preference (test feature) */}
            {(() => {
              const me = players.find((p) => p.id === myId)
              if (!me || me.isBot) return null
              return (
                <div className="mb-4 p-3 bg-dark-bg border border-dark-border rounded-xl">
                  <div className="text-xs text-gray-500 mb-2">役職を指定（テスト用）</div>
                  <div className="flex gap-2">
                    {(['defender', 'traitor', null] as const).map((role) => (
                      <button
                        key={String(role)}
                        onClick={() => onSetRole(roomId!, role)}
                        className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                          me.preferredRole === role
                            ? role === 'traitor'
                              ? 'bg-red-700 text-white'
                              : role === 'defender'
                              ? 'bg-blue-700 text-white'
                              : 'bg-amber-glow text-black'
                            : 'bg-dark-border text-gray-400 hover:text-white'
                        }`}
                      >
                        {role === 'defender' ? '🛡 防衛者' : role === 'traitor' ? '🗡 裏切り者' : 'ランダム'}
                      </button>
                    ))}
                  </div>
                </div>
              )
            })()}

            {!canStart && (
              <p className="text-xs text-yellow-500 text-center mb-4">
                ゲームを開始するには4人以上必要です（現在{players.length}人）
                {isHost && players.length < 4 && (
                  <span className="block mt-0.5 text-gray-500">
                    ← 「CPU を追加」ボタンで練習対戦できます
                  </span>
                )}
              </p>
            )}

            {isHost ? (
              <button
                onClick={() => onStartGame(roomId)}
                disabled={!canStart}
                className={`w-full py-3 rounded-xl font-bold transition-all ${
                  canStart
                    ? 'bg-amber-glow text-black hover:bg-gold-light'
                    : 'bg-dark-border text-gray-600 cursor-not-allowed'
                }`}
              >
                ゲーム開始
              </button>
            ) : (
              <div className="text-center text-gray-500 text-sm py-2">
                ホストがゲームを開始するのを待っています…
              </div>
            )}

            <div className="mt-3 text-center text-xs text-gray-600">
              ルームコードを他のプレイヤーと共有してください
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-dark-bg flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-10">
          <h1 className="text-4xl font-bold text-amber-glow mb-2 tracking-tight">
            夜が明けるまで
          </h1>
          <p className="text-gray-500">Until Dawn Breaks — 隠れ役職タワーディフェンスカードゲーム</p>
          <div
            className={`mt-2 inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${
              connected ? 'text-green-400 bg-green-900/20' : 'text-gray-500 bg-dark-border'
            }`}
          >
            <div className={`w-1.5 h-1.5 rounded-full ${connected ? 'bg-green-400' : 'bg-gray-500'}`} />
            {connected ? '接続済み' : '接続中…'}
          </div>
        </div>

        <div className="flex bg-dark-card border border-dark-border rounded-xl p-1 mb-4">
          {(['create', 'join', 'list'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                tab === t
                  ? 'bg-amber-glow text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              {t === 'create' ? 'ルーム作成' : t === 'join' ? 'ルーム参加' : 'ルーム一覧'}
            </button>
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-950/60 border border-red-700 rounded-xl text-red-400 text-sm">
            {error}
          </div>
        )}

        <div className="bg-dark-card border border-dark-border rounded-2xl p-6">
          {tab === 'create' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">プレイヤー名</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="名前を入力"
                  maxLength={16}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-glow text-sm"
                />
              </div>
              <button
                onClick={() => playerName.trim() && onCreateRoom(playerName.trim())}
                disabled={!playerName.trim() || !connected}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-glow text-black hover:bg-gold-light disabled:bg-dark-border disabled:text-gray-600 disabled:cursor-not-allowed transition-all"
              >
                ルームを作成する
              </button>
              <p className="text-xs text-gray-600 text-center">
                作成後、CPU を追加して1人で練習対戦できます
              </p>
            </div>
          )}

          {tab === 'join' && (
            <div className="space-y-4">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">プレイヤー名</label>
                <input
                  type="text"
                  value={playerName}
                  onChange={(e) => setPlayerName(e.target.value)}
                  placeholder="名前を入力"
                  maxLength={16}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-glow text-sm"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">ルームコード</label>
                <input
                  type="text"
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  placeholder="XXXX"
                  maxLength={4}
                  className="w-full bg-dark-bg border border-dark-border rounded-xl px-4 py-2.5 text-white placeholder-gray-600 focus:outline-none focus:border-amber-glow text-sm font-mono tracking-widest text-center uppercase"
                />
              </div>
              <button
                onClick={() =>
                  playerName.trim() && joinCode.length === 4 && onJoinRoom(joinCode, playerName.trim())
                }
                disabled={!playerName.trim() || joinCode.length !== 4 || !connected}
                className="w-full py-3 rounded-xl font-bold text-sm bg-amber-glow text-black hover:bg-gold-light disabled:bg-dark-border disabled:text-gray-600 disabled:cursor-not-allowed transition-all"
              >
                ルームに参加する
              </button>
            </div>
          )}

          {tab === 'list' && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <span className="text-sm text-gray-400">オープンルーム</span>
                <button
                  onClick={onListRooms}
                  className="text-xs text-amber-glow hover:text-gold-light"
                >
                  更新
                </button>
              </div>
              {rooms.length === 0 ? (
                <div className="text-center text-gray-600 text-sm py-8">
                  利用可能なルームがありません
                </div>
              ) : (
                <div className="space-y-2">
                  {rooms.map((room) => (
                    <div
                      key={room.roomId}
                      className="flex items-center gap-3 bg-dark-bg border border-dark-border rounded-xl px-3 py-2"
                    >
                      <span className="font-mono font-bold text-amber-glow text-sm">
                        {room.roomId}
                      </span>
                      <span className="flex-1 text-xs text-gray-400">{room.hostName}のルーム</span>
                      <span className="text-xs text-gray-500">
                        {room.playerCount}/{room.maxPlayers}人
                      </span>
                      <button
                        onClick={() => {
                          setTab('join')
                          setJoinCode(room.roomId)
                        }}
                        className="text-xs bg-amber-glow/20 text-amber-glow px-2 py-1 rounded-lg hover:bg-amber-glow/30"
                      >
                        参加
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        <div className="mt-6 bg-dark-card border border-dark-border rounded-2xl p-4 text-xs text-gray-500 space-y-1">
          <div className="font-semibold text-gray-400 mb-2">ゲーム概要</div>
          <div>👥 4〜8人プレイ / 8ラウンド制</div>
          <div>⚔️ 防衛者：8ラウンド生き残る（崩壊1以下）</div>
          <div>🐍 裏切り者：2セクションを崩壊させる</div>
          <div>🤖 CPU対戦：ルーム作成後にCPUを追加</div>
        </div>
      </div>
    </div>
  )
}
