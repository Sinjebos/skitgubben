// server.js
const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

// Servera statiska filer från 'public'-mappen
app.use(express.static(path.join(__dirname, 'public')));

// Skicka index.html för basrouten
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Spelrum och spelardata
const rooms = {};

// Kortlek och spelkonstanter
const SUITS = ['♥', '♦', '♣', '♠'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class Card {
    constructor(suit, value) {
        this.suit = suit;
        this.value = value;
        this.rank = VALUES.indexOf(value);
    }

    toString() {
        return `${this.value}${this.suit}`;
    }
}

class Deck {
    constructor() {
        this.reset();
    }

    reset() {
        this.cards = [];
        for (const suit of SUITS) {
            for (const value of VALUES) {
                this.cards.push(new Card(suit, value));
            }
        }
        return this;
    }

    shuffle() {
        for (let i = this.cards.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.cards[i], this.cards[j]] = [this.cards[j], this.cards[i]];
        }
        return this;
    }

    deal() {
        if (this.cards.length === 0) return null;
        return this.cards.pop();
    }
}

class SkitGubbenGame {
    constructor(roomId, isDevelopment = false) {
        this.roomId = roomId;
        this.players = [];
        this.deck = new Deck().shuffle();
        this.currentPlayerIndex = 0;
        this.pile = [];
        this.currentRank = -1;
        this.lastPlayerToPlay = -1;
        this.gameStarted = false;
        this.gameOver = false;
        this.skitGubben = null;
        this.isDevelopment = isDevelopment;
        this.finishedPlayers = []; // Array to track finished players in order
    }

    addPlayer(playerId, playerName) {
        if (this.gameStarted) return false;
        if (this.players.some(p => p.id === playerId)) return false;

        this.players.push({
            id: playerId,
            name: playerName,
            hand: [],
            tableCardsDown: [],  // Face down cards on table
            tableCardsUp: [],    // Face up cards on table
            playingTableCards: false, // Whether player is playing table cards
            connected: true
        });

        return true;
    }

    removePlayer(playerId) {
        const index = this.players.findIndex(p => p.id === playerId);
        if (index !== -1) {
            this.players.splice(index, 1);

            // Om spelet redan hade börjat, avsluta det
            if (this.gameStarted && this.players.length < 2) {
                this.gameOver = true;
            }

            // Justera currentPlayerIndex om nödvändigt
            if (this.currentPlayerIndex >= index && this.currentPlayerIndex > 0) {
                this.currentPlayerIndex--;
            }

            return true;
        }
        return false;
    }

    startGame() {
        // In development mode, allow starting with just 1 player
        if (!this.isDevelopment && this.players.length < 2) return false;
        if (this.gameStarted) return false;

        this.gameStarted = true;
        this.gameOver = false;
        this.deck.reset().shuffle();
        this.pile = [];
        this.currentRank = -1;
        this.lastPlayerToPlay = -1;
        this.skitGubben = null;

        // Determine number of table cards based on player count
        const tableCardsCount = this.players.length > 3 ? 2 : 3;

        // Reset all players' hands
        this.players.forEach(player => {
            player.hand = [];
            player.tableCardsDown = [];  // Face down cards on table
            player.tableCardsUp = [];    // Face up cards on table
            player.playingTableCards = false; // Whether player is playing table cards
        });

        // Deal initial cards to each player
        this.players.forEach(player => {
            // Deal face-down cards (2 or 3 depending on player count)
            for (let i = 0; i < tableCardsCount; i++) {
                const card = this.deck.deal();
                if (card) player.tableCardsDown.push(card);
            }

            // Deal face-up cards (same amount as face-down)
            for (let i = 0; i < tableCardsCount; i++) {
                const card = this.deck.deal();
                if (card) player.tableCardsUp.push(card);
            }

            // Deal 3 cards to hand
            for (let i = 0; i < 3; i++) {
                const card = this.deck.deal();
                if (card) player.hand.push(card);
            }
        });

        // Slumpa vem som startar
        this.currentPlayerIndex = Math.floor(Math.random() * this.players.length);

        return true;
    }

