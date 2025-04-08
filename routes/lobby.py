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
        player = Player(name=data['name'], lobby_id=lobby_id)
        db.session.add(player)
        lobby.players.append(player)
        db.session.commit()

    # Join the Socket.IO room
    join_room(lobby_id)

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
    for p in lobby.players:
        if p.character and p.character['name'] == character_name:
            emit('error', {'message': f'Character {character_name} already selected', 'code': 'CHARACTER_ALREADY_SELECTED'})
            return

    # Set the player's character
    lobby.change_character(player_id, character_name)

    db.session.commit()

    # Notify all players about the character selection
    emit('character_selected', {
        'player_id': player.id,
        'character_name': character_name,
        'characters': lobby.get_character_list()
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

    # Get all player positions to broadcast
    all_player = lobby.getAllPlayers_state()

    player_positions = []
    for player in all_player:
        # Get the player information from the board state

        # convert string to dict

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

    # Emit game started event with the initial turn information and board state
    emit('game_started', {
        'current_player_id': current_player.id,
        'current_player_name': current_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves
    }, room=lobby_id)


@socketio.on('next_turn')
def next_turn(data):
    lobby_id = data['lobby_id']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    next_player = lobby.next_turn()


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
            'position_type': character.get('type', 'Unknown')
        })

    # Get valid moves for the current player
    valid_moves = lobby.show_available_moves(next_player.id)

    db.session.commit()

    emit('turn_update', {
        'player_id': next_player.id,
        'player_name': next_player.name,
        'player_positions': player_positions,
        'valid_moves': valid_moves
    }, room=lobby_id)

#----------------------MOVE THESE TO ANOTHER FILE FOR HANDLING PLAYER ACTIONS--------------------------------


@socketio.on('make_move')
def make_move(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    move = data['move']

    print(f"Received move: {move}")

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Verify it's the player's turn
    current_player = lobby.players[lobby.current_turn_idx]
    if current_player.id != player_id:
        emit('error', {'message': 'Not your turn', 'code': 'NOT_YOUR_TURN'})
        return

    # Get current board state
    board= lobby.get_board()


    # Verify the move is valid

    if not board._is_valid_move(player_id, move):
        emit('error', {'message': 'Invalid move', 'code': 'INVALID_MOVE'})
        return

    # Make the move

    old_position = json.loads(current_player.character).get('position', None)

    try:
        lobby.player_move(player_id, move)
    except ValueError as e:
        emit('error', {'message': str(e), 'code': 'MOVE_ERROR'})
        return
    
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
            'position_type': character.get('type', 'Unknown')
        })


    # Emit the move update event
    emit('move_update', {
        'player_id': player_id,
        'player_name': current_player.name,
        'new_position': move,
        'old_position': old_position,
        'player_positions': player_positions,
    }, room=lobby_id)



