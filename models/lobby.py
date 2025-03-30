import uuid
from extensions import db
import random
import string
import json

from models import Board, Cards, Player


def generate_uuid():
    return str(uuid.uuid4())


def generate_lobby_id():
    return ''.join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Lobby(db.Model):
    id = db.Column(db.String(6), primary_key=True, default=generate_lobby_id)
    players = db.relationship('Player', backref='lobby', lazy=True)
    
    status = db.Column(db.String(10), default='waiting')
    host = db.Column(db.String(36), nullable=False)  # Adjusted length to match
    current_turn_idx = db.Column(db.Integer, default=0)
    
    board_id = db.Column(db.String(36), db.ForeignKey('board.id'), nullable=True)
    solution = db.Column(db.Text, nullable=True, default=json.dumps({}))

    characters = db.Column(db.Text, nullable=False, default=json.dumps([]))




    def __init__(self, host_id):
        self.id = generate_lobby_id()
        self.status = 'waiting'
        self.host = host_id
        self.current_turn_idx = 0
        self.board_id = None  # Initially no board is assigned
        
        self.characters = json.dumps({
            'Miss Scarlet': {'position': 'start', 'type': 'starter', 'selected': False},
            'Col. Mustard': {'position': 'start', 'type': 'starter', 'selected': False},
            'Mrs. White': {'position': 'start', 'type': 'starter', 'selected': False},
            'Mr. Green': {'position': 'start', 'type': 'starter', 'selected': False},
            'Mrs. Peacock': {'position': 'start', 'type': 'starter', 'selected': False},
            'Prof. Plum': {'position': 'start', 'type': 'starter', 'selected': False}
        })


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
        self.board_id = str(Board(self.id).id)

        # Initialize cards
        card_obj = Cards()

        self.solution = json.dumps(card_obj.get_solution())

        # deal cards to players
        player_cards = card_obj.deal_card_to_all_players(self.players)
        for player in self.players:
            player.cards = json.dumps(player_cards[player.id])
            player.is_ready = True
            db.session.commit()
    
        # Set the game status to 'in_progress'
        self.status = 'in_progress'
        db.session.commit()


    def get_board(self):
        """Get the board object associated with this lobby"""
        return Board.query.filter_by(id=self.board_id).first()
    

    def change_character(self, player_id, character_name):
        """Change the character of a player"""
        characters = json.loads(self.characters)

        if character_name in characters:
            for player in self.players:
                if player.id == player_id:
                    if player.character in characters:
                        characters[player.character]['selected'] = False
                    player.character = json.dumps(characters[character_name])
                    characters[character_name]['selected'] = True
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

        if player and board:
            location = board._find_player_location(player.id)

            if location.type == 'room':
                # Get adjacent hallways for the room
                adjacent_hallways = board._get_adjacent_hallways_for_room(location.location)
                return adjacent_hallways
            elif location.type == 'hallway':
                # Get adjacent rooms for the hallway
                adjacent_rooms = board._get_adjacent_rooms_for_hallway(location.location)
                return adjacent_rooms
            elif player.character.position == 'start':
                # If player is at start, limited to starting positions
                adjacency_map = {
                    'Miss Scarlet': 'hall_lounge',
                    'Col. Mustard': 'lounge_dining',
                    'Mrs. White': 'ballroom_kitchen',
                    'Mr. Green': 'conservatory_ballroom',
                    'Mrs. Peacock': 'library_conservatory',
                    'Prof. Plum': 'study_library'
                }
                if player.character.name in adjacency_map:
                    return [adjacency_map[player.character.name]]    

            
        return None

    def player_move(self, player_id, new_location):
        """Move a player to a new location."""
        board = self.get_board()
        if not board:
            return False

        player = Player.query.filter_by(id=player_id).first()
        if not player:
            return False

        # Check if it's a valid move or a valid accusation from 'start'
        valid_move = (
            board.is_valid_move(player.id, new_location)
            or (player.character.position == 'start' and board.is_valid_accusation(player.id, new_location))
        )

        if valid_move:
            player.character.position = new_location
            # Update the player's location on the board
            board.update_player_location(player.id, new_location)
            # Update the player's character position
            db.session.commit()
            return True

        # If neither condition is satisfied, it's invalid
        raise ValueError("Invalid move")