    playCard(playerId, cardIndex, fromTable = false) {
        if (!this.gameStarted || this.gameOver) return { success: false, message: "Spelet har inte startat eller är över." };

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { success: false, message: "Spelare hittades inte." };
        if (playerIndex !== this.currentPlayerIndex) return { success: false, message: "Det är inte din tur." };

        const player = this.players[playerIndex];
        let cardSource;

        // Determine which card source to use
        if (fromTable) {
            // Check if trying to play face-down cards before face-up cards are gone
            if (player.playingTableCards && player.tableCardsUp.length > 0) {
                return { success: false, message: "Du måste spela alla kort uppåtvänta först!" };
            }
            if (player.playingTableCards) {
                cardSource = player.tableCardsDown;
            } else {
                cardSource = player.tableCardsUp;
            }
        } else {
            cardSource = player.hand;
        }

        if (!cardSource || cardIndex < 0 || cardIndex >= cardSource.length) {
            return { success: false, message: "Ogiltigt kortval." };
        }

        const card = cardSource[cardIndex];
        if (!card) {
            return { success: false, message: "Kortet kunde inte hittas." };
        }

        // Check if trying to go out on illegal card
        if ((player.hand.length === 0 && player.tableCardsUp.length === 0 && player.tableCardsDown.length === 1) &&
            (card.value === '2' || card.value === '10' || card.value === 'A')) {
            return { success: false, message: "Du kan inte gå ut på en tvåa, tia eller ett ess!" };
        }

        // Handle special cards and normal play
        let validPlay = false;
        let specialAction = false;

        if (card.value === '2') {
            validPlay = true;  // Two can be played on anything
            this.currentRank = -1;  // Reset current rank
            specialAction = true;
        } else if (card.value === '10') {
            validPlay = true;  // Ten can be played on anything
            this.pile = [];    // Clear the pile
            this.currentRank = -1;
            specialAction = true;
        } else if (this.currentRank === -1 || playerIndex === this.lastPlayerToPlay) {
            validPlay = true;
            this.currentRank = card.rank;
        } else if (card.rank > this.currentRank) {  // Changed from >= to > to prevent playing equal cards
            validPlay = true;
            this.currentRank = card.rank;
        }

        if (validPlay) {
            // Remove card from appropriate source
            if (fromTable) {
                if (player.playingTableCards) {
                    player.tableCardsDown.splice(cardIndex, 1);
                } else {
                    player.tableCardsUp.splice(cardIndex, 1);
                }
            } else {
                player.hand.splice(cardIndex, 1);
            }

            // Add card to pile unless it's a ten
            if (card.value !== '10') {
                this.pile.push(card);
            }

            this.lastPlayerToPlay = playerIndex;

            // Draw cards if playing from hand and deck has cards
            if (!fromTable) {
                this.drawCardsToMinimum(player);
            }

            // If player has no more face-up cards and has face-down cards, switch to playing face-down
            if (player.tableCardsUp.length === 0 && player.tableCardsDown.length > 0) {
                player.playingTableCards = true;
            }

            // Move to next player
            this.nextPlayer();

            return { success: true, message: `${player.name} spelade ${card.toString()}` };
        }

        // Invalid play - pick up the pile
        this.pile.forEach(c => player.hand.push(c));
        this.pile = [];
        this.currentRank = -1;
        this.nextPlayer();

        return { success: true, message: `${player.name} kunde inte spela ${card.toString()}. Tar upp högen!` };
    }

    drawCardsToMinimum(player) {
        // Only draw if player has less than 3 cards and hasn't picked up the pile this turn
        if (player.hand.length < 3 && this.deck.cards.length > 0) {
            while (player.hand.length < 3 && this.deck.cards.length > 0) {
                const card = this.deck.deal();
                if (card) {
                    player.hand.push(card);
                }
            }
        }
    }

