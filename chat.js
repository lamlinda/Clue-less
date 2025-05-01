/**
 * chat.js
 * Handles all chat functionality for the Clue-Less game
 */

// Initialize chat system when the page loads
document.addEventListener('DOMContentLoaded', function() {
    console.log("Initializing chat system...");

    // Create chat container
    createChatInterface();

    // Set up socket listeners for chat events
    setupChatSocketListeners();

    // Set up UI event handlers
    setupChatUIHandlers();
});

// Create the chat interface
function createChatInterface() {
    console.log("Creating chat interface...");

    // Create the chat panel
    const chatPanel = document.createElement('div');
    chatPanel.id = 'chatPanel';
    chatPanel.style.display = 'none'; // Hidden initially, will be shown when game starts

    // Create chat header
    const chatHeader = document.createElement('div');
    chatHeader.id = 'chatHeader';
    chatHeader.innerHTML = '<span>Game Chat</span><button id="chatCloseBtn">&times;</button>';

    // Create chat messages container
    const chatMessages = document.createElement('div');
    chatMessages.id = 'chatMessages';

    // Create chat input area
    const chatInputArea = document.createElement('div');
    chatInputArea.id = 'chatInputArea';
    chatInputArea.innerHTML = `
        <input type="text" id="chatMessageInput" placeholder="Type your message...">
        <button id="chatSendBtn">Send</button>
    `;

    // Assemble the chat panel
    chatPanel.appendChild(chatHeader);
    chatPanel.appendChild(chatMessages);
    chatPanel.appendChild(chatInputArea);

    // Add to the body
    document.body.appendChild(chatPanel);

    // Create toggle button in the game controls
    const gameControls = document.getElementById('gameControls');
    if (gameControls) {
        const toggleBtn = document.createElement('button');
        toggleBtn.id = 'toggleChatBtn';
        toggleBtn.className = 'toggle-button';
        toggleBtn.textContent = 'Hide Chat';
        gameControls.appendChild(toggleBtn);
    }

    // Add welcome message
    setTimeout(() => {
        const chatMessagesElement = document.getElementById('chatMessages');
        if (chatMessagesElement) {
            const welcomeMessage = document.createElement('div');
            welcomeMessage.className = 'chat-message';
            welcomeMessage.innerHTML = `
                <span class="chat-time">[${new Date().toLocaleTimeString([], {hour: '2-digit', minute: '2-digit'})}]</span>
                <span class="chat-system-message">Welcome to the game chat! Be respectful and have fun!</span>
            `;
            chatMessagesElement.appendChild(welcomeMessage);
        }
    }, 500);

    console.log("Chat interface created");
}

// Set up socket listeners for chat events
function setupChatSocketListeners() {
    // Listen for chat messages from the server
    socket.on('chat_message', function(data) {
        console.log('Chat message received:', data);
        addMessageToChat(data.player_name, data.message, data.timestamp);
    });

    // Listen for player joined notifications
    socket.on('player_joined', function(data) {
        addMessageToChat('System', `${data.player_name} has joined the game.`, data.timestamp);
    });

    // Add game event notifications
    socket.on('game_started', function() {
        addMessageToChat('System', 'Game has started!');

        // Open the chat automatically when the game starts
        toggleChat(true);
    });

    socket.on('turn_update', function(data) {
        addMessageToChat('System', `It's ${data.player_name}'s turn.`);
    });

    // REMOVED: Do not show move_update events
    // REMOVED: Do not show suggestion_made events

    socket.on('accusation_result', function(data) {
        if (data.is_correct) {
            addMessageToChat('System', `${data.player_name} made a correct accusation and won the game!`);
        } else {
            addMessageToChat('System', `${data.player_name} made an incorrect accusation and is eliminated.`);
        }
    });

    socket.on('game_over', function(data) {
        addMessageToChat('System', `Game Over! ${data.winner_name} has won!`);
    });

    console.log("Chat socket listeners set up");
}

// Set up UI event handlers for the chat
function setupChatUIHandlers() {
    // Toggle chat visibility when toggle button is clicked
    document.getElementById('toggleChatBtn').addEventListener('click', function() {
        toggleChat();
    });

    // Close chat when close button is clicked
    document.getElementById('chatCloseBtn').addEventListener('click', function() {
        toggleChat(false);
    });

    // Send message when Send button is clicked
    document.getElementById('chatSendBtn').addEventListener('click', function() {
        sendChatMessage();
    });

    // Send message when Enter key is pressed in the input field
    document.getElementById('chatMessageInput').addEventListener('keypress', function(event) {
        if (event.key === 'Enter') {
            sendChatMessage();
            event.preventDefault();
        }
    });

    console.log("Chat UI handlers set up");
}

