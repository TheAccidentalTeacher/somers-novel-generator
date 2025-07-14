// Frontend copy of conflict data structures

export const conflictTypes = {
  "person_vs_self": {
    name: "Person vs. Self",
    description: "Internal struggle with doubt, fear, identity, or moral dilemma",
    beats: [
      { name: "The Lie", description: "Character believes something false about themselves or God" },
      { name: "The Want", description: "What the character thinks they need" },
      { name: "The Need", description: "What they actually need (usually spiritual growth)" },
      { name: "First Glimpse", description: "Hint of the truth they'll eventually learn" },
      { name: "The Catalyst", description: "Event that begins the internal journey" },
      { name: "Debate", description: "Character wrestles with change" },
      { name: "Commitment", description: "Character decides to face their internal conflict" },
      { name: "Resistance", description: "Old patterns fight back" },
      { name: "Crisis", description: "Moment of greatest internal struggle" },
      { name: "Revelation", description: "Character sees the truth" },
      { name: "Transformation", description: "Character changes internally" },
      { name: "New Life", description: "Living in the truth they've discovered" }
    ]
  },
  
  "person_vs_person": {
    name: "Person vs. Person",
    description: "Conflict between protagonist and another character",
    beats: [
      { name: "Introduction", description: "Meet both protagonist and antagonist" },
      { name: "Inciting Incident", description: "First clash between them" },
      { name: "Rising Action", description: "Escalating conflicts and confrontations" },
      { name: "Midpoint", description: "Major revelation or shift in their relationship" },
      { name: "Crisis", description: "Biggest confrontation or betrayal" },
      { name: "Climax", description: "Final face-to-face resolution" },
      { name: "Resolution", description: "New understanding or forgiveness" }
    ]
  },
  
  "person_vs_society": {
    name: "Person vs. Society",
    description: "Character challenges or is challenged by societal norms, systems, or expectations",
    beats: [
      { name: "Conformity", description: "Character initially fits into society" },
      { name: "Awakening", description: "Realizes something is wrong with the system" },
      { name: "Questioning", description: "Begins to doubt societal norms" },
      { name: "Resistance", description: "Takes first steps to resist or change" },
      { name: "Persecution", description: "Society pushes back against the character" },
      { name: "Isolation", description: "Character stands alone in their convictions" },
      { name: "Truth", description: "Character's position is validated" },
      { name: "Change", description: "Society begins to transform or character finds their place" }
    ]
  },
  
  "person_vs_nature": {
    name: "Person vs. Nature",
    description: "Character struggles against natural forces, disasters, or wilderness",
    beats: [
      { name: "Preparation", description: "Character enters the natural challenge" },
      { name: "First Challenge", description: "Initial obstacle from nature" },
      { name: "Adaptation", description: "Learning to work with natural forces" },
      { name: "Escalation", description: "Nature becomes more threatening" },
      { name: "Crisis", description: "Life-threatening natural disaster or challenge" },
      { name: "Surrender", description: "Character must rely on faith/others/inner strength" },
      { name: "Resolution", description: "Harmony with nature or successful escape" }
    ]
  },
  
  "person_vs_supernatural": {
    name: "Person vs. Supernatural",
    description: "Conflict involving spiritual warfare, demons, angels, or divine intervention",
    beats: [
      { name: "Normal World", description: "Character's life before supernatural encounter" },
      { name: "Supernatural Incursion", description: "First contact with spiritual realm" },
      { name: "Disbelief", description: "Character struggles to accept reality" },
      { name: "Acceptance", description: "Acknowledging the supernatural conflict" },
      { name: "Spiritual Warfare", description: "Active battle in the spiritual realm" },
      { name: "Divine Intervention", description: "God's power becomes evident" },
      { name: "Victory", description: "Supernatural conflict resolved through faith" },
      { name: "New Understanding", description: "Changed perspective on spiritual reality" }
    ]
  },
  
  "person_vs_technology": {
    name: "Person vs. Technology",
    description: "Character conflicts with technological systems, AI, or modern dependencies",
    beats: [
      { name: "Dependence", description: "Character relies heavily on technology" },
      { name: "Malfunction", description: "Technology begins to fail or turn against them" },
      { name: "Escalation", description: "Technological problems multiply" },
      { name: "Isolation", description: "Cut off from technological support" },
      { name: "Adaptation", description: "Learning to live without technology" },
      { name: "Confrontation", description: "Final battle with technological antagonist" },
      { name: "Balance", description: "Finding healthy relationship with technology" }
    ]
  }
};

