import uuid
from extensions import db
import random
import string
import json


class Cards():
    suspect = []
    weapon = []
    room = []

    # Theme data for card generation
    THEME_DATA = {
        "classic": {
            "suspects": [
                "Miss Scarlet",
                "Colonel Mustard",
                "Mrs. White",
                "Mr. Green",
                "Mrs. Peacock",
                "Professor Plum"
            ],
            "weapons": [
                "Candlestick",
                "Knife",
                "Lead Pipe",
                "Revolver",
                "Rope",
                "Wrench"
            ],
            "rooms": [
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
        },
        "scifi": {
            "suspects": [
                "Commander Nova",
                "Engineer Orion",
                "Doctor Stellar",
                "Security Chief Comet",
                "Science Officer Luna",
                "Ambassador Nebula"
            ],
            "weapons": [
                "Laser Cutter",
                "Toxic Syringe",
                "Plasma Wrench",
                "Gravity Gun",
                "Oxygen Deprivation",
                "Nanobots"
            ],
            "rooms": [
                "Bridge",
                "Engine Room",
                "Med Bay",
                "Mess Hall",
                "Observation Deck",
                "Cargo Bay",
                "Captain's Quarters",
                "Research Lab",
                "Airlock"
            ]
        },
        "fantasy": {
            "suspects": [
                "Elven Ranger",
                "Dwarven Smith",
                "Court Wizard",
                "Knight Champion",
                "Noble Princess",
                "Royal Bard"
            ],
            "weapons": [
                "Poisoned Goblet",
                "Enchanted Dagger",
                "Dragon's Tooth",
                "Cursed Amulet",
                "Ancient Tome",
                "Ceremonial Sword"
            ],
            "rooms": [
                "Great Hall",
                "Wizard's Tower",
                "Royal Chambers",
                "Armory",
                "Treasury",
                "Dungeon",
                "Throne Room",
                "Enchanted Garden",
                "Alchemist's Lab"
            ]
        },
        "western": {
            "suspects": [
                "Sheriff Steele",
                "Saloon Singer",
                "Town Doctor",
                "Railroad Baron",
                "School Marm",
                "Native Scout"
            ],
            "weapons": [
                "Six-shooter",
                "Lasso",
                "Poisoned Whiskey",
                "Dynamite",
                "Branding Iron",
                "Hunting Knife"
            ],
            "rooms": [
                "Saloon",
                "Sheriff's Office",
                "Bank",
                "General Store",
                "Train Station",
                "Church",
                "Hotel Room",
                "Stables",
                "Mining Office"
            ]
        },
        "noir": {
            "suspects": [
                "Private Eye",
                "Femme Fatale",
                "Corrupt Officer",
                "Nightclub Owner",
                "Wealthy Socialite",
                "Veteran Reporter"
            ],
            "weapons": [
                "Tommy Gun",
                "Poison Cocktail",
                "Piano Wire",
                "Blackjack",
                "Switchblade",
                "Silenced Pistol"
            ],
            "rooms": [
                "Detective's Office",
                "Jazz Club",
                "Back Alley",
                "Hotel Suite",
                "City Hall",
                "Police Station",
                "Warehouse",
                "Upscale Bar",
                "Train Terminal"
            ]
        },
        "medieval": {
            "suspects": [
                "King's Champion",
                "Court Jester",
                "Royal Physician",
                "Foreign Ambassador",
                "High Priestess",
                "Master of Coin"
            ],
            "weapons": [
                "Ornate Dagger",
                "Poisoned Wine",
                "Crossbow",
                "Iron Mace",
                "Garrote",
                "Herbal Toxin"
            ],
            "rooms": [
                "Royal Bedchamber",
                "Feast Hall",
                "Chapel",
                "Courtyard",
                "Alchemy Tower",
                "Stables",
                "Council Chamber",
                "Guardhouse",
                "Secret Passage"
            ]
        },
        "tropical": {
            "suspects": [
                "Resort Owner",
                "Famous Actor",
                "Island Chef",
                "Diving Instructor",
                "Wealthy Heiress",
                "Mysterious Stranger"
            ],
            "weapons": [
                "Coconut",
                "Dive Knife",
                "Poisoned Cocktail",
                "Harpoon",
                "Fishing Line",
                "Shark Tooth"
            ],
            "rooms": [
                "Beach Cabana",
                "Tiki Bar",
                "Luxury Suite",
                "Spa Room",
                "Restaurant",
                "Pool Area",
                "Gift Shop",
                "Boat Dock",
                "Jungle Trail"
            ]
        },
        "campus": {
            "suspects": [
                "History Professor",
                "Star Athlete",
                "Computer Genius",
                "Drama Student",
                "Exchange Scholar",
                "Campus Security"
            ],
            "weapons": [
                "Lab Equipment",
                "Trophy",
                "Textbook",
                "USB Drive",
                "Letter Opener",
                "Graduation Tassel"
            ],
            "rooms": [
                "Lecture Hall",
                "Student Union",
                "Library Stacks",
                "Laboratory",
                "Dormitory",
                "Admin Office",
                "Gymnasium",
                "Cafeteria",
                "Campus Quad"
            ]
        }
    }

    def __init__(self, theme="classic"):
        # Set cards based on the selected theme
        theme_data = self.THEME_DATA.get(theme, self.THEME_DATA["classic"])

        self.suspect = theme_data["suspects"].copy()
        self.weapon = theme_data["weapons"].copy()
        self.room = theme_data["rooms"].copy()

    def get_solution(self):
        # Randomly select one card from each category
        solution = {
            "suspect": random.choice(self.suspect),
            "weapon": random.choice(self.weapon),
            "room": random.choice(self.room)
        }

        # Remove the selected cards from the lists
        self.suspect.remove(solution["suspect"])
        self.weapon.remove(solution["weapon"])
        self.room.remove(solution["room"])

        return solution

    def deal_card_to_all_players(self, players):
        # Shuffle the remaining cards
        all_cards = self.suspect + self.weapon + self.room
        random.shuffle(all_cards)

        # Distribute cards to players
        player_cards = {player.id: [] for player in players}
        for i, card in enumerate(all_cards):
            player_cards[players[i % len(players)].id].append(card)

        return player_cards