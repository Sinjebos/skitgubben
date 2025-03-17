<template>
  <div class="game-container">
    <div v-if="!playerName" class="join-form">
      <input
        v-model="nameInput"
        placeholder="Ange ditt namn"
        @keyup.enter="handleJoin"
      />
      <div class="room-options">
        <button @click="createRoom" :disabled="!nameInput" class="create-room">
          Skapa nytt rum
        </button>
        <div class="join-existing">
          <input
            v-model="roomInput"
            placeholder="Ange rum-ID"
            @keyup.enter="handleJoin"
          />
          <button @click="handleJoin" :disabled="!nameInput || !roomInput">
            Anslut till rum
          </button>
        </div>
      </div>
    </div>

    <div v-else class="game-area">
      <div class="room-info">
        Rum-ID: {{ currentRoom }}
        <button class="copy-button" @click="copyRoomId" title="Kopiera rum-ID">
          📋
        </button>
      </div>
      <Opponents
        :opponents="opponents"
        :current-player-id="currentPlayerId"
      />

      <GameTable
        :top-card="topCard"
        :pile-count="pileCount"
        :deck-count="deckCount"
        :table-cards-up="tableCardsUp"
        :table-cards-down="tableCardsDown"
        :selected-table-cards="selectedTableCards"
        :can-play-table-card="canPlayTableCard"
        @card-click="handleTableCardClick"
      />

      <PlayerHand
        :cards="handCards"
        :selected-cards="selectedHandCards"
        :current-rank="currentRank"
        :can-draw-card="canDrawCard"
        :show-draw-button="showDrawButton"
        @card-click="handleHandCardClick"
        @draw-card="drawCard"
        @play-cards="playSelectedCards"
      />

      <div class="game-controls">
        <button
          v-if="!isReady"
          @click="toggleReady"
          class="ready-button"
        >
          Redo
        </button>
        <div v-if="gameMessage" class="game-message">
          {{ gameMessage }}
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { io, Socket } from 'socket.io-client'
import Opponents from './Opponents.vue'
import GameTable from './GameTable.vue'
import PlayerHand from './PlayerHand.vue'

interface CardType {
  value: string
  suit: string
}

interface Player {
  id: string
  name: string
  ready: boolean
  handSize: number
  tableCardsUpCount: number
  tableCardsDownCount: number
  tableCardsUp: CardType[]
}

interface GameState {
  hand: CardType[]
  tableCardsUp: CardType[]
  tableCardsDown: CardType[]
  topCard: CardType | null
  pileCount: number
  deckCount: number
  currentPlayerId: string
  currentRank: string
  opponents: Player[]
  canDrawCard: boolean
  showDrawButton: boolean
  isReady: boolean
  room?: string
}

const socket: Socket = io('http://localhost:3000')

// State
const playerName = ref('')
const nameInput = ref('')
const roomInput = ref('')
const opponents = ref<Player[]>([])
const handCards = ref<CardType[]>([])
const tableCardsUp = ref<CardType[]>([])
const tableCardsDown = ref<CardType[]>([])
const topCard = ref<CardType | null>(null)
const pileCount = ref(0)
const deckCount = ref(0)
const currentPlayerId = ref('')
const currentRank = ref('')
const isReady = ref(false)
const gameMessage = ref('')
const selectedHandCards = ref<number[]>([])
const selectedTableCards = ref<number[]>([])
const canDrawCard = ref(false)
const showDrawButton = ref(true)
const currentRoom = ref('')

// Methods
const generateRoomId = () => {
  return Math.random().toString(36).substring(2, 8).toUpperCase()
}

const createRoom = () => {
  if (nameInput.value) {
    const newRoomId = generateRoomId()
    joinRoom(newRoomId)
  }
}

const joinRoom = (roomId: string) => {
  socket.emit('join', {
    name: nameInput.value,
    room: roomId,

  })
  playerName.value = nameInput.value
  currentRoom.value = roomId
}

const handleJoin = () => {
  if (nameInput.value && roomInput.value) {
    joinRoom(roomInput.value.trim().toUpperCase())
  }
}

const copyRoomId = () => {
  navigator.clipboard.writeText(currentRoom.value)
  gameMessage.value = 'Rum-ID kopierat!'
  setTimeout(() => {
    gameMessage.value = ''
  }, 2000)
}

const toggleReady = () => {
  socket.emit('ready', {
    room: currentRoom.value
  })
  isReady.value = true
}

const handleHandCardClick = (index: number) => {
  const card = handCards.value[index]
  const selectedIndex = selectedHandCards.value.indexOf(index)
  
  if (selectedIndex === -1) {
    if (selectedHandCards.value.length === 0 || 
        handCards.value[selectedHandCards.value[0]].value === card.value) {
      selectedHandCards.value.push(index)
    }
  } else {
    selectedHandCards.value.splice(selectedIndex, 1)
  }
}

