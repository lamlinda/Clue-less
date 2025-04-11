import uuid
from extensions import db
import random
import string
import json
import datetime

from .board import Board
from .player import Player
from .card import Cards


def generate_uuid():
    return str(uuid.uuid4())


def generate_lobby_id():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Lobby(db.Model):
    id = db.Column(db.String(6), primary_key=True, default=generate_lobby_id)
    players = db.relationship("Player", backref="lobby", lazy=True)

    status = db.Column(db.String(10), default="waiting")
    host = db.Column(db.String(36), nullable=False)  # Adjusted length to match
    current_turn_idx = db.Column(db.Integer, default=0)

    board_id = db.Column(db.String(36), db.ForeignKey("board.id"), nullable=True)
    solution = db.Column(db.Text, nullable=True, default=json.dumps({}))

    characters = db.Column(db.Text, nullable=False, default=json.dumps([]))

    suggestions = db.Column(db.Text, nullable=True, default=json.dumps([]))

    def __init__(self, host_id):
        self.id = generate_lobby_id()
        self.status = "waiting"
        self.host = host_id
        self.current_turn_idx = 0
        self.board_id = None  # Initially no board is assigned
        self.suggestions = json.dumps([])

        self.characters = json.dumps(
            {
                "Miss Scarlet": {
                    "name": "Miss Scarlet",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
                "Col. Mustard": {
                    "name": "Col. Mustard",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
                "Mrs. White": {
                    "name": "Mrs. White",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
                "Mr. Green": {
                    "name": "Mr. Green",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
                "Mrs. Peacock": {
                    "name": "Mrs. Peacock",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
                "Prof. Plum": {
                    "name": "Prof. Plum",
                    "position": "start",
                    "type": "starter",
                    "selected": False,
                },
            }
        )

    def next_turn(self):
        if self.players:
            self.current_turn_idx = (self.current_turn_idx + 1) % len(self.players)
            return self.players[self.current_turn_idx]
        return None

    def randomize_turn_order(self):
        random.shuffle(self.players)
        self.current_turn_idx = 0

    def initialize_game(self):
        """Initialize the game state with cards and board"""
        # Initialize board

        self.randomize_turn_order()

        board_obj = Board(self.id)

        db.session.add(board_obj)
        db.session.commit()

        self.board_id = board_obj.id

        # Initialize cards
        card_obj = Cards()

        self.solution = card_obj.get_solution()

        # deal cards to players
        player_cards = card_obj.deal_card_to_all_players(self.players)
        for player in self.players:
            player.cards = json.dumps(player_cards[player.id])
            player.is_ready = True
            db.session.commit()

        # Randomize the characters for the players
        self.random_character()

        # Set the game status to 'in_progress'
        self.status = "in_progress"
        db.session.commit()

    def get_board(self):
        """Get the board object associated with this lobby"""
        return Board.query.filter_by(id=self.board_id).first()

    def getAllPlayers_state(self):
        """Get the state of all players in the lobby"""
        return [player._get_player_state() for player in self.players]

    def change_character(self, player_id, character_name):
        """Change the character of a player"""
        characters = self.characters

        if character_name in characters:
            for player in self.players:
                if player.id == player_id:
                    if player.character in characters:
                        characters[player.character]["selected"] = False
                    player.character = json.dumps(characters[character_name])
                    characters[character_name]["selected"] = True
                    break
        else:
            raise ValueError("Character not found in lobby")

        self.characters = json.dumps(characters)
        db.session.commit()
        return characters

    def show_available_moves(self, player_id):
        """Show available moves for a player"""
        board = self.get_board()
        player = Player.query.filter_by(id=player_id).first()
        player = player._get_player_state() if player else None
        print(player)  # For debugging

        if player and board:
            location = board._find_player_on_board(player["id"])
            print(location)  # For debugging

            # If _find_player_on_board returns None, assume "start" or unplaced
            if location is None:
                # Check if they are indeed at the start
                if player["character"]["position"] == "start":
                    adjacency_map = {
                        "Miss Scarlet": "hall_lounge",
                        "Col. Mustard": "lounge_dining",
                        "Mrs. White": "ballroom_kitchen",
                        "Mr. Green": "conservatory_ballroom",
                        "Mrs. Peacock": "library_conservatory",
                        "Prof. Plum": "study_library",
                    }
                    if player["character"]["name"] in adjacency_map:
                        return [adjacency_map[player["character"]["name"]]]
                # If not at start, return None or handle differently
                return None

            # If location is not None, then they're on the board
            if location["type"] == "room":
                # Get adjacent hallways for the room
                adjacent_hallways = board._get_adjacent_hallways_for_room(
                    location["location"]
                )
                return adjacent_hallways

            elif location["type"] == "hallway":
                # Get adjacent rooms for the hallway
                adjacent_rooms = board._get_adjacent_rooms_for_hallway(
                    location["location"]
                )
                return adjacent_rooms

        return None

    def player_move(self, player_id, new_location):
        """Move a player to a new location."""
        board = self.get_board()
        if not board:
            return False

        player_obj = Player.query.filter_by(id=player_id).first()
        player = player_obj._get_player_state() if player_obj else None

        print(player)  # For debugging
        if not player:
            return False

        # Check if it's a valid move or a valid accusation from 'start'
        valid_move = board._is_valid_move(player["id"], new_location)

        print("valid_move", valid_move)  # For debugging

        if valid_move["result"]:
            player["character"]["position"] = new_location
            player["character"]["type"] = valid_move["type"]
            # Update the player's character position in the database
            player_obj.character = json.dumps(player["character"])
            # Update the player's location on the board
            board._move_player(player["id"], new_location)
            # Update the player's character position
            db.session.commit()
            return True

        # If neither condition is satisfied, it's invalid
        raise ValueError("Invalid move")

    def make_suggestion(self, player_id, suspect, weapon):
        """Make a suggestion about the culprit and weapon."""
        # Verify it's the player's turn
        current_player = self.players[self.current_turn_idx]
        if current_player.id != player_id:
            raise ValueError("Not your turn")

        # Get the player's current location (room)
        player = Player.query.filter_by(id=player_id).first()
        player_state = player._get_player_state()

        board = self.get_board()
        location = board._find_player_on_board(player_id)

        if not location or location["type"] != "room":
            raise ValueError("You must be in a room to make a suggestion")

        # Get the location as stored in the board
        board_room = location["location"]

        # Map from board room name to card room name
        room_name_map = {
            "kitchen": "Kitchen",
            "ballroom": "Ballroom",
            "conservatory": "Conservatory",
            "dining_room": "Dining Room",
            "lounge": "Lounge",
            "hall": "Hall",
            "study": "Study",
            "library": "Library",
            "billiard_room": "Billiard Room"
        }

        # Convert the board room name to the card room name
        room = room_name_map.get(board_room, board_room.capitalize())

        # Create the suggestion object
        suggestion = {
            "player_id": player_id,
            "suspect": suspect,
            "weapon": weapon,
            "room": room,  # Now using the properly formatted room name
            "disproved_by": None,
            "card_shown": None,
            "timestamp": str(datetime.datetime.now())
        }

        # Add the suggestion to the lobby's suggestion history
        try:
            suggestions = json.loads(self.suggestions)
            if not isinstance(suggestions, list):
                suggestions = []  # Reset if not a list
        except (ValueError, TypeError):
            suggestions = []  # Handle case where it's not valid JSON or is None

        suggestions.append(suggestion)
        self.suggestions = json.dumps(suggestions)

        # Move the suspect character to the room
        # First find which player has that character
        suspect_player_id = None
        for p in self.players:
            p_character = json.loads(p.character) if p.character else {}
            if isinstance(p_character, dict) and p_character.get("name") == suspect:
                suspect_player_id = p.id
                break

        # If the character is controlled by a player, move them
        if suspect_player_id:
            # Move the suspect to the room
            try:
                # Get their current position for the return value
                suspect_player = Player.query.filter_by(id=suspect_player_id).first()
                old_position = json.loads(suspect_player.character).get("position", None)

                # Move them regardless of normal move rules (teleport)
                board._move_player(suspect_player_id, board_room)  # Use board_room (location name) here

                # Update their character position
                suspect_character = json.loads(suspect_player.character)
                suspect_character["position"] = board_room  # Use board_room (location name) here
                suspect_character["type"] = "room"
                suspect_player.character = json.dumps(suspect_character)

                db.session.commit()

                # Return the suggestion data and moved player info
                return suggestion, suspect_player_id
            except Exception as e:
                print(f"Error moving suspect: {e}")
                # Continue even if moving the suspect fails
                pass

        db.session.commit()
        return suggestion, None

    def check_suggestion(self, suggestion_idx, player_id, card_shown):
        """Process a player's response to a suggestion."""
        suggestions = json.loads(self.suggestions)

        if suggestion_idx >= len(suggestions):
            raise ValueError("Invalid suggestion index")

        suggestion = suggestions[suggestion_idx]

        # Verify the card is valid to show (player must have it)
        player = Player.query.filter_by(id=player_id).first()
        if not player:
            raise ValueError("Player not found")

        player_cards = json.loads(player.cards)

        print(f"Player {player.name} cards: {player_cards}")
        print(f"Card to show: {card_shown}")

        if card_shown not in player_cards:
            raise ValueError("You don't have this card")

        # Verify the card matches the suggestion
        if (card_shown != suggestion["suspect"] and
                card_shown != suggestion["weapon"] and
                card_shown != suggestion["room"]):
            raise ValueError("Card does not match any part of the suggestion")

        # Update the suggestion
        suggestion["disproved_by"] = player_id
        # We don't store the actual card shown in the shared record
        # to keep it private between suggester and disprover
        suggestion["card_shown"] = True

        suggestions[suggestion_idx] = suggestion
        self.suggestions = json.dumps(suggestions)

        db.session.commit()
        return suggestion

    def make_accusation(self, player_id, suspect, weapon, room):
        """Make a final accusation."""
        # Verify it's the player's turn
        current_player = self.players[self.current_turn_idx]
        if current_player.id != player_id:
            raise ValueError("Not your turn")

        # Get the solution
        solution = json.loads(self.solution)

        # Check if the accusation is correct
        is_correct = (
                suspect == solution["suspect"] and
                weapon == solution["weapon"] and
                room == solution["room"]
        )

        # Create the accusation record
        accusation = {
            "player_id": player_id,
            "suspect": suspect,
            "weapon": weapon,
            "room": room,
            "is_correct": is_correct,
            "timestamp": str(datetime.datetime.now())
        }

        # If the accusation is incorrect, mark the player as eliminated
        if not is_correct:
            player = Player.query.filter_by(id=player_id).first()
            player.eliminated = True
            db.session.commit()

        return accusation

    def get_game_state(self):
        """Get the current game state for a player."""
        board = self.get_board()

        # Get the room and hallway occupancy
        rooms = {}
        hallways = {}

        if board:
            rooms = json.loads(board.rooms)
            hallways = json.loads(board.hallways)

        # Get player cards
        player_cards = {}
        for player in self.players:
            player_cards[player.id] = json.loads(player.cards)

        # Return the full game state
        return {
            "status": self.status,
            "current_turn_idx": self.current_turn_idx,
            "current_player_id": self.players[self.current_turn_idx].id if self.players else None,
            "solution": json.loads(self.solution),
            "suggestions": json.loads(self.suggestions),
            "player_cards": player_cards,
            "rooms": rooms,
            "hallways": hallways
        }

    def random_character(self):
        """Randomize the characters for the players."""
        characters = json.loads(self.characters)
        available_characters = [
            name for name, details in characters.items() if not details["selected"]
        ]

        if len(available_characters) < len(self.players):
            raise ValueError("Not enough characters available for all players.")

        for player in self.players:
            random_character = random.choice(available_characters)
            available_characters.remove(random_character)
            characters[random_character]["selected"] = True
            player.character = json.dumps(characters[random_character])

        self.characters = json.dumps(characters)
        db.session.commit()
        return characters