    nextPlayer() {
        // Gå till nästa spelare som fortfarande har kort
        let count = 0;
        do {
            this.currentPlayerIndex = (this.currentPlayerIndex + 1) % this.players.length;
            count++;

            // Get current player
            const currentPlayer = this.players[this.currentPlayerIndex];

            // Check if player has any cards left to play
            const hasCards = currentPlayer.hand.length > 0 ||
                currentPlayer.tableCardsUp.length > 0 ||
                currentPlayer.tableCardsDown.length > 0;

            if (hasCards) {
                return; // Found next player with cards
            }

            if (count > this.players.length) {
                // If we've gone through all players, reset the game state
                this.currentRank = -1;
                this.pile = [];
                return;
            }
        } while (true);
    }

    checkGameOver() {
        // Check if any player has finished (no cards left)
        this.players.forEach(player => {
            if (player.hand.length === 0 &&
                player.tableCardsUp.length === 0 &&
                player.tableCardsDown.length === 0 &&
                !this.finishedPlayers.includes(player.id)) {
                // Add player to finished list
                this.finishedPlayers.push(player.id);
            }
        });

        // Count active players (those who still have any cards)
        const activePlayers = this.players.filter(p =>
            p.hand.length > 0 ||
            p.tableCardsUp.length > 0 ||
            p.tableCardsDown.length > 0
        );

        // In development mode, only end when the player has no cards left
        if (this.isDevelopment) {
            if (activePlayers.length === 0) {
                this.gameOver = true;
                return {
                    gameOver: true,
                    finishedPlayers: this.finishedPlayers
                };
            }
            return {
                gameOver: false,
                finishedPlayers: this.finishedPlayers
            };
        }

        // Normal game mode: end when only one or zero players remain
        if (activePlayers.length <= 1) {
            if (activePlayers.length === 1) {
                this.gameOver = true;
                this.skitGubben = activePlayers[0].id;
                // Add the last player (Skit Gubben) to the finished list
                if (!this.finishedPlayers.includes(this.skitGubben)) {
                    this.finishedPlayers.push(this.skitGubben);
                }
            }
            return {
                gameOver: true,
                finishedPlayers: this.finishedPlayers,
                skitGubben: activePlayers[0]
            };
        }

        return {
            gameOver: false,
            finishedPlayers: this.finishedPlayers
        };
    }

    getGameState() {
        return {
            roomId: this.roomId,
            players: this.players.map(p => ({
                id: p.id,
                name: p.name,
                handSize: p.hand.length,
                tableCardsUpCount: p.tableCardsUp.length,
                tableCardsDownCount: p.tableCardsDown.length,
                tableCardsUp: p.tableCardsUp,
                playingTableCards: p.playingTableCards,
                connected: p.connected
            })),
            currentPlayerIndex: this.currentPlayerIndex,
            currentPlayerId: this.players[this.currentPlayerIndex].id,
            currentPlayerName: this.players[this.currentPlayerIndex].name,
            pile: this.pile.length > 0 ? this.pile[this.pile.length - 1] : null,
            fullPile: this.pile,
            pileSize: this.pile.length,
            deckSize: this.deck.cards.length,
            currentRank: this.currentRank !== -1 ? VALUES[this.currentRank] : null,
            gameStarted: this.gameStarted,
            gameOver: this.gameOver,
            skitGubben: this.skitGubben,
            finishedPlayers: this.finishedPlayers,
            isDevelopment: this.isDevelopment
        };
    }

    getPlayerState(playerId) {
        const player = this.players.find(p => p.id === playerId);
        if (!player) return null;

        return {
            ...this.getGameState(),
            hand: player.hand,
            tableCardsUp: player.tableCardsUp,
            tableCardsDown: player.tableCardsDown,
            playingTableCards: player.playingTableCards
        };
    }

