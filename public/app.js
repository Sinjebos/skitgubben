// public/app.js
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

document.addEventListener('DOMContentLoaded', () => {
    // DOM-element
    const loginSection = document.getElementById('login-section');
    const lobbySection = document.getElementById('lobby-section');
    const gameSection = document.getElementById('game-section');
    const gameOverSection = document.getElementById('game-over-section');

    const playerNameInput = document.getElementById('player-name');
    const roomIdInput = document.getElementById('room-id');
    const joinBtn = document.getElementById('join-btn');

    const roomCodeSpan = document.getElementById('room-code');
    const gameRoomCodeSpan = document.getElementById('game-room-code');
    const playerList = document.getElementById('player-list');
    const startBtn = document.getElementById('start-btn');

    const currentPlayerSpan = document.getElementById('current-player');
    const topCardSpan = document.getElementById('top-card');
    const currentRankSpan = document.getElementById('current-rank');
    const pileCountSpan = document.getElementById('pile-count');
    const opponentsList = document.getElementById('opponents-list');
    const pileElement = document.getElementById('pile');
    const handElement = document.getElementById('hand');
    const messageArea = document.getElementById('message-area');

    const gameResult = document.getElementById('game-result');
    const restartBtn = document.getElementById('restart-btn');

    let socket;
    let playerId;
    let playerName;
    let roomId;
    let gameState;
    let isDevelopmentMode = false;

    // Initiera Socket.IO
    function initSocket() {
        socket = io();

        // Hantera anslutning
        socket.on('connect', () => {
            playerId = socket.id;
            addMessage('Ansluten till servern', 'system');
        });

        // Hantera när en spelare går med
        socket.on('playerJoined', (data) => {
            addMessage(data.message, 'system');
            updatePlayerList(data.players);
        });

        // Hantera när en spelare lämnar
        socket.on('playerLeft', (data) => {
            addMessage(data.message, 'system');
            updatePlayerList(data.players);
        });

        // Hantera spelstart
        socket.on('gameStarted', (data) => {
            addMessage(data.message, 'system');
            showGameSection();
        });

        // Hantera spelstatus
        socket.on('gameState', (data) => {
            gameState = data;
            updateGameUI();
        });

        // Hantera kortspelning
        socket.on('cardPlayed', (data) => {
            addMessage(data.message, 'action');
        });

        // Hantera spelets slut
        socket.on('gameOver', (data) => {
            addMessage(data.message, 'system');
            gameResult.textContent = data.message;
            gameSection.classList.add('hidden');
            gameOverSection.classList.remove('hidden');
        });

        // Hantera fel
        socket.on('error', (data) => {
            addMessage(data.message, 'error');
        });

        // Hantera frånkoppling
        socket.on('disconnect', () => {
            addMessage('Frånkopplad från servern', 'error');
        });
    }

    // Gå med i ett rum
    function joinRoom() {
        playerName = playerNameInput.value.trim();
        let requestedRoomId = roomIdInput.value.trim();
        isDevelopmentMode = document.getElementById('dev-mode').checked;

        if (!playerName) {
            addMessage('Du måste ange ett namn', 'error');
            return;
        }

        // Om inget rum anges, generera ett slumpmässigt ID
        if (!requestedRoomId) {
            requestedRoomId = Math.random().toString(36).substring(2, 8).toUpperCase();
        }

        roomId = requestedRoomId;

        // Initiera Socket.IO om det inte redan är gjort
        if (!socket) {
            initSocket();
        }

        // Skicka förfrågan om att gå med i rummet
        socket.emit('joinRoom', { roomId, playerName, isDevelopment: isDevelopmentMode });

        // Uppdatera UI med rumskod
        roomCodeSpan.textContent = roomId;
        gameRoomCodeSpan.textContent = roomId;

        // Visa lobbyn
        loginSection.classList.add('hidden');
        lobbySection.classList.remove('hidden');
    }

    // Uppdatera spellistan
    function updatePlayerList(players) {
        playerList.innerHTML = '';

        players.forEach(player => {
            const li = document.createElement('li');
            li.textContent = player.name;
            playerList.appendChild(li);
        });

        // Använd den lagrade utvecklingslägesflaggan
        startBtn.disabled = !isDevelopmentMode && players.length < 2;

        // Uppdatera informationstexten baserat på läget
        const lobbyInfo = document.getElementById('lobby-info');
        if (isDevelopmentMode) {
            lobbyInfo.textContent = 'Utvecklingsläge: Du kan starta spelet ensam.';
        } else {
            lobbyInfo.textContent = 'Minst 2 spelare krävs för att starta.';
        }
    }

    // Visa spelsektionen
    function showGameSection() {
        lobbySection.classList.add('hidden');
        gameSection.classList.remove('hidden');
    }

    // Lägg till ett meddelande i meddelandeområdet
    function addMessage(message, type) {
        const messageElement = document.createElement('div');
        messageElement.classList.add('message', type);
        messageElement.textContent = message;
        messageArea.appendChild(messageElement);

        // Scrolla till botten av meddelandeområdet
        messageArea.scrollTop = messageArea.scrollHeight;
    }

    // Uppdatera spelets UI baserat på nuvarande spelstatus
    function updateGameUI() {
        if (!gameState) return;

        // Update tier list if there are finished players
        const tierList = document.getElementById('tier-list');
        if (tierList) {
            tierList.innerHTML = '<h3>Placeringar</h3>';
            if (gameState.finishedPlayers && gameState.finishedPlayers.length > 0) {
                const tierListContent = document.createElement('div');
                tierListContent.classList.add('tier-list-content');

                gameState.finishedPlayers.forEach((playerId, index) => {
                    const player = gameState.players.find(p => p.id === playerId);
                    if (player) {
                        const playerEntry = document.createElement('div');
                        playerEntry.classList.add('tier-entry');

                        // If it's the last player and game is over, show "Skitgubben"
                        if (gameState.gameOver && index === gameState.finishedPlayers.length - 1) {
                            playerEntry.textContent = `${player.name} - Skitgubben`;
                            playerEntry.classList.add('skit-gubben');
                        } else {
                            playerEntry.textContent = `${index + 1}. ${player.name}`;
                        }

                        tierListContent.appendChild(playerEntry);
                    }
                });

                tierList.appendChild(tierListContent);
            }
        }

        // Update draw card button visibility
        const drawCardBtn = document.getElementById('draw-card-btn');
        const canPlayFromHand = gameState.hand && gameState.hand.some(card => {
            // Can always play 2 or 10
            if (card.value === '2' || card.value === '10') return true;
            // Can play if no current rank or if card is higher/equal
            return !gameState.currentRank || VALUES.indexOf(card.value) >= VALUES.indexOf(gameState.currentRank);
        });

        const canDrawCard = gameState.currentPlayerId === playerId &&
            !gameState.playingTableCards &&
            !canPlayFromHand &&
            gameState.deckSize > 0;

        if (canDrawCard) {
            drawCardBtn.classList.remove('hidden');
            drawCardBtn.disabled = false;
        } else {
            drawCardBtn.classList.add('hidden');
            drawCardBtn.disabled = true;
        }

        // Uppdatera vems tur det är
        currentPlayerSpan.textContent = gameState.currentPlayerName;

        // Uppdatera information om högen
        if (gameState.pile) {
            const card = gameState.pile;
            topCardSpan.textContent = `${card.value}${card.suit}`;
            pileElement.textContent = `${card.value}${card.suit}`;
            pileElement.className = 'card';

            // Lägg till röd färg för hjärter och ruter
            if (card.suit === '♥' || card.suit === '♦') {
                pileElement.classList.add('red');
            } else {
                pileElement.classList.add('black');
            }

            // Display all cards in the pile
            const pileContainer = document.getElementById('pile-container');
            pileContainer.innerHTML = '<h4>Kort i högen:</h4>';
            const pileCards = document.createElement('div');
            pileCards.classList.add('pile-cards');

            if (gameState.fullPile && gameState.fullPile.length > 0) {
                gameState.fullPile.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.classList.add('card', 'small');
                    cardElement.textContent = `${card.value}${card.suit}`;
                    if (card.suit === '♥' || card.suit === '♦') {
                        cardElement.classList.add('red');
                    }
                    pileCards.appendChild(cardElement);
                });
            }
            pileContainer.appendChild(pileCards);
        } else {
            topCardSpan.textContent = 'Ingen';
            pileElement.textContent = '?';
            pileElement.className = 'card';
            document.getElementById('pile-container').innerHTML = '<h4>Kort i högen:</h4><div class="pile-cards"></div>';
        }

        // Uppdatera information om nuvarande rank
        if (gameState.currentRank) {
            currentRankSpan.textContent = gameState.currentRank;
        } else {
            currentRankSpan.textContent = 'Ingen';
        }

        // Uppdatera antal kort i högen och leken
        pileCountSpan.textContent = `Kort i högen: ${gameState.pileSize || 0}`;
        document.getElementById('deck-count').textContent = `Kort i leken: ${gameState.deckSize || 0}`;

        // Uppdatera motståndare
        opponentsList.innerHTML = '';
        gameState.players.forEach(player => {
            // Visa inte den aktuella spelaren i motståndarlistan
            if (player.id === playerId) return;

            const playerDiv = document.createElement('div');
            playerDiv.classList.add('player-info');

            // Markera den aktuella spelaren
            if (player.id === gameState.currentPlayerId) {
                playerDiv.classList.add('current');
            }

            const nameDiv = document.createElement('div');
            nameDiv.classList.add('player-name');
            nameDiv.textContent = player.name;

            const cardsInfo = document.createElement('div');
            cardsInfo.classList.add('cards-info');
            cardsInfo.innerHTML = `
                Hand: ${player.handSize} kort<br>
                Synliga kort: ${player.tableCardsUpCount}<br>
                Dolda kort: ${player.tableCardsDownCount}
            `;

            // Display opponent's face-up cards
            const tableCardsUp = document.createElement('div');
            tableCardsUp.classList.add('opponent-table-cards');
            if (player.tableCardsUp && player.tableCardsUp.length > 0) {
                player.tableCardsUp.forEach(card => {
                    const cardElement = document.createElement('div');
                    cardElement.classList.add('card', 'small');
                    cardElement.textContent = `${card.value}${card.suit}`;
                    if (card.suit === '♥' || card.suit === '♦') {
                        cardElement.classList.add('red');
                    }
                    tableCardsUp.appendChild(cardElement);
                });
            }

            playerDiv.appendChild(nameDiv);
            playerDiv.appendChild(cardsInfo);
            playerDiv.appendChild(tableCardsUp);
            opponentsList.appendChild(playerDiv);
        });

        // Uppdatera spelarens hand
        handElement.innerHTML = '';
        const tableCardsUp = document.getElementById('table-cards-up');
        const tableCardsDown = document.getElementById('table-cards-down');
        tableCardsUp.innerHTML = '';
        tableCardsDown.innerHTML = '';

        // Only show and allow playing hand cards if not playing table cards
        if (!gameState.playingTableCards) {
            if (gameState.hand && gameState.hand.length > 0) {
                gameState.hand.forEach((card, index) => {
                    const cardElement = document.createElement('div');
                    cardElement.classList.add('card');
                    cardElement.textContent = `${card.value}${card.suit}`;

                    if (card.suit === '♥' || card.suit === '♦') {
                        cardElement.classList.add('red');
                    }

                    cardElement.addEventListener('click', () => {
                        if (gameState.currentPlayerId === playerId) {
                            playCard(index, false);
                        } else {
                            addMessage('Det är inte din tur', 'error');
                        }
                    });

                    handElement.appendChild(cardElement);
                });
            }
        }

        // Show table cards
        if (gameState.tableCardsUp) {
            gameState.tableCardsUp.forEach((card, index) => {
                const cardElement = document.createElement('div');
                cardElement.classList.add('card');
                cardElement.textContent = `${card.value}${card.suit}`;

                if (card.suit === '♥' || card.suit === '♦') {
                    cardElement.classList.add('red');
                }

                // Only allow playing table cards when hand is empty
                if (gameState.playingTableCards && gameState.currentPlayerId === playerId) {
                    cardElement.addEventListener('click', () => {
                        playCard(index, true);
                    });
                }

                tableCardsUp.appendChild(cardElement);
            });
        }

        if (gameState.tableCardsDown) {
            for (let i = 0; i < gameState.tableCardsDown.length; i++) {
                const cardElement = document.createElement('div');
                cardElement.classList.add('card', 'face-down');
                cardElement.textContent = '?';

                // Only allow playing face-down cards when no face-up cards left
                if (gameState.playingTableCards &&
                    gameState.tableCardsUp.length === 0 &&
                    gameState.currentPlayerId === playerId) {
                    cardElement.addEventListener('click', () => {
                        playCard(i, true);
                    });
                }

                tableCardsDown.appendChild(cardElement);
            }
        }
    }

    // Spela ett kort
    function playCard(cardIndex, fromTable = false) {
        socket.emit('playCard', { cardIndex, fromTable });
    }

    // Starta spelet
    function startGame() {
        socket.emit('startGame');
    }

    // Starta om spelet
    function restartGame() {
        socket.emit('restartGame');
        gameOverSection.classList.add('hidden');
        gameSection.classList.remove('hidden');
    }

    // Add this after the playCard function
    function drawCard() {
        socket.emit('drawCard');
    }

    // Event listeners
    joinBtn.addEventListener('click', joinRoom);
    startBtn.addEventListener('click', startGame);
    restartBtn.addEventListener('click', restartGame);

    // Add this to the event listeners section
    document.getElementById('draw-card-btn').addEventListener('click', drawCard);

    // Hantera Enter-tangent för att gå med i ett rum
    playerNameInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            joinRoom();
        }
    });

    roomIdInput.addEventListener('keyup', (event) => {
        if (event.key === 'Enter') {
            joinRoom();
        }
    });
});