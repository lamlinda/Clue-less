/**
 * @file manageGamestate.js
 * @description This file enforces game rules and manages the gamestate
 *
 */

// Maps card names to image filenames
const cardImageMap = {
    // Suspects
    "Miss Scarlet": "MsScarlet.png",
    "Colonel Mustard": "ColMustard.png",
    "Mrs. White": "MrsWhite.png",
    "Mr. Green": "MrGreen.png",
    "Mrs. Peacock": "MrsPeacock.png",
    "Professor Plum": "ProfPlum.png",
  
    // Weapons
    "Candlestick": "candlestick.png",
    "Knife": "knife.png",
    "Lead Pipe": "leadPipe.png",
    "Revolver": "revolver.png",
    "Rope": "rope.png",
    "Wrench": "wrench.png",
  
    // Rooms
    "Kitchen": "kitchen.png",
    "Ballroom": "ballroom.png",
    "Conservatory": "conservatory.png",
    "Dining Room": "dining.png",
    "Lounge": "lounge.png",
    "Hall": "hall.png",
    "Study": "study.png",
    "Library": "library.png",
    "Billiard Room": "billiard.png"
  };

  const cardDisplayNameMap = {
    "Colonel Mustard": "Col. Mustard",
    "Professor Plum": "Prof. Plum",
    // Add more if needed
  };

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

    // Always show the suggestion button (will be enabled/disabled based on room presence)
    document.getElementById('makeSuggestionBtn2').style.display = 'inline-block';

    // Update the suggestion button state based on room presence
    updateSuggestionButton(data.in_room, data.current_location);

    // Explicitly request my cards from the server
    console.log("Requesting my cards...");
    socket.emit('get_my_cards', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId
    });

    // Store valid moves if it's our turn
    if (data.current_player_id === currentPlayerId) {
        isMyTurn = true;
        validMoves = data.valid_moves;
        secret_passage = data.secret_passage;
        showMoveOptions(validMoves, secret_passage);

        // Show accusation button when it's our turn
        document.getElementById('makeAccusationBtn2').style.display = 'inline-block';
    } else {
        isMyTurn = false;
        document.getElementById('moveOptions').style.display = 'none';
        document.getElementById('makeAccusationBtn2').style.display = 'none';
    }

    // Apply theme to the game board with a short delay to ensure DOM is ready
    console.log("About to apply theme to game board:", currentTheme);
    setTimeout(function() {
        console.log("Delayed theme update for game start");
        // Dispatch event to indicate game has started
        window.dispatchEvent(new Event('gameStarted'));
        // Also try direct update
        if (window.updateEntireGameBoard) {
            window.updateEntireGameBoard();
        } else {
            console.error("updateEntireGameBoard function not found!");
            // Try to find it on the window object
            for (var key in window) {
                if (key.toLowerCase().includes('update') && key.toLowerCase().includes('board')) {
                    console.log("Found potential function:", key);
                }
            }
        }
    }, 500);
});


// Listen for 'cards_dealt' event
socket.on('cards_dealt', function(data) {
    console.log('Cards dealt:', data);
    myCards = data.cards;

    // Display the cards
    updateCardDisplay();

    // Force theme update after getting cards
    setTimeout(function() {
        if (window.updateEntireGameBoard) {
            console.log("Forced theme update after cards dealt");
            window.updateEntireGameBoard();
        }
    }, 300);
});

