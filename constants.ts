
export const COLORS = {
  // Mode-Specific Themes
  NORMAL: {
    BACKGROUND: '#FAFAFA',
    PLAYER: '#2D3436',
    PLAYER_OUTLINE: '#000000',
    BULLET: '#2D3436',
    TEXT: '#2D3436',
    GRID: 'transparent',
    PARTICLE_BLEND: 'source-over' as GlobalCompositeOperation,
  },
  HARD: {
    BACKGROUND: '#000000',
    PLAYER: '#FFFFFF',
    PLAYER_OUTLINE: '#FFFFFF', // White outline for glow
    BULLET: '#00FFFF', // Cyan bullets
    TEXT: '#FFFFFF',
    GRID: '#111111',
    PARTICLE_BLEND: 'lighter' as GlobalCompositeOperation,
  }
};

// Retro Neon Hues (Red, Orange, Yellow, Lime, Cyan, Magenta)
export const ENEMY_HUES = [0, 30, 60, 120, 180, 300];

export const CONFIG = {
  PLAYER_SPEED_LERP: 0.08,
  PLAYER_RADIUS: 10,
  BULLET_SPEED: 12,
  BULLET_RADIUS: 3,
  
  // Advanced Shooting Config
  SHOOTING: {
    BASE_INTERVAL: 400,
    MIN_INTERVAL: 100,
    BASE_POST_HIT_DISTANCE: 200,
    DECAY_FACTOR: 0.4,
  },

  ENEMY_SPEED: 1.75,
  
  // Particle Configs (Dynamic per mode)
  PARTICLE: {
    NORMAL: { COUNT: 12, SPEED: 5, FRICTION: 0.95, LIFE_DECAY: 0.03 },
    HARD:   { COUNT: 25, SPEED: 8, FRICTION: 0.92, LIFE_DECAY: 0.04 }
  },
  
  // Dynamic Spawning Config
  SPAWN: {
    BASE_INTERVAL: 1200, 
    MIN_INTERVAL: 100,
    MAX_INTERVAL: 2000,
    SAFE_ZONE_START: 600,
    SAFE_ZONE_MIN: 200,
    SECTOR_COUNT: 9,
  }
};
