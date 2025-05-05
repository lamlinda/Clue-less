/**
 * @file themeSelection.js
 * @description Handles theme selection and management for the Clue-Less game
 */

// Define theme data
const gameThemes = {
  classic: {
    name: "Classic Clue",
    characters: [
      "Miss Scarlet",
      "Colonel Mustard",
      "Mrs. White",
      "Mr. Green",
      "Mrs. Peacock",
      "Professor Plum"
    ],
    rooms: [
      "Kitchen",
      "Ballroom",
      "Conservatory",
      "Dining Room",
      "Lounge",
      "Hall",
      "Study",
      "Library",
      "Billiard Room"
    ],
    weapons: [
      "Candlestick",
      "Knife",
      "Lead Pipe",
      "Revolver",
      "Rope",
      "Wrench"
    ]
  },
  scifi: {
    name: "Space Station Mystery",
    characters: [
      "Commander Nova",
      "Engineer Orion",
      "Doctor Stellar",
      "Security Chief Comet",
      "Science Officer Luna",
      "Ambassador Nebula"
    ],
    rooms: [
      "Bridge",
      "Engine Room",
      "Med Bay",
      "Mess Hall",
      "Observation Deck",
      "Cargo Bay",
      "Captain's Quarters",
      "Research Lab",
      "Airlock"
    ],
    weapons: [
      "Laser Cutter",
      "Toxic Syringe",
      "Plasma Wrench",
      "Gravity Gun",
      "Oxygen Deprivation",
      "Nanobots"
    ]
  },
  fantasy: {
    name: "Enchanted Castle",
    characters: [
      "Elven Ranger",
      "Dwarven Smith",
      "Court Wizard",
      "Knight Champion",
      "Noble Princess",
      "Royal Bard"
    ],
    rooms: [
      "Great Hall",
      "Wizard's Tower",
      "Royal Chambers",
      "Armory",
      "Treasury",
      "Dungeon",
      "Throne Room",
      "Enchanted Garden",
      "Alchemist's Lab"
    ],
    weapons: [
      "Poisoned Goblet",
      "Enchanted Dagger",
      "Dragon's Tooth",
      "Cursed Amulet",
      "Ancient Tome",
      "Ceremonial Sword"
    ]
  },
  western: {
    name: "Wild West Whodunit",
    characters: [
      "Sheriff Steele",
      "Saloon Singer",
      "Town Doctor",
      "Railroad Baron",
      "School Marm",
      "Native Scout"
    ],
    rooms: [
      "Saloon",
      "Sheriff's Office",
      "Bank",
      "General Store",
      "Train Station",
      "Church",
      "Hotel Room",
      "Stables",
      "Mining Office"
    ],
    weapons: [
      "Six-shooter",
      "Lasso",
      "Poisoned Whiskey",
      "Dynamite",
      "Branding Iron",
      "Hunting Knife"
    ]
  },
  noir: {
    name: "Film Noir Detective",
    characters: [
      "Private Eye",
      "Femme Fatale",
      "Corrupt Officer",
      "Nightclub Owner",
      "Wealthy Socialite",
      "Veteran Reporter"
    ],
    rooms: [
      "Detective's Office",
      "Jazz Club",
      "Back Alley",
      "Hotel Suite",
      "City Hall",
      "Police Station",
      "Warehouse",
      "Upscale Bar",
      "Train Terminal"
    ],
    weapons: [
      "Tommy Gun",
      "Poison Cocktail",
      "Piano Wire",
      "Blackjack",
      "Switchblade",
      "Silenced Pistol"
    ]
  },
  medieval: {
    name: "Medieval Court Intrigue",
    characters: [
      "King's Champion",
      "Court Jester",
      "Royal Physician",
      "Foreign Ambassador",
      "High Priestess",
      "Master of Coin"
    ],
    rooms: [
      "Royal Bedchamber",
      "Feast Hall",
      "Chapel",
      "Courtyard",
      "Alchemy Tower",
      "Stables",
      "Council Chamber",
      "Guardhouse",
      "Secret Passage"
    ],
    weapons: [
      "Ornate Dagger",
      "Poisoned Wine",
      "Crossbow",
      "Iron Mace",
      "Garrote",
      "Herbal Toxin"
    ]
  },
  tropical: {
    name: "Tropical Resort Mystery",
    characters: [
      "Resort Owner",
      "Famous Actor",
      "Island Chef",
      "Diving Instructor",
      "Wealthy Heiress",
      "Mysterious Stranger"
    ],
    rooms: [
      "Beach Cabana",
      "Tiki Bar",
      "Luxury Suite",
      "Spa Room",
      "Restaurant",
      "Pool Area",
      "Gift Shop",
      "Boat Dock",
      "Jungle Trail"
    ],
    weapons: [
      "Coconut",
      "Dive Knife",
      "Poisoned Cocktail",
      "Harpoon",
      "Fishing Line",
      "Shark Tooth"
    ]
  },
  campus: {
    name: "Campus Murder Mystery",
    characters: [
      "History Professor",
      "Star Athlete",
      "Computer Genius",
      "Drama Student",
      "Exchange Scholar",
      "Campus Security"
    ],
    rooms: [
      "Lecture Hall",
      "Student Union",
      "Library Stacks",
      "Laboratory",
      "Dormitory",
      "Admin Office",
      "Gymnasium",
      "Cafeteria",
      "Campus Quad"
    ],
    weapons: [
      "Lab Equipment",
      "Trophy",
      "Textbook",
      "USB Drive",
      "Letter Opener",
      "Graduation Tassel"
    ]
  }
};

