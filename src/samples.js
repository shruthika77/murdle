// Sample puzzles: 3 from the prototype + 10 more (extra-01..10), each verified to have exactly one answer
export const SAMPLES = [
  {
    "id": "case-001",
    "title": "The Missing Manor Chef",
    "story": "Lord Ashwin was found dead in the Library after a dinner party. Three guests were each alone in a different room, each holding a different object.",
    "suspects": [
      {
        "name": "Chef Marigold",
        "trait": "Wears an apron, hates being interrupted"
      },
      {
        "name": "Inspector Jasmine",
        "trait": "Always carries a notebook"
      },
      {
        "name": "Gardener Tulsi",
        "trait": "Has muddy boots"
      }
    ],
    "weapons": [
      {
        "name": "Rolling Pin",
        "description": "Heavy wooden pin"
      },
      {
        "name": "Candlestick",
        "description": "Brass, very heavy"
      },
      {
        "name": "Garden Shears",
        "description": "Sharp, rusty blades"
      }
    ],
    "locations": [
      {
        "name": "Kitchen",
        "description": "Smells of spices"
      },
      {
        "name": "Library",
        "description": "Silent and dusty"
      },
      {
        "name": "Greenhouse",
        "description": "Warm and humid"
      }
    ],
    "clues": [
      "The person in the Kitchen held neither the Candlestick nor the Garden Shears.",
      "Chef Marigold was not in the Kitchen or the Greenhouse, and Inspector Jasmine was not in the Kitchen.",
      "The Candlestick was not in the Greenhouse. The victim was found in the Library."
    ],
    "solution": {
      "suspect": "Chef Marigold",
      "weapon": "Candlestick",
      "location": "Library"
    },
    "explanation": "Clue 1: Kitchen = Rolling Pin. Clue 2: Marigold = Library, Jasmine = Greenhouse, so Tulsi = Kitchen. Clue 3: Candlestick is not in the Greenhouse, so Jasmine has the Shears and Marigold the Candlestick. The crime was in the Library: Marigold, Candlestick, Library."
  },
  {
    "id": "case-002",
    "title": "Poison at the Masquerade",
    "story": "A guest collapsed on the Balcony during the masked ball. Each suspect hid in a different spot with a different weapon.",
    "suspects": [
      {
        "name": "Dr. Vance",
        "trait": "Carries a stethoscope"
      },
      {
        "name": "Madam Rue",
        "trait": "Always veiled"
      },
      {
        "name": "Captain Bly",
        "trait": "Covered in medals"
      }
    ],
    "weapons": [
      {
        "name": "Dagger",
        "description": "Slim and silver"
      },
      {
        "name": "Poison Vial",
        "description": "Smells of almonds"
      },
      {
        "name": "Rope",
        "description": "Thick and frayed"
      }
    ],
    "locations": [
      {
        "name": "Cellar",
        "description": "Cold and dark"
      },
      {
        "name": "Balcony",
        "description": "Overlooks the garden"
      },
      {
        "name": "Study",
        "description": "Leather chairs"
      }
    ],
    "clues": [
      "The Poison Vial was not in the Cellar or on the Balcony.",
      "Madam Rue stayed away from the Study and the Balcony, and never carried the Rope.",
      "Captain Bly never touched the Poison Vial. The crime took place on the Balcony."
    ],
    "solution": {
      "suspect": "Captain Bly",
      "weapon": "Rope",
      "location": "Balcony"
    },
    "explanation": "Clue 1: Poison = Study. Clue 2: Rue = Cellar with the Dagger. Clue 3: Bly is not in the Study, so Bly = Balcony, Vance = Study. Bly holds the Rope. The crime was on the Balcony."
  },
  {
    "id": "case-003",
    "title": "The Parlour Poker",
    "story": "The house was silent until a scream came from the Garage. Three people, three rooms, three weapons.",
    "suspects": [
      {
        "name": "Lady Quill",
        "trait": "Fond of pearls"
      },
      {
        "name": "Professor Moss",
        "trait": "Absent-minded"
      },
      {
        "name": "Butler Finch",
        "trait": "Impeccably polite"
      }
    ],
    "weapons": [
      {
        "name": "Letter Opener",
        "description": "Brass, razor tip"
      },
      {
        "name": "Candlestick",
        "description": "Tall and heavy"
      },
      {
        "name": "Fireplace Poker",
        "description": "Iron, blackened"
      }
    ],
    "locations": [
      {
        "name": "Attic",
        "description": "Dusty trunks"
      },
      {
        "name": "Garage",
        "description": "Smells of oil"
      },
      {
        "name": "Parlour",
        "description": "Warm fireplace"
      }
    ],
    "clues": [
      "Lady Quill was neither in the Attic nor the Garage.",
      "The Letter Opener was kept in the Attic. The Poker was not in the Parlour.",
      "Professor Moss was not in the Garage. The crime occurred in the Garage."
    ],
    "solution": {
      "suspect": "Butler Finch",
      "weapon": "Fireplace Poker",
      "location": "Garage"
    },
    "explanation": "Clue 1: Quill = Parlour. Clue 2: Opener = Attic, so the Poker is in the Garage and the Candlestick in the Parlour. Clue 3: Moss = Attic, Finch = Garage. The crime was in the Garage: Finch, Poker, Garage."
  },
  {
    "id": "extra-01",
    "title": "The Silent Library",
    "story": "Midnight at the Alder University library, where silence is the only rule. Professor Alder was found dead in the Reading Hall. Three people were each alone in a different room, each holding a different object.",
    "suspects": [
      {
        "name": "Librarian Odette",
        "trait": "Never raises her voice"
      },
      {
        "name": "Student Rafferty",
        "trait": "Always behind on essays"
      },
      {
        "name": "Janitor Mr. Kemp",
        "trait": "Knows every key"
      }
    ],
    "weapons": [
      {
        "name": "Marble Bookend",
        "description": "Heavy and cold"
      },
      {
        "name": "Letter Opener",
        "description": "Slim and sharp"
      },
      {
        "name": "Reading Lamp",
        "description": "Cast-iron base"
      }
    ],
    "locations": [
      {
        "name": "Archive Room",
        "description": "Cold and silent"
      },
      {
        "name": "Reading Hall",
        "description": "Rows of oak desks"
      },
      {
        "name": "Rare Books Vault",
        "description": "Locked with a brass key"
      }
    ],
    "clues": [
      "Neither Librarian Odette nor Student Rafferty was in the Reading Hall.",
      "The person in the Reading Hall was not holding the Marble Bookend.",
      "The Letter Opener was not in the Reading Hall."
    ],
    "solution": {
      "suspect": "Janitor Mr. Kemp",
      "weapon": "Reading Lamp",
      "location": "Reading Hall"
    },
    "explanation": "Combining the clues leaves one arrangement: Librarian Odette was in the Archive Room with the Marble Bookend; Student Rafferty was in the Rare Books Vault with the Letter Opener; Janitor Mr. Kemp was in the Reading Hall with the Reading Lamp. The victim was found in the Reading Hall, so the culprit is Janitor Mr. Kemp with the Reading Lamp."
  },
  {
    "id": "extra-02",
    "title": "Midnight at the Museum",
    "story": "The Hargrove Museum had just unveiled a priceless golden mask when the lights went out. Director Hale was found dead in the Egyptian Hall. Three staff members were alone in different rooms when it happened, each holding something from the building.",
    "suspects": [
      {
        "name": "Curator Beaumont",
        "trait": "Fusses over every exhibit"
      },
      {
        "name": "Guard Okafor",
        "trait": "Walks the halls all night"
      },
      {
        "name": "Restorer Lindqvist",
        "trait": "Hands stained with paint"
      }
    ],
    "weapons": [
      {
        "name": "Sculptor's Chisel",
        "description": "Chipped steel edge"
      },
      {
        "name": "Brass Stanchion",
        "description": "Part of the rope barrier"
      },
      {
        "name": "Display Hammer",
        "description": "Used to hang exhibits"
      }
    ],
    "locations": [
      {
        "name": "Egyptian Hall",
        "description": "Mummies and mystery"
      },
      {
        "name": "Gem Gallery",
        "description": "Glittering glass cases"
      },
      {
        "name": "Restoration Studio",
        "description": "Smells of varnish"
      }
    ],
    "clues": [
      "Neither Guard Okafor nor Restorer Lindqvist was in the Egyptian Hall.",
      "Guard Okafor was holding the Brass Stanchion.",
      "Curator Beaumont was not holding the Sculptor's Chisel."
    ],
    "solution": {
      "suspect": "Curator Beaumont",
      "weapon": "Display Hammer",
      "location": "Egyptian Hall"
    },
    "explanation": "Combining the clues leaves one arrangement: Curator Beaumont was in the Egyptian Hall with the Display Hammer; Guard Okafor was in the Restoration Studio with the Brass Stanchion; Restorer Lindqvist was in the Gem Gallery with the Sculptor's Chisel. The victim was found in the Egyptian Hall, so the culprit is Curator Beaumont with the Display Hammer."
  },
  {
    "id": "extra-03",
    "title": "The Lighthouse Keeper",
    "story": "A storm battered the Gull Point lighthouse the night its old keeper was found dead. Keeper Ambrose was found dead in the Cellar. Three visitors sheltered in different parts of the lighthouse, each holding a different tool.",
    "suspects": [
      {
        "name": "Captain Marlow",
        "trait": "Weathered and gruff"
      },
      {
        "name": "Fisherman Tobias",
        "trait": "Smells of salt and tar"
      },
      {
        "name": "Cartographer Wren",
        "trait": "Sketches everything"
      }
    ],
    "weapons": [
      {
        "name": "Boat Hook",
        "description": "Long iron hook"
      },
      {
        "name": "Flare Gun",
        "description": "Bright orange barrel"
      },
      {
        "name": "Anchor Chain",
        "description": "Thick and rusted"
      }
    ],
    "locations": [
      {
        "name": "Lantern Room",
        "description": "Top of the tower"
      },
      {
        "name": "Boathouse",
        "description": "Damp and creaking"
      },
      {
        "name": "Cellar",
        "description": "Barrels and cobwebs"
      }
    ],
    "clues": [
      "Captain Marlow was not in the Cellar.",
      "Cartographer Wren was holding the Anchor Chain.",
      "Neither Captain Marlow nor Cartographer Wren was in the Boathouse."
    ],
    "solution": {
      "suspect": "Cartographer Wren",
      "weapon": "Anchor Chain",
      "location": "Cellar"
    },
    "explanation": "Combining the clues leaves one arrangement: Captain Marlow was in the Lantern Room with the Boat Hook; Fisherman Tobias was in the Boathouse with the Flare Gun; Cartographer Wren was in the Cellar with the Anchor Chain. The victim was found in the Cellar, so the culprit is Cartographer Wren with the Anchor Chain."
  },
  {
    "id": "extra-04",
    "title": "Poison at the Bakery",
    "story": "The famous Rosewater Bakery was buzzing until a food critic collapsed behind the counter. Critic Montague was found dead in the Back Kitchen. Three people were each alone in different parts of the bakery, each holding a different utensil.",
    "suspects": [
      {
        "name": "Baker Rosalind",
        "trait": "Up before dawn every day"
      },
      {
        "name": "Rival Pierre",
        "trait": "Runs the bakery across town"
      },
      {
        "name": "Driver Sunny",
        "trait": "Delivers flour at odd hours"
      }
    ],
    "weapons": [
      {
        "name": "Cake Knife",
        "description": "Long serrated blade"
      },
      {
        "name": "Iron Skillet",
        "description": "Heavy and black"
      },
      {
        "name": "Mixing Bowl",
        "description": "Solid stoneware"
      }
    ],
    "locations": [
      {
        "name": "Front Counter",
        "description": "Glass cases of pastries"
      },
      {
        "name": "Cold Store",
        "description": "Chilled and dim"
      },
      {
        "name": "Back Kitchen",
        "description": "Ovens and flour dust"
      }
    ],
    "clues": [
      "Neither Rival Pierre nor Driver Sunny was in the Back Kitchen.",
      "Baker Rosalind was not holding the Cake Knife.",
      "The person in the Back Kitchen was not holding the Mixing Bowl."
    ],
    "solution": {
      "suspect": "Baker Rosalind",
      "weapon": "Iron Skillet",
      "location": "Back Kitchen"
    },
    "explanation": "Combining the clues leaves one arrangement: Baker Rosalind was in the Back Kitchen with the Iron Skillet; Rival Pierre was in the Cold Store with the Cake Knife; Driver Sunny was in the Front Counter with the Mixing Bowl. The victim was found in the Back Kitchen, so the culprit is Baker Rosalind with the Iron Skillet."
  },
  {
    "id": "extra-05",
    "title": "The Orchestra's Last Note",
    "story": "The Regent Hall orchestra was tuning up when its star soloist was found silenced. Soloist Isadora was found dead in the Green Room. Three musicians were alone in different places backstage, each holding a different object.",
    "suspects": [
      {
        "name": "Conductor Valeria",
        "trait": "Demands perfection"
      },
      {
        "name": "Cellist Dmitri",
        "trait": "Plays with fierce passion"
      },
      {
        "name": "Stagehand Joss",
        "trait": "Moves silently in the dark"
      }
    ],
    "weapons": [
      {
        "name": "Metronome",
        "description": "Brass weight on a stand"
      },
      {
        "name": "Music Stand",
        "description": "Heavy iron base"
      },
      {
        "name": "Brass Trumpet",
        "description": "Dented bell"
      }
    ],
    "locations": [
      {
        "name": "Stage",
        "description": "Under the hot lights"
      },
      {
        "name": "Green Room",
        "description": "Mirrors and sofas"
      },
      {
        "name": "Orchestra Pit",
        "description": "Cramped and dark"
      }
    ],
    "clues": [
      "The person in the Green Room was not holding the Brass Trumpet.",
      "Neither Conductor Valeria nor Cellist Dmitri was in the Green Room.",
      "Stagehand Joss was not holding the Metronome."
    ],
    "solution": {
      "suspect": "Stagehand Joss",
      "weapon": "Music Stand",
      "location": "Green Room"
    },
    "explanation": "Combining the clues leaves one arrangement: Conductor Valeria was in the Orchestra Pit with the Metronome; Cellist Dmitri was in the Stage with the Brass Trumpet; Stagehand Joss was in the Green Room with the Music Stand. The victim was found in the Green Room, so the culprit is Stagehand Joss with the Music Stand."
  },
  {
    "id": "extra-06",
    "title": "Trouble at the Startup",
    "story": "Launch day at Brightbyte ended badly when the company auditor was found dead. Auditor Frost was found dead in the Meeting Room. Three people were each alone in a different room, each holding something from the office.",
    "suspects": [
      {
        "name": "Founder Elena",
        "trait": "Lives on coffee"
      },
      {
        "name": "Engineer Marcus",
        "trait": "Hasn't slept in two days"
      },
      {
        "name": "Investor Mr. Sato",
        "trait": "Always checks his watch"
      }
    ],
    "weapons": [
      {
        "name": "Cable Spool",
        "description": "Thick network cable"
      },
      {
        "name": "Desk Trophy",
        "description": "Awarded for Best Startup"
      },
      {
        "name": "Monitor Stand",
        "description": "Solid steel"
      }
    ],
    "locations": [
      {
        "name": "Server Room",
        "description": "Humming and cold"
      },
      {
        "name": "Rooftop Terrace",
        "description": "Fairy lights and wind"
      },
      {
        "name": "Meeting Room",
        "description": "Glass walls and whiteboards"
      }
    ],
    "clues": [
      "Founder Elena was not holding the Desk Trophy.",
      "Neither Engineer Marcus nor Investor Mr. Sato was in the Meeting Room.",
      "The person in the Meeting Room was not holding the Cable Spool."
    ],
    "solution": {
      "suspect": "Founder Elena",
      "weapon": "Monitor Stand",
      "location": "Meeting Room"
    },
    "explanation": "Combining the clues leaves one arrangement: Founder Elena was in the Meeting Room with the Monitor Stand; Engineer Marcus was in the Server Room with the Cable Spool; Investor Mr. Sato was in the Rooftop Terrace with the Desk Trophy. The victim was found in the Meeting Room, so the culprit is Founder Elena with the Monitor Stand."
  },
  {
    "id": "extra-07",
    "title": "Death on the Film Set",
    "story": "Filming stopped abruptly when the producer was found dead between takes. Producer Reyes was found dead in the Soundstage. Three crew members were alone in different places, each holding a different prop.",
    "suspects": [
      {
        "name": "Director Castellano",
        "trait": "Shouts through a megaphone"
      },
      {
        "name": "Actor Lucian Vale",
        "trait": "Demands his own trailer"
      },
      {
        "name": "Make-up Artist Bea",
        "trait": "Knows everyone's secrets"
      }
    ],
    "weapons": [
      {
        "name": "Prop Sword",
        "description": "Heavier than it looks"
      },
      {
        "name": "Clapperboard",
        "description": "Hinged wooden slate"
      },
      {
        "name": "Boom Pole",
        "description": "Long and metallic"
      }
    ],
    "locations": [
      {
        "name": "Soundstage",
        "description": "Cameras and cables"
      },
      {
        "name": "Costume Trailer",
        "description": "Racks of old costumes"
      },
      {
        "name": "Editing Suite",
        "description": "Glowing screens"
      }
    ],
    "clues": [
      "The Boom Pole was not in the Soundstage.",
      "Director Castellano was not holding the Prop Sword.",
      "Neither Actor Lucian Vale nor Make-up Artist Bea was in the Soundstage."
    ],
    "solution": {
      "suspect": "Director Castellano",
      "weapon": "Clapperboard",
      "location": "Soundstage"
    },
    "explanation": "Combining the clues leaves one arrangement: Director Castellano was in the Soundstage with the Clapperboard; Actor Lucian Vale was in the Editing Suite with the Boom Pole; Make-up Artist Bea was in the Costume Trailer with the Prop Sword. The victim was found in the Soundstage, so the culprit is Director Castellano with the Clapperboard."
  },
  {
    "id": "extra-08",
    "title": "Cruise Ship Mystery",
    "story": "The luxury liner Aurelia was far from land when a wealthy passenger was found dead. Mr. Davenport was found dead in the Observation Lounge. Three people were each alone in different parts of the ship, each holding a different item.",
    "suspects": [
      {
        "name": "Captain Ingrid",
        "trait": "Calm in every storm"
      },
      {
        "name": "Chef Antoine",
        "trait": "Temperamental and proud"
      },
      {
        "name": "Magician Zane",
        "trait": "Hides everything up his sleeve"
      }
    ],
    "weapons": [
      {
        "name": "Champagne Bottle",
        "description": "Thick green glass"
      },
      {
        "name": "Brass Telescope",
        "description": "Long and heavy"
      },
      {
        "name": "Deck Winch Handle",
        "description": "Solid iron"
      }
    ],
    "locations": [
      {
        "name": "Casino Deck",
        "description": "Slot machines and chips"
      },
      {
        "name": "Engine Room",
        "description": "Roaring and hot"
      },
      {
        "name": "Observation Lounge",
        "description": "Wide windows over the sea"
      }
    ],
    "clues": [
      "Captain Ingrid was not holding the Brass Telescope.",
      "Neither Captain Ingrid nor Magician Zane was in the Casino Deck.",
      "Neither Captain Ingrid nor Chef Antoine was in the Engine Room.",
      "The person in the Observation Lounge was not holding the Champagne Bottle."
    ],
    "solution": {
      "suspect": "Captain Ingrid",
      "weapon": "Deck Winch Handle",
      "location": "Observation Lounge"
    },
    "explanation": "Combining the clues leaves one arrangement: Captain Ingrid was in the Observation Lounge with the Deck Winch Handle; Chef Antoine was in the Casino Deck with the Champagne Bottle; Magician Zane was in the Engine Room with the Brass Telescope. The victim was found in the Observation Lounge, so the culprit is Captain Ingrid with the Deck Winch Handle."
  },
  {
    "id": "extra-09",
    "title": "The Garden Party",
    "story": "Lady Fenwick's garden party ended in horror when the old colonel was found lifeless. Colonel Thistlewood was found dead in the Rose Garden. Three guests wandered off alone into different corners of the estate, each holding a different item.",
    "suspects": [
      {
        "name": "Lady Fenwick",
        "trait": "Proud of her roses"
      },
      {
        "name": "Gardener Hollis",
        "trait": "Knows every hedge"
      },
      {
        "name": "Vicar Pembroke",
        "trait": "Always has a kind word"
      }
    ],
    "weapons": [
      {
        "name": "Croquet Mallet",
        "description": "Painted wooden head"
      },
      {
        "name": "Pruning Saw",
        "description": "Curved rusty teeth"
      },
      {
        "name": "Stone Gnome",
        "description": "Surprisingly heavy"
      }
    ],
    "locations": [
      {
        "name": "Rose Garden",
        "description": "Thorns and perfume"
      },
      {
        "name": "Gazebo",
        "description": "White lattice and shade"
      },
      {
        "name": "Orangery",
        "description": "Glass roof, warm air"
      }
    ],
    "clues": [
      "Neither Lady Fenwick nor Vicar Pembroke was in the Orangery.",
      "The Stone Gnome was not in the Orangery.",
      "Vicar Pembroke was not holding the Stone Gnome.",
      "Lady Fenwick was not in the Gazebo."
    ],
    "solution": {
      "suspect": "Lady Fenwick",
      "weapon": "Stone Gnome",
      "location": "Rose Garden"
    },
    "explanation": "Combining the clues leaves one arrangement: Lady Fenwick was in the Rose Garden with the Stone Gnome; Gardener Hollis was in the Orangery with the Pruning Saw; Vicar Pembroke was in the Gazebo with the Croquet Mallet. The victim was found in the Rose Garden, so the culprit is Lady Fenwick with the Stone Gnome."
  },
  {
    "id": "extra-10",
    "title": "The Chess Club Murder",
    "story": "The final of the Ravenswood Chess Championship ended with the reigning champion found dead. Champion Orlov was found dead in the Tournament Hall. Three people were alone in different rooms of the club, each holding a different item.",
    "suspects": [
      {
        "name": "Grandmaster Ilya",
        "trait": "Never smiles"
      },
      {
        "name": "Arbiter Mei",
        "trait": "Strict about every rule"
      },
      {
        "name": "Newcomer Fabian",
        "trait": "Won three games in a row"
      }
    ],
    "weapons": [
      {
        "name": "Chess Clock",
        "description": "Heavy brass body"
      },
      {
        "name": "Trophy Cup",
        "description": "Engraved silver"
      },
      {
        "name": "Walking Cane",
        "description": "Silver-topped"
      }
    ],
    "locations": [
      {
        "name": "Tournament Hall",
        "description": "Rows of boards"
      },
      {
        "name": "Analysis Room",
        "description": "Whiteboards of moves"
      },
      {
        "name": "Cafe Corner",
        "description": "Smells of strong coffee"
      }
    ],
    "clues": [
      "Neither Grandmaster Ilya nor Newcomer Fabian was in the Cafe Corner.",
      "Grandmaster Ilya was not holding the Chess Clock.",
      "The Walking Cane was not in the Tournament Hall.",
      "Newcomer Fabian was not in the Tournament Hall."
    ],
    "solution": {
      "suspect": "Grandmaster Ilya",
      "weapon": "Trophy Cup",
      "location": "Tournament Hall"
    },
    "explanation": "Combining the clues leaves one arrangement: Grandmaster Ilya was in the Tournament Hall with the Trophy Cup; Arbiter Mei was in the Cafe Corner with the Walking Cane; Newcomer Fabian was in the Analysis Room with the Chess Clock. The victim was found in the Tournament Hall, so the culprit is Grandmaster Ilya with the Trophy Cup."
  }
];
