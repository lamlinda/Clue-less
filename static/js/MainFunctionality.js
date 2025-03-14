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

// Listen for 'cards_dealt' event
socket.on('cards_dealt', function(data) {
    console.log('Cards dealt:', data);
    myCards = data.cards;

    // Display the cards
    updateCardDisplay();
});

// Function to update card display
function updateCardDisplay() {
    if (!myCards || myCards.length === 0) return;

    const cardsContainer = document.getElementById('cardsContainer');
    const playerCards = document.getElementById('playerCards');

    // Show the container
    cardsContainer.style.display = 'block';

    // Clear existing cards
    playerCards.innerHTML = '';

    // Add each card
    myCards.forEach(function(card) {
    const cardElement = document.createElement('div');
    cardElement.className = 'card';

    // Determine the card type
    if (['Miss Scarlet', 'Colonel Mustard', 'Mrs. White', 'Mr. Green', 'Mrs. Peacock', 'Professor Plum'].includes(card)) {
        cardElement.classList.add('card-suspect');
        cardElement.innerHTML = `
        <div class="card-title">${card}</div>
        <div class="card-type">Weapon</div>
        `;
    } else {
        cardElement.classList.add('card-room');
        cardElement.innerHTML = `
        <div class="card-title">${card}</div>
        <div class="card-type">Room</div>
        `;
    }

    playerCards.appendChild(cardElement);
    });
}

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

// Listen for 'turn_update' event which sends the next player's turn
socket.on('turn_update', function(data) {
    console.log('Turn update:', data);

    // Update turn information
    updateTurnInfo(data.player_id, data.player_name);

    // Update player positions on the board
    if (data.player_positions) {
    updatePlayerPositions(data.player_positions);
    }

    // Check if it's our turn and show move options
    isMyTurn = (data.player_id === currentPlayerId);
    if (isMyTurn) {
    validMoves = data.valid_moves;
    showMoveOptions(validMoves);

    // Hide suggestion form if it was shown
    document.getElementById('suggestionForm').style.display = 'none';

    // Show accusation button
    document.getElementById('makeAccusationBtn2').style.display = 'inline-block';
    } else {
    document.getElementById('moveOptions').style.display = 'none';
    document.getElementById('suggestionForm').style.display = 'none';
    document.getElementById('makeAccusationBtn2').style.display = 'none';
    }
});

// Listen for 'move_update' event
socket.on('move_update', function(data) {
    console.log('Move update:', data);

    // Update player positions on the board
    updatePlayerPositions(data.player_positions);

    // Add move notification to turn result
    document.getElementById('turnResult').innerHTML =
    `<p>${data.player_name} moved from ${formatPositionName(data.old_position)} to ${formatPositionName(data.new_position)}</p>`;

    // If it's still our turn (for making a suggestion after moving)
    if (data.player_id === currentPlayerId && data.can_suggest) {
    document.getElementById('moveOptions').style.display = 'none';
    document.getElementById('moveResult').innerHTML = '';

    // Show suggestion form
    document.getElementById('suggestionForm').style.display = 'block';

    // Pre-select the room in the suggestion form based on where we are
    if (data.new_position) {
        const currentRoomElement = document.getElementById('currentRoom');
        if (currentRoomElement) {
        currentRoomElement.textContent = `Room: ${formatPositionName(data.new_position)}`;
        }
    }
    }
});

// Listen for 'suggestion_made' event
socket.on('suggestion_made', function(data) {
    console.log('Suggestion made:', data);

    // Add to the suggestion history
    addSuggestionToHistory(data);

    // Update player positions for the moved character
    if (data.player_positions) {
    updatePlayerPositions(data.player_positions);
    }

    // If we're the next player to disprove
    if (data.next_to_disprove === currentPlayerId) {
    // Show the disprove form
    prepareSuggestionDisprove(data);
    }
});

// Listen for 'suggestion_disproved' event
socket.on('suggestion_disproved', function(data) {
    console.log('Suggestion disproved:', data);

    // Update the suggestion history
    updateSuggestionInHistory(data.suggestion_idx, data.disproved_by);
});

// Listen for 'card_shown' event
socket.on('card_shown', function(data) {
    console.log('Card shown to you:', data);

    // Display the card that was shown to you
    const cardShownContainer = document.createElement('div');
    cardShownContainer.className = 'card-shown-container';
    cardShownContainer.innerHTML = `
    <p>Card shown to you: <strong>${data.card}</strong></p>
    `;

    document.getElementById('turnResult').appendChild(cardShownContainer);
});