    drawCard(playerId) {
        if (!this.gameStarted || this.gameOver) return { success: false, message: "Spelet har inte startat eller är över." };

        const playerIndex = this.players.findIndex(p => p.id === playerId);
        if (playerIndex === -1) return { success: false, message: "Spelare hittades inte." };
        if (playerIndex !== this.currentPlayerIndex) return { success: false, message: "Det är inte din tur." };

        const player = this.players[playerIndex];

        // Check if player can play any card from their hand
        const canPlayFromHand = player.hand.some(card => {
            // Can always play 2 or 10
            if (card.value === '2' || card.value === '10') return true;
            // Can play if no current rank or if card is higher/equal
            return this.currentRank === -1 || card.rank >= this.currentRank;
        });

        if (canPlayFromHand) {
            return { success: false, message: "Du kan spela ett kort från din hand." };
        }

        if (this.deck.cards.length === 0) {
            return { success: false, message: "Det finns inga kort kvar i leken." };
        }

        // Draw one card as a chance
        const card = this.deck.deal();
        if (card) {
            // Check if the drawn card can be played
            let validPlay = false;
            let specialAction = false;

            if (card.value === '2') {
                validPlay = true;  // Two can be played on anything
                this.currentRank = -1;  // Reset current rank
                specialAction = true;
            } else if (card.value === '10') {
                validPlay = true;  // Ten can be played on anything
                this.pile = [];    // Clear the pile
                this.currentRank = -1;
                specialAction = true;
            } else if (this.currentRank === -1 || card.rank >= this.currentRank) {
                validPlay = true;
                this.currentRank = card.rank;
            }

            if (validPlay) {
                // Add card to pile unless it's a ten
                if (card.value !== '10') {
                    this.pile.push(card);
                }

                this.lastPlayerToPlay = playerIndex;

                // Move to next player unless it's a special card
                if (!specialAction) {
                    this.nextPlayer();
                }

                return {
                    success: true,
                    message: `${player.name} drog och spelade ${card.value}${card.suit}${specialAction ? ' (Specialkort!)' : ''}`,
                    gameState: this.getGameState()
                };
            } else {
                // Invalid play - add card to hand and pick up the pile
                player.hand.push(card);
                this.pile.forEach(c => player.hand.push(c));
                this.pile = [];
                this.currentRank = -1;
                this.nextPlayer();

                return {
                    success: true,
                    message: `${player.name} drog ${card.value}${card.suit} men kunde inte spela det. Tar upp högen!`,
                    gameState: this.getGameState()
                };
            }
        }

        return { success: false, message: "Kunde inte dra kort." };
    }
}

