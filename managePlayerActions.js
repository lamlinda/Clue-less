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
    if (data.player_id === currentPlayerId) {
        // Hide the move options
        document.getElementById('moveOptions').style.display = 'none';
        document.getElementById('moveResult').innerHTML = '';

        // Update suggestion button state based on whether player is in a room
        updateSuggestionButton(data.can_suggest, data.current_location);

        // Don't automatically open the suggestion form
        // This allows for toggling with the button instead
        // If we want to automatically show it only on the initial move to a room, we can
        // add an additional check here

        // Optional: To automatically show the form only when first entering a room:
        const wasInRoom = window.wasInRoom || false;
        window.wasInRoom = data.can_suggest;

        // Show the form only when transitioning from not-in-room to in-room
        if (data.can_suggest && !wasInRoom) {
            document.getElementById('suggestionForm').style.display = 'block';
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

    // Clear any previous disprove notifications
    document.getElementById('turnResult').innerHTML = '';

    // Store the current suggestion for later use
    currentSuggestion = data;

    // If we're the next player to disprove
    if (data.next_to_disprove === currentPlayerId) {
        console.log("I need to disprove this suggestion!");

        // Ensure we have our cards before showing the disprove form
        if (!myCards || myCards.length === 0) {
            console.log("Requesting my cards before disproving");
            socket.emit('get_my_cards', {
                lobby_id: currentLobbyId,
                player_id: currentPlayerId
            });

            // Set a short timeout to wait for cards to load
            setTimeout(() => {
                prepareSuggestionDisprove(data);
            }, 500);
        } else {
            // We already have cards, show the form
            prepareSuggestionDisprove(data);
        }

        // Add a prominent notification
        const notificationEl = document.createElement('div');
        notificationEl.className = 'disprove-notification';

        // Special message if this player controls the suggested character
        if (data.is_suggested_character) {
            notificationEl.innerHTML = "<p><strong>Your character was suggested!</strong> It's your turn to try to disprove this suggestion first!</p>";
        } else {
            notificationEl.innerHTML = "<p>It's your turn to try to disprove this suggestion!</p>";
        }

        // Insert at the top of the game status
        const gameStatus = document.getElementById('gameStatus');
        gameStatus.insertBefore(notificationEl, gameStatus.firstChild);

        // Remove after 5 seconds
        setTimeout(() => {
            if (notificationEl.parentNode) {
                notificationEl.parentNode.removeChild(notificationEl);
            }
        }, 5000);
    } else {
        // If it's not our turn to disprove, hide the disprove form
        document.getElementById('disproveForm').style.display = 'none';

        // Add a message about who needs to disprove
        const disproverName = data.next_to_disprove_name || getPlayerNameById(data.next_to_disprove);
        const waitingMessage = document.createElement('div');
        waitingMessage.className = 'disprove-notification';

        // Special message if the suggested character player is disproving
        if (data.is_suggested_character) {
            waitingMessage.innerHTML = `<p>The suggested character (${data.suspect}) is controlled by ${disproverName}. Waiting for them to try to disprove first...</p>`;
        } else {
            waitingMessage.innerHTML = `<p>Waiting for ${disproverName} to try to disprove...</p>`;
        }

        document.getElementById('turnResult').appendChild(waitingMessage);
    }
});

// Listen for 'suggestion_disproved' event
socket.on('suggestion_disproved', function(data) {
    console.log('Suggestion disproved:', data);

    // Update the suggestion history
    updateSuggestionInHistory(data.suggestion_idx, data.disproved_by);

    // Hide any disprove form that might be showing
    document.getElementById('disproveForm').style.display = 'none';

    // Add a notification that the suggestion was disproved
    const notification = document.createElement('div');
    notification.className = 'disprove-notification';

    // Use player name if available, otherwise get it from the player table
    const disproverName = data.disproved_by_name || getPlayerNameById(data.disproved_by);
    notification.innerHTML = `<p>${disproverName} has disproved the suggestion.</p>`;

    // Add this notification to the turnResult
    const currentResult = document.getElementById('turnResult').querySelector('.card-shown-container');
    if (!currentResult) {
        document.getElementById('turnResult').innerHTML = '';
        document.getElementById('turnResult').appendChild(notification);
    }
});

// Listen for 'cannot_disprove' event
socket.on('cannot_disprove', function(data) {
    console.log('Cannot disprove:', data);

    // Update the suggestion history
    const item = document.querySelector(`[data-suggestion-idx="${data.suggestion_idx}"]`);
    if (item) {
        const playerName = data.player_name || getPlayerNameById(data.player_id);
        item.innerHTML += `<br><em>${playerName} could not disprove</em>`;
    }

    // Hide the disprove form if it's showing for the current player
    if (data.player_id === currentPlayerId) {
        document.getElementById('disproveForm').style.display = 'none';
    }
});

// Function to make a move
function makeMove(move) {
    // Get the actual move ID to send to the server
    const moveId = typeof move === 'object' && move.position ? move.position : move;

    console.log('Making move:', moveId);

    // Clear any previous move results
    document.getElementById('moveResult').innerHTML = '';

    // Add visual feedback
    document.getElementById('moveResult').innerHTML =
        '<p>Moving to ' + formatPositionName(moveId) + '...</p>';

    // Emit the make_move event
    socket.emit('make_move', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        move: moveId
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

    console.log("Making suggestion:", suspect, "with", weapon);

    // Display a loading indicator or disable the button
    document.getElementById('makeSuggestionBtn').disabled = true;
    document.getElementById('makeSuggestionBtn').textContent = 'Processing...';

    // Emit the suggestion
    socket.emit('make_suggestion', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        suspect: suspect,
        weapon: weapon
    });

    // Reset button after a short delay (in case of error)
    setTimeout(() => {
        document.getElementById('makeSuggestionBtn').disabled = false;
        document.getElementById('makeSuggestionBtn').textContent = 'Make Suggestion';
    }, 3000);
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
    const cardSelect = document.getElementById('cardToShow');
    const card = cardSelect.value;

    if (!card) {
        alert('Please select a card to show');
        return;
    }

    console.log("Showing card to disprove suggestion:", card);

    // Disable the buttons to prevent multiple submissions
    document.getElementById('showCardBtn').disabled = true;
    document.getElementById('cannotDisproveBtn').disabled = true;

    socket.emit('disprove_suggestion', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        suggestion_idx: currentSuggestion.suggestion_idx,
        card_shown: card,
        is_suggested_character: currentSuggestion.is_suggested_character || false
    });
}

// Function to indicate you cannot disprove a suggestion
function cannotDisprove() {
    console.log("Cannot disprove suggestion");

    // Disable the buttons to prevent multiple submissions
    document.getElementById('showCardBtn').disabled = true;
    document.getElementById('cannotDisproveBtn').disabled = true;

    socket.emit('disprove_suggestion', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        suggestion_idx: currentSuggestion.suggestion_idx,
        card_shown: null,
        is_suggested_character: currentSuggestion.is_suggested_character || false
    });
}