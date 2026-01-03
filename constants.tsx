
import { Motion } from './types';

export const COLORS = {
  bg: '#F7F4EA',
  line: '#000000',
  highlight: '#F3C85F', // Sponge Yellow
  secondary: '#AAB7E8', // Pastel Blue
  startTitle: '#45A8FF',
  menuTitle: '#000000',
  hintText: '#888888',
  guideRingStart: 'rgba(204, 204, 204, 0)',
  guideRingEnd: '#CCCCCC',
  bubbleFill1: '#45D3FF',
  bubbleFill2: '#458FFF',
  bubbleOutline: '#0069D8',
  text: '#000000',
  teaStain: '#8B4513', // Brown
};

export const GAME_CONSTANTS = {
  lineWidthStandard: 4,
  lineWidthThin: 2,
  lineWidthTitleStroke: 1,
  spongeRadius: 42.75, // 45 * 0.95 (5% reduction as requested)
  scrubSensitivity: 0.8,
  decayRate: 0.3,
  warmupReps: 5,
  startBubbleCount: 80,
  waitDelayMs: 3000, // Exactly 3 seconds
};

export const MOTIONS: Motion[] = [
  {
    id: 'flex_ext',
    label: 'PUSH\n&\nPULL',
    type: 'vertical',
    iconColor: '#FF6B6B',
    drawIcon: (ctx, x, y, s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      const h = s * 0.8;
      ctx.moveTo(x, y - h / 2); ctx.lineTo(x, y + h / 2);
      ctx.moveTo(x - s / 4, y - h / 2 + s / 4); ctx.lineTo(x, y - h / 2); ctx.lineTo(x + s / 4, y - h / 2 + s / 4);
      ctx.moveTo(x - s / 4, y + h / 2 - s / 4); ctx.lineTo(x, y + h / 2); ctx.lineTo(x + s / 4, y + h / 2 - s / 4);
      ctx.stroke();
    }
  },
  {
    id: 'hor_abd',
    label: 'SIDE\nTO\nSIDE',
    type: 'horizontal',
    iconColor: '#4ECDC4',
    drawIcon: (ctx, x, y, s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      const w = s * 0.8;
      ctx.beginPath();
      ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y);
      ctx.moveTo(x - w / 2 + s / 4, y - s / 4); ctx.lineTo(x - w / 2, y); ctx.lineTo(x - w / 2 + s / 4, y + s / 4);
      ctx.moveTo(x + w / 2 - s / 4, y - s / 4); ctx.lineTo(x + w / 2, y); ctx.lineTo(x + w / 2 - s / 4, y + s / 4);
      ctx.stroke();
    }
  },
  {
    id: 'abd_add',
    label: 'ARC\nSWING',
    type: 'fan',
    iconColor: '#FFE66D',
    drawIcon: (ctx, x, y, s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y + s * 0.4, s * 0.7, -Math.PI * 0.8, -Math.PI * 0.2);
      ctx.stroke();
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(x, y + s * 0.4, 4, 0, Math.PI * 2);
      ctx.fill();
    }
  },
  {
    id: 'circular',
    label: 'CIRCLE',
    type: 'circle',
    iconColor: '#1A535C',
    drawIcon: (ctx, x, y, s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(x, y, s * 0.6, 0, Math.PI * 1.5);
      ctx.stroke();
      const endAngle = Math.PI * 1.5;
      const r = s * 0.6;
      const tipX = x + Math.cos(endAngle) * r;
      const tipY = y + Math.sin(endAngle) * r;
      ctx.beginPath();
      ctx.moveTo(tipX - 5, tipY - 5);
      ctx.lineTo(tipX + 5, tipY);
      ctx.lineTo(tipX - 5, tipY + 5);
      ctx.stroke();
    }
  },
  {
    id: 'fig_8',
    label: 'FIGURE\n8',
    type: 'infinity',
    iconColor: '#FF9F1C',
    drawIcon: (ctx, x, y, s, color) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.lineCap = 'round';
      ctx.beginPath();
      const w = s * 0.8;
      for (let t = 0; t < Math.PI * 2; t += 0.1) {
        let px = x + (w) * Math.cos(t) / (1 + Math.sin(t) ** 2);
        let py = y + (w) * Math.cos(t) * Math.sin(t) / (1 + Math.sin(t) ** 2);
        if (t === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.stroke();
    }
  }
];