// Listen for 'my_cards' event (response to get_my_cards)
socket.on('my_cards', function(data) {
    console.log('Received my cards:', data);

    // Verify the cards were actually sent for this player
    if (data.player_id && data.player_id !== currentPlayerId) {
        console.warn("Received cards for a different player. Ignoring.");
        return;
    }

    // Store the cards
    myCards = data.cards || [];

    // Store in localStorage for persistence (using player ID in the key)
    localStorage.setItem('myCards_' + currentPlayerId, JSON.stringify(myCards));

    console.log("My cards updated:", myCards);

    // Always update the card display
    updateCardDisplay();

    // Force theme update after getting cards
    setTimeout(function() {
        if (window.updateEntireGameBoard) {
            console.log("Forced theme update after receiving my cards");
            window.updateEntireGameBoard();
        } else {
            console.log("updateEntireGameBoard function not available yet");
            // Try again in a bit
            setTimeout(function() {
                if (window.updateEntireGameBoard) {
                    window.updateEntireGameBoard();
                }
            }, 1000);
        }
    }, 300);
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

    console.log("Displaying cards:", myCards);

    // Get current theme data for type detection
    const theme = gameThemes[currentTheme];
    if (!theme) {
        console.error("Theme data not found when displaying cards");
        return;
    }

    // Add each card with proper type detection and styling
    // Add each card
    myCards.forEach(function(card) {
        const cardElement = document.createElement('div');
        cardElement.className = 'card';
    
        let cardType = 'room';
        if (['Miss Scarlet', 'Colonel Mustard', 'Mrs. White', 'Mr. Green', 'Mrs. Peacock', 'Professor Plum'].includes(card)) {
            cardType = 'suspect';
            cardElement.classList.add('card-suspect');
        } else if (['Candlestick', 'Knife', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench', 'Dagger'].includes(card)) {
            cardType = 'weapon';
            cardElement.classList.add('card-weapon');
        } else {
            cardElement.classList.add('card-room');
        }
    
        // Determine subfolder based on card type
        const folder = {
            suspect: 'suspects',
            weapon: 'weapons',
            room: 'rooms'
        }[cardType];
    
        const filename = cardImageMap[card] || 'default.png';
        const imageSrc = `/static/images/${folder}/${filename}`;
    
        const imageEl = document.createElement('img');
        imageEl.src = imageSrc;
        imageEl.alt = card;
        imageEl.classList.add('card-image');
        
        // Only show image if it loads successfully
        imageEl.onerror = function () {
            console.warn(`Image not found: ${imageSrc}`);
            imageEl.remove(); // Or comment this out if you still want to show the card without the image
        };
    
        const titleEl = document.createElement('div');
        titleEl.className = 'card-title';
        titleEl.textContent = cardDisplayNameMap[card] || card;

    
        const typeEl = document.createElement('div');
        typeEl.className = 'card-type';
        typeEl.textContent = cardType.charAt(0).toUpperCase() + cardType.slice(1);
    
        cardElement.appendChild(imageEl);
        cardElement.appendChild(titleEl);
        cardElement.appendChild(typeEl);
    
        playerCards.appendChild(cardElement);
    });

    // Log debug info
    console.log("Card display updated with theme:", currentTheme);

    if (document.getElementById('debugInfo')) {
        document.getElementById('debugInfo').innerHTML =
            `<div>Theme: ${currentTheme}</div>
             <div>Cards: ${myCards.length}</div>`;
    }
}


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

        // Always show suggestion button, but update its state
        updateSuggestionButton(data.in_room, data.current_location);
        document.getElementById('makeSuggestionBtn2').style.display = 'inline-block';

        // If already made a suggestion and showing suggestion form, keep it displayed
        // Otherwise hide the suggestion form but keep the button visible
        if (!document.getElementById('suggestionForm').style.display === 'block') {
            document.getElementById('suggestionForm').style.display = 'none';
        }

        secret_passage = data.secret_passage;
        showMoveOptions(validMoves, secret_passage);

        // Show accusation button
        document.getElementById('makeAccusationBtn2').style.display = 'inline-block';
    } else {
        // Not our turn
        document.getElementById('moveOptions').style.display = 'none';
        document.getElementById('suggestionForm').style.display = 'none';
        document.getElementById('makeAccusationBtn2').style.display = 'none';
        document.getElementById('makeSuggestionBtn2').style.display = 'none';
    }

    // Apply theme updates if the theme changes
    if (data.theme && data.theme !== currentTheme) {
        currentTheme = data.theme;
        if (window.updateEntireGameBoard) {
            window.updateEntireGameBoard();
        }
    }
});