const suspectImageMap = {
  "Miss Scarlet": "MsScarlet.png",
  "Colonel Mustard": "ColMustard.png",
  "Mrs. White": "MrsWhite.png",
  "Mr. Green": "MrGreen.png",
  "Mrs. Peacock": "MrsPeacock.png",
  "Professor Plum": "ProfPlum.png"
};

// Current selected theme
let currentTheme = "classic";

// Store the original character data for later reference
const originalCharacters = {
  "Miss Scarlet": { position: "scarlet_start", color: "#FF2400" },
  "Colonel Mustard": { position: "mustard_start", color: "#E3A817" },
  "Mrs. White": { position: "white_start", color: "#F5F5F5" },
  "Mr. Green": { position: "green_start", color: "#138808" },
  "Mrs. Peacock": { position: "peacock_start", color: "#33A1C9" },
  "Professor Plum": { position: "plum_start", color: "#8E4585" }
};

// Character color mapping for each theme
const themeCharacterColors = {
  classic: {
    "Miss Scarlet": "#FF2400",
    "Colonel Mustard": "#E3A817",
    "Mrs. White": "#F5F5F5",
    "Mr. Green": "#138808",
    "Mrs. Peacock": "#33A1C9",
    "Professor Plum": "#8E4585"
  },
  scifi: {
    "Commander Nova": "#FF2400", // Red
    "Engineer Orion": "#E3A817", // Yellow
    "Doctor Stellar": "#F5F5F5", // White
    "Security Chief Comet": "#138808", // Green
    "Science Officer Luna": "#33A1C9", // Blue
    "Ambassador Nebula": "#8E4585" // Purple
  },
  fantasy: {
    "Elven Ranger": "#33A1C9", // Blue
    "Dwarven Smith": "#E3A817", // Yellow
    "Court Wizard": "#8E4585", // Purple
    "Knight Champion": "#138808", // Green
    "Noble Princess": "#FF2400", // Red
    "Royal Bard": "#F5F5F5" // White
  },
  western: {
    "Sheriff Steele": "#138808", // Green
    "Saloon Singer": "#FF2400", // Red
    "Town Doctor": "#F5F5F5", // White
    "Railroad Baron": "#8E4585", // Purple
    "School Marm": "#33A1C9", // Blue
    "Native Scout": "#E3A817" // Yellow
  },
  noir: {
    "Private Eye": "#138808", // Green
    "Femme Fatale": "#FF2400", // Red
    "Corrupt Officer": "#E3A817", // Yellow
    "Nightclub Owner": "#8E4585", // Purple
    "Wealthy Socialite": "#33A1C9", // Blue
    "Veteran Reporter": "#F5F5F5" // White
  },
  medieval: {
    "King's Champion": "#E3A817", // Yellow
    "Court Jester": "#8E4585", // Purple
    "Royal Physician": "#F5F5F5", // White
    "Foreign Ambassador": "#33A1C9", // Blue
    "High Priestess": "#FF2400", // Red
    "Master of Coin": "#138808" // Green
  },
  tropical: {
    "Resort Owner": "#8E4585", // Purple
    "Famous Actor": "#FF2400", // Red
    "Island Chef": "#F5F5F5", // White
    "Diving Instructor": "#33A1C9", // Blue
    "Wealthy Heiress": "#E3A817", // Yellow
    "Mysterious Stranger": "#138808" // Green
  },
  campus: {
    "History Professor": "#8E4585", // Purple
    "Star Athlete": "#E3A817", // Yellow
    "Computer Genius": "#138808", // Green
    "Drama Student": "#FF2400", // Red
    "Exchange Scholar": "#F5F5F5", // White
    "Campus Security": "#33A1C9" // Blue
  }
};