// Listen for 'cannot_disprove' event
socket.on('cannot_disprove', function(data) {
    console.log('Cannot disprove:', data);

    // Update the suggestion history to indicate player couldn't disprove
    const item = document.getElementById('suggestionHistoryList').querySelector(`[data-suggestion-idx="${data.suggestion_idx}"]`);
    if (item) {
    item.innerHTML += `<br><em>${getPlayerNameById(data.player_id)} could not disprove</em>`;
    }
});

// Listen for 'accusation_result' event
socket.on('accusation_result', function(data) {
    console.log('Accusation result:', data);

    let resultMessage = '';
    if (data.is_correct) {
    resultMessage = `<p class="success">${data.player_name} made a correct accusation and won the game!</p>`;
    } else {
    resultMessage = `<p class="error">${data.player_name} made an incorrect accusation and is now eliminated from making further accusations.</p>`;
    }

    document.getElementById('turnResult').innerHTML = resultMessage;
});

// Listen for 'game_over' event
socket.on('game_over', function(data) {
    console.log('Game over:', data);

    document.getElementById('gameStatus').innerHTML = `
    <p class="success">Game Over! ${data.winner_name} has won!</p>
    <p>The solution was: ${data.solution.suspect} in the ${data.solution.room} with the ${data.solution.weapon}</p>
    `;

    // Disable all game controls
    document.getElementById('moveOptions').style.display = 'none';
    document.getElementById('suggestionForm').style.display = 'none';
    document.getElementById('accusationForm').style.display = 'none';
    document.getElementById('nextTurnBtn').style.display = 'none';
    document.getElementById('makeAccusationBtn2').style.display = 'none';
});

// Function to add a suggestion to the history
function addSuggestionToHistory(suggestion) {
    const suggestionsList = document.getElementById('suggestionHistoryList');
    const suggestionItem = document.createElement('div');
    suggestionItem.className = 'suggestion-item';
    suggestionItem.setAttribute('data-suggestion-idx', suggestion.suggestion_idx);

    suggestionItem.innerHTML = `
    <strong>${getPlayerNameById(suggestion.player_id)}</strong> suggests:
    ${suggestion.suspect} in the ${suggestion.room} with the ${suggestion.weapon}
    `;

    suggestionsList.prepend(suggestionItem);
}

// Function to update a suggestion in the history
function updateSuggestionInHistory(suggestionIdx, disproved_by) {
    const suggestionItem = document.getElementById('suggestionHistoryList')
    .querySelector(`[data-suggestion-idx="${suggestionIdx}"]`);

    if (suggestionItem) {
    suggestionItem.innerHTML += `<br><em>Disproved by ${getPlayerNameById(disproved_by)}</em>`;
    suggestionItem.classList.add('suggestion-disproved');
    }
}

// Function to get player name by ID
function getPlayerNameById(playerId) {
    // Look through the positions table
    const rows = document.getElementById('playerPositionsBody').querySelectorAll('tr');
    for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.getAttribute('data-player-id') === playerId) {
        return row.querySelector('td:first-child').textContent.replace(' (You)', '');
    }
    }

    return 'Unknown Player';
}

// Function to prepare the disprove suggestion form
function prepareSuggestionDisprove(data) {
    const disproveForm = document.getElementById('disproveForm');
    disproveForm.style.display = 'block';

    // Store current suggestion data
    currentSuggestion = data;

    // Display the suggestion to disprove
    document.getElementById('suggestionToDisprove').innerHTML = `
    <p>${data.player_name} suggests:</p>
    <p><strong>${data.suspect}</strong> in the <strong>${data.room}</strong> with the <strong>${data.weapon}</strong></p>
    `;

    // Get matching cards that can disprove
    const matchingCards = myCards.filter(card =>
    card === data.suspect || card === data.weapon || card === data.room
    );

    // Populate the select with matching cards
    const cardSelect = document.getElementById('cardToShow');
    cardSelect.innerHTML = '<option value="">Select a card...</option>';

    matchingCards.forEach(card => {
    const option = document.createElement('option');
    option.value = card;
    option.textContent = card;
    cardSelect.appendChild(option);
    });

    // Enable/disable the buttons based on whether we have matching cards
    document.getElementById('showCardBtn').disabled = matchingCards.length === 0;
    document.getElementById('cannotDisproveBtn').disabled = matchingCards.length > 0;
}

