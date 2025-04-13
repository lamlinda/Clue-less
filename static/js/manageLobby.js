/**
 * @file manageLobby.js
 * @description This file handles lobby functionality
 *
 */

// Store player and lobby information
let currentLobbyId = null;
let currentPlayerId = null;
let isHost = false;
let minPlayers = 3;
let maxPlayers = 6;
let isMyTurn = false;
let myCharacter = null;
let validMoves = [];
let myCards = [];
let suggestions = [];
let currentSuggestion = null;

// Initialize flag to prevent endless loops
window.isUpdatingDisproveForm = false;

// Connect to Socket.IO (it will connect to the same host and port that served this page)
var socket = io();

// Initialize - try to load cards from localStorage on page load
window.addEventListener('DOMContentLoaded', function() {
    // We'll try to restore cards if we have a lobby ID stored
    const storedLobbyId = localStorage.getItem('currentLobbyId');
    if (storedLobbyId) {
        const storedCards = localStorage.getItem('myCards_' + storedLobbyId);
        if (storedCards) {
            try {
                myCards = JSON.parse(storedCards);
                console.log("Restored cards from localStorage:", myCards);

                // Display cards if we're in a game
                if (document.getElementById('cardsContainer')) {
                    updateCardDisplay();
                }
            } catch (e) {
                console.error("Error restoring cards:", e);
            }
        }
    }
});

// Listen for 'lobby_created' event (emitted when a lobby is hosted)
socket.on('lobby_created', function(data) {
    console.log('Lobby created:', data);
});

// Listen for 'lobby_joined' event which sends the updated player list
socket.on('lobby_joined', function(data) {
    console.log('Lobby joined:', data);

    // If this is our first time joining, save our player_id
    if (!currentPlayerId && data.player_id) {
        currentPlayerId = data.player_id;
    }

    // Save current lobby ID
    currentLobbyId = data.lobby_id;
    localStorage.setItem('currentLobbyId', currentLobbyId);

    // Try to load cards from localStorage
    const storedCards = localStorage.getItem('myCards_' + currentLobbyId);
    if (storedCards) {
        try {
            myCards = JSON.parse(storedCards);
            console.log("Restored cards for lobby:", myCards);
        } catch (e) {
            console.error("Error parsing stored cards:", e);
        }
    }

    // If the game is in progress, request cards from server
    if (data.game_in_progress) {
        console.log("Joining game in progress, requesting cards...");
        socket.emit('get_my_cards', {
            lobby_id: currentLobbyId,
            player_id: currentPlayerId
        });
    }

    // Update lobby info display
    const lobbyInfoDiv = document.getElementById('lobbyInfo');

    // Show lobby section and hide join/host sections if not already done
    document.getElementById('lobbySection').style.display = 'block';

    lobbyInfoDiv.innerHTML = `<p>Lobby ID: <strong>${data.lobby_id}</strong></p>` +
                        `<p>Players: ${data.players.length}/${data.max_players}</p>`;

    // Display the updated player list
    const playersContainer = document.getElementById('playersContainer');
    let html = "<h3>Players:</h3>";

    data.players.forEach(function(player) {
        const hostBadge = player.is_host ? '<span class="host-indicator"> (Host)</span>' : '';
        const youBadge = player.player_id === currentPlayerId ? ' (You)' : '';
        html += `<div class="player-item">${player.name}${hostBadge}${youBadge}</div>`;
    });

    playersContainer.innerHTML = html;

    // Update the start game button status
    const startGameBtn = document.getElementById('startGameBtn');
    if (data.host_id === currentPlayerId) {
        isHost = true;
        startGameBtn.disabled = data.players.length < minPlayers;
        startGameBtn.textContent = data.players.length < minPlayers
            ? `Start Game (Need at least ${minPlayers} players)`
            : 'Start Game';
    } else {
        isHost = false;
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Waiting for host to start the game...';
    }
});

// Listen for errors
socket.on('error', function(data) {
    console.error('Error:', data);

    // Display error in appropriate section
    if (data.code === 'LOBBY_FULL' || data.code === 'LOBBY_NOT_FOUND' || data.code === 'GAME_IN_PROGRESS') {
        // Show the join/host sections again for full lobby or not found scenarios
        document.getElementById('hostSection').style.display = 'block';
        document.getElementById('joinSection').style.display = 'block';
        document.getElementById('lobbySection').style.display = 'none';

        // Clear the join result
        document.getElementById('joinResult').innerHTML = '';

        // Display more prominent notification for lobby full
        if (data.code === 'LOBBY_FULL') {
            const notificationElement = document.getElementById('lobbyNotification');
            notificationElement.style.display = 'block';
            notificationElement.innerHTML = `
            <strong>This lobby is full (maximum ${maxPlayers} players).</strong>
            <p>${data.message}</p>
            <p>Please join another lobby or create a new one.</p>
            `;
        } else {
            // For other errors, display in join result
            document.getElementById('joinResult').innerHTML = `<p class="error">${data.message}</p>`;
        }

        // Reset input fields for lobby joining
        if (data.code === 'LOBBY_FULL') {
            document.getElementById('joinLobbyId').value = '';
        }
    } else if (data.code === 'NOT_HOST' || data.code === 'NOT_ENOUGH_PLAYERS') {
        document.getElementById('startGameResult').innerHTML = `<p class="error">${data.message}</p>`;
    } else if (data.code === 'NOT_YOUR_TURN') {
        document.getElementById('moveResult').innerHTML = `<p class="error">${data.message}</p>`;
    } else if (data.code === 'INVALID_MOVE') {
        document.getElementById('moveResult').innerHTML = `<p class="error">${data.message}</p>`;
    } else if (data.code === 'SUGGESTION_ERROR') {
        // Remove any existing error message first
        const existingError = document.getElementById('suggestionForm').querySelector('.error');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('p');
        errorElement.className = 'error';
        errorElement.textContent = data.message;
        document.getElementById('suggestionForm').appendChild(errorElement);
    } else if (data.code === 'ACCUSATION_ERROR') {
        // Remove any existing error message first
        const existingError = document.getElementById('accusationForm').querySelector('.error');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('p');
        errorElement.className = 'error';
        errorElement.textContent = data.message;
        document.getElementById('accusationForm').appendChild(errorElement);
    } else if (data.code === 'DISPROVE_ERROR') {
        // Remove any existing error message first
        const existingError = document.getElementById('disproveForm').querySelector('.error');
        if (existingError) {
            existingError.remove();
        }

        const errorElement = document.createElement('p');
        errorElement.className = 'error';
        errorElement.textContent = data.message;
        document.getElementById('disproveForm').appendChild(errorElement);
    }
});