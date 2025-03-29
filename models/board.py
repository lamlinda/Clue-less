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

        # Hallways between rooms that can holder player 
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


        self.secret_passages = json.dumps({
                'study': 'kitchen',
                'lounge': 'conservatory',
                'conservatory': 'lounge',
                'kitchen': 'study'
            })  
        
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
        # Load the rooms from JSON
        rooms = json.loads(self.rooms)

        for room, players in rooms.items():
            if player_id in players:
                return {"location" :room, "type" : "room"}
            
        # If player not found in any room, check hallways
        hallways = json.loads(self.hallway)
        for hallway, player in hallways.items():
            if player == player_id:
                return {"location" : hallway, "type" : "hallway"}
            
        return None