// Function to update the turn information display
function updateTurnInfo(playerId, playerName) {
    const isMeTurn = (playerId === currentPlayerId);
    document.getElementById('turnInfo').innerHTML = isMeTurn
    ? `<p><strong>It's your turn!</strong></p>`
    : `<p>Current turn: <strong>${playerName}</strong></p>`;

    // Show/hide next turn button for testing
    document.getElementById('nextTurnBtn').style.display = isMeTurn ? 'inline-block' : 'none';
}

// Function to update player positions on the board
function updatePlayerPositions(positions) {
    if (!positions) return;

    console.log('Updating player positions:', positions);

    // First clear existing player markers from all board spaces
    clearPlayerMarkers();

    // Update the player positions table
    const tbody = document.getElementById('playerPositionsBody');
    tbody.innerHTML = '';

    // Group players by position
    const positionGroups = {};

    // Add each player to their position on the board and to the table
    positions.forEach(function(player, index) {
    // Store my character if it's me
    if (player.player_id === currentPlayerId) {
        myCharacter = player.character;
    }

    // Add player to position group
    if (!positionGroups[player.position]) {
        positionGroups[player.position] = [];
    }
    positionGroups[player.position].push(player);

    // Add player to the table
    const row = document.createElement('tr');
    if (player.player_id === currentPlayerId) {
        row.classList.add('current-turn');
    }

    row.setAttribute('data-player-id', player.player_id);

    row.innerHTML = `
        <td>${player.name}${player.player_id === currentPlayerId ? ' (You)' : ''}</td>
        <td>${player.character}</td>
        <td>${formatPositionName(player.position)}</td>
    `;
    tbody.appendChild(row);
    });

    // Now add player tokens to the board
    Object.keys(positionGroups).forEach(function(position) {
    const positionElement = document.getElementById(position);
    if (!positionElement) return;

    const players = positionGroups[position];
    players.forEach(function(player, idx) {
        // Create a player token
        const playerToken = document.createElement('div');
        playerToken.classList.add('player-token');

        // Get character class (e.g., "scarlet" from "Miss Scarlet")
        if (player.character) {
        const characterName = player.character.toLowerCase().split(' ')[1];
        playerToken.classList.add('character-' + characterName);
        }

        // Add positioning class based on index
        playerToken.classList.add('player-position-' + (idx % 6));

        // Add title attribute for tooltip on hover
        playerToken.title = `${player.name} (${player.character})${player.player_id === currentPlayerId ? ' (You)' : ''}`;

        // Add to the board
        positionElement.appendChild(playerToken);
    });
    });
}

// Function to clear player markers from all board spaces
function clearPlayerMarkers() {
    document.querySelectorAll('.room, .hallway, .starter-square').forEach(function(element) {
    // Remove all player tokens
    element.querySelectorAll('.player-token').forEach(function(token) {
        token.remove();
    });
    });
}

// Function to show move options for the current player
function showMoveOptions(moves) {
    console.log('Showing move options:', moves);

    // First clear any existing move options
    clearMoveOptions();

    // Update move options container
    const moveOptionsContainer = document.getElementById('moveOptionsContainer');
    moveOptionsContainer.innerHTML = '';

    if (!moves || moves.length === 0) {
    moveOptionsContainer.innerHTML = '<p>No valid moves available.</p>';
    document.getElementById('moveOptions').style.display = 'block';
    return;
    }

    // Add text buttons in the moveOptionsContainer
    moves.forEach(function(move) {
    const moveButton = document.createElement('button');
    moveButton.classList.add('move-option-btn');

    // Format button text based on move type
    let buttonText = `Move to ${formatPositionName(move.position)}`;
    if (move.via_secret_passage) {
        buttonText += ' (via secret passage)';
    } else if (move.stay_in_room) {
        buttonText = 'Stay in room and make suggestion';
    }

    moveButton.textContent = buttonText;

    // Add click event to make the move
    moveButton.addEventListener('click', function() {
        makeMove(move);
    });

    moveOptionsContainer.appendChild(moveButton);
    moveOptionsContainer.appendChild(document.createElement('br'));
    });

    // Also highlight the valid moves on the board
    moves.forEach(function(move) {
    const positionElement = document.getElementById(move.position);
    if (positionElement) {
        positionElement.classList.add('move-option');

        // Add a small hint
        const hintSpan = document.createElement('span');
        hintSpan.classList.add('move-hint');
        hintSpan.textContent = 'Click to move';
        positionElement.appendChild(hintSpan);

        // Add click event to the board element too
        positionElement.addEventListener('click', function() {
        makeMove(move);
        });
    }
    });

    document.getElementById('moveOptions').style.display = 'block';
}