// Position mapping from classic characters to themed characters
const characterPositionMapping = {
  "Miss Scarlet": 0,
  "Colonel Mustard": 1,
  "Mrs. White": 2,
  "Mr. Green": 3,
  "Mrs. Peacock": 4,
  "Professor Plum": 5
};

// Initialize theme selection
document.addEventListener('DOMContentLoaded', function() {
  const themeSelector = document.getElementById('gameTheme');

  if (themeSelector) {
    // Update preview when theme is changed
    themeSelector.addEventListener('change', function() {
      currentTheme = this.value;
      updateThemePreview();

      // Update character selection UI if visible
      if (document.getElementById('characterSelectionSection').style.display === 'block') {
        updateCharacterSelectionUI(currentTheme);
      }
    });

    // Initialize preview with default theme
    updateThemePreview();
  }

  // Set up detective notes checkbox functionality
  setupDetectiveNotesCheckboxes();
});

// Function to set up detective notes checkboxes
function setupDetectiveNotesCheckboxes() {
  const checkboxes = document.querySelectorAll('#detectiveNotesSection input[type="checkbox"]');

  checkboxes.forEach((checkbox) => {
    checkbox.addEventListener('change', function() {
      // Get the corresponding label element using the 'for' attribute
      const label = document.querySelector(`label[for="${this.id}"]`);

      if (label) {
        if (this.checked) {
          label.style.textDecoration = 'line-through';
          label.style.color = '#888'; // Dimmed color
        } else {
          label.style.textDecoration = 'none';
          label.style.color = ''; // Reset the color
        }
      }
    });
  });

  console.log("Detective notes checkbox functionality set up");
}

// Update the theme preview based on selected theme
function updateThemePreview() {
  const theme = gameThemes[currentTheme];

  if (!theme) return;

  const previewCharacters = document.getElementById('previewCharacters');
  const previewRooms = document.getElementById('previewRooms');
  const previewWeapons = document.getElementById('previewWeapons');

  if (previewCharacters) previewCharacters.textContent = theme.characters.join(', ');
  if (previewRooms) previewRooms.textContent = theme.rooms.join(', ');
  if (previewWeapons) previewWeapons.textContent = theme.weapons.join(', ');

  console.log("Theme preview updated for:", currentTheme);
}

// Function to update character selection UI based on theme
function updateCharacterSelectionUI(theme) {
  console.log("Updating character selection UI for theme:", theme);

  const characterCards = document.querySelectorAll('.character-card');
  const themeData = gameThemes[theme];

  if (!themeData) {
    console.error("Theme data not found for:", theme);
    return;
  }

  characterCards.forEach((card, index) => {
    if (index < themeData.characters.length) {
      const character = themeData.characters[index];

      // Update character name
      card.setAttribute('data-character', character);
      card.querySelector('.character-name').textContent = character;

      // Update character color based on theme
      const characterImage = card.querySelector('.character-image');

      if (characterImage) {
        if (theme === 'classic' && suspectImageMap[character]) {
          characterImage.style.backgroundImage = `url('/static/images/suspects/${suspectImageMap[character]}')`;
          characterImage.style.backgroundSize = 'cover';
          characterImage.style.backgroundColor = ''; // Remove solid color
        } else {
          characterImage.style.backgroundImage = ''; // Clear any previous image
          const colorValue = themeCharacterColors[theme][character];
          characterImage.style.backgroundColor = colorValue || '#ccc';
        }
      }

      // Ensure select button text is updated
      const selectButton = card.querySelector('.select-character-btn');
      if (selectButton) {
        if (card.classList.contains('selected')) {
          selectButton.textContent = 'Selected';
        } else {
          selectButton.textContent = 'Select';
        }
      }
    }
  });

  console.log("Character selection UI updated for theme:", theme);
}

