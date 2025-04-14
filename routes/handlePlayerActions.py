from flask_socketio import emit
from models import Lobby, Player
from extensions import db, socketio
import json
import datetime


# Player movement event
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
    board = lobby.get_board()

    # Verify the move is valid
    valid_move = board._is_valid_move(player_id, move)
    if not valid_move["result"]:
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
        player_positions.append({
            'player_id': player.id,
            'name': player.name,
            'character': character.get('name', 'Unknown'),
            'position': character.get('position', 'Unknown'),
            'position_type': character.get('type', 'Unknown')
        })

    # Determine if player can make a suggestion (they moved to a room)
    can_suggest = False
    location = board._find_player_on_board(player_id)
    if location and location["type"] == "room":
        can_suggest = True

    # Emit the move update event
    emit('move_update', {
        'player_id': player_id,
        'player_name': current_player.name,
        'new_position': move,
        'old_position': old_position,
        'player_positions': player_positions,
        'can_suggest': can_suggest
    }, room=lobby_id)


# Suggestion event
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

        # Get the suggestion index
        suggestions = json.loads(lobby.suggestions)
        suggestion_idx = len(suggestions) - 1

        # FIND THE PLAYER CONTROLLING THE SUGGESTED CHARACTER FIRST
        suggested_player_id = None
        for p in lobby.players:
            if p.id != player_id:  # Skip the suggesting player
                try:
                    p_character = json.loads(p.character) if p.character else None
                    if p_character and isinstance(p_character, dict):
                        # Try to match by character name
                        if p_character.get("name") == suspect:
                            suggested_player_id = p.id
                            break
                except Exception as e:
                    print(f"Error checking player character: {e}")
                    continue

        print(f"Player controlling suggested character {suspect}: {suggested_player_id}")

        # Set the next player to disprove
        if suggested_player_id:
            # The suggested character player goes first
            next_to_disprove = suggested_player_id
            is_suggested_character = True
            print(f"Suggested character controlled by player {next_to_disprove} - they go first")
        else:
            # If no player controls the suggested character or we couldn't find them
            # Start with the player to the left of the current player (clockwise)
            next_to_disprove_idx = (lobby.current_turn_idx + 1) % len(lobby.players)
            next_to_disprove = lobby.players[next_to_disprove_idx].id

            # Skip the player who made the suggestion
            if next_to_disprove == player_id:
                next_to_disprove_idx = (next_to_disprove_idx + 1) % len(lobby.players)
                next_to_disprove = lobby.players[next_to_disprove_idx].id

            is_suggested_character = False
            print(f"No player controls suggested character - next player {next_to_disprove} goes first")

        # Get the player names
        suggesting_player_name = current_player.name
        next_to_disprove_name = Player.query.get(next_to_disprove).name if Player.query.get(next_to_disprove) else "Unknown"

        # Broadcast the suggestion to all players
        emit('suggestion_made', {
            'player_id': player_id,
            'player_name': suggesting_player_name,
            'suspect': suspect,
            'weapon': weapon,
            'room': suggestion['room'],
            'player_positions': player_positions,
            'suggestion_idx': suggestion_idx,
            'next_to_disprove': next_to_disprove,
            'next_to_disprove_name': next_to_disprove_name,
            'is_suggested_character': is_suggested_character
        }, room=lobby_id)

    except ValueError as e:
        emit('error', {'message': str(e), 'code': 'SUGGESTION_ERROR'})