// Function to clear move options highlighting
function clearMoveOptions() {
    // Remove move-option class from all elements
    document.querySelectorAll('.move-option').forEach(function(element) {
    element.classList.remove('move-option');

    // Remove the click event (needs to be the same function reference, which we don't have)
    // So recreate the element to remove all listeners
    const newElement = element.cloneNode(true);
    element.parentNode.replaceChild(newElement, element);
    });

    // Remove all move hints
    document.querySelectorAll('.move-hint').forEach(function(hint) {
    hint.remove();
    });
}

// Function to make a move
function makeMove(move) {
    console.log('Making move:', move);

    // Clear any previous move results
    document.getElementById('moveResult').innerHTML = '';

    // Emit the make_move event
    socket.emit('make_move', {
    lobby_id: currentLobbyId,
    player_id: currentPlayerId,
    move: move
    });
}

// Function to make a suggestion
function makeSuggestion() {
    const suspect = document.getElementById('suggestSuspect').value;
    const weapon = document.getElementById('suggestWeapon').value;

    if (!suspect || !weapon) {
    alert('Please select both a suspect and a weapon');
    return;
    }

    socket.emit('make_suggestion', {
    lobby_id: currentLobbyId,
    player_id: currentPlayerId,
    suspect: suspect,
    weapon: weapon
    });

    // Hide the suggestion form
    document.getElementById('suggestionForm').style.display = 'none';
}

// Function to make an accusation
function makeAccusation() {
    const suspect = document.getElementById('accuseSuspect').value;
    const weapon = document.getElementById('accuseWeapon').value;
    const room = document.getElementById('accuseRoom').value;

    if (!suspect || !weapon || !room) {
    alert('Please select a suspect, weapon, and room');
    return;
    }

    if (confirm(`Are you sure you want to accuse ${suspect} of committing the murder in the ${room} with the ${weapon}? If you're wrong, you'll be eliminated from the game!`)) {
    socket.emit('make_accusation', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        suspect: suspect,
        weapon: weapon,
        room: room
    });

    // Hide the accusation form
    document.getElementById('accusationForm').style.display = 'none';
    }
}

// Function to show a card to disprove a suggestion
function showCard() {
    const card = document.getElementById('cardToShow').value;

    if (!card) {
    alert('Please select a card to show');
    return;
    }

    socket.emit('disprove_suggestion', {
    lobby_id: currentLobbyId,
    player_id: currentPlayerId,
    suggestion_idx: currentSuggestion.suggestion_idx,
    card_shown: card
    });

    // Hide the disprove form
    document.getElementById('disproveForm').style.display = 'none';
}

// Function to indicate you cannot disprove a suggestion
function cannotDisprove() {
    socket.emit('disprove_suggestion', {
    lobby_id: currentLobbyId,
    player_id: currentPlayerId,
    suggestion_idx: currentSuggestion.suggestion_idx,
    card_shown: null
    });

    // Hide the disprove form
    document.getElementById('disproveForm').style.display = 'none';
}

// Format position names for display
function formatPositionName(position) {
    if (!position) return 'Unknown';

    // For starter positions
    if (position.endsWith('_start')) {
    const character = position.replace('_start', '');
    return `${character.charAt(0).toUpperCase() + character.slice(1)} starting position`;
    }

    // For hallways
    if (position.includes('_')) {
    const rooms = position.split('_');
    return `Hallway between ${rooms[0].charAt(0).toUpperCase() + rooms[0].slice(1)} and ${rooms[1].charAt(0).toUpperCase() + rooms[1].slice(1)}`;
    }

    // For rooms
    return position.charAt(0).toUpperCase() + position.slice(1);
}

