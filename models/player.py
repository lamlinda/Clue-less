import uuid
from extensions import db
import random
import string
import json


def generate_uuid():
    return str(uuid.uuid4())


def generate_lobby_id():
    return "".join(random.choices(string.ascii_uppercase + string.digits, k=6))


class Player(db.Model):
    id = db.Column(db.String(36), primary_key=True, default=generate_uuid)
    lobby_id = db.Column(db.String(36), db.ForeignKey("lobby.id"), nullable=True)
    name = db.Column(db.String(50), nullable=False)
    character = db.Column(db.String(256), nullable=True)  # Increased size for theme data
    cards = db.Column(db.Text, nullable=False, default=json.dumps([]))  # Player's cards
    eliminated = db.Column(
        db.Boolean, default=False
    )  # If player made incorrect accusation
    is_ready = db.Column(db.Boolean, default=False)  # Ready to start game

    def __init__(self, name, lobby_id=None):
        self.id = generate_uuid()
        self.name = name
        self.lobby_id = lobby_id
        self.character = None
        self.eliminated = False
        self.cards = json.dumps([])
        self.is_ready = False

    def __repr__(self):
        return f"Player('{self.id}', '{self.name}')"

    def _get_player_state(self):
        return {
            "id": self.id,
            "name": self.name,
            "character": json.loads(self.character) if self.character else None,
            "cards": json.loads(self.cards),
            "eliminated": self.eliminated,
            "is_ready": self.is_ready
        }