// Function to update available characters (disabling already selected ones)
function updateAvailableCharacters(selectedCharacters) {
  console.log("Updating available characters, already selected:", selectedCharacters);

  const characterCards = document.querySelectorAll('.character-card');

  characterCards.forEach(card => {
    const characterName = card.getAttribute('data-character');
    const selectButton = card.querySelector('.select-character-btn');

    // If this character is already selected by someone else
    if (selectedCharacters.includes(characterName) && selectedCharacter !== characterName) {
      card.classList.add('unavailable');
      selectButton.disabled = true;

      // Add a status message if it doesn't exist
      if (!card.querySelector('.character-status')) {
        const statusElem = document.createElement('div');
        statusElem.className = 'character-status';
        statusElem.textContent = 'Already selected';
        card.appendChild(statusElem);
      }
    } else {
      card.classList.remove('unavailable');
      selectButton.disabled = false;

      // Remove status message if it exists
      const statusElem = card.querySelector('.character-status');
      if (statusElem) {
        statusElem.remove();
      }

      // If this is the player's selected character, mark it
      if (characterName === selectedCharacter) {
        card.classList.add('selected');

        // Update button text
        selectButton.textContent = 'Selected';
      } else {
        card.classList.remove('selected');
        selectButton.textContent = 'Select';
      }
    }
  });
}

// Function to get theme-appropriate room names
function getThemeRoomName(originalRoom) {
  // Map original room names to indexes
  const roomIndexMap = {
    "kitchen": 0,
    "ballroom": 1,
    "conservatory": 2,
    "dining": 3,
    "lounge": 4,
    "hall": 5,
    "study": 6,
    "library": 7,
    "billiard": 8
  };

  const theme = gameThemes[currentTheme];
  if (!theme) return originalRoom;

  const index = roomIndexMap[originalRoom];
  if (index !== undefined && theme.rooms[index]) {
    return theme.rooms[index];
  }

  return originalRoom;
}

// Function to get theme-appropriate weapon names
function getThemeWeaponName(originalWeapon) {
  const weaponIndexMap = {
    "Candlestick": 0,
    "Knife": 1,
    "Lead Pipe": 2,
    "Revolver": 3,
    "Rope": 4,
    "Wrench": 5
  };

  const theme = gameThemes[currentTheme];
  if (!theme) return originalWeapon;

  const index = weaponIndexMap[originalWeapon];
  if (index !== undefined && theme.weapons[index]) {
    return theme.weapons[index];
  }

  return originalWeapon;
}

// Function to initialize game board with theme-specific room names
function updateGameBoardWithTheme() {
  const theme = gameThemes[currentTheme];
  if (!theme) return;

  // Update room labels on the board
  const roomElements = [
    { id: 'study', index: 6 },
    { id: 'hall', index: 5 },
    { id: 'lounge', index: 4 },
    { id: 'library', index: 7 },
    { id: 'billiard', index: 8 },
    { id: 'dining', index: 3 },
    { id: 'conservatory', index: 2 },
    { id: 'ballroom', index: 1 },
    { id: 'kitchen', index: 0 }
  ];

  roomElements.forEach(room => {
    const element = document.getElementById(room.id);
    if (element) {
      const themeName = theme.rooms[room.index];
      element.textContent = themeName;

      // Only apply room images for classic theme
      if (currentTheme === "classic") {
        const roomId = room.id; // like "library"
        element.style.backgroundImage = `url('/static/images/rooms/${roomId}.png')`;
        element.style.backgroundSize = "cover";
        element.style.backgroundPosition = "center";
      } else {
        element.style.backgroundImage = "none"; // clear any background image
      }

      // Preserve the secret passage indicator if it exists
      const secretPassage = element.querySelector('.secret-passage');
      if (secretPassage) {
        element.appendChild(secretPassage);
      }
    }
  });

  // Update character starter positions
  theme.characters.forEach((character, index) => {
    // Get original character position
    const originalCharacter = Object.keys(characterPositionMapping)[index];
    if (originalCharacter && originalCharacters[originalCharacter]) {
      const positionId = originalCharacters[originalCharacter].position;
      const element = document.getElementById(positionId);
      if (element) {
        element.textContent = character;
      }
    }
  });

  console.log("Game board updated with theme:", currentTheme);
}

