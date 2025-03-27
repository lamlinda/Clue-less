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

// Connect to Socket.IO (it will connect to the same host and port that served this page)
var socket = io();

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
    if (isHost) {
    startGameBtn.disabled = data.players.length < minPlayers;
    startGameBtn.textContent = data.players.length < minPlayers
        ? `Start Game (Need at least ${minPlayers} players)`
        : 'Start Game';
    } else {
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
    }
});


// Listen for 'game_started' event
socket.on('game_started', function(data) {
    console.log('Game started:', data);

    // Switch to game view
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('gameSection').style.display = 'block';

    // Update game status display
    document.getElementById('gameStatus').innerHTML =
    '<p class="success">Game has started!</p>';

    // Update current turn information
    updateTurnInfo(data.current_player_id, data.current_player_name);

    // Update player positions on the board
    updatePlayerPositions(data.player_positions);

    // Show suggestion history container
    document.getElementById('suggestionHistory').style.display = 'block';

    // Store valid moves if it's our turn
    if (data.current_player_id === currentPlayerId) {
    isMyTurn = true;
    validMoves = data.valid_moves;
    showMoveOptions(validMoves);

    // Show accusation button when it's our turn
    document.getElementById('makeAccusationBtn2').style.display = 'inline-block';
    } else {
    isMyTurn = false;
    document.getElementById('moveOptions').style.display = 'none';
    document.getElementById('makeAccusationBtn2').style.display = 'none';
    }
});




