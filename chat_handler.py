from flask_socketio import emit
from models import Player
import datetime


def register_chat_handlers(socketio):
    """
    Register all chat-related Socket.IO event handlers

    Args:
        socketio: The Flask-SocketIO instance
    """

    @socketio.on('send_chat')
    def handle_chat_message(data):
        """
        Handle incoming chat messages from clients

        Args:
            data (dict): Contains lobby_id, player_id, and message
        """
        lobby_id = data['lobby_id']
        player_id = data['player_id']
        message = data['message']

        print(f"Processing chat message: {message}")

        # Get the player's name
        player = Player.query.get(player_id)

        if player is None:
            emit('error', {'message': 'Player not found', 'code': 'PLAYER_NOT_FOUND'})
            return

        # Create timestamp
        timestamp = datetime.datetime.now().isoformat()

        # Broadcast the message to all players in the lobby
        emit('chat_message', {
            'player_id': player_id,
            'player_name': player.name,
            'message': message,
            'timestamp': timestamp
        }, room=lobby_id)

        # Log the message (for debugging)
        print(f"Sent chat message from {player.name} in lobby {lobby_id}: {message}")