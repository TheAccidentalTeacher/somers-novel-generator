// Genre and writing instruction definitions for the AI
// All prompts and instructions should be in the backend for consistency

export const genreInstructions = {
  'sci-fi': {
    name: 'Science Fiction',
    subgenres: {
      'space-opera': {
        name: 'Space Opera',
        instructions: `SPACE OPERA WRITING GUIDELINES:
- Grand scale adventures across galaxies and star systems
- Epic battles between good and evil forces
- Advanced technology seamlessly integrated into daily life
- Diverse alien species with unique cultures and abilities
- Themes of heroism, sacrifice, and the triumph of good over evil
- Focus on adventure and action while maintaining character development
- Include Christian themes of redemption, hope, and divine purpose
- Technology should serve the story, not overwhelm it
- Create vivid, immersive alien worlds and cultures
- Balance large-scale action with intimate character moments`
      },
      'cyberpunk': {
        name: 'Cyberpunk',
        instructions: `CYBERPUNK WRITING GUIDELINES:
- High-tech, low-life setting with advanced technology and social decay
- Themes of humanity vs. technology and corporate control
- Gritty urban environments with neon lights and digital interfaces
- Characters struggling with identity in a digital world
- Questions about what makes us human in an age of enhancement
- Christian themes: soul vs. machine, finding hope in darkness
- Focus on the value of human connection in a disconnected world
- Explore themes of redemption and finding purpose
- Technology as both blessing and curse
- Maintain hope and meaning despite dystopian elements`
      },
      'dystopian': {
        name: 'Dystopian',
        instructions: `DYSTOPIAN WRITING GUIDELINES:
- Oppressive society or government controlling citizens
- Protagonist awakens to the reality of their situation
- Themes of freedom, truth, and the value of individual worth
- Show the importance of faith and hope in dark times
- Contrast the lie of the system with divine truth
- Character growth through resistance and standing for what's right
- Christian themes: good vs. evil, light conquering darkness
- Focus on the power of truth to transform society
- Show that even in the darkest times, God's love endures
- End with hope and the possibility of redemption`
      },
      'hard-sf': {
        name: 'Hard Science Fiction',
        instructions: `HARD SCIENCE FICTION WRITING GUIDELINES:
- Scientifically accurate and plausible technology and scenarios
- Detailed explanations of scientific concepts integrated naturally
- Characters who are scientists, engineers, or researchers
- Exploration of the implications of scientific advancement
- Christian themes: science as a way to understand God's creation
- Wonder at the complexity and beauty of the universe
- Ethical questions about the use of technology
- Balance technical accuracy with compelling storytelling
- Show how scientific discovery can deepen faith
- Explore the relationship between faith and reason`
      }
    }
  },
  
  'fantasy': {
    name: 'Fantasy',
    subgenres: {
      'epic': {
        name: 'Epic Fantasy',
        instructions: `EPIC FANTASY WRITING GUIDELINES:
- Large-scale quest or battle between good and evil
- Rich world-building with detailed magic systems and cultures
- Prophetic elements and divine calling/destiny
- Multiple character viewpoints and complex plots
- Themes of sacrifice, courage, and divine providence
- Magic that reflects spiritual truths and God's power
- Clear distinction between good and evil forces
- Character growth through trials and spiritual development
- Christian allegory woven naturally into the narrative
- Hope triumphing over darkness through divine intervention`
      },
      'urban': {
        name: 'Urban Fantasy',
        instructions: `URBAN FANTASY WRITING GUIDELINES:
- Modern-day setting with hidden magical/supernatural elements
- Protagonist discovers or deals with supernatural threats
- Fast-paced action mixed with character development
- Themes of spiritual warfare and unseen realms
- Christian perspective on supernatural elements
- Angels, demons, and spiritual gifts portrayed biblically
- Modern challenges addressed through spiritual insight
- Balance between supernatural action and real-world problems
- Faith as a source of power and protection
- Show God's presence and protection in dangerous situations`
      },
      'dark': {
        name: 'Dark Fantasy',
        instructions: `DARK FANTASY WRITING GUIDELINES:
- Darker tone with horror and supernatural elements
- Characters facing genuine spiritual darkness and evil
- Themes of redemption conquering even the darkest evil
- Gothic or horror atmosphere with Christian hope
- Focus on the power of faith to overcome darkness
- Show that no one is beyond God's redemption
- Light piercing through the deepest darkness
- Characters tested but ultimately strengthened by trials
- Evil portrayed as real but ultimately defeatable
- Maintain hope and meaning despite dark themes`
      },
      'romantic': {
        name: 'Romantic Fantasy',
        instructions: `ROMANTIC FANTASY WRITING GUIDELINES:
- Central romantic relationship integral to the plot
- Fantasy elements that enhance the romantic storyline
- Themes of sacrificial love and commitment
- Christian view of love, marriage, and relationships
- Romance that honors biblical principles
- Magical elements that symbolize spiritual truths
- Character growth through love and partnership
- Challenges that strengthen rather than threaten the relationship
- Purity and honor in romantic relationships
- Love as a reflection of God's love for humanity`
      }
    }
  },
  
  'romance': {
    name: 'Romance',
    subgenres: {
      'contemporary': {
        name: 'Contemporary Romance',
        instructions: `CONTEMPORARY CHRISTIAN ROMANCE GUIDELINES:
- Modern-day setting with realistic characters and situations
- Central romantic relationship with strong character development
- Christian values and faith central to the story
- Characters who grow spiritually through their relationship
- Realistic challenges that test and strengthen their bond
- Purity and honor in physical and emotional intimacy
- Prayer, scripture, and faith community play important roles
- Themes of forgiveness, trust, and unconditional love
- Avoid unrealistic perfection - show genuine human struggles
- Happy ending that honors God and biblical principles`
      },
      'historical': {
        name: 'Historical Romance',
        instructions: `HISTORICAL CHRISTIAN ROMANCE GUIDELINES:
- Accurate historical setting with rich period details
- Characters whose faith reflects the time period
- Historical challenges that test love and faith
- Christian themes appropriate to the historical context
- Courtship and marriage customs of the era
- Women's roles and societal expectations historically accurate
- Faith practices and church life of the time period
- Historical events that impact the romantic storyline
- Period-appropriate language and dialogue
- Research-based authenticity in customs and daily life`
      },
      'paranormal': {
        name: 'Paranormal Romance',
        instructions: `PARANORMAL CHRISTIAN ROMANCE GUIDELINES:
- Supernatural elements from a Christian worldview
- Angels, prophetic gifts, or spiritual warfare themes
- Romance tested by supernatural challenges
- Biblical perspective on spiritual gifts and supernatural events
- Faith as protection and guidance in supernatural situations
- Avoid occult elements - focus on God's supernatural power
- Characters with spiritual gifts used for God's purposes
- Themes of divine protection and providence
- Supernatural elements that strengthen rather than threaten faith
- Love that transcends physical realm and honors God`
      },
      'suspense': {
        name: 'Romantic Suspense',
        instructions: `ROMANTIC SUSPENSE GUIDELINES:
- Central romantic relationship developed amid danger/mystery
- Fast-paced plot with romantic and suspenseful elements
- Characters who protect and support each other
- Faith as a source of strength during dangerous situations
- Prayer and divine protection in life-threatening moments
- Themes of trust, courage, and relying on God
- Romance that deepens through shared trials
- Realistic danger that tests character and faith
- God's providence evident in protection and resolution
- Balance between romantic development and suspenseful plot`
      }
    }
  },
  
  'mystery': {
    name: 'Mystery',
    subgenres: {
      'cozy': {
        name: 'Cozy Mystery',
        instructions: `COZY CHRISTIAN MYSTERY GUIDELINES:
- Amateur sleuth in small-town or close-knit community setting
- Minimal violence with puzzle-solving focus
- Strong sense of community and Christian fellowship
- Characters who support each other through investigation
- Faith community helps solve mysteries and provides support
- Themes of truth, justice, and community responsibility
- Prayer and wisdom seeking in investigation process
- Gentle humor and warm relationships
- Resolution that brings justice and healing to the community
- Focus on character relationships and spiritual growth`
      },
      'hardboiled': {
        name: 'Hard-boiled Mystery',
        instructions: `HARD-BOILED CHRISTIAN MYSTERY GUIDELINES:
- Gritty, realistic detective work in urban setting
- Morally complex characters seeking truth and justice
- Christian detective/protagonist with strong moral compass
- Themes of justice, redemption, and fighting corruption
- Faith tested by exposure to human darkness and evil
- Grace and forgiveness even for criminals and enemies
- Realistic portrayal of crime's impact on community
- Detective work as a calling to serve truth and protect others
- Hope and redemption possible even in darkest situations
- Balance realism with Christian hope and values`
      },
      'police': {
        name: 'Police Procedural',
        instructions: `POLICE PROCEDURAL GUIDELINES:
- Realistic police work and investigation procedures
- Team dynamics and professional relationships
- Christian officers using faith to guide their work
- Themes of service, protection, and seeking justice
- Prayer and wisdom in difficult decisions
- Balancing law enforcement with Christian compassion
- Supporting victims and their families
- Professional integrity and moral courage
- Faith community supporting officers and their families
- Resolution that serves both justice and mercy`
      },
      'psychological': {
        name: 'Psychological Mystery',
        instructions: `PSYCHOLOGICAL CHRISTIAN MYSTERY GUIDELINES:
- Deep exploration of character motivations and mental states
- Complex psychological puzzles and character development
- Themes of healing, forgiveness, and psychological restoration
- Christian counseling or pastoral care elements
- Mental health portrayed with compassion and understanding
- Faith as healing and strength in psychological struggles
- Realistic portrayal of trauma and recovery
- Hope for healing and wholeness through God's love
- Professional help combined with spiritual support
- Resolution that brings both understanding and healing`
      }
    }
  }
};

// Helper function to get genre instructions
export function getGenreInstructions(genre, subgenre) {
  const genreData = genreInstructions[genre];
  if (!genreData) return '';
  
  const subgenreData = genreData.subgenres[subgenre];
  if (!subgenreData) return '';
  
  return subgenreData.instructions;
}

// Helper function to get all available genres
export function getAvailableGenres() {
  return Object.entries(genreInstructions).map(([key, genre]) => ({
    key,
    name: genre.name,
    subgenres: Object.entries(genre.subgenres).map(([subKey, subgenre]) => ({
      key: subKey,
      name: subgenre.name
    }))
  }));
}
