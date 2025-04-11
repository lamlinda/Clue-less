from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room
from models import Lobby, Player

from extensions import db, socketio
import json

lobby_bp = Blueprint('lobby', __name__)

# Constants for player limits
MIN_PLAYERS = 3
MAX_PLAYERS = 6


@lobby_bp.route('/host', methods=['POST'])
def host_lobby():
    data = request.get_json()

    host_player = Player(name=data['name'])
    db.session.add(host_player)
    db.session.flush()

    lobby = Lobby(host_id=host_player.id)
    db.session.add(lobby)
    db.session.flush()

    host_player.lobby_id = lobby.id
    lobby.players.append(host_player)

    db.session.commit()

    socketio.emit('lobby_created', {'lobby_id': lobby.id})

    return jsonify({'lobby_id': lobby.id, 'player_id': host_player.id})


@socketio.on('join_lobby')
def join_lobby(data):
    lobby_id = data['lobby_id']
    player_id = data.get('player_id', None)  # Optional player_id parameter for the host
    player_name = data.get('name', 'Anonymous')

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Check if the lobby is already full
    if len(lobby.players) >= MAX_PLAYERS:
        # Return a more detailed error message for full lobbies
        emit('error', {
            'message': f'This lobby already has {len(lobby.players)} out of {MAX_PLAYERS} players',
            'code': 'LOBBY_FULL',
            'current_players': len(lobby.players),
            'max_players': MAX_PLAYERS
        })
        return

    # Check if the game has already started
    if lobby.status == 'in_progress':
        emit('error', {'message': 'Game already in progress', 'code': 'GAME_IN_PROGRESS'})
        return

    # If player_id is provided, the host is joining their own lobby
    if player_id:
        player = Player.query.get(player_id)
        if not player:
            emit('error', {'message': 'Player not found', 'code': 'PLAYER_NOT_FOUND'})
            return
    else:
        # Create a new player
        player = Player(name=player_name, lobby_id=lobby_id)
        db.session.add(player)
        lobby.players.append(player)
        db.session.commit()

    # Join the lobby's Socket.IO room
    join_room(lobby_id)

    # Also join a private room for this player, enabling direct messaging
    join_room(player.id)
    print(f"Player {player.name} joined their private room: {player.id}")

    # Get the current player list
    players_list = [{'player_id': p.id, 'name': p.name, 'is_host': p.id == lobby.host} for p in lobby.players]

    # Send the join event to all clients in the room, including the player's ID
    emit('lobby_joined', {
        'lobby_id': lobby_id,
        'players': players_list,
        'host_id': lobby.host,
        'player_id': player.id,  # Return the player's ID so client can store it
        'min_players': MIN_PLAYERS,
        'max_players': MAX_PLAYERS,
        'can_start': len(lobby.players) >= MIN_PLAYERS
    }, room=lobby_id)


@socketio.on('start_game')
def start_game(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Check if the player is the host
    if lobby.host != player_id:
        emit('error', {'message': 'Only the host can start the game', 'code': 'NOT_HOST'})
        return

    # Check if there are enough players
    if len(lobby.players) < MIN_PLAYERS:
        emit('error', {
            'message': f'Not enough players to start (min {MIN_PLAYERS})',
            'code': 'NOT_ENOUGH_PLAYERS'
        })
        return

    # Check if there are too many players (redundant but for safety)
    if len(lobby.players) > MAX_PLAYERS:
        emit('error', {
            'message': f'Too many players to start (max {MAX_PLAYERS})',
            'code': 'TOO_MANY_PLAYERS'
        })
        return

    # Initialize the game board and cards
    lobby.initialize_game()

    db.session.commit()

    # Get the player who has the first turn
    current_player = lobby.players[lobby.current_turn_idx]

    # Get the board to check if the player is in a room
    board = lobby.get_board()
    in_room = False
    current_location = None

    if board:
        # Find player's location on the board
        player_location = board._find_player_on_board(current_player.id)
        if player_location and player_location["type"] == "room":
            in_room = True
            current_location = player_location["location"]

    # Get all player positions to broadcast
    all_player = lobby.getAllPlayers_state()

    player_positions = []
    for player in all_player:
        # Get the player information from the board state
        player_info = {
            'player_id': player['id'],
            'name': player['name'],
            'character': player['character'].get('name', 'Unknown'),
            'position': player['character'].get('position', 'Unknown'),
            'position_type': player['character'].get('type', 'Unknown'),
        }
        player_positions.append(player_info)

    # Get valid moves for the current player
    valid_moves = lobby.show_available_moves(current_player.id)

    print(f"Valid moves for {current_player.name}: {valid_moves}")

    # Emit game started event with the initial turn information and board state
    emit('game_started', {
        'current_player_id': current_player.id,
        'current_player_name': current_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves,
        'in_room': in_room,
        'current_location': current_location
    }, room=lobby_id)


@socketio.on('next_turn')
def next_turn(data):
    lobby_id = data['lobby_id']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    next_player = lobby.next_turn()

    # Get the board to check if the player is in a room
    board = lobby.get_board()
    in_room = False
    current_location = None

    if board:
        # Find player's location on the board
        player_location = board._find_player_on_board(next_player.id)
        if player_location and player_location["type"] == "room":
            in_room = True
            current_location = player_location["location"]

    # Get all player positions to broadcast
    player_positions = []
    for player in lobby.players:
        player_info = player._get_player_state()
        character = player_info.get('character', {})
        print(player_info)
        player_positions.append({
            'player_id': player.id,
            'name': player.name,
            'character': character.get('name', 'Unknown'),
            'position': character.get('position', 'Unknown'),
            'position_type': character.get('type', 'Unknown'),
            'cards': character.get('cards', 'Unknown')
        })

    # Get valid moves for the current player
    valid_moves = lobby.show_available_moves(next_player.id)

    db.session.commit()

    emit('turn_update', {
        'player_id': next_player.id,
        'player_name': next_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves,
        'in_room': in_room,
        'current_location': current_location
    }, room=lobby_id)


@socketio.on('get_my_cards')
def get_player_cards(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']

    # Log the request
    print(f"Player {player_id} requesting their cards from lobby {lobby_id}")
    print(f"Current socket session ID: {request.sid}")

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Get the player's cards
    player = Player.query.filter_by(id=player_id, lobby_id=lobby_id).first()
    if not player:
        print(f"Player {player_id} not found in lobby {lobby_id}")
        emit('error', {'message': 'Player not found', 'code': 'PLAYER_NOT_FOUND'})
        return

    # Get the player's cards
    try:
        player_cards = json.loads(player.cards)
        print(f"Sending cards to player {player_id} ({player.name}): {player_cards}")

        # Send cards ONLY to the requesting socket connection
        emit('my_cards', {
            'player_id': player_id,  # Include player ID for verification
            'cards': player_cards
        })
        print(f"Cards sent to player {player.name} via socket {request.sid}")

    except Exception as e:
        print(f"Error sending cards to player {player_id}: {str(e)}")
        emit('error', {'message': f'Error getting cards: {str(e)}', 'code': 'CARD_ERROR'})