/**
 * @file manageGUI.js
 * @description This file handles interactions with the GUI (i.e. clicking buttons)
 * 
 */

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

    console.log("joining lobby as host")
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