export const genrePatterns = {
  "Contemporary Christian Fiction": {
    description: "Modern-day stories exploring faith in everyday life",
    commonThemes: ["family relationships", "community", "personal growth", "finding purpose"],
    structure: "Character-driven with emphasis on internal change and relationship healing"
  },
  
  "Historical Christian Fiction": {
    description: "Stories set in the past, often exploring how faith sustained people through difficult times",
    commonThemes: ["persecution", "historical events", "cultural challenges", "timeless faith"],
    structure: "Event-driven with historical backdrop supporting spiritual themes"
  },
  
  "Christian Romance": {
    description: "Love stories that honor Christian values and include spiritual growth",
    commonThemes: ["pure love", "waiting on God's timing", "overcoming past hurts", "building godly relationships"],
    structure: "Romance arc integrated with spiritual journey for both characters"
  },
  
  "Christian Suspense/Thriller": {
    description: "Fast-paced stories with danger, mystery, and spiritual warfare elements",
    commonThemes: ["good vs evil", "protection", "justice", "faith under pressure"],
    structure: "Plot-driven with high stakes and spiritual elements woven throughout"
  },
  
  "Christian Fantasy": {
    description: "Imaginative worlds with Christian allegory and spiritual themes",
    commonThemes: ["redemption", "sacrifice", "good vs evil", "divine calling"],
    structure: "Hero's journey with clear spiritual parallels and allegory"
  },
  
  "Biblical Fiction": {
    description: "Stories based on or inspired by biblical events and characters",
    commonThemes: ["obedience to God", "divine providence", "redemption", "faith tested"],
    structure: "Following biblical narrative with creative interpretation and character development"
  },
  
  "Inspirational Fiction": {
    description: "Stories that uplift and encourage readers through difficult circumstances",
    commonThemes: ["hope", "healing", "second chances", "community support"],
    structure: "Problem-resolution with emphasis on positive spiritual outcome"
  },
  
  "Christian Literary Fiction": {
    description: "Character-driven stories with deep exploration of faith and human nature",
    commonThemes: ["doubt and faith", "moral complexity", "spiritual questioning", "grace"],
    structure: "Literary approach with spiritual themes woven into complex character studies"
  }
};

// Alana Terry's 12-Beat Romance Structure
export const romanceBeats = [
  {
    beat: 1,
    name: "Setup",
    description: "Introduce your heroine in her ordinary world, showing what's missing in her life",
    placement: "Opening chapters",
    integration: "Show protagonist's life before the central conflict begins"
  },
  {
    beat: 2,
    name: "Meet Cute",
    description: "First meeting between hero and heroine - should be memorable and hint at their dynamic",
    placement: "Early in story (10-15%)",
    integration: "Can coincide with or trigger the inciting incident"
  },
  {
    beat: 3,
    name: "Inciting Incident",
    description: "Event that throws heroine's world off balance and begins the main story",
    placement: "Around 10-15%",
    integration: "Often connects to meeting the hero or main conflict"
  },
  {
    beat: 4,
    name: "Plot Point 1",
    description: "Heroine decides to pursue her goal, point of no return",
    placement: "Around 20-25%",
    integration: "Commitment to solving main conflict, hero involved in decision"
  },
  {
    beat: 5,
    name: "First Pinch Point",
    description: "Reminder of what's at stake, pressure increases",
    placement: "Around 35%",
    integration: "Obstacles in both main plot and romantic development"
  },
  {
    beat: 6,
    name: "Midpoint",
    description: "Major shift - false victory or defeat, everything changes",
    placement: "Around 50%",
    integration: "Major revelation in main plot affects romantic relationship"
  },
  {
    beat: 7,
    name: "Second Pinch Point",
    description: "Stakes raised higher, things look dire",
    placement: "Around 65%",
    integration: "Both main conflict and romantic tension reach new heights"
  },
  {
    beat: 8,
    name: "Plot Point 2",
    description: "New information or event changes everything, leads to final act",
    placement: "Around 75-80%",
    integration: "Crisis point for both main story and relationship"
  },
  {
    beat: 9,
    name: "Dark Moment",
    description: "All seems lost, both in external plot and romance",
    placement: "Around 80-85%",
    integration: "Protagonist faces greatest challenge, relationship seems doomed"
  },
  {
    beat: 10,
    name: "Epiphany",
    description: "Heroine realizes what she must do, finds inner strength",
    placement: "Around 85-90%",
    integration: "Spiritual breakthrough that affects both conflicts"
  },
  {
    beat: 11,
    name: "Climax",
    description: "Final confrontation and resolution of main conflict",
    placement: "Around 90-95%",
    integration: "External conflict resolved, often through character growth"
  },
  {
    beat: 12,
    name: "HEA (Happily Ever After)",
    description: "New world established, romantic relationship confirmed",
    placement: "Final 5%",
    integration: "Both main conflict and romantic arc satisfyingly concluded"
  }
];

export default {
  conflictTypes,
  genrePatterns,
  romanceBeats
};
