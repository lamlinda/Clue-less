/**
 * @file managePlayerActions.js
 * @description This file handles all the events for player actions
 * (i.e movement, suggestions, accusations)
 * 
 */

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