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

// Character selection variables
let selectedCharacter = null;
let characterSelectionRequired = true; // Set to false if you want to make character selection optional

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
        const characterBadge = player.select_character ? ` - ${JSON.parse(player.select_character).name}` : '';
        html += `<div class="player-item">${player.name}${hostBadge}${youBadge}${characterBadge}</div>`;
    });

    playersContainer.innerHTML = html;

    // Update the start game button status
    const startGameBtn = document.getElementById('startGameBtn');
    if (isHost) {
        // Count total players and players with characters
        const totalPlayers = data.players.length;
        const playersWithCharacters = data.players.filter(player => player.select_character).length;
        
        // Enable button only if:
        // 1. At least minPlayers have joined
        // 2. All players have selected characters
        const enoughPlayers = totalPlayers >= minPlayers;
        const allPlayersHaveCharacters = totalPlayers === playersWithCharacters;
        
        startGameBtn.disabled = !enoughPlayers || !allPlayersHaveCharacters;
        
        // Update button text based on conditions
        let buttonText = 'Start Game';
        if (!enoughPlayers) {
            buttonText = `Start Game (Need at least ${minPlayers} players)`;
        } else if (!allPlayersHaveCharacters) {
            buttonText = 'Start Game (All players must select characters)';
        }
        
        startGameBtn.textContent = buttonText;
    } else {
        startGameBtn.disabled = true;
        startGameBtn.textContent = 'Waiting for host to start the game...';
    }
    
    // Show character selection if the player doesn't have a character yet
    const currentPlayer = data.players.find(p => p.player_id === currentPlayerId);
    if (!currentPlayer.select_character) {
        document.getElementById('characterSelectionSection').style.display = 'block';
        
        // Get list of already selected characters to disable them
        const selectedCharacters = data.players
            .filter(p => p.select_character)
            .map(p => JSON.parse(p.select_character).name);
        
        updateAvailableCharacters(selectedCharacters);
    } else {
        
        selectedCharacter = JSON.parse(currentPlayer.select_character).name;
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
        document.getElementById('characterSelectionSection').style.display = 'none';

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
    } else if (data.code === 'CHARACTER_ALREADY_SELECTED') {
        document.getElementById('characterSelectionResult').innerHTML = `<p class="error">${data.message}</p>`;
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

// Listen for character_selected event to update the UI
socket.on('character_selected', function(data) {
    console.log('Character selected:', data);
    
    // Extract selected characters from the characters object
    let selectedCharacterNames = [];
    
    // Loop through the character object and find which ones are selected
    if (data.characters) {
        for (let charName in data.characters) {
            if (data.characters[charName].selected) {
                selectedCharacterNames.push(charName);
            }
        }
    }
    
    // Update the available characters based on the selected names
    updateAvailableCharacters(selectedCharacterNames);
    
    // Update the player list with the latest information
    if (data.players) {
        const playersContainer = document.getElementById('playersContainer');
        let html = "<h3>Players:</h3>";
        
        data.players.forEach(function(player) {
            // Use is_host property from the player data if available
            const hostBadge = player.player_id === currentPlayerId && isHost ? '<span class="host-indicator"> (Host)</span>' : '';
            
            // Determine if this is the current user
            const youBadge = player.player_id === currentPlayerId ? ' (You)' : '';
            
            // Get character info if available
            const characterBadge = player.character ? ` - ${player.character.name}` : '';
            
            html += `<div class="player-item" data-player-id="${player.player_id}">${player.name}${hostBadge}${youBadge}${characterBadge}</div>`;
        });
        
        playersContainer.innerHTML = html;
    }
    
    // If this is the current player, update the selected character
    if (data.player_id === currentPlayerId) {
        selectedCharacter = data.character_name;
    }
    
    // Update start game button status for host
    if (isHost) {
        const startGameBtn = document.getElementById('startGameBtn');
        
        // Using the players data to determine if all have characters
        const allPlayersHaveCharacters = data.players && 
            data.players.every(player => player.character);
        
        const enoughPlayers = data.players && data.players.length >= minPlayers;
        
        // Only enable start game if enough players AND all players have characters
        startGameBtn.disabled = !enoughPlayers || !allPlayersHaveCharacters;
        
        let buttonText = 'Start Game';
        if (!enoughPlayers) {
            buttonText = `Start Game (Need at least ${minPlayers} players)`;
        } else if (!allPlayersHaveCharacters) {
            buttonText = 'Start Game (All players must select characters)';
        }
        
        startGameBtn.textContent = buttonText;
    }
});

// Function to update the available characters display
function updateAvailableCharacters(selectedCharacters) {
    // Get all character cards
    const characterCards = document.querySelectorAll('.character-card');
    
    characterCards.forEach(card => {
        const characterName = card.getAttribute('data-character');
        const selectButton = card.querySelector('.select-character-btn');
        
        // If this character is already selected by someone else
        if (selectedCharacters.includes(characterName) && selectedCharacter !== characterName) {
            card.classList.add('unavailable');
            selectButton.disabled = true;
            
            // Add a status message if it doesn't exist
            if (!card.querySelector('.character-status')) {
                const statusElem = document.createElement('div');
                statusElem.className = 'character-status';
                statusElem.textContent = 'Already selected';
                card.appendChild(statusElem);
            }
        } else {
            card.classList.remove('unavailable');
            selectButton.disabled = false;
            
            // Remove status message if it exists
            const statusElem = card.querySelector('.character-status');
            if (statusElem) {
                statusElem.remove();
            }
            
            // If this is the player's selected character, mark it
            if (characterName === selectedCharacter) {
                card.classList.add('selected');
                
                // Update button text
                selectButton.textContent = 'Selected';
            } else {
                card.classList.remove('selected');
                selectButton.textContent = 'Select';
            }
        }
    });
}

// Listen for 'game_started' event
socket.on('game_started', function(data) {
    console.log('Game started:', data);

    // Switch to game view
    document.getElementById('lobbySection').style.display = 'none';
    document.getElementById('characterSelectionSection').style.display = 'none';
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