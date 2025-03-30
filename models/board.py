import uuid
from extensions import db
import random
import string
import json

class Board(db.Model):
    __tablename__ = 'board'
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lobby_id = db.Column(db.String(36), db.ForeignKey('lobby.id'), nullable=False)
    hallways = db.Column(db.Text, nullable=False, default=json.dumps([]))
    rooms = db.Column(db.Text, nullable=False, default=json.dumps([]))
    secret_passages = db.Column(db.Text, nullable=False, default=json.dumps([]))


    def __init__(self, lobby_id):
        self.lobby_id = lobby_id

        # Hallways are the connections between rooms
        # Each hallway connects two rooms
        # Only one player can be in a hallway at a time 
        self.hallway = json.dumps({
                'study_hall': None,
                'hall_lounge': None,
                'library_billiard': None,
                'billiard_dining': None,
                'conservatory_ballroom': None,
                'ballroom_kitchen': None,
                'study_library': None,
                'hall_billiard': None,
                'lounge_dining': None,
                'library_conservatory': None,
                'billiard_ballroom': None,
                'dining_kitchen': None
            })
        # Hold the player_id in the room
        # The room can hold multiple players
        self.rooms = json.dumps({
            'kitchen': [],
            'ballroom': [],
            'conservatory': [],
            'dining_room': [],
            'lounge': [],
            'hall': [],
            'study': [],
            'library': [],
            'billiard_room': []
        })

        # Secret passages are the connections between rooms
        # Each secret passage connects two rooms
        #The hallway don't hold any players
        self.secret_passages = json.dumps({
                'study': 'kitchen',
                'lounge': 'conservatory',
                'conservatory': 'lounge',
                'kitchen': 'study'
            })  
        
    def get_id(self):
        return self.id

    # Get all the rooms in the board
    def get_rooms(self):
        # Load the rooms from JSON
        rooms = json.loads(self.rooms)
        return rooms
    
    # Get all the hallway in the board
    def get_hallway(self):
        # Load the hallway from JSON
        hallway = json.loads(self.hallway)
        return hallway
    
    # Get all the secret passages in the board
    def get_secret_passages(self):
        # Load the secret passages from JSON
        secret_passages = json.loads(self.secret_passages)
        return secret_passages
    
    def _get_adjacent_rooms_for_hallway(self, hallway):
        return hallway.split('_')


    def _get_adjacent_hallways_for_room(self, room):
        # Load the hallway from JSON
        hallways = json.loads(self.hallway)

        adjacent_hallways = []
        
        # Get the adjacent hallways for the given room
        for hallway in hallways:
            if room in hallway.split('_'):
                adjacent_hallways.append(hallway)
            
        return adjacent_hallways
    
    def _find_player_on_board(self, player_id):
        rooms = json.loads(self.rooms)
        hallways = json.loads(self.hallway)

        # 1) Check rooms (multiple occupants)
        for room_name, occupants in rooms.items():
            if player_id in occupants:
                return {'type': 'room', 'location': room_name}

        # 2) Check hallways (single occupant)
        for hallway_name, occupant in hallways.items():
            if occupant == player_id:
                return {'type': 'hallway', 'location': hallway_name}

        return None


    def _is_valid_move(self, player_id, destination):
        # Check if the destination is a valid room or hallway
        current_location = self._find_player_on_board(player_id)
        
        if current_location is None:
            return False
        
        current_type = current_location['type']
        current_location = current_location['location']

        # If the destination is a hallway, check if it's occupied 
        if self.hallway[destination]:
            return False
        
        # If the player is in a room, they can only move to adjacent hallways
        # Check if the destination is a room or hallway
        if current_type == 'room':
            adjacent_hallways = self._get_adjacent_hallways_for_room(current_location)
            return destination in adjacent_hallways
        # If the player is in a hallway, they can only move to adjacent rooms
        elif current_type == 'hallway':
            adjacent_rooms = self._get_adjacent_rooms_for_hallway(current_location)
            return destination in adjacent_rooms
        else:
            return False
            
    def _move_player(self, player_id, new_location):
        rooms = json.loads(self.rooms)
        hallways = json.loads(self.hallway)

        current_location = self._find_player_on_board(player_id)
        
        # Only remove the player if they're currently on the board
        if current_location:
            if current_location['type'] == 'room':
                rooms[current_location['location']].remove(player_id)
            elif current_location['type'] == 'hallway':
                hallways[current_location['location']] = None

        # Now add the player to the new location
        if new_location in rooms:
            rooms[new_location].append(player_id)
        elif new_location in hallways:
            hallways[new_location] = player_id
        else:
            raise ValueError(f"Invalid new location: {new_location}")

        # Save updates back to JSON
        self.rooms = json.dumps(rooms)
        self.hallway = json.dumps(hallways)
    