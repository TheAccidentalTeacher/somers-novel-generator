// Conflict types definition
export const CONFLICT_TYPES = {
  INTERNAL: {
    PERSON_VS_SELF: {
      id: 'person_vs_self',
      name: 'Person vs. Self',
      description: 'Internal struggles with thoughts, beliefs, values, moral dilemmas',
      examples: ['Identity crisis', 'Moral conflict', 'Self-doubt', 'Faith questioning']
    },
    PERSON_VS_FATE: {
      id: 'person_vs_fate',
      name: 'Person vs. Fate',
      description: 'Struggling against destiny, calling, predetermined circumstances',
      examples: ['Accepting divine calling', 'Fighting prophecy', 'Embracing purpose']
    }
  },
  EXTERNAL: {
    PERSON_VS_PERSON: {
      id: 'person_vs_person',
      name: 'Person vs. Person',
      description: 'Protagonist against antagonist with opposing goals',
      examples: ['Hero vs villain', 'Romantic rivals', 'Family conflict']
    },
    PERSON_VS_SOCIETY: {
      id: 'person_vs_society',
      name: 'Person vs. Society',
      description: 'Fighting against societal constructs, traditions, institutions',
      examples: ['Cultural rebellion', 'Social reform', 'Traditional vs modern']
    },
    PERSON_VS_NATURE: {
      id: 'person_vs_nature',
      name: 'Person vs. Nature',
      description: 'Struggling against natural forces or environments',
      examples: ['Survival stories', 'Natural disasters', 'Environmental challenges']
    },
    PERSON_VS_SUPERNATURAL: {
      id: 'person_vs_supernatural',
      name: 'Person vs. Supernatural',
      description: 'Facing otherworldly entities, monsters, spiritual forces',
      examples: ['Spiritual warfare', 'Demon battles', 'Divine intervention']
    },
    PERSON_VS_TECHNOLOGY: {
      id: 'person_vs_technology',
      name: 'Person vs. Technology',
      description: 'Contending with technological or scientific creations',
      examples: ['AI uprising', 'Scientific ethics', 'Technology dependence']
    }
  }
};

// Genre-specific conflict patterns
export const GENRE_CONFLICT_PATTERNS = {
  CHRISTIAN_FICTION: {
    name: 'Christian Fiction',
    characteristics: [
      'Moral and ethical dilemmas viewed through Christian lens',
      'Spiritual growth as key component of character development',
      'Faith-based resolution to conflicts',
      'Integration of prayer, scripture, and divine intervention',
      'Balance spiritual solutions with narrative tension'
    ],
    preferredConflicts: ['person_vs_self', 'person_vs_supernatural', 'person_vs_society'],
    actStructure: {
      actI: {
        focus: 'Establishes protagonist\'s spiritual state and worldview',
        conflicts: 'Introduces faith-related challenges or questions',
        incitingIncident: 'Challenge to character\'s faith or moral convictions'
      },
      actII: {
        focus: 'Characters face escalating challenges that test their faith',
        conflicts: 'Spiritual doubts often emerge at midpoint',
        secondary: 'Relationships with non-believers or different spiritual maturity'
      },
      actIII: {
        focus: 'Resolution involves spiritual growth and renewed faith',
        conflicts: 'Character transformation reflects personal and spiritual development',
        denouement: 'Emphasizes how faith has changed protagonist\'s perspective'
      }
    },
    subgenres: {
      CHRISTIAN_ROMANCE: {
        name: 'Christian Romance',
        conflicts: ['person_vs_person', 'person_vs_self', 'person_vs_society', 'person_vs_fate'],
        themes: ['Love within moral boundaries', 'Divine timing', 'Forgiveness', 'Redemption']
      },
      AMISH_FICTION: {
        name: 'Amish Fiction',
        conflicts: ['person_vs_society', 'person_vs_self', 'person_vs_person'],
        themes: ['Community vs individual desires', 'Traditional vs modern', 'Faith vs temptation']
      },
      CHRISTIAN_SUSPENSE: {
        name: 'Christian Suspense',
        conflicts: ['person_vs_person', 'person_vs_self', 'person_vs_society', 'person_vs_supernatural'],
        themes: ['Good vs evil', 'Faith under pressure', 'Moral choices in danger']
      }
    }
  }
};

// Romance beat templates
export const ROMANCE_BEAT_TEMPLATES = {
  ALANA_TERRY_CLASSIC: {
    name: 'Alana Terry Classic Christian Romance',
    description: '12-part structure for authentic Christian romance',
    guidelines: {
      pov: '3rd person deep POV, heroine only',
      content: 'Clean and wholesome, faith-integrated',
      conflicts: 'Three main conflicts: external motivation, internal struggles, danger/intrigue',
      faith: 'Faith journey critical to plot and character development'
    },
    beats: [
      {
        name: 'Meet Cute',
        percentage: '0-8%',
        description: 'Hero and heroine meet in memorable way',
        guidance: 'Establish immediate attraction with potential conflict'
      },
      {
        name: 'Inciting Incident',
        percentage: '8-15%',
        description: 'Event forces hero and heroine together',
        guidance: 'Create situation requiring ongoing interaction'
      },
      {
        name: 'Getting to Know You',
        percentage: '15-25%',
        description: 'Characters learn about each other',
        guidance: 'Develop emotional connection, reveal character depths'
      },
      {
        name: 'First Kiss',
        percentage: '25-30%',
        description: 'Physical attraction acknowledged',
        guidance: 'Emotional milestone, deepen romantic tension'
      },
      {
        name: 'Relationship Deepens',
        percentage: '30-45%',
        description: 'Growing emotional intimacy',
        guidance: 'Share vulnerabilities, spiritual discussions'
      },
      {
        name: 'Midpoint Crisis',
        percentage: '45-55%',
        description: 'Major obstacle threatens relationship',
        guidance: 'Test faith and commitment, raise stakes'
      },
      {
        name: 'Working Together',
        percentage: '55-65%',
        description: 'Unite against common challenge',
        guidance: 'Demonstrate compatibility, shared values'
      },
      {
        name: 'Declaration of Love',
        percentage: '65-70%',
        description: 'Feelings openly acknowledged',
        guidance: 'Emotional climax, spiritual alignment'
      },
      {
        name: 'Dark Moment',
        percentage: '70-80%',
        description: 'Relationship seems impossible',
        guidance: 'Greatest test of faith and love'
      },
      {
        name: 'Spiritual Growth',
        percentage: '80-85%',
        description: 'Character transformation through faith',
        guidance: 'Divine guidance, prayer, spiritual revelation'
      },
      {
        name: 'Grand Gesture',
        percentage: '85-95%',
        description: 'Heroic action proves love',
        guidance: 'Sacrifice, commitment demonstration'
      },
      {
        name: 'Happily Ever After',
        percentage: '95-100%',
        description: 'Resolution and commitment',
        guidance: 'Marriage proposal, spiritual blessing, future hope'
      }
    ]
  }
};