// Function to update suggestion form with theme-specific options
function updateSuggestionFormWithTheme() {
  const theme = gameThemes[currentTheme];
  if (!theme) return;

  // Update suspect dropdown
  const suspectSelect = document.getElementById('suggestSuspect');
  if (suspectSelect) {
    // Clear existing options, keeping the empty default
    while (suspectSelect.options.length > 1) {
      suspectSelect.remove(1);
    }

    // Add theme-specific characters
    theme.characters.forEach(character => {
      const option = document.createElement('option');
      option.value = character;
      option.textContent = character;
      suspectSelect.appendChild(option);
    });
  }

  // Update weapon dropdown
  const weaponSelect = document.getElementById('suggestWeapon');
  if (weaponSelect) {
    // Clear existing options, keeping the empty default
    while (weaponSelect.options.length > 1) {
      weaponSelect.remove(1);
    }

    // Add theme-specific weapons
    theme.weapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon;
      option.textContent = weapon;
      weaponSelect.appendChild(option);
    });
  }

  console.log("Suggestion form updated with theme:", currentTheme);
}

// Function to update accusation form with theme-specific options
function updateAccusationFormWithTheme() {
  const theme = gameThemes[currentTheme];
  if (!theme) return;

  // Update suspect dropdown
  const suspectSelect = document.getElementById('accuseSuspect');
  if (suspectSelect) {
    // Clear existing options, keeping the empty default
    while (suspectSelect.options.length > 1) {
      suspectSelect.remove(1);
    }

    // Add theme-specific characters
    theme.characters.forEach(character => {
      const option = document.createElement('option');
      option.value = character;
      option.textContent = character;
      suspectSelect.appendChild(option);
    });
  }

  // Update weapon dropdown
  const weaponSelect = document.getElementById('accuseWeapon');
  if (weaponSelect) {
    // Clear existing options, keeping the empty default
    while (weaponSelect.options.length > 1) {
      weaponSelect.remove(1);
    }

    // Add theme-specific weapons
    theme.weapons.forEach(weapon => {
      const option = document.createElement('option');
      option.value = weapon;
      option.textContent = weapon;
      weaponSelect.appendChild(option);
    });
  }

  // Update room dropdown
  const roomSelect = document.getElementById('accuseRoom');
  if (roomSelect) {
    // Clear existing options, keeping the empty default
    while (roomSelect.options.length > 1) {
      roomSelect.remove(1);
    }

    // Add theme-specific rooms
    theme.rooms.forEach(room => {
      const option = document.createElement('option');
      option.value = room;
      option.textContent = room;
      roomSelect.appendChild(option);
    });
  }

  console.log("Accusation form updated with theme:", currentTheme);
}

