
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { GameState, Motion, GameResult, BubbleData, Particle } from './types';
import { COLORS, GAME_CONSTANTS, MOTIONS } from './constants';
import { getCoachFeedback } from './services/geminiService';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [selectedMotion, setSelectedMotion] = useState<Motion | null>(null);
  const [selectedMode, setSelectedMode] = useState<'speed' | 'endurance' | null>(null);
  const [result, setResult] = useState<GameResult | null>(null);
  const [coachTip, setCoachTip] = useState<string>("");
  const [loadingTip, setLoadingTip] = useState(false);
  const [spongeLoaded, setSpongeLoaded] = useState(false);

  // Interaction State
  const mouseRef = useRef({ x: -100, y: -100, speed: 0, isDown: false, lastX: -100, lastY: -100 });
  
  // Game Entities Refs
  const bubblesRef = useRef<BubbleData[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const menuButtonsRef = useRef<any[]>([]);
  const spongeImageRef = useRef<HTMLImageElement | null>(null);

  const gameDataRef = useRef({
    timer: 0,
    score: 0,
    warmupCount: 0,
    warmupDir: 1,
    lastMoveTime: Date.now(),
    startAnimY: 0,
    exitStartTime: 0,
    animatingOut: false,
    waitingForExit: false,
    returnProg: 0,
    guideRotation: 0
  });

  const noiseCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const stainCanvasRef = useRef<HTMLCanvasElement | null>(null);

  // -- Initializers --
  const initStartScreen = useCallback(() => {
    bubblesRef.current = Array.from({ length: GAME_CONSTANTS.startBubbleCount }, () => ({
      originX: Math.random() * window.innerWidth,
      originY: Math.random() * window.innerHeight,
      x: 0, y: 0,
      r: 25 + Math.random() * 35,
      active: true,
      wobbleSpeed: 0.001 + Math.random() * 0.002,
      wobbleRange: 5 + Math.random() * 10,
      wobbleOffset: Math.random() * Math.PI * 2,
      color: Math.random() > 0.5 ? COLORS.bubbleFill1 : COLORS.bubbleFill2
    }));
    gameDataRef.current.waitingForExit = false;
    gameDataRef.current.animatingOut = false;
    gameDataRef.current.startAnimY = 0;
  }, []);

  const initMenu = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const btnSize = Math.min(w, h) * 0.264; // btnSize + 10%
    const gap = btnSize * 0.322; // gap + 15%
    const totalW = MOTIONS.length * btnSize + (MOTIONS.length - 1) * gap;
    let startX = (w - totalW) / 2 + btnSize / 2;

    menuButtonsRef.current = MOTIONS.map((m, i) => ({
      x: startX + i * (btnSize + gap),
      y: h / 2 + 50,
      r: btnSize / 2,
      label: m.label,
      iconFunc: m.drawIcon,
      iconColor: m.iconColor,
      data: m,
      progress: 0,
      completed: false
    }));
  }, []);

  const initModeSelect = useCallback(() => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    const btnSize = Math.min(w, h) * 0.22;

    menuButtonsRef.current = [
      {
        x: w * 0.35, y: h / 2, r: btnSize / 2,
        label: 'SPEED', id: 'speed', progress: 0, completed: false,
        iconColor: '#000000',
        iconFunc: (ctx: any, x: any, y: any, s: any, c: any) => {
          ctx.strokeStyle = c; ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
          ctx.beginPath(); ctx.moveTo(x + s / 4, y - s / 2); ctx.lineTo(x - s / 4, y); ctx.lineTo(x, y);
          ctx.lineTo(x - s / 4, y + s / 2); ctx.lineTo(x + s / 4, y - 0.1 * s); ctx.lineTo(x, y - 0.1 * s); ctx.stroke();
        }
      },
      {
        x: w * 0.65, y: h / 2, r: btnSize / 2,
        label: 'ENDURANCE', id: 'endurance', progress: 0, completed: false,
        iconColor: '#000000',
        iconFunc: (ctx: any, x: any, y: any, s: any, c: any) => {
          ctx.strokeStyle = c; ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
          ctx.beginPath(); ctx.arc(x, y, s / 3, Math.PI, 0);
          ctx.moveTo(x - s / 3, y); ctx.lineTo(x - s / 3, y + s / 3); ctx.moveTo(x + s / 3, y); ctx.lineTo(x + s / 3, y + s / 3);
          ctx.moveTo(x - s / 3, y + s / 3); ctx.lineTo(x + s / 3, y + s / 3); ctx.stroke();
        }
      }
    ];
  }, []);

  const generateNoise = useCallback((w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    ctx.fillStyle = COLORS.bg;
    ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = "rgba(0,0,0,0.035)";
    for (let i = 0; i < (w * h) * 0.05; i++) {
      ctx.fillRect(Math.random() * w, Math.random() * h, 2, 2);
    }
    noiseCanvasRef.current = canvas;
  }, []);

  const generateStains = useCallback((w: number, h: number) => {
    const canvas = document.createElement('canvas');
    canvas.width = w; canvas.height = h;
    const ctx = canvas.getContext('2d')!;
    const borderX = w * 0.15;
    const borderY = h * 0.15;
    ctx.strokeStyle = `rgba(139, 69, 19, 0.1)`; // Alpha 0.1
    const count = 10 + Math.floor(Math.random() * 5);
    let created = 0;
    while (created < count) {
      const x = Math.random() * w;
      const y = Math.random() * h;
      // Placement Logic: Distribute ONLY along the extreme borders (outer 15%). Strictly exclude center.
      const isInside = (x > borderX && x < (w - borderX) && y > borderY && y < (h - borderY));
      if (isInside) continue;

      const r = 40 + Math.random() * 60;
      ctx.lineWidth = 3 + Math.random() * 5;
      ctx.beginPath();
      for (let t = 0; t <= Math.PI * 2; t += 0.3) {
        const rOffset = (Math.random() - 0.5) * 12;
        const px = x + (r + rOffset) * Math.cos(t);
        const py = y + (r + rOffset) * Math.sin(t);
        if (t === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
      }
      ctx.closePath(); ctx.stroke();
      created++;
    }
    stainCanvasRef.current = canvas;
  }, []);

  const initGame = useCallback((motion: Motion, mode: string) => {
    const w = window.innerWidth;
    const h = window.innerHeight;
    gameDataRef.current.timer = mode === 'speed' ? 30 : 0;
    gameDataRef.current.score = 0;
    gameDataRef.current.lastMoveTime = Date.now();
    
    particlesRef.current = [];
    const size = Math.min(w, h) * 0.7;
    const count = 300;

    for (let i = 0; i < count; i++) {
      let px, py;
      if (motion.type === 'vertical') {
        px = w / 2 + (Math.random() - 0.5) * 120;
        py = h * 0.15 + Math.random() * h * 0.7;
      } else if (motion.type === 'horizontal') {
        px = w * 0.15 + Math.random() * w * 0.7;
        py = h / 2 + (Math.random() - 0.5) * 120;
      } else if (motion.type === 'circle') {
        let a = Math.random() * Math.PI * 2;
        let r = Math.random() * (size / 3);
        px = w / 2 + Math.cos(a) * r;
        py = h / 2 + Math.sin(a) * r;
      } else if (motion.type === 'fan') {
        let a = -Math.PI * 1.25 + Math.random() * Math.PI / 2;
        let r = size / 4 + Math.random() * size / 2;
        px = w / 2 + Math.cos(a) * r;
        py = h * 0.8 + Math.sin(a) * r;
      } else { // infinity
        let t = Math.random() * Math.PI * 2;
        let s = size / 4;
        px = w / 2 + s * Math.cos(t) / (1 + Math.sin(t) ** 2);
        py = h / 2 + s * Math.cos(t) * Math.sin(t) / (1 + Math.sin(t) ** 2);
      }

      particlesRef.current.push({
        x: px + (Math.random() - 0.5) * 20,
        y: py + (Math.random() - 0.5) * 20,
        r: 10 + Math.random() * 15,
        active: true
      });
    }
  }, []);

  // -- Game Loop Logic --
  const update = useCallback((time: number) => {
    const { x, y, speed } = mouseRef.current;
    const data = gameDataRef.current;
    
    // Animation Speed: Reduced by 30% (Slower, gentle rotation)
    // Old speed was 0.05. New is 0.035.
    data.guideRotation += 0.035;

    if (gameState === GameState.START) {
      let activeCount = 0;
      bubblesRef.current.forEach(b => {
        if (!b.active) return;
        activeCount++;
        const t = Date.now();
        b.x = b.originX + Math.sin(t * b.wobbleSpeed + b.wobbleOffset) * b.wobbleRange;
        b.y = b.originY + Math.cos(t * b.wobbleSpeed + b.wobbleOffset) * b.wobbleRange;
        const dx = x - b.x; const dy = y - b.y;
        if (Math.sqrt(dx * dx + dy * dy) < GAME_CONSTANTS.spongeRadius + b.r) b.active = false;
      });

      if (activeCount === 0 && !data.waitingForExit && !data.animatingOut) {
        data.waitingForExit = true;
        data.exitStartTime = Date.now();
      }
      if (data.waitingForExit && !data.animatingOut && Date.now() - data.exitStartTime > GAME_CONSTANTS.waitDelayMs) {
        data.animatingOut = true;
      }
      if (data.animatingOut) {
        data.startAnimY += 12;
        if (data.startAnimY > window.innerHeight + 400) {
          setGameState(GameState.MENU);
          initMenu();
        }
      }
    } else if (gameState === GameState.MENU || gameState === GameState.MODE_SELECT) {
      menuButtonsRef.current.forEach(btn => {
        const dx = x - btn.x; const dy = y - btn.y;
        if (Math.sqrt(dx * dx + dy * dy) < btn.r && speed > 1) {
          btn.progress += GAME_CONSTANTS.scrubSensitivity;
        } else {
          btn.progress = Math.max(0, btn.progress - 0.5);
        }
        if (btn.progress >= 100 && !btn.completed) {
          btn.completed = true;
          if (gameState === GameState.MENU) {
            setSelectedMotion(btn.data);
            setGameState(GameState.MODE_SELECT);
            initModeSelect();
          } else {
            setSelectedMode(btn.id);
            setGameState(GameState.WARMUP);
            data.warmupCount = 0;
            data.warmupDir = 1;
          }
        }
      });
    } else if (gameState === GameState.WARMUP) {
      const cx = window.innerWidth / 2;
      const cy = window.innerHeight / 2;
      const top = cy - 200;
      const bot = cy + 200;
      if (data.warmupDir === 1 && y > bot - 50 && Math.abs(x - cx) < 100) {
        data.warmupDir = -1; data.warmupCount++;
      } else if (data.warmupDir === -1 && y < top + 50 && Math.abs(x - cx) < 100) {
        data.warmupDir = 1; data.warmupCount++;
      }
      if (data.warmupCount >= GAME_CONSTANTS.warmupReps) {
        if (selectedMotion && selectedMode) {
          initGame(selectedMotion, selectedMode);
          setGameState(GameState.GAME);
        }
      }
    } else if (gameState === GameState.GAME) {
      if (selectedMode === 'speed') {
        data.timer -= 0.016;
        if (data.timer <= 0) endGame(false);
      } else {
        if (Date.now() - data.lastMoveTime > 1000) data.score = Math.max(0, data.score - GAME_CONSTANTS.decayRate);
      }

      let activeP = 0;
      particlesRef.current.forEach(p => {
        if (!p.active) return;
        activeP++;
        const dx = x - p.x; const dy = y - p.y;
        if (Math.sqrt(dx * dx + dy * dy) < GAME_CONSTANTS.spongeRadius + p.r) {
          p.r -= 1.8;
          if (p.r <= 0) p.active = false;
        }
      });

      if (selectedMode === 'speed') {
        data.score = ((particlesRef.current.length - activeP) / particlesRef.current.length) * 100;
        if (activeP === 0) endGame(true);
      } else {
        if (speed > 1) data.score += 0.05;
        if (data.score >= 100) endGame(true);
      }
    } else if (gameState === GameState.RESULTS) {
      const bx = window.innerWidth / 2;
      const by = window.innerHeight / 2 + 100;
      const dx = x - bx; const dy = y - (by + 30);
      if (Math.abs(dx) < 120 && Math.abs(dy) < 30 && speed > 1) {
        data.returnProg += 2.5;
        if (data.returnProg > 100) {
          data.returnProg = 0;
          setGameState(GameState.MENU);
          initMenu();
        }
      } else {
        data.returnProg = Math.max(0, data.returnProg - 1.5);
      }
    }
  }, [gameState, selectedMode, selectedMotion, initMenu, initGame]);

  const endGame = (success: boolean) => {
    const finalScore = gameDataRef.current.score;
    const finalMotion = selectedMotion;
    const finalMode = selectedMode || '';
    setResult({ success, score: finalScore, motion: finalMotion, mode: finalMode });
    setGameState(GameState.RESULTS);
    
    setLoadingTip(true);
    getCoachFeedback(finalMotion?.label.replace('\n', ' ') || "movement", finalMode, success, finalScore)
      .then(tip => {
        setCoachTip(tip);
        setLoadingTip(false);
      });
  };

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d')!;
    const w = window.innerWidth;
    const h = window.innerHeight;

    // Background
    if (noiseCanvasRef.current) ctx.drawImage(noiseCanvasRef.current, 0, 0);
    // Tea stains NOT in START state
    if (gameState !== GameState.START && stainCanvasRef.current) ctx.drawImage(stainCanvasRef.current, 0, 0);

    const data = gameDataRef.current;

    if (gameState === GameState.START) {
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      const fontSize = Math.min(w * 0.18, 140) * 1.1; // 110% scale
      ctx.font = `${fontSize}px 'Modak'`;
      ctx.fillStyle = COLORS.startTitle;
      const ty1 = h / 2 - 60 - data.startAnimY;
      const ty2 = h / 2 + 60 - data.startAnimY;
      ctx.fillText("CLEANING", w / 2, ty1);
      ctx.fillText("RUSH", w / 2, ty2);
      ctx.strokeStyle = COLORS.line; ctx.lineWidth = GAME_CONSTANTS.lineWidthTitleStroke;
      ctx.strokeText("CLEANING", w / 2, ty1);
      ctx.strokeText("RUSH", w / 2, ty2);
      
      bubblesRef.current.forEach(b => {
        if (!b.active) return;
        ctx.save(); ctx.translate(b.x, b.y);
        ctx.beginPath(); ctx.fillStyle = b.color; ctx.strokeStyle = COLORS.bubbleOutline; ctx.lineWidth = 2;
        ctx.arc(0, 0, b.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFF'; ctx.beginPath(); ctx.arc(-b.r * 0.4, -b.r * 0.4, b.r * 0.2, 0, Math.PI * 2); ctx.fill();
        ctx.restore();
      });
    } else if (gameState === GameState.MENU || gameState === GameState.MODE_SELECT) {
      const cx = w / 2;
      ctx.fillStyle = COLORS.menuTitle;
      ctx.font = "600 52px 'Poppins'"; // 115% scale
      ctx.textAlign = 'center';
      ctx.fillText(gameState === GameState.MENU ? "SELECT MOTION" : "CHOOSE MODE", cx, h * 0.2);
      
      const opacity = Math.abs(Math.sin(Date.now() * 0.003)) * 0.7 + 0.3;
      ctx.save(); ctx.globalAlpha = opacity;
      ctx.fillStyle = COLORS.hintText; ctx.font = "600 20px 'Poppins'";
      ctx.fillText("Draw a circle on the option to select", cx, h * 0.2 + 45);
      ctx.restore();

      menuButtonsRef.current.forEach(btn => {
        const dx = mouseRef.current.x - btn.x;
        const dy = mouseRef.current.y - btn.y;
        const dist = Math.sqrt(dx*dx + dy*dy);

        // Rotating Gradient Guide
        if (dist < btn.r + 60) {
          ctx.save(); ctx.translate(btn.x, btn.y);
          ctx.rotate(data.guideRotation);
          
          try {
            const grad = ctx.createConicGradient(0, 0, 0);
            grad.addColorStop(0, COLORS.guideRingStart);
            grad.addColorStop(1, COLORS.guideRingEnd);
            ctx.strokeStyle = grad;
          } catch(e) {
            ctx.strokeStyle = COLORS.guideRingEnd;
          }
          
          ctx.lineWidth = 6;
          ctx.beginPath();
          ctx.arc(0, 0, btn.r + 20, 0, Math.PI * 2);
          ctx.stroke();

          // Arrow Head at the end of gradient
          ctx.fillStyle = COLORS.guideRingEnd;
          ctx.save();
          ctx.translate(btn.r + 20, 0);
          ctx.beginPath();
          // Ensure arrow head points in direction of rotation (clockwise)
          ctx.moveTo(0, 10); ctx.lineTo(-8, -5); ctx.lineTo(8, -5); 
          ctx.fill();
          ctx.restore();
          ctx.restore();
        }

        // Progress Overlay
        if (btn.progress > 0) {
          ctx.beginPath(); ctx.strokeStyle = COLORS.secondary; ctx.lineWidth = 12;
          ctx.arc(btn.x, btn.y, btn.r + 12, -Math.PI / 2, -Math.PI / 2 + (Math.PI * 2 * btn.progress / 100));
          ctx.stroke();
        }

        // Button Circle (Constraint: Black line 2px)
        ctx.beginPath(); ctx.lineWidth = 2; ctx.strokeStyle = COLORS.line; ctx.fillStyle = '#FFF';
        ctx.arc(btn.x, btn.y, btn.r, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        
        // Inner Content Layout
        // Top Half: Icon
        const iconY = btn.y - btn.r * 0.3;
        btn.iconFunc(ctx, btn.x, iconY, btn.r * 0.6, btn.iconColor);

        // Bottom Half: Multi-line Text (Vertically Centered in bottom space)
        ctx.fillStyle = COLORS.text;
        const lines = btn.label.split('\n');
        
        // Auto-adjust font size to ensure fit
        const baseSize = btn.r * 0.18;
        ctx.font = `600 ${baseSize}px 'Poppins'`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        
        const lineSpacing = baseSize * 1.25;
        const totalHeight = lines.length * lineSpacing;
        // The bottom half available space is roughly from btn.y to btn.y + btn.r * 0.8
        const textAreaCenterY = btn.y + (btn.r * 0.4); 
        const startY = textAreaCenterY - (totalHeight / 2) + (lineSpacing / 2);

        lines.forEach((l: string, i: number) => {
          ctx.fillText(l, btn.x, startY + i * lineSpacing);
        });
      });
    } else if (gameState === GameState.WARMUP) {
      const cx = w / 2; const cy = h / 2;
      ctx.fillStyle = COLORS.text; ctx.font = "30px 'Modak'"; ctx.textAlign = 'center';
      ctx.fillText(`Warm-up: Push & Pull (${data.warmupCount}/${GAME_CONSTANTS.warmupReps})`, cx, cy - 260);
      ctx.beginPath(); ctx.strokeStyle = '#DDD'; ctx.lineWidth = 20; ctx.lineCap = 'round';
      ctx.moveTo(cx, cy - 200); ctx.lineTo(cx, cy + 200); ctx.stroke();
      const dotY = data.warmupDir === 1 ? cy + 200 : cy - 200;
      ctx.beginPath(); ctx.fillStyle = COLORS.secondary; ctx.arc(cx, dotY, 30, 0, Math.PI * 2); ctx.fill();
    } else if (gameState === GameState.GAME) {
      ctx.fillStyle = COLORS.text; ctx.font = '24px sans-serif'; ctx.textAlign = 'center';
      const info = selectedMode === 'speed' ? `Time: ${Math.max(0, Math.ceil(data.timer))}` : `Shiny: ${Math.floor(data.score)}%`;
      ctx.fillText(info, w / 2, 60);
      particlesRef.current.forEach(p => {
        if (!p.active) return;
        ctx.beginPath(); ctx.fillStyle = COLORS.secondary; ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2); ctx.fill();
      });
    } else if (gameState === GameState.RESULTS) {
      ctx.fillStyle = COLORS.text; ctx.font = "60px 'Modak'"; ctx.textAlign = 'center';
      ctx.fillText(result?.success ? "CLEAN & SHINY!" : "MISSED A SPOT!", w / 2, h / 2 - 80);
      
      const by = h / 2 + 100;
      ctx.beginPath(); ctx.strokeStyle = COLORS.line; ctx.lineWidth = GAME_CONSTANTS.lineWidthStandard;
      ctx.rect(w / 2 - 120, by, 240, 60); ctx.stroke();
      ctx.fillStyle = COLORS.secondary; ctx.fillRect(w / 2 - 120, by + 55, data.returnProg * 2.4, 5);
      ctx.fillStyle = COLORS.text; ctx.font = '24px sans-serif';
      ctx.fillText("Scrub to Menu", w / 2, by + 35);
    }

    // Cursor (Sponge) Visualization
    if (spongeLoaded && spongeImageRef.current) {
      ctx.save();
      ctx.beginPath();
      // Size: 0.95x scale already factored into constant spongeRadius
      ctx.arc(mouseRef.current.x, mouseRef.current.y, GAME_CONSTANTS.spongeRadius, 0, Math.PI * 2);
      ctx.clip();
      ctx.drawImage(
        spongeImageRef.current, 
        mouseRef.current.x - GAME_CONSTANTS.spongeRadius, 
        mouseRef.current.y - GAME_CONSTANTS.spongeRadius, 
        GAME_CONSTANTS.spongeRadius * 2, 
        GAME_CONSTANTS.spongeRadius * 2
      );
      ctx.restore();
      // Border: Draw a Black, 2px Border circle around sponge
      ctx.beginPath();
      ctx.lineWidth = 2;
      ctx.strokeStyle = COLORS.line;
      ctx.arc(mouseRef.current.x, mouseRef.current.y, GAME_CONSTANTS.spongeRadius, 0, Math.PI * 2);
      ctx.stroke();
    } else {
      ctx.beginPath(); ctx.fillStyle = COLORS.highlight; ctx.strokeStyle = COLORS.line; ctx.lineWidth = 2;
      ctx.arc(mouseRef.current.x, mouseRef.current.y, GAME_CONSTANTS.spongeRadius, 0, Math.PI * 2);
      ctx.fill(); ctx.stroke();
    }
  }, [gameState, result, selectedMode, spongeLoaded]);

  // -- Main Effect Loops --
  useEffect(() => {
    // Load Sponge Asset
    const img = new Image();
    // Using a high-quality SVG source as fallback since ./assets/sponge.png is not guaranteed
    img.src = 'https://api.iconify.design/mdi:sponge.svg?color=%23f3c85f';
    img.onload = () => {
      spongeImageRef.current = img;
      setSpongeLoaded(true);
    };

    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      if (canvasRef.current) {
        canvasRef.current.width = w;
        canvasRef.current.height = h;
      }
      generateNoise(w, h);
      generateStains(w, h);
      if (gameState === GameState.MENU) initMenu();
      if (gameState === GameState.MODE_SELECT) initModeSelect();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    initStartScreen();

    let animId: number;
    const loop = (t: number) => {
      update(t);
      draw();
      animId = requestAnimationFrame(loop);
    };
    animId = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animId);
    };
  }, [gameState, update, draw, initStartScreen, initMenu, initModeSelect, generateNoise, generateStains]);

  const handlePointer = (e: React.MouseEvent | React.TouchEvent) => {
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clientY = 'touches' in e ? e.touches[0].clientY : e.clientY;
    
    const mouse = mouseRef.current;
    mouse.lastX = mouse.x;
    mouse.lastY = mouse.y;
    mouse.x = clientX;
    mouse.y = clientY;
    const dx = mouse.x - mouse.lastX;
    const dy = mouse.y - mouse.lastY;
    mouse.speed = Math.sqrt(dx * dx + dy * dy);
    if (mouse.speed > 2) gameDataRef.current.lastMoveTime = Date.now();
  };

  return (
    <div 
      className="relative w-full h-full overflow-hidden"
      onMouseMove={handlePointer}
      onMouseDown={() => { mouseRef.current.isDown = true; }}
      onMouseUp={() => { mouseRef.current.isDown = false; mouseRef.current.speed = 0; }}
      onTouchMove={(e) => { handlePointer(e); }}
      onTouchStart={(e) => { handlePointer(e); mouseRef.current.isDown = true; }}
      onTouchEnd={() => { mouseRef.current.isDown = false; mouseRef.current.speed = 0; }}
    >
      <canvas ref={canvasRef} className="absolute inset-0 z-0" />
      
      {gameState === GameState.RESULTS && (
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-[40%] pointer-events-none flex flex-col items-center w-full max-w-md px-4">
          <div className="bg-white/90 p-6 rounded-2xl border-4 border-black shadow-2xl text-center">
            <h2 className="text-xl font-bold mb-2">Coach Gemini Says:</h2>
            {loadingTip ? (
              <div className="animate-pulse space-y-2">
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-3/4"></div>
              </div>
            ) : (
              <p className="text-lg italic text-gray-800 leading-snug">"{coachTip}"</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
