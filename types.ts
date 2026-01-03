
export enum GameState {
  START = 'START',
  MENU = 'MENU',
  MODE_SELECT = 'MODE_SELECT',
  WARMUP = 'WARMUP',
  GAME = 'GAME',
  RESULTS = 'RESULTS'
}

export type MotionType = 'vertical' | 'horizontal' | 'fan' | 'circle' | 'infinity';

export interface Motion {
  id: string;
  label: string;
  type: MotionType;
  iconColor: string;
  drawIcon: (ctx: CanvasRenderingContext2D, x: number, y: number, s: number, color: string) => void;
}

export interface Particle {
  x: number;
  y: number;
  r: number;
  active: boolean;
}

export interface BubbleData {
  x: number;
  y: number;
  originX: number;
  originY: number;
  r: number;
  active: boolean;
  wobbleSpeed: number;
  wobbleRange: number;
  wobbleOffset: number;
  color: string;
}

export interface GameResult {
  success: boolean;
  score: number;
  motion: Motion | null;
  mode: string;
}
