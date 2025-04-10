import uuid
from extensions import db
import random
import string
import json

from .player import Player


class Board(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=lambda: str(uuid.uuid4()))
    lobby_id = db.Column(db.String(36), db.ForeignKey("lobby.id"), nullable=False)
    hallways = db.Column(db.Text, nullable=False, default=json.dumps([]))
    rooms = db.Column(db.Text, nullable=False, default=json.dumps([]))
    secret_passages = db.Column(db.Text, nullable=False, default=json.dumps([]))

    def __init__(self, lobby_id):
        self.lobby_id = lobby_id

        # Hallways are the connections between rooms
        # Each hallway connects two rooms
        # Only one player can be in a hallway at a time
        self.hallways = json.dumps(
            {
                "study_hall": None,
                "hall_lounge": None,
                "library_billiard": None,
                "billiard_dining": None,
                "conservatory_ballroom": None,
                "ballroom_kitchen": None,
                "study_library": None,
                "hall_billiard": None,
                "lounge_dining": None,
                "library_conservatory": None,
                "billiard_ballroom": None,
                "dining_kitchen": None,
            }
        )
        # Hold the player_id in the room
        # The room can hold multiple players
        self.rooms = json.dumps(
            {
                "kitchen": [],
                "ballroom": [],
                "conservatory": [],
                "dining_room": [],
                "lounge": [],
                "hall": [],
                "study": [],
                "library": [],
                "billiard": [],
            }
        )

        # Secret passages are the connections between rooms
        # Each secret passage connects two rooms
        # The hallway don't hold any players
        self.secret_passages = json.dumps(
            {
                "study": "kitchen",
                "lounge": "conservatory",
                "conservatory": "lounge",
                "kitchen": "study",
            }
        )

    def get_id(self):
        return self.id

    # Get all the rooms in the board
    def get_rooms(self):
        # Load the rooms from JSON
        rooms = json.loads(self.rooms)
        return rooms

    # Get all the hallway in the board
    def get_hallways(self):
        # Load the hallway from JSON
        hallway = json.loads(self.hallways)
        return hallway

    # Get all the secret passages in the board
    def get_valid_secret_passages(self, room):
        # Load the secret passages from JSON
        secret_passages = json.loads(self.secret_passages)

        return secret_passages.get(room)

    def _get_adjacent_rooms_for_hallway(self, hallway):
        return hallway.split("_")

    def _get_adjacent_hallways_for_room(self, room):
        # Load the hallway from JSON
        hallways = json.loads(self.hallways)

        adjacent_hallways = []

        # Get the adjacent hallways for the given room
        for hallway in hallways:
            if room in hallway.split("_"):
                adjacent_hallways.append(hallway)

        return adjacent_hallways

    def _find_player_on_board(self, player_id):
        rooms = json.loads(self.rooms)
        hallways = json.loads(self.hallways)

        # 1) Check rooms (multiple occupants)
        for room_name, occupants in rooms.items():
            if player_id in occupants:
                return {"type": "room", "location": room_name}

        # 2) Check hallways (single occupant)
        for hallway_name, occupant in hallways.items():
            if occupant == player_id:
                return {"type": "hallway", "location": hallway_name}

        return None

    def _is_valid_move(self, player_id, destination):
        # Fetch the player and state
        player_state = Player.query.filter_by(id=player_id).first()._get_player_state()
        hallways = json.loads(self.hallways)

        if not player_state:
            return {"result": False, "message": "Player not found"}

        current_position = player_state["character"]["position"]
        current_location = self._find_player_on_board(player_id)

        # 1. Player is not yet on the board (current_location is None)
        #    - If player is at "start", allow move only if the hallway is unoccupied.

        if current_position == "start":
            # If destination is a hallway, check if it's unoccupied
            if destination in hallways and hallways[destination] is None:
                return {"result": True, "type": "hallway"}
            else:
                return {"result": False, "message": "Invalid move"}
        # 2. If destination hallway is occupied, deny
        if destination in hallways and hallways[destination] is not None:
            return {"result": False, "message": "Destination hallway is occupied"}


        # 3. Depending on location type (room or hallway), check valid adjacency
        location_type = current_location["type"]
        location_name = current_location["location"]

        # If in a room, must move to an adjacent hallway or through secret passage
        if location_type == "room":
            if destination in self._get_adjacent_hallways_for_room(location_name):
                return {
                    "result": destination in self._get_adjacent_hallways_for_room(location_name),
                    "type": "hallway",
                }
            elif destination == self.get_valid_secret_passages(location_name):
                return {
                    "result": destination == self.get_valid_secret_passages(location_name),
                    "type": "room",
                    "via_secret_passage": True,
                }

        # If in a hallway, must move to an adjacent room
        if location_type == "hallway":
            return {
                "result": destination in self._get_adjacent_rooms_for_hallway(location_name),
                "type": "room",
            }

        # Otherwise, not valid
        return {"result": False, "message": "Move is not valid"}


    def _move_player(self, player_id, new_location):
        rooms = json.loads(self.rooms)
        hallways = json.loads(self.hallways)

        current_location = self._find_player_on_board(player_id)

        # Only remove the player if they're currently on the board
        if current_location:
            if current_location["type"] == "room":
                rooms[current_location["location"]].remove(player_id)
            elif current_location["type"] == "hallway":
                hallways[current_location["location"]] = None

        # Now add the player to the new location
        if new_location in rooms:
            rooms[new_location].append(player_id)
        elif new_location in hallways:
            hallways[new_location] = player_id
        else:
            raise ValueError(f"Invalid new location: {new_location}")

        # Save updates back to JSON
        self.rooms = json.dumps(rooms)
        self.hallways = json.dumps(hallways)