// Socket.io-koppling
io.on('connection', (socket) => {
    console.log('Ny användare ansluten:', socket.id);

    // Skapa eller gå med i ett rum
    socket.on('joinRoom', ({ roomId, playerName, isDevelopment = false }) => {
        socket.join(roomId);

        if (!rooms[roomId]) {
            rooms[roomId] = new SkitGubbenGame(roomId, isDevelopment);
        }

        const game = rooms[roomId];

        if (game.addPlayer(socket.id, playerName)) {
            console.log(`${playerName} gick med i rum ${roomId}${isDevelopment ? ' (utvecklingsläge)' : ''}`);

            // Meddela alla spelare om den nya anslutningen
            io.to(roomId).emit('playerJoined', {
                playerId: socket.id,
                playerName: playerName,
                players: game.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
                message: `${playerName} har anslutit till spelet.`,
                isDevelopment: game.isDevelopment
            });

            // Skicka spelets nuvarande tillstånd till den nya spelaren
            socket.emit('gameState', {
                ...game.getPlayerState(socket.id),
                isDevelopment: game.isDevelopment
            });
        } else {
            socket.emit('error', { message: 'Kunde inte gå med i spelet. Det kan redan ha startat.' });
        }

        // Spara rumsinformationen i socket för att underlätta vid frånkoppling
        socket.roomId = roomId;
        socket.playerName = playerName;
    });

    // Starta spelet
    socket.on('startGame', () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const game = rooms[roomId];

        if (game.startGame()) {
            console.log(`Spel startat i rum ${roomId}`);

            // Meddela alla spelare
            io.to(roomId).emit('gameStarted', { message: 'Spelet har startat!' });

            // Skicka individuella spelartillstånd till varje spelare
            game.players.forEach(player => {
                io.to(player.id).emit('gameState', game.getPlayerState(player.id));
            });
        } else {
            socket.emit('error', { message: 'Kunde inte starta spelet. Minst 2 spelare krävs.' });
        }
    });

    // Spela ett kort
    socket.on('playCard', (data) => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const game = rooms[roomId];
        const result = game.playCard(socket.id, data.cardIndex, data.fromTable);

        if (result.success) {
            // Meddela alla spelare om draget
            io.to(roomId).emit('cardPlayed', {
                playerId: socket.id,
                playerName: socket.playerName,
                message: result.message
            });

            // Skicka individuella spelartillstånd till varje spelare
            game.players.forEach(player => {
                io.to(player.id).emit('gameState', game.getPlayerState(player.id));
            });

            // Om spelet är över, meddela alla
            if (game.gameOver) {
                const skitGubben = game.players.find(p => p.id === game.skitGubben);
                io.to(roomId).emit('gameOver', {
                    skitGubbenId: game.skitGubben,
                    skitGubbenName: skitGubben ? skitGubben.name : null,
                    finishedPlayers: game.finishedPlayers,
                    message: 'Spelet är slut!'
                });
            }
        } else {
            socket.emit('error', { message: result.message });
        }
    });

    // Starta ett nytt spel efter att det föregående slutat
    socket.on('restartGame', () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const game = rooms[roomId];

        if (game.startGame()) {
            console.log(`Spel omstartat i rum ${roomId}`);

            // Meddela alla spelare
            io.to(roomId).emit('gameStarted', { message: 'Spelet har startats om!' });

            // Skicka individuella spelartillstånd till varje spelare
            game.players.forEach(player => {
                io.to(player.id).emit('gameState', game.getPlayerState(player.id));
            });
        } else {
            socket.emit('error', { message: 'Kunde inte starta om spelet.' });
        }
    });

    // Hantera frånkoppling
    socket.on('disconnect', () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const game = rooms[roomId];
        const playerName = socket.playerName;

        console.log(`${playerName} kopplade från rum ${roomId}`);

        // Ta bort spelaren från spelet
        if (game.removePlayer(socket.id)) {
            // Om inga spelare kvar, ta bort rummet
            if (game.players.length === 0) {
                delete rooms[roomId];
                console.log(`Rum ${roomId} borttaget`);
            } else {
                // Meddela återstående spelare
                io.to(roomId).emit('playerLeft', {
                    playerId: socket.id,
                    playerName: playerName,
                    players: game.players.map(p => ({ id: p.id, name: p.name, connected: p.connected })),
                    message: `${playerName} har lämnat spelet.`
                });

                // Om spelet pågick, avsluta det
                if (game.gameStarted && !game.gameOver) {
                    game.gameOver = true;
                    io.to(roomId).emit('gameOver', {
                        message: `Spelet avslutades eftersom ${playerName} lämnade.`
                    });
                }
            }
        }
    });

    // Draw a card
    socket.on('drawCard', () => {
        const roomId = socket.roomId;
        if (!roomId || !rooms[roomId]) return;

        const game = rooms[roomId];
        const result = game.drawCard(socket.id);

        if (result.success) {
            // Notify all players about the card draw
            io.to(roomId).emit('cardPlayed', {
                playerId: socket.id,
                playerName: socket.playerName,
                message: result.message
            });

            // Send individual game states to each player
            game.players.forEach(player => {
                io.to(player.id).emit('gameState', game.getPlayerState(player.id));
            });
        } else {
            socket.emit('error', { message: result.message });
        }
    });
});

// Starta servern
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server igång på port ${PORT}`);
});