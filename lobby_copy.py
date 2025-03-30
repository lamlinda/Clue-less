import uuid
from extensions import db
import random
import string
import json
from models import Board


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
    game_state = db.Column(db.Text, default='{}')  # JSON string to store game state (cards, solution)

    def __init__(self, host_id):
        self.id = generate_lobby_id()
        self.status = 'waiting'
        self.host = host_id
        self.current_turn_idx = 0
        self.board_id = None  # Initially no board is assigned


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
        board = Board(self.id)
        db.session.add(board)

        # Setup cards and solution
        game_state = self.initialize_cards()


    # def initialize_board(self):
    #     """Initialize the game board with starting positions for each character"""
    #     # Define the characters and their starting positions
        # characters = {
        #     'Miss Scarlet': {'position': 'scarlet_start', 'type': 'starter'},
        #     'Colonel Mustard': {'position': 'mustard_start', 'type': 'starter'},
        #     'Mrs. White': {'position': 'white_start', 'type': 'starter'},
        #     'Mr. Green': {'position': 'green_start', 'type': 'starter'},
        #     'Mrs. Peacock': {'position': 'peacock_start', 'type': 'starter'},
        #     'Professor Plum': {'position': 'plum_start', 'type': 'starter'}
        # }

    #     # Assign characters to players
    #     available_characters = list(characters.keys())
    #     random.shuffle(available_characters)

    #     board_state = {
    #         'players': {},
    #         'hallways': {
    #             'study_hall': None,
    #             'hall_lounge': None,
    #             'library_billiard': None,
    #             'billiard_dining': None,
    #             'conservatory_ballroom': None,
    #             'ballroom_kitchen': None,
    #             'study_library': None,
    #             'hall_billiard': None,
    #             'lounge_dining': None,
    #             'library_conservatory': None,
    #             'billiard_ballroom': None,
    #             'dining_kitchen': None
    #         },
    #         'rooms': {
    #             'study': [],
    #             'hall': [],
    #             'lounge': [],
    #             'library': [],
    #             'billiard': [],
    #             'dining': [],
    #             'conservatory': [],
    #             'ballroom': [],
    #             'kitchen': []
    #         },
    #         'secret_passages': {
    #             'study': 'kitchen',
    #             'lounge': 'conservatory',
    #             'conservatory': 'lounge',
    #             'kitchen': 'study'
    #         }
    #     }

    #     # Assign characters to players
    #     for i, player in enumerate(self.players):
    #         if i < len(available_characters):
    #             character = available_characters[i]
    #             player.character = character

    #             # Save player info in board state
    #             board_state['players'][player.id] = {
    #                 'name': player.name,
    #                 'character': character,
    #                 'position': characters[character]['position'],
    #                 'position_type': 'starter',
    #                 'first_move': True
    #             }

    #     # Save the board state
    #     self.board_state = json.dumps(board_state)
    #     db.session.commit()

    #     return board_state

    # def initialize_cards(self):
    #     """Initialize the cards and solution for the game"""
    #     # Define all cards
    #     suspects = ['Miss Scarlet', 'Colonel Mustard', 'Mrs. White', 'Mr. Green', 'Mrs. Peacock', 'Professor Plum']
    #     weapons = ['Candlestick', 'Knife', 'Lead Pipe', 'Revolver', 'Rope', 'Wrench']
    #     rooms = ['Study', 'Hall', 'Lounge', 'Library', 'Billiard Room', 'Dining Room', 'Conservatory', 'Ballroom',
    #              'Kitchen']

    #     # Randomly select solution cards
    #     solution_suspect = random.choice(suspects)
    #     solution_weapon = random.choice(weapons)
    #     solution_room = random.choice(rooms)

    #     # Remove solution cards from the decks
    #     suspects.remove(solution_suspect)
    #     weapons.remove(solution_weapon)
    #     rooms.remove(solution_room)

    #     # Combine all remaining cards and shuffle
    #     all_cards = suspects + weapons + rooms
    #     random.shuffle(all_cards)

    #     # Deal cards to players
    #     game_state = {
    #         'solution': {
    #             'suspect': solution_suspect,
    #             'weapon': solution_weapon,
    #             'room': solution_room
    #         },
    #         'player_cards': {},
    #         'suggestions': [],
    #         'accusations': []
    #     }

    #     # Deal cards as evenly as possible
    #     num_players = len(self.players)
    #     cards_per_player = len(all_cards) // num_players
    #     remainder = len(all_cards) % num_players

    #     card_index = 0
    #     for i, player in enumerate(self.players):
    #         # Calculate how many cards this player gets
    #         player_card_count = cards_per_player
    #         if i < remainder:
    #             player_card_count += 1

    #         # Assign cards to player
    #         game_state['player_cards'][player.id] = all_cards[card_index:card_index + player_card_count]
    #         card_index += player_card_count

    #     # Save the game state
    #     self.game_state = json.dumps(game_state)
    #     db.session.commit()

    #     return game_state

    def get_board_state(self):
        """Get the current board state"""
        return json.loads(self.board_state)

    def update_board_state(self, new_state):
        """Update the board state"""
        self.board_state = json.dumps(new_state)
        db.session.commit()

    def get_game_state(self):
        """Get the current game state"""
        return json.loads(self.game_state)

    def update_game_state(self, new_state):
        """Update the game state"""
        self.game_state = json.dumps(new_state)
        db.session.commit()

    def get_valid_moves(self, player_id):
        """Get valid moves for a player based on their current position"""
        board_state = self.get_board_state()
        player_data = board_state['players'].get(player_id)

        if not player_data:
            return []

        position = player_data['position']
        position_type = player_data['position_type']
        valid_moves = []

        # If player is in a starter position, they must move to the adjacent hallway
        if position_type == 'starter':
            adjacent_hallway = self._get_adjacent_hallway_for_starter(position)
            if adjacent_hallway and not board_state['hallways'][adjacent_hallway]:
                valid_moves.append({
                    'position': adjacent_hallway,
                    'type': 'hallway',
                    'can_suggest': False
                })

        # If player is in a hallway, they must move to one of the two adjacent rooms
        elif position_type == 'hallway':
            adjacent_rooms = self._get_adjacent_rooms_for_hallway(position)
            for room in adjacent_rooms:
                valid_moves.append({
                    'position': room,
                    'type': 'room',
                    'can_suggest': True
                })

        # If player is in a room, they can move to an unblocked hallway or take a secret passage
        elif position_type == 'room':
            # Check for secret passage
            if position in board_state['secret_passages']:
                destination_room = board_state['secret_passages'][position]
                valid_moves.append({
                    'position': destination_room,
                    'type': 'room',
                    'can_suggest': True,
                    'via_secret_passage': True
                })

            # Check for unblocked hallways
            adjacent_hallways = self._get_adjacent_hallways_for_room(position)
            for hallway in adjacent_hallways:
                if not board_state['hallways'][hallway]:
                    valid_moves.append({
                        'position': hallway,
                        'type': 'hallway',
                        'can_suggest': False
                    })

            # If player was moved to this room by a suggestion, they can stay and make a suggestion
            if player_data.get('moved_by_suggestion'):
                valid_moves.append({
                    'position': position,
                    'type': 'room',
                    'can_suggest': True,
                    'stay_in_room': True
                })

        return valid_moves

    def make_suggestion(self, player_id, suspect, weapon):
        """Make a suggestion by a player"""
        board_state = self.get_board_state()
        game_state = self.get_game_state()

        # Get the current player
        player_data = board_state['players'].get(player_id)
        if not player_data:
            raise ValueError("Player not found")

        # Get the current room
        room = player_data['position']
        if player_data['position_type'] != 'room':
            raise ValueError("You must be in a room to make a suggestion")

        # Format the room name for the suggestion
        room_name = room.capitalize() + (
            " Room" if room != "hall" and room != "lounge" and room != "study" and room != "kitchen" else "")

        # Move the suggested suspect to the room
        moved_player_id = None
        for pid, p_data in board_state['players'].items():
            if p_data['character'] == suspect:
                # Remember old position
                old_position = p_data['position']
                old_position_type = p_data['position_type']

                # If they were in a hallway, clear it
                if old_position_type == 'hallway':
                    board_state['hallways'][old_position] = None

                # Move to the room
                p_data['position'] = room
                p_data['position_type'] = 'room'
                p_data['moved_by_suggestion'] = True

                moved_player_id = pid
                break

        # Create suggestion record
        suggestion = {
            'player_id': player_id,
            'room': room_name,
            'suspect': suspect,
            'weapon': weapon,
            'disproved': False,
            'disproved_by': None,
            'disproved_with': None
        }

        # Add to suggestions list
        game_state['suggestions'].append(suggestion)

        # Update states
        self.update_board_state(board_state)
        self.update_game_state(game_state)

        return suggestion, moved_player_id

    def check_suggestion(self, suggestion_index, showing_player_id, card_shown):
        """Record a suggestion being disproved"""
        game_state = self.get_game_state()

        if suggestion_index >= len(game_state['suggestions']):
            raise ValueError("Invalid suggestion index")

        # Update the suggestion record
        game_state['suggestions'][suggestion_index]['disproved'] = True
        game_state['suggestions'][suggestion_index]['disproved_by'] = showing_player_id
        game_state['suggestions'][suggestion_index]['disproved_with'] = card_shown

        self.update_game_state(game_state)

        return game_state['suggestions'][suggestion_index]

    def make_accusation(self, player_id, suspect, weapon, room):
        """Make an accusation by a player"""
        game_state = self.get_game_state()

        # Get solution
        solution = game_state['solution']

        # Check if accusation is correct
        is_correct = (
                solution['suspect'] == suspect and
                solution['weapon'] == weapon and
                solution['room'] == room
        )

        # Record the accusation
        accusation = {
            'player_id': player_id,
            'suspect': suspect,
            'weapon': weapon,
            'room': room,
            'is_correct': is_correct
        }

        game_state['accusations'].append(accusation)
        self.update_game_state(game_state)

        return accusation

    def _get_adjacent_hallway_for_starter(self, starter_position):
        """Get the adjacent hallway for a starter position"""
        adjacency_map = {
            'scarlet_start': 'hall_lounge',
            'mustard_start': 'lounge_dining',
            'white_start': 'ballroom_kitchen',
            'green_start': 'conservatory_ballroom',
            'peacock_start': 'library_conservatory',
            'plum_start': 'study_library'
        }
        return adjacency_map.get(starter_position)

    def _get_adjacent_rooms_for_hallway(self, hallway):
        """Get the adjacent rooms for a hallway"""
        # Extract room names from hallway ID (format: room1_room2)
        return hallway.split('_')

    def _get_adjacent_hallways_for_room(self, room):
        """Get the adjacent hallways for a room"""
        hallways = []
        for hallway in self.get_board_state()['hallways']:
            if room in hallway.split('_'):
                hallways.append(hallway)
        return hallways

    def __repr__(self):
        return f"Lobby('{self.id}', '{self.status}')"