const handleTableCardClick = (index: number) => {
  const card = tableCardsUp.value[index]
  if (!canPlayTableCard(card)) return
  
  const selectedIndex = selectedTableCards.value.indexOf(index)
  if (selectedIndex === -1) {
    selectedTableCards.value.push(index)
  } else {
    selectedTableCards.value.splice(selectedIndex, 1)
  }
}

const canPlayTableCard = (card: CardType): boolean => {
  if (!topCard.value) return true
  return card.value === '2' || card.value === '10' || 
         card.value === topCard.value.value
}

const playSelectedCards = () => {
  if (selectedHandCards.value.length > 0) {
    socket.emit('playCards', {
      indices: selectedHandCards.value,
      fromHand: true
    })
    selectedHandCards.value = []
  } else if (selectedTableCards.value.length > 0) {
    socket.emit('playCards', {
      indices: selectedTableCards.value,
      fromHand: false
    })
    selectedTableCards.value = []
  }
}

const drawCard = () => {
  socket.emit('drawCard')
}

// Socket event handlers
onMounted(() => {
  socket.on('connect', () => {
    // If we were previously in a room, try to rejoin
    if (currentRoom.value && playerName.value) {
      socket.emit('join', {
        name: playerName.value,
        room: currentRoom.value
      })
    }
  })

  socket.on('gameState', (state: GameState) => {
    console.log('Received game state:', state) // Add logging for debugging
    handCards.value = state.hand || []
    tableCardsUp.value = state.tableCardsUp || []
    tableCardsDown.value = state.tableCardsDown || []
    topCard.value = state.topCard
    pileCount.value = state.pileCount
    deckCount.value = state.deckCount
    currentPlayerId.value = state.currentPlayerId
    currentRank.value = state.currentRank
    opponents.value = state.opponents || []
    canDrawCard.value = state.canDrawCard
    showDrawButton.value = state.showDrawButton
    isReady.value = state.isReady
    if (state.room) {
      currentRoom.value = state.room
    }
  })

  socket.on('message', (msg: string) => {
    console.log('Received message:', msg) // Add logging for debugging
    gameMessage.value = msg
    setTimeout(() => {
      gameMessage.value = ''
    }, 3000)
  })

  socket.on('dealCards', (cards: CardType[]) => {
    console.log('Received dealt cards:', cards) // Add logging for debugging
    handCards.value = cards
  })

  socket.on('error', (error: string) => {
    console.error('Socket error:', error)
    gameMessage.value = `Error: ${error}`
  })
})

onUnmounted(() => {
  socket.disconnect()
})
</script>

<style scoped>
.game-container {
  height: 100vh;
  display: flex;
  justify-content: center;
  align-items: center;
  color: white;
}

.join-form {
  display: flex;
  flex-direction: column;
  gap: 10px;
  padding: 20px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 8px;
}

.join-form input {
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: rgba(255, 255, 255, 0.2);
  color: white;
  width: 100%;
}

.join-form button {
  padding: 8px;
  border: none;
  border-radius: 4px;
  background: #4CAF50;
  color: white;
  cursor: pointer;
}

.join-form button:disabled {
  background: #ccc;
  cursor: not-allowed;
}

.game-area {
  display: grid;
  grid-template-columns: 250px 1fr;
  grid-template-rows: 1fr auto;
  gap: 10px;
  width: 100%;
  height: 100%;
  padding: 10px;
}

.game-controls {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 10px;
  padding: 10px;
}


.game-message {
  padding: 8px 16px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 4px;
  animation: fadeIn 0.3s ease-in;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}


.ready-button {
  grid-column: 1 / -1;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  padding: 10px 16px;
  font-size: 1em;
}

.room-info {
  grid-column: 1 / -1;
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1px;
  padding: 1px;
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 1px;
  margin-bottom: 1px;
  font-size: 1em;
  width: 10%;
  height: 10%;
}

.room-options {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.create-room {
  width: 100%;
  padding: 10px;
  background-color: #4CAF50;
  color: white;
  border: none;
  border-radius: 4px;
  cursor: pointer;
}

.join-existing {
  display: flex;
  gap: 5px;
}

.join-existing input {
  flex: 1;
  text-transform: uppercase;
}

.join-existing button {
  white-space: nowrap;
  padding: 8px 12px;
}

.copy-button {
  background: none;
  border: none;
  cursor: pointer;
  padding: 0 5px;
  font-size: 1.2em;
  vertical-align: middle;
}

.copy-button:hover {
  opacity: 0.8;
}
</style> 