// Function to update detective notes to reflect the current theme
function updateDetectiveNotes() {
  const theme = gameThemes[currentTheme];
  if (!theme) {
    console.error("Theme data not found when updating detective notes");
    return;
  }

  console.log("Updating detective notes for theme:", currentTheme);

  // Get all three columns
  const columns = document.querySelectorAll('#detectiveNotesSection .column');
  if (columns.length < 3) {
    console.error("Cannot find detective notes columns");
    return;
  }

  // ===== FIRST COLUMN: SUSPECTS =====
  const suspectColumn = columns[0];
  suspectColumn.innerHTML = '<h3>Suspects</h3>'; // Reset with correct header

  // Add new suspects based on theme
  theme.characters.forEach((character, index) => {
    const div = document.createElement('div');
    const id = `suspect${index + 1}`;

    div.innerHTML = `
      <input type="checkbox" id="${id}">
      <label for="${id}">${character}</label>
    `;

    suspectColumn.appendChild(div);

    // Add event listener for the checkbox
    const checkbox = div.querySelector(`#${id}`);
    checkbox.addEventListener('change', function() {
      const label = div.querySelector(`label[for="${id}"]`);
      if (this.checked) {
        label.style.textDecoration = 'line-through';
        label.style.color = '#888';
      } else {
        label.style.textDecoration = 'none';
        label.style.color = '';
      }
    });
  });

  // ===== SECOND COLUMN: WEAPONS =====
  const weaponColumn = columns[1];
  weaponColumn.innerHTML = '<h3>Weapons</h3>'; // Reset with correct header

  // Add weapons based on the theme
  theme.weapons.forEach((weapon, index) => {
    const div = document.createElement('div');
    const id = `weapon${index + 1}`;

    div.innerHTML = `
      <input type="checkbox" id="${id}">
      <label for="${id}">${weapon}</label>
    `;

    weaponColumn.appendChild(div);

    // Add event listener for the checkbox
    const checkbox = div.querySelector(`#${id}`);
    checkbox.addEventListener('change', function() {
      const label = div.querySelector(`label[for="${id}"]`);
      if (this.checked) {
        label.style.textDecoration = 'line-through';
        label.style.color = '#888';
      } else {
        label.style.textDecoration = 'none';
        label.style.color = '';
      }
    });
  });

  // ===== THIRD COLUMN: ROOMS =====
  const roomColumn = columns[2];
  roomColumn.innerHTML = '<h3>Rooms</h3>'; // Reset with correct header

  // Add rooms based on theme
  theme.rooms.forEach((room, index) => {
    const div = document.createElement('div');
    const id = `room${index + 1}`; // Changed from location to room

    div.innerHTML = `
      <input type="checkbox" id="${id}">
      <label for="${id}">${room}</label>
    `;

    roomColumn.appendChild(div);

    // Add event listener for the checkbox
    const checkbox = div.querySelector(`#${id}`);
    checkbox.addEventListener('change', function() {
      const label = div.querySelector(`label[for="${id}"]`);
      if (this.checked) {
        label.style.textDecoration = 'line-through';
        label.style.color = '#888';
      } else {
        label.style.textDecoration = 'none';
        label.style.color = '';
      }
    });
  });

  console.log("Detective notes updated completely for theme:", currentTheme);

  // Ensure the detective notes are displayed
  const detectiveNotesSection = document.getElementById('detectiveNotesSection');
  if (detectiveNotesSection) {
    detectiveNotesSection.style.display = 'flex';
  }
}

// Function to fully update the game board when a game starts or theme changes
function updateEntireGameBoard() {
    console.log("=== UPDATING ENTIRE GAME BOARD ===");
    console.log("Current theme:", currentTheme);
    console.log("Theme data:", gameThemes[currentTheme]);

    // Update the room names and character positions based on theme
    console.log("Updating game board with theme...");
    updateGameBoardWithTheme();

    // Update all forms to match the theme
    console.log("Updating suggestion form...");
    updateSuggestionFormWithTheme();
    console.log("Updating accusation form...");
    updateAccusationFormWithTheme();

    // Update detective notes with the current theme
    console.log("Updating detective notes...");
    updateDetectiveNotes();

    // Update card display if we already have cards
    if (myCards && myCards.length > 0) {
        console.log("Updating card display...");
        updateCardDisplay();
    } else {
        console.log("No cards to update yet.");
    }

    console.log("Game board update complete!");
}

// Listen for game_started event to update the board
socket.on('game_started', function(data) {
  // If the theme is provided, update the game board
  if (data.theme) {
    currentTheme = data.theme;
    console.log("Setting theme from game_started:", currentTheme);

    // Add a short delay to ensure DOM is ready
    setTimeout(updateEntireGameBoard, 100);
  }
});

// Handle theme in lobby_joined event
socket.on('lobby_joined', function(data) {
  // Set the current theme if provided
  if (data.theme) {
    currentTheme = data.theme;
    console.log("Setting theme from lobby:", data.theme);

    // Update character selection UI if visible
    if (document.getElementById('characterSelectionSection').style.display === 'block') {
      updateCharacterSelectionUI(data.theme);
    }

    // Update theme selector dropdown to match the lobby's theme
    const themeSelector = document.getElementById('gameTheme');
    if (themeSelector) {
      themeSelector.value = data.theme;

      // Update the theme preview to match
      updateThemePreview();
    }
  }
});

// Also update when a turn update happens (in case theme wasn't set earlier)
socket.on('turn_update', function(data) {
  if (data.theme && data.theme !== currentTheme) {
    currentTheme = data.theme;
    updateEntireGameBoard();
  }
});

// Export theme functions and data for use in other files
window.gameThemes = gameThemes;
window.currentTheme = currentTheme;
window.updateCharacterSelectionUI = updateCharacterSelectionUI;
window.updateGameBoardWithTheme = updateGameBoardWithTheme;
window.updateThemePreview = updateThemePreview;
window.updateDetectiveNotes = updateDetectiveNotes;
window.updateEntireGameBoard = updateEntireGameBoard;