# Handle disproving a suggestion
@socketio.on('disprove_suggestion')
def handle_disprove(data):
    lobby_id = data['lobby_id']
    player_id = data['player_id']
    suggestion_idx = data['suggestion_idx']
    card_shown = data.get('card_shown')
    is_suggested_character = data.get('is_suggested_character', False)

    print(f"Disprove attempt by player {player_id}, is_suggested_character: {is_suggested_character}")

    lobby = Lobby.query.get(lobby_id)

    if lobby is None:
        emit('error', {'message': 'Lobby not found', 'code': 'LOBBY_NOT_FOUND'})
        return

    suggestions = json.loads(lobby.suggestions)

    if suggestion_idx >= len(suggestions):
        emit('error', {'message': 'Invalid suggestion index', 'code': 'INVALID_SUGGESTION'})
        return

    suggestion = suggestions[suggestion_idx]
    suggesting_player_id = suggestion['player_id']
    suspect = suggestion['suspect']

    if card_shown:
        # Player is showing a card
        try:
            updated_suggestion = lobby.check_suggestion(suggestion_idx, player_id, card_shown)

            # Get the player names for nicer display
            suggesting_player = Player.query.get(suggesting_player_id)
            disproving_player = Player.query.get(player_id)

            if not suggesting_player or not disproving_player:
                print(f"Warning: Could not find one of the players")

            # Notify ONLY the suggesting player about the card shown
            # The key here is to emit directly to the suggesting player's room
            print(f"Sending private card_shown to player {suggesting_player_id}")
            socketio.emit('card_shown', {
                'suggestion_idx': suggestion_idx,
                'shown_by': player_id,
                'shown_by_name': disproving_player.name,
                'card': card_shown
            }, room=suggesting_player_id)  # This sends to the private room we joined the player to

            # Notify everyone (including the suggester) that a card was shown (but not which one)
            emit('suggestion_disproved', {
                'suggestion_idx': suggestion_idx,
                'disproved_by': player_id,
                'disproved_by_name': disproving_player.name
            }, room=lobby_id)

            print(f"Player {player_id} showed card {card_shown} to player {suggesting_player_id}")

            # If a card was shown, move to the next player's turn immediately
            next_player = lobby.next_turn()
            db.session.commit()

            # Check if the next player is in a room (for suggestion capability)
            board = lobby.get_board()
            in_room = False
            current_location = None

            if board:
                player_location = board._find_player_on_board(next_player.id)
                if player_location and player_location["type"] == "room":
                    in_room = True
                    current_location = player_location["location"]

            valid_moves = lobby.show_available_moves(next_player.id)

            emit('turn_update', {
                'player_id': next_player.id,
                'player_name': next_player.name,
                'valid_moves': valid_moves,
                'in_room': in_room,
                'current_location': current_location
            }, room=lobby_id)

            # Return early to skip the next player check
            return

        except ValueError as e:
            emit('error', {'message': str(e), 'code': 'DISPROVE_ERROR'})
    else:
        # Player couldn't disprove - notify everyone
        disprover = Player.query.get(player_id)
        emit('cannot_disprove', {
            'player_id': player_id,
            'player_name': disprover.name if disprover else "Unknown",
            'suggestion_idx': suggestion_idx,
            'is_suggested_character': is_suggested_character
        }, room=lobby_id)

    # If we get here, the current player couldn't disprove
    # We need to find the next player to try
    next_player_to_try = None

    if is_suggested_character:
        print(f"Suggested character player {player_id} couldn't disprove, finding next player...")
        # If the suggested character couldn't disprove, go to normal turn order
        # starting with the player after the suggester
        current_turn_idx = lobby.current_turn_idx
        next_idx = (current_turn_idx + 1) % len(lobby.players)

        # Skip the suggester
        if lobby.players[next_idx].id == suggesting_player_id:
            next_idx = (next_idx + 1) % len(lobby.players)

        # Skip the suggested character player who just tried
        if lobby.players[next_idx].id == player_id:
            next_idx = (next_idx + 1) % len(lobby.players)

        next_player_to_try = lobby.players[next_idx]
        print(f"Next player to try: {next_player_to_try.name} (ID: {next_player_to_try.id})")
    else:
        # Find the player's position in the turn order
        player_idx = -1
        for idx, p in enumerate(lobby.players):
            if p.id == player_id:
                player_idx = idx
                break

        if player_idx != -1:
            # Go to the next player clockwise
            next_idx = (player_idx + 1) % len(lobby.players)

            # Skip back to the suggester if we've gone all the way around
            if next_idx == lobby.current_turn_idx or lobby.players[next_idx].id == suggesting_player_id:
                # We've gone full circle, end suggestion round
                next_player = lobby.next_turn()
                db.session.commit()

                # Check if next player is in a room
                board = lobby.get_board()
                in_room = False
                current_location = None

                if board:
                    player_location = board._find_player_on_board(next_player.id)
                    if player_location and player_location["type"] == "room":
                        in_room = True
                        current_location = player_location["location"]

                valid_moves = lobby.show_available_moves(next_player.id)

                emit('turn_update', {
                    'player_id': next_player.id,
                    'player_name': next_player.name,
                    'valid_moves': valid_moves,
                    'in_room': in_room,
                    'current_location': current_location
                }, room=lobby_id)
                return

            next_player_to_try = lobby.players[next_idx]

            # Skip the suggester if they're next
            if next_player_to_try.id == suggesting_player_id:
                next_idx = (next_idx + 1) % len(lobby.players)
                if next_idx == player_idx:  # Avoid infinite loop with 2 players
                    # End the suggestion round if we'd loop back to the current player
                    next_player = lobby.next_turn()
                    db.session.commit()

                    # Check if next player is in a room
                    board = lobby.get_board()
                    in_room = False
                    current_location = None

                    if board:
                        player_location = board._find_player_on_board(next_player.id)
                        if player_location and player_location["type"] == "room":
                            in_room = True
                            current_location = player_location["location"]

                    valid_moves = lobby.show_available_moves(next_player.id)

                    emit('turn_update', {
                        'player_id': next_player.id,
                        'player_name': next_player.name,
                        'valid_moves': valid_moves,
                        'in_room': in_room,
                        'current_location': current_location
                    }, room=lobby_id)
                    return

                next_player_to_try = lobby.players[next_idx]
        else:
            # Couldn't find player in the list - should never happen
            # End the suggestion round
            next_player = lobby.next_turn()
            db.session.commit()

            # Check if next player is in a room
            board = lobby.get_board()
            in_room = False
            current_location = None

            if board:
                player_location = board._find_player_on_board(next_player.id)
                if player_location and player_location["type"] == "room":
                    in_room = True
                    current_location = player_location["location"]

            valid_moves = lobby.show_available_moves(next_player.id)

            emit('turn_update', {
                'player_id': next_player.id,
                'player_name': next_player.name,
                'valid_moves': valid_moves,
                'in_room': in_room,
                'current_location': current_location
            }, room=lobby_id)
            return

    if next_player_to_try:
        # Send the suggestion to the next player to try to disprove
        emit('suggestion_made', {
            'player_id': suggesting_player_id,
            'player_name': Player.query.get(suggesting_player_id).name,
            'suspect': suggestion['suspect'],
            'weapon': suggestion['weapon'],
            'room': suggestion['room'],
            'suggestion_idx': suggestion_idx,
            'next_to_disprove': next_player_to_try.id,
            'is_suggested_character': False  # Not the suggested character player anymore
        }, room=lobby_id)
    else:
        # If for some reason we don't have a next player, end the suggestion round
        next_player = lobby.next_turn()
        db.session.commit()

        # Check if next player is in a room
        board = lobby.get_board()
        in_room = False
        current_location = None

        if board:
            player_location = board._find_player_on_board(next_player.id)
            if player_location and player_location["type"] == "room":
                in_room = True
                current_location = player_location["location"]

        valid_moves = lobby.show_available_moves(next_player.id)

        emit('turn_update', {
            'player_id': next_player.id,
            'player_name': next_player.name,
            'valid_moves': valid_moves,
            'in_room': in_room,
            'current_location': current_location
        }, room=lobby_id)


# Accusation event
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
            'solution': json.loads(lobby.solution)
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
                'solution': json.loads(lobby.solution)
            }, room=lobby_id)
        else:
            # Move to the next player
            next_player = lobby.next_turn()
            while next_player.eliminated:
                next_player = lobby.next_turn()

            valid_moves = lobby.show_available_moves(next_player.id)
            db.session.commit()

            emit('turn_update', {
                'player_id': next_player.id,
                'player_name': next_player.name,
                'valid_moves': valid_moves
            }, room=lobby_id)