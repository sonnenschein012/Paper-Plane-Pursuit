
export interface Vector2D {
  x: number;
  y: number;
}

export interface Entity {
  id: string;
  pos: Vector2D;
  velocity: Vector2D;
  radius: number;
  color: string;
  markedForDeletion: boolean;
}

export interface Player extends Entity {
  angle: number;
}

export interface Enemy extends Entity {
  hp: number;
  hueIndex: number; // To track color distribution
  borderColor: string; // Darker shade for the outline
}

export interface Bullet extends Entity {
  distanceTraveled: number;
  maxRange: number;
  penetrationCount: number;
}

export interface Particle extends Entity {
  life: number; // 0 to 1
  maxLife: number;
}

export type Difficulty = 'NORMAL' | 'HARD';
export type GamePhase = 'MENU' | 'PLAYING' | 'GAMEOVER';

export interface GameState {
  score: number;
  phase: GamePhase;
}