// When the Host Lobby button is clicked
document.getElementById('hostLobbyBtn').addEventListener('click', function() {
    const hostName = document.getElementById('hostName').value;

    if (!hostName.trim()) {
    document.getElementById('hostResult').innerHTML =
        '<p class="error">Please enter your name</p>';
    return;
    }

    // POST to the /lobby/host endpoint
    fetch('/lobby/host', {
    method: 'POST',
    headers: {'Content-Type': 'application/json'},
    body: JSON.stringify({name: hostName})
    })
    .then(response => response.json())
    .then(data => {
    // Store the player and lobby information
    currentLobbyId = data.lobby_id;
    currentPlayerId = data.player_id;
    isHost = true;

    // Show result
    const hostResultDiv = document.getElementById('hostResult');
    hostResultDiv.innerHTML = `<p class="success">Lobby created!</p>` +
                                `<p>Lobby ID: <strong>${data.lobby_id}</strong> (Share this with other players)</p>` +
                                `<p>Your Player ID: ${data.player_id}</p>`;

    // Automatically join the lobby room as host
    socket.emit('join_lobby', {
        lobby_id: data.lobby_id,
        name: hostName,
        player_id: data.player_id  // Pass the player_id to identify as host
    });

    // Hide host/join sections
    document.getElementById('hostSection').style.display = 'none';
    document.getElementById('joinSection').style.display = 'none';
    })
    .catch(error => {
    console.error('Error:', error);
    document.getElementById('hostResult').innerHTML =
        '<p class="error">Error creating lobby. Please try again.</p>';
    });
});

// When the Join Lobby button is clicked
document.getElementById('joinLobbyBtn').addEventListener('click', function() {
    const joinName = document.getElementById('joinName').value;
    const joinLobbyId = document.getElementById('joinLobbyId').value;

    if (!joinName.trim() || !joinLobbyId.trim()) {
    document.getElementById('joinResult').innerHTML =
        '<p class="error">Please enter both your name and the lobby ID</p>';
    return;
    }

    // Store the player and lobby information (player ID will be set when we get a response)
    currentLobbyId = joinLobbyId;
    isHost = false;

    // Clear previous results
    document.getElementById('joinResult').innerHTML = '';
    document.getElementById('lobbyNotification').style.display = 'none';

    // Show loading state
    document.getElementById('joinResult').innerHTML = '<p>Joining lobby...</p>';

    // Emit the join_lobby event with the lobby id and player's name
    socket.emit('join_lobby', {lobby_id: joinLobbyId, name: joinName});

    // Hide host/join sections after successful join
    // We'll show these again if there's an error
    document.getElementById('hostSection').style.display = 'none';
    document.getElementById('joinSection').style.display = 'none';
});

// When the Start Game button is clicked
document.getElementById('startGameBtn').addEventListener('click', function() {
    if (!isHost) {
    document.getElementById('startGameResult').innerHTML =
        '<p class="error">Only the host can start the game</p>';
    return;
    }

    // Emit the start_game event
    socket.emit('start_game', {
    lobby_id: currentLobbyId,
    player_id: currentPlayerId
    });
});

// When the Next Turn button is clicked (for testing)
document.getElementById('nextTurnBtn').addEventListener('click', function() {
    // Emit the next_turn event for the current lobby
    socket.emit('next_turn', {lobby_id: currentLobbyId});
});

// When the Make Suggestion button is clicked
document.getElementById('makeSuggestionBtn').addEventListener('click', function() {
    makeSuggestion();
});

// When the Skip Suggestion button is clicked
document.getElementById('skipSuggestionBtn').addEventListener('click', function() {
    // Hide suggestion form
    document.getElementById('suggestionForm').style.display = 'none';

    // Emit next turn event
    socket.emit('next_turn', {lobby_id: currentLobbyId});
});

// When the Make Accusation button is clicked (from game controls)
document.getElementById('makeAccusationBtn2').addEventListener('click', function() {
    // Show accusation form
    document.getElementById('accusationForm').style.display = 'block';
});

// When the Make Accusation button is clicked (from accusation form)
document.getElementById('makeAccusationBtn').addEventListener('click', function() {
    makeAccusation();
});

// When the Cancel Accusation button is clicked
document.getElementById('cancelAccusationBtn').addEventListener('click', function() {
    // Hide accusation form
    document.getElementById('accusationForm').style.display = 'none';
});

// When the Show Card button is clicked
document.getElementById('showCardBtn').addEventListener('click', function() {
    showCard();
});

// When the Cannot Disprove button is clicked
document.getElementById('cannotDisproveBtn').addEventListener('click', function() {
    cannotDisprove();
});