// Global variable to track chat visibility state
let chatVisible = false;

// Toggle chat panel visibility
function toggleChat(show) {
    const chatPanel = document.getElementById('chatPanel');
    const toggleBtn = document.getElementById('toggleChatBtn');

    // If show parameter is provided, use it; otherwise toggle
    if (typeof show === 'boolean') {
        chatVisible = show;
    } else {
        chatVisible = chatPanel.style.display === 'none' || chatPanel.style.display === '';
    }

    if (chatVisible) {
        chatPanel.style.display = 'flex';
        toggleBtn.textContent = 'Hide Chat';

        // Focus the input field
        document.getElementById('chatMessageInput').focus();

        // Scroll to the bottom to show the latest messages
        const messageContainer = document.getElementById('chatMessages');
        messageContainer.scrollTop = messageContainer.scrollHeight;
    } else {
        chatPanel.style.display = 'none';
        toggleBtn.textContent = 'Show Chat';
    }
}

// Send chat message
function sendChatMessage() {
    const messageInput = document.getElementById('chatMessageInput');
    const message = messageInput.value.trim();

    if (message === '') return; // Don't send empty messages

    console.log("Sending chat message:", message); // Debug log

    // Emit message to server
    socket.emit('send_chat', {
        lobby_id: currentLobbyId,
        player_id: currentPlayerId,
        message: message
    });

    // Clear input field
    messageInput.value = '';
}

// Add a message to the chat
function addMessageToChat(playerName, message, timestamp) {
    const chatMessages = document.getElementById('chatMessages');
    if (!chatMessages) return;

    const messageElement = document.createElement('div');
    messageElement.className = 'chat-message';

    // Format timestamp
    let timeString = '';
    if (timestamp) {
        const date = new Date(timestamp);
        timeString = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else {
        timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    }

    // Style based on message type
    if (playerName === 'System') {
        // System messages are styled differently
        messageElement.innerHTML = `
            <span class="chat-time">[${timeString}]</span>
            <span class="chat-system-message">${message}</span>
        `;
    } else {
        // Regular player messages
        // Check if this is the current player
        const isCurrentPlayer = playerName === document.getElementById('playerName')?.textContent ||
                               (currentPlayerId && playerName === getCachedPlayerName(currentPlayerId));

        const nameClass = isCurrentPlayer ? 'chat-current-player' : 'chat-player-name';

        messageElement.innerHTML = `
            <span class="chat-time">[${timeString}]</span>
            <span class="${nameClass}">${playerName}:</span>
            ${message}
        `;
    }

    // Add to the chat container
    chatMessages.appendChild(messageElement);

    // Scroll to the bottom
    chatMessages.scrollTop = chatMessages.scrollHeight;

    // Notify user if chat is hidden
    if (document.getElementById('chatPanel').style.display === 'none') {
        const toggleBtn = document.getElementById('toggleChatBtn');
        if (toggleBtn) {
            toggleBtn.classList.add('has-unread');

            // Create or update the unread indicator
            let unread = toggleBtn.querySelector('.chat-unread');
            if (!unread) {
                unread = document.createElement('span');
                unread.className = 'chat-unread';
                toggleBtn.appendChild(unread);
            }
            unread.style.display = 'block';
        }
    }
}

// Helper function to get player name from cache or player ID
function getCachedPlayerName(playerId) {
    // Try to find the player name from the player positions table
    const playerRows = document.getElementById('playerPositionsBody')?.querySelectorAll('tr') || [];
    for (let i = 0; i < playerRows.length; i++) {
        const row = playerRows[i];
        if (row.getAttribute('data-player-id') === playerId) {
            const nameCell = row.querySelector('td:first-child');
            return nameCell ? nameCell.textContent.replace(' (You)', '') : 'Unknown Player';
        }
    }

    // Fallback: try to find in the player list
    const playerItems = document.querySelectorAll('#playersContainer .player-item');
    for (let i = 0; i < playerItems.length; i++) {
        const item = playerItems[i];
        if (item.getAttribute('data-player-id') === playerId) {
            return item.textContent.replace(/ \(Host\)| \(You\).*/, '');
        }
    }

    return 'Unknown Player';
}