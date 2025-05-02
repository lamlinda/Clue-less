import uuid
from extensions import db
import random
import string
import json


class Cards():
    suspect = []
    weapon = []
    room = []

    def __init__(self):
        self.suspect = [
            "Miss Scarlet",
            "Colonel Mustard",
            "Mrs. White",
            "Mr. Green",
            "Mrs. Peacock",
            "Professor Plum"
        ]

        self.weapon = [
            "Candlestick",
            "Dagger",
            "Lead Pipe",
            "Revolver",
            "Rope",
            "Wrench"
        ]

        self.room = [
            "Kitchen",
            "Ballroom",
            "Conservatory",
            "Dining Room",
            "Lounge",
            "Hall",
            "Study",
            "Library",
            "Billiard Room"
        ]
    
    def get_solution(self):

        # Randomly select one card from each category
        solution = {
            "suspect": random.choice(self.suspect),
            "weapon": random.choice(self.weapon),
            "room": random.choice(self.room)
        }

        #remove the selected cards from the lists
        self.suspect.remove(solution["suspect"])
        self.weapon.remove(solution["weapon"])
        self.room.remove(solution["room"])



        return json.dumps(solution)


    def deal_card_to_all_players(self, players):
        # Shuffle the remaining cards
        all_cards = self.suspect + self.weapon + self.room
        random.shuffle(all_cards)

        # Distribute cards to players
        player_cards = {player.id: [] for player in players}
        for i, card in enumerate(all_cards):
            player_cards[players[i % len(players)].id].append(card)

        return player_cards    
    
    