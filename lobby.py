from flask import Blueprint, request, jsonify
from flask_socketio import emit, join_room
from models import Lobby, Player

from extensions import db, socketio
import json
import datetime

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

    # Get the selected theme (default to "classic" if not specified)
    selected_theme = data.get('theme', 'classic')

    lobby = Lobby(host_id=host_player.id, theme=selected_theme)
    db.session.add(lobby)
    db.session.flush()

    host_player.lobby_id = lobby.id
    # Don't append here - rely on the lobby_id field to establish relationship
    # Remove: lobby.players.append(host_player)

    db.session.commit()

    socketio.emit('lobby_created', {'lobby_id': lobby.id, 'theme': selected_theme})

    return jsonify({
        'lobby_id': lobby.id,
        'player_id': host_player.id,
        'theme': selected_theme
    })


@socketio.on('join_lobby')
def join_lobby(data):
    lobby_id = data['lobby_id']
    player_id = data.get('player_id', None)  # Optional player_id parameter for the host

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
        # Check if a player with this name already exists in this lobby
        existing_player = Player.query.filter_by(name=data['name'], lobby_id=lobby_id).first()
        if existing_player:
            # Use the existing player instead of creating a new one
            player = existing_player
            print(f"Player {data['name']} already exists in lobby {lobby_id}, reusing player")
        else:
            # Create a new player
            player = Player(name=data['name'], lobby_id=lobby_id)
            db.session.add(player)
            # Set the lobby_id but don't append to lobby.players
            # Remove: lobby.players.append(player)
            db.session.commit()

    # Join the Socket.IO room
    join_room(lobby_id)

    # Also join a private room for this player, enabling direct messaging
    join_room(player.id)
    print(f"Player {player.name} joined their private room: {player.id}")

    # Get the current player list - ensure we have fresh data
    lobby = Lobby.query.get(lobby_id)  # Refresh lobby from DB

    # Create a set of player IDs to detect and prevent duplicates
    player_ids_seen = set()
    players_list = []

    for p in lobby.players:
        if p.id not in player_ids_seen:
            player_ids_seen.add(p.id)
            players_list.append({
                'player_id': p.id,
                'name': p.name,
                'is_host': p.id == lobby.host,
                'select_character': p.character
            })
        else:
            print(f"Duplicate player detected: {p.name} (ID: {p.id})")

    # Get the theme of this lobby - CRUCIAL for theme synchronization
    lobby_theme = getattr(lobby, 'theme', 'classic')
    print(f"Player {player.name} joined lobby with theme: {lobby_theme}")

    # Emit player_joined notification to other players in the lobby for chat system
    for p in lobby.players:
        if p.id != player.id:  # Skip the joining player
            emit('player_joined', {
                'player_id': player.id,
                'player_name': player.name,
                'timestamp': datetime.datetime.now().isoformat()
            }, room=p.id)  # Send to that player's individual room

    # Send the join event to all clients in the room, including the player's ID and theme
    emit('lobby_joined', {
        'lobby_id': lobby_id,
        'players': players_list,
        'host_id': lobby.host,
        'player_id': player.id,
        'min_players': MIN_PLAYERS,
        'max_players': MAX_PLAYERS,
        'can_start': len(players_list) >= MIN_PLAYERS,
        'theme': lobby_theme  # Send the theme to ALL clients
    }, room=lobby_id)


@socketio.on('select_character')
def select_character(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    character_name = data['character_name']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Check if the player is already in the lobby
    player = Player.query.get(player_id)
    if player is None or player.lobby_id != lobby.id:
        emit('error', {'message': 'Player not in lobby', 'code': 'PLAYER_NOT_IN_LOBBY'})
        return

    # Check if the character is already selected by another player
    all_characters = json.loads(lobby.characters)
    for character in all_characters.values():
        if character['name'] == character_name and character['selected']:
            emit('error', {
                'message': f'Character {character_name} is already selected',
                'code': 'CHARACTER_ALREADY_SELECTED'
            })
            return

    # Set the player's character
    lobby.change_character(player_id, character_name)
    db.session.commit()

    lobby = Lobby.query.get(lobby_id)  # Refresh the lobby object
    characters = json.loads(lobby.characters)

    # Notify all players about the character selection
    emit('character_selected', {
        'player_id': player.id,
        'character_name': character_name,
        'characters': characters,
        'players': [
            {
                'player_id': p.id,
                'name': p.name,
                'character': json.loads(p.character) if p.character else None
            }
            for p in lobby.players
        ],
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
            'position_type': player['character'].get('type', 'Unknown')
        }
        player_positions.append(player_info)

    # Get valid moves for the current player
    valid_moves = lobby.show_available_moves(current_player.id)

    print(f"Valid moves for {current_player.name}: {valid_moves}")

    # Send individual cards to each player
    for player in lobby.players:
        player_cards = json.loads(player.cards)
        emit('cards_dealt', {
            'cards': player_cards
        }, room=player.id)

    # Get the lobby theme
    lobby_theme = getattr(lobby, 'theme', 'classic')

    # Emit game started event with the initial turn information and board state
    emit('game_started', {
        'current_player_id': current_player.id,
        'current_player_name': current_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves,
        'in_room': in_room,
        'current_location': current_location,
        'secret_passage': None,
        'theme': lobby_theme,  # Include the theme in game_started
        'timestamp': datetime.datetime.now().isoformat()  # Add timestamp for chat
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
        player_positions.append({
            'player_id': player.id,
            'name': player.name,
            'character': character.get('name', 'Unknown'),
            'position': character.get('position', 'Unknown'),
            'position_type': character.get('type', 'Unknown')
        })

    # Get valid moves for the current player
    valid_moves = lobby.show_available_moves(next_player.id)

    # Get secret passages
    board = lobby.get_board()
    secret_passage = None
    next_player_location = board._find_player_on_board(next_player.id)
    if next_player_location:
        secret_passage = board.get_valid_secret_passages(next_player_location["location"])

    db.session.commit()

    # Get the lobby theme
    lobby_theme = getattr(lobby, 'theme', 'classic')

    emit('turn_update', {
        'player_id': next_player.id,
        'player_name': next_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves,
        'in_room': in_room,
        'current_location': current_location,
        'secret_passage': secret_passage,
        'theme': lobby_theme,  # Include theme in turn updates
        'timestamp': datetime.datetime.now().isoformat()  # Add timestamp for chat
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