// Listen for 'card_shown' event - only received by the player who made the suggestion
socket.on('card_shown', function(data) {
    console.log('Card shown to you:', data);

    // Create a more prominent card display
    const cardShownContainer = document.createElement('div');
    cardShownContainer.className = 'card-shown-container';

    // Get the theme data
    const theme = gameThemes[currentTheme];
    let cardType = "Unknown";
    let cardColor = "#666";

    if (theme) {
        if (theme.characters.includes(data.card)) {
            cardType = "Suspect";
            cardColor = "#f44336";
        } else if (theme.weapons.includes(data.card)) {
            cardType = "Weapon";
            cardColor = "#2196F3";
        } else if (theme.rooms.includes(data.card)) {
            cardType = "Room";
            cardColor = "#4CAF50";
        }
    }

    cardShownContainer.innerHTML = `
    <p style="margin-bottom: 10px;"><strong>${data.shown_by_name}</strong> showed you:</p>
    <div class="shown-card" style="padding: 10px; border: 2px solid ${cardColor}; background-color: rgba(${cardColor === '#f44336' ? '244, 67, 54' : cardColor === '#2196F3' ? '33, 150, 243' : '76, 175, 80'}, 0.05);">
        <strong>${data.card}</strong> (${cardType})
    </div>
    <p style="margin-top: 10px; font-style: italic; color: #666;">Only you can see this card.</p>
    `;

    // Clear previous results and add this notification
    const turnResult = document.getElementById('turnResult');
    turnResult.innerHTML = '';
    turnResult.appendChild(cardShownContainer);

    // Store this card for future reference
    if (!window.cardsShownToMe) {
        window.cardsShownToMe = [];
    }

    window.cardsShownToMe.push({
        shownBy: data.shown_by,
        shownByName: data.shown_by_name,
        card: data.card,
        cardType: cardType,
        timestamp: new Date().toISOString(),
        suggestionIdx: data.suggestion_idx
    });

    // Store in local storage for persistence
    try {
        localStorage.setItem('cardsShownToMe', JSON.stringify(window.cardsShownToMe));
    } catch (e) {
        console.error("Failed to store cards in localStorage:", e);
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

    // If we're not the suggester, we only see the generic message
    // If we are the suggester, we'll receive both events, but we'll prioritize showing the card
    // Add this notification to the turnResult unless it's the suggester (who gets a different notification)
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

    // If this was the suggested character player, add special notification
    if (data.is_suggested_character) {
        const notification = document.createElement('div');
        notification.className = 'disprove-notification';
        const playerName = data.player_name || getPlayerNameById(data.player_id);
        notification.innerHTML = `<p>${playerName} (the suggested character) could not disprove the suggestion.</p>`;
        document.getElementById('turnResult').innerHTML = '';
        document.getElementById('turnResult').appendChild(notification);
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

// Function to prepare the disprove suggestion form
function prepareSuggestionDisprove(data) {
    console.log("Preparing to disprove suggestion:", data);

    // Store current suggestion data
    currentSuggestion = data;

    // Display the disprove form
    const disproveForm = document.getElementById('disproveForm');
    disproveForm.style.display = 'block';

    // Display the suggestion to disprove
    document.getElementById('suggestionToDisprove').innerHTML = `
    <p>${data.player_name} suggests:</p>
    <p><strong>${data.suspect}</strong> in the <strong>${data.room}</strong> with the <strong>${data.weapon}</strong></p>
    `;

    // Add special message if this player controls the suggested character
    if (data.is_suggested_character) {
        const characterMessage = document.createElement('p');
        characterMessage.className = 'warning';
        characterMessage.innerHTML = `<strong>Your character (${data.suspect}) was suggested!</strong>`;
        document.getElementById('suggestionToDisprove').appendChild(characterMessage);
    }

    // Log current cards for debugging
    console.log("Current cards:", myCards);

    // Get matching cards that can disprove
    const matchingCards = myCards.filter(card =>
        card === data.suspect ||
        card === data.weapon ||
        card === data.room
    );

    console.log("Matching cards found:", matchingCards);

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

    // Add visual feedback about whether you can disprove
    const disproveStatusEl = document.createElement('div');
    disproveStatusEl.className = 'disprove-status';

    if (matchingCards.length > 0) {
        disproveStatusEl.innerHTML = `<p class="success">You have ${matchingCards.length} card(s) that can disprove this suggestion.</p>`;
    } else {
        disproveStatusEl.innerHTML = `<p class="warning">You don't have any cards that can disprove this suggestion.</p>`;
    }

    // Remove any existing status message
    const existingStatus = document.querySelector('.disprove-status');
    if (existingStatus) {
        existingStatus.remove();
    }

    document.getElementById('disproveForm').insertBefore(disproveStatusEl, document.getElementById('suggestionToDisprove').nextSibling);
}

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
    document.getElementById('makeSuggestionBtn2').style.display = 'none';
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
            // Handle different themed characters by extracting color from theme data
            const theme = gameThemes[currentTheme];
            if (theme) {
                const characterIndex = theme.characters.indexOf(player.character);
                if (characterIndex >= 0) {
                    // Use the corresponding classic character's color class
                    const classicCharacter = Object.keys(characterPositionMapping)[characterIndex];
                    if (classicCharacter) {
                        const colorName = classicCharacter.toLowerCase().split(' ')[1];
                        playerToken.classList.add('character-' + colorName);
                    }
                }
            } else {
                // Fallback to traditional method
                const characterName = player.character.toLowerCase().split(' ')[1];
                if (characterName) {
                    playerToken.classList.add('character-' + characterName);
                }
            }
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
function showMoveOptions(moves, secret_passage) {
    console.log('Showing move options:', moves);

    // First clear any existing move options
    clearMoveOptions();

    // Update move options container
    const moveOptionsContainer = document.getElementById('moveOptionsContainer');
    moveOptionsContainer.innerHTML = '';

    // Handle case where no moves are available
    if (!moves || moves.length === 0) {
        moveOptionsContainer.innerHTML = '<p>No valid moves available.</p>';
        document.getElementById('moveOptions').style.display = 'block';
        return;
    }

    // Process each move and create a button for it
    moves.forEach(function(move) {
        // Get the move ID - handle both string and object formats
        const moveId = typeof move === 'object' && move.position ? move.position : move;

        // Create button element for this move
        const moveButton = document.createElement('button');
        moveButton.classList.add('move-option-btn');

        // Format button text based on the move type
        let buttonText = `Move to ${formatPositionName(moveId)}`;

        // Check if this is a secret passage move
        if (secret_passage && moveId === secret_passage) {
            buttonText += ' (via secret passage)';
            moveButton.style.backgroundColor = '#9c27b0'; // Purple for secret passage
        }

        moveButton.textContent = buttonText;

        // Add click event to make the move
        moveButton.addEventListener('click', function() {
            console.log('Move button clicked for move:', moveId);
            document.getElementById('moveResult').innerHTML =
                '<p>Attempting move to ' + formatPositionName(moveId) + '...</p>';
            makeMove(moveId);
        });

        // Add the button to the options container
        moveOptionsContainer.appendChild(moveButton);
        moveOptionsContainer.appendChild(document.createElement('br'));
    });

    // Also highlight the valid moves on the board
    moves.forEach(function(move) {
        // Get the move ID - handle both string and object formats
        const moveId = typeof move === 'object' && move.position ? move.position : move;

        // Find the element on the board
        const positionElement = document.getElementById(moveId);

        if (positionElement) {
            console.log('Adding move option to element:', moveId);
            positionElement.classList.add('move-option');

            // Add a visual hint
            const hintSpan = document.createElement('span');
            hintSpan.classList.add('move-hint');
            hintSpan.textContent = 'Click to move';
            positionElement.appendChild(hintSpan);

            // Add click event directly to the board element
            positionElement.addEventListener('click', function(event) {
                // Prevent event bubbling
                event.stopPropagation();
                console.log('Board position clicked:', moveId);
                makeMove(moveId);
            });
        } else {
            console.warn('Position element not found for ID:', moveId);
        }
    });

    // Show the move options container
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


// Format position names for display with theme awareness
function formatPositionName(position) {
    if (!position) return 'Unknown';

    // Get current theme data
    const theme = gameThemes[currentTheme];
    if (!theme) {
        console.error("Theme data not found when formatting position names");
        // Fallback to basic formatting
        return position.charAt(0).toUpperCase() + position.slice(1);
    }

    // For starter positions
    if (position.endsWith('_start')) {
        const character = position.replace('_start', '');

        // Map from classic character positions to themed character names
        const classicToIndex = {
            'scarlet': 0,
            'mustard': 1,
            'white': 2,
            'green': 3,
            'peacock': 4,
            'plum': 5
        };

        const index = classicToIndex[character];
        if (index !== undefined && index < theme.characters.length) {
            return `${theme.characters[index]} starting position`;
        }

        // Fallback
        return `${character.charAt(0).toUpperCase() + character.slice(1)} starting position`;
    }

    // For hallways (connections between rooms)
    if (position.includes('_')) {
        const rooms = position.split('_');

        // Map from classic room names to theme-specific room names
        const roomMap = {
            'study': theme.rooms[6] || 'Study',
            'hall': theme.rooms[5] || 'Hall',
            'lounge': theme.rooms[4] || 'Lounge',
            'library': theme.rooms[7] || 'Library',
            'billiard': theme.rooms[8] || 'Billiard Room',
            'dining': theme.rooms[3] || 'Dining Room',
            'conservatory': theme.rooms[2] || 'Conservatory',
            'ballroom': theme.rooms[1] || 'Ballroom',
            'kitchen': theme.rooms[0] || 'Kitchen'
        };

        const room1 = roomMap[rooms[0]] || (rooms[0].charAt(0).toUpperCase() + rooms[0].slice(1));
        const room2 = roomMap[rooms[1]] || (rooms[1].charAt(0).toUpperCase() + rooms[1].slice(1));

        return `Hallway between ${room1} and ${room2}`;
    }

    // For rooms
    const roomMap = {
        'study': theme.rooms[6] || 'Study',
        'hall': theme.rooms[5] || 'Hall',
        'lounge': theme.rooms[4] || 'Lounge',
        'library': theme.rooms[7] || 'Library',
        'billiard': theme.rooms[8] || 'Billiard Room',
        'dining': theme.rooms[3] || 'Dining Room',
        'conservatory': theme.rooms[2] || 'Conservatory',
        'ballroom': theme.rooms[1] || 'Ballroom',
        'kitchen': theme.rooms[0] || 'Kitchen'
    };

    return roomMap[position] || (position.charAt(0).toUpperCase() + position.slice(1));
}

// Add a debug button to force theme update
document.addEventListener('DOMContentLoaded', function() {
    // Show debug panel in development mode
    const debugPanel = document.getElementById('debugPanel');
    if (debugPanel) {
        const inDevMode = window.location.hostname === 'localhost' ||
                         window.location.hostname === '127.0.0.1' ||
                         window.location.search.includes('debug=true');

        if (inDevMode) {
            debugPanel.style.display = 'block';
        }
    }
});