@socketio.on('make_suggestion')
def handle_suggestion(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    suspect = data['suspect']
    weapon = data['weapon']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Verify it's the player's turn
    current_player = lobby.players[lobby.current_turn_idx]
    if current_player.id != player_id:
        emit('error', {'message': 'Not your turn', 'code': 'NOT_YOUR_TURN'})
        return

    try:
        # Make the suggestion
        suggestion, moved_player_id = lobby.make_suggestion(player_id, suspect, weapon)

        # Get the current board state
        board_state = lobby.get_board_state()

        # Get all player positions to broadcast
        player_positions = []
        for player in lobby.players:
            player_info = board_state['players'].get(player.id, {})
            player_positions.append({
                'player_id': player.id,
                'name': player.name,
                'character': player_info.get('character', 'Unknown'),
                'position': player_info.get('position', 'Unknown'),
                'position_type': player_info.get('position_type', 'Unknown')
            })

        # Broadcast the suggestion to all players
        emit('suggestion_made', {
            'player_id': player_id,
            'player_name': current_player.name,
            'suspect': suspect,
            'weapon': weapon,
            'room': suggestion['room'],
            'player_positions': player_positions,
            'suggestion_idx': len(lobby.get_game_state()['suggestions']) - 1
        }, room=lobby_id)

        # Determine which player should respond to the suggestion
        # For now, we'll just move to the next turn automatically
        # Future implementation would handle the clockwise checking
        next_player = lobby.next_turn()
        valid_moves = lobby.get_valid_moves(next_player.id)
        db.session.commit()


        emit('turn_update', {
            'player_id': next_player.id,
            'player_name': next_player.name,
            'player_positions': player_positions,
            'valid_moves': valid_moves
        }, room=lobby_id)

    except ValueError as e:
        emit('error', {'message': str(e), 'code': 'SUGGESTION_ERROR'})


@socketio.on('make_accusation')
def handle_accusation(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    suspect = data['suspect']
    weapon = data['weapon']
    room = data['room']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Verify it's the player's turn
    current_player = lobby.players[lobby.current_turn_idx]
    if current_player.id != player_id:
        emit('error', {'message': 'Not your turn', 'code': 'NOT_YOUR_TURN'})
        return

    # Make the accusation
    accusation = lobby.make_accusation(player_id, suspect, weapon, room)

    # Check if accusation is correct
    if accusation['is_correct']:
        # Player won the game!
        emit('game_over', {
            'winner': player_id,
            'winner_name': current_player.name,
            'solution': lobby.get_game_state()['solution']
        }, room=lobby_id)
    else:
        # Incorrect accusation - player is eliminated
        current_player.eliminated = True
        db.session.commit()

        # Notify everyone
        emit('accusation_result', {
            'player_id': player_id,
            'player_name': current_player.name,
            'suspect': suspect,
            'weapon': weapon,
            'room': room,
            'is_correct': False
        }, room=lobby_id)

        # Check if only one player remains
        active_players = [p for p in lobby.players if not p.eliminated]
        if len(active_players) == 1:
            # Last player standing wins
            winner = active_players[0]
            emit('game_over', {
                'winner': winner.id,
                'winner_name': winner.name,
                'solution': lobby.get_game_state()['solution']
            }, room=lobby_id)
        else:
            # Move to the next player
            next_player = lobby.next_turn()
            while next_player.eliminated:
                next_player = lobby.next_turn()

            valid_moves = lobby.get_valid_moves(next_player.id)
            db.session.commit()

            emit('turn_update', {
                'player_id': next_player.id,
                'player_name': next_player.name,
                'valid_moves': valid_moves
            }, room=lobby_id)


@socketio.on('disprove_suggestion')
def handle_disprove(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    suggestion_idx = data['suggestion_idx']
    card_shown = data.get('card_shown')

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Get the suggestion
    game_state = lobby.get_game_state()
    if suggestion_idx >= len(game_state['suggestions']):
        emit('error', {'message': 'Invalid suggestion index', 'code': 'INVALID_SUGGESTION'})
        return

    suggestion = game_state['suggestions'][suggestion_idx]
    suggesting_player_id = suggestion['player_id']

    if card_shown:
        # Player is showing a card
        try:
            updated_suggestion = lobby.check_suggestion(suggestion_idx, player_id, card_shown)

            # Notify the suggesting player about the card shown
            emit('card_shown', {
                'suggestion_idx': suggestion_idx,
                'shown_by': player_id,
                'card': card_shown
            }, room=suggesting_player_id)

            # Notify everyone else that a card was shown (but not which one)
            emit('suggestion_disproved', {
                'suggestion_idx': suggestion_idx,
                'disproved_by': player_id
            }, room=lobby_id)

        except ValueError as e:
            emit('error', {'message': str(e), 'code': 'DISPROVE_ERROR'})
    else:
        # Player couldn't disprove - notify everyone
        emit('cannot_disprove', {
            'player_id': player_id,
            'suggestion_idx': suggestion_idx
        }, room=lobby_id)

    # Move to the next player's turn
    next_player = lobby.next_turn()
    valid_moves = lobby.get_valid_moves(next_player.id)
    db.session.commit()

    emit('turn_update', {
        'player_id': next_player.id,
        'player_name': next_player.name,
        'valid_moves': valid_moves
    }, room=lobby_id)


@socketio.on('get_my_cards')
def get_player_cards(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    # Get the player's cards
    game_state = lobby.get_game_state()
    player_cards = game_state['player_cards'].get(player_id, [])

    # Send the cards to the player
    emit('my_cards', {
        'cards': player_cards
    })


    #------------------------------------------------------------------------------------------