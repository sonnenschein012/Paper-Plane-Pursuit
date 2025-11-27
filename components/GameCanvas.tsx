
import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CONFIG, COLORS, ENEMY_HUES } from '../constants';
import { Enemy, Bullet, Particle, Player, Vector2D, Difficulty, GamePhase } from '../types';
import { UIOverlay } from './UIOverlay';

export const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationFrameId = useRef<number>(0);
  
  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player',
    pos: { x: window.innerWidth / 2, y: window.innerHeight / 2 },
    velocity: { x: 0, y: 0 },
    radius: CONFIG.PLAYER_RADIUS,
    color: COLORS.NORMAL.PLAYER, // Default init
    markedForDeletion: false,
    angle: 0
  });

  const playerTrailRef = useRef<Vector2D[]>([]); // Trail for Hard Mode
  const shakeRef = useRef<number>(0); // Screen shake intensity
  
  // Grid Pulsing Effect (Hard Mode)
  const gridPulseRef = useRef({ val: 0.07, target: 0.12, speed: 0.001 });

  const mouseRef = useRef<Vector2D>({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const enemiesRef = useRef<Enemy[]>([]);
  const bulletsRef = useRef<Bullet[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  
  const lastShotTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const startTimeRef = useRef<number>(0); 
  const scoreRef = useRef<number>(0);
  const killCountRef = useRef<number>(0); 
  
  const difficultyRef = useRef<Difficulty>('NORMAL');

  // React State
  const [score, setScore] = useState(0);
  const [gamePhase, setGamePhase] = useState<GamePhase>('MENU');

  // --- Helpers ---

  const addShake = (amount: number) => {
    shakeRef.current = Math.min(shakeRef.current + amount, 15);
  };

  const createExplosion = (x: number, y: number, color: string) => {
    const isHard = difficultyRef.current === 'HARD';
    const config = isHard ? CONFIG.PARTICLE.HARD : CONFIG.PARTICLE.NORMAL;
    
    // Add screen shake on explosion in Hard Mode
    if (isHard) addShake(4);

    for (let i = 0; i < config.COUNT; i++) {
      const angle = (Math.PI * 2 / config.COUNT) * i;
      // Hard mode has more explosive variance
      const speed = isHard 
        ? Math.random() * config.SPEED + 2 
        : Math.random() * config.SPEED;
      
      // Hard mode fireworks: Mix enemy color with white/brights
      let pColor = color;
      if (isHard && Math.random() < 0.3) {
        pColor = '#FFFFFF'; 
      }

      particlesRef.current.push({
        id: `p-${Date.now()}-${i}`,
        pos: { x, y },
        velocity: {
          x: Math.cos(angle) * speed,
          y: Math.sin(angle) * speed
        },
        radius: Math.random() * 2 + 1, // Keep small
        color: pColor,
        markedForDeletion: false,
        life: 1.0,
        maxLife: 1.0
      });
    }
  };

  const generateEnemyColorInfo = (): { color: string, borderColor: string, hueIndex: number } => {
    const isHard = difficultyRef.current === 'HARD';
    
    // Hard Mode: Weighted Randomness based on counts
    if (isHard) {
      const activeEnemies = enemiesRef.current;
      const hueCounts = new Array(ENEMY_HUES.length).fill(0);
      activeEnemies.forEach(e => {
        if (e.hueIndex >= 0 && e.hueIndex < ENEMY_HUES.length) {
          hueCounts[e.hueIndex]++;
        }
      });

      // Inverse Weights
      const weights = hueCounts.map(count => 1 / (count + 1));
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      
      let randomVal = Math.random() * totalWeight;
      let selectedHueIndex = 0;
      for (let i = 0; i < weights.length; i++) {
        randomVal -= weights[i];
        if (randomVal <= 0) {
          selectedHueIndex = i;
          break;
        }
      }

      const baseHue = ENEMY_HUES[selectedHueIndex];
      // 100% Saturation Neon
      // Tier 1 (Normal): 50% Lightness, Tier 2 (Dark): 30% Lightness
      const lightness = Math.random() < 0.6 ? 50 : 35;
      
      return {
        color: `hsl(${baseHue}, 100%, ${lightness}%)`,
        borderColor: `hsl(${baseHue}, 100%, ${lightness - 15}%)`,
        hueIndex: selectedHueIndex
      };
    } 
    
    // Normal Mode: Simple Random
    else {
      const hueIndex = Math.floor(Math.random() * ENEMY_HUES.length);
      const hue = ENEMY_HUES[hueIndex];
      // Casual Pastels/Vibrants
      return {
        color: `hsl(${hue}, 85%, 60%)`,
        borderColor: `hsl(${hue}, 85%, 45%)`,
        hueIndex
      };
    }
  };

  const handleSpawning = (now: number, width: number, height: number) => {
    if (!startTimeRef.current) startTimeRef.current = now;

    const T = (now - startTimeRef.current) / 1000;
    const K = killCountRef.current;
    const C = enemiesRef.current.length;
    const isHard = difficultyRef.current === 'HARD';

    let difficulty = 1;
    let spawnInterval = 1000;

    if (isHard) {
      // --- HARD MODE: Sigmoid Difficulty ---
      // Input = (Time / 60) + (Kills / 50)
      const input = (T / 60) + (K / 50);
      // Difficulty = 1.5 + (9 * (1 / (1 + Math.exp(-0.5 * (input - 4)))))
      difficulty = 1.5 + (9 * (1 / (1 + Math.exp(-0.5 * (input - 4)))));
      
      // Crowd Penalty: Cubic Function
      // If enemies > 20, penalty ramps up significantly
      const crowdPenalty = Math.pow(Math.max(0, C - 10), 3) * 2;
      
      const calculatedInterval = (CONFIG.SPAWN.BASE_INTERVAL / difficulty) + crowdPenalty;
      spawnInterval = Math.max(CONFIG.SPAWN.MIN_INTERVAL, Math.min(CONFIG.SPAWN.MAX_INTERVAL, calculatedInterval));
    } else {
      // --- NORMAL MODE: Linear ---
      difficulty = 1 + Math.min(2, T / 60);
      spawnInterval = Math.max(500, 2000 - (T * 10));
    }

    if (now - lastSpawnTimeRef.current > spawnInterval) {
      const player = playerRef.current;
      let spawnX, spawnY;

      if (isHard) {
        // --- HARD MODE: Spatial Logic ---
        const safeRadius = Math.max(
          CONFIG.SPAWN.SAFE_ZONE_MIN, 
          CONFIG.SPAWN.SAFE_ZONE_START - (difficulty * 20)
        );

        // Density Check
        const sectorCounts = new Array(CONFIG.SPAWN.SECTOR_COUNT).fill(0);
        const sectorSize = (Math.PI * 2) / CONFIG.SPAWN.SECTOR_COUNT;

        enemiesRef.current.forEach(e => {
          const dx = e.pos.x - player.pos.x;
          const dy = e.pos.y - player.pos.y;
          let angle = Math.atan2(dy, dx); 
          if (angle < 0) angle += Math.PI * 2;
          const sectorIdx = Math.floor(angle / sectorSize) % CONFIG.SPAWN.SECTOR_COUNT;
          sectorCounts[sectorIdx]++;
        });

        // Find min density
        let minSectorIdx = 0;
        let minCount = Infinity;
        sectorCounts.forEach((count, idx) => {
          if (count < minCount) {
            minCount = count;
            minSectorIdx = idx;
          }
        });

        // 30% Chance to spawn in Gap (Lowest Density)
        const useGapFiller = Math.random() < 0.3;
        let spawnAngle: number;
        
        if (useGapFiller) {
          const sectorStart = minSectorIdx * sectorSize;
          spawnAngle = sectorStart + (Math.random() * sectorSize);
        } else {
          spawnAngle = Math.random() * Math.PI * 2;
        }
        
        const spawnDist = safeRadius + 100 + (Math.random() * 200);
        spawnX = player.pos.x + Math.cos(spawnAngle) * spawnDist;
        spawnY = player.pos.y + Math.sin(spawnAngle) * spawnDist;

      } else {
        // --- NORMAL MODE: Random Edge ---
        const edge = Math.floor(Math.random() * 4);
        const offset = 50;
        if (edge === 0) { spawnX = Math.random() * width; spawnY = -offset; }
        else if (edge === 1) { spawnX = width + offset; spawnY = Math.random() * height; }
        else if (edge === 2) { spawnX = Math.random() * width; spawnY = height + offset; }
        else { spawnX = -offset; spawnY = Math.random() * height; }
      }

      const { color, borderColor, hueIndex } = generateEnemyColorInfo();

      enemiesRef.current.push({
        id: `e-${now}-${Math.random()}`,
        pos: { x: spawnX, y: spawnY },
        velocity: { x: 0, y: 0 },
        radius: 7.74, 
        color: color,
        borderColor: borderColor,
        hueIndex: hueIndex,
        markedForDeletion: false,
        hp: 1
      });

      lastSpawnTimeRef.current = now;
    }
  };

  const startGame = useCallback((difficulty: Difficulty) => {
    difficultyRef.current = difficulty;
    
    // Set Player Color based on mode
    playerRef.current.color = difficulty === 'HARD' ? COLORS.HARD.PLAYER : COLORS.NORMAL.PLAYER;
    
    playerRef.current.pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    playerRef.current.angle = -Math.PI / 2;
    
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    playerTrailRef.current = [];
    shakeRef.current = 0;
    
    scoreRef.current = 0;
    killCountRef.current = 0;
    lastShotTimeRef.current = 0;
    lastSpawnTimeRef.current = 0;
    startTimeRef.current = Date.now();
    
    setScore(0);
    setGamePhase('PLAYING');
  }, []);

  const restartGame = useCallback(() => {
    startGame(difficultyRef.current);
  }, [startGame]);

  const backToMenu = useCallback(() => {
    setGamePhase('MENU');
    enemiesRef.current = [];
    bulletsRef.current = [];
    particlesRef.current = [];
    playerTrailRef.current = [];
  }, []);

  const handleMouseMove = useCallback((e: MouseEvent) => {
    mouseRef.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handleResize = useCallback(() => {
    if (canvasRef.current) {
      canvasRef.current.width = window.innerWidth;
      canvasRef.current.height = window.innerHeight;
    }
  }, []);

  // --- Main Game Loop ---

  const update = (dt: number) => {
    if (gamePhase !== 'PLAYING') return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const now = Date.now();
    const player = playerRef.current;
    const isHard = difficultyRef.current === 'HARD';
    const activeEnemyCount = enemiesRef.current.length;

    // --- Dynamic Enemy Speed Calculation ---
    const T = (now - startTimeRef.current) / 1000; // Time in seconds
    const S = scoreRef.current;
    const C = activeEnemyCount;
    
    let currentEnemySpeed = 0;

    if (isHard) {
      // Hard Mode: Sigmoid S-Curve Formula
      // Step A: Progress
      const progress = (T / 60) + (S / 500);
      // Step B: Sigmoid
      // Multiplier = 1 + (5 * (1 / (1 + Math.exp(-0.8 * (Progress - 4)))))
      const sigmoidMultiplier = 1 + (5 * (1 / (1 + Math.exp(-0.8 * (progress - 4)))));
      // Step C: Drag
      // DragFactor = Min(0.6, C / 150)
      const dragFactor = Math.min(0.6, C / 150);
      
      const baseSpeed = 2.5;
      const finalSpeed = (baseSpeed * sigmoidMultiplier) * (1 - dragFactor);
      
      // Step D: Clamp [2.0, 12.0]
      currentEnemySpeed = Math.max(2.0, Math.min(12.0, finalSpeed));
      
    } else {
      // Normal Mode: Linear Formula
      const baseSpeed = 2.0;
      const timeFactor = T * 0.01;
      const scoreFactor = S * 0.005;
      const crowdDrag = C * 0.02;
      
      const finalSpeed = baseSpeed + timeFactor + scoreFactor - crowdDrag;
      
      // Clamp [1.5, 6.0]
      currentEnemySpeed = Math.max(1.5, Math.min(6.0, finalSpeed));
    }

    // Update Screen Shake
    if (shakeRef.current > 0) {
      shakeRef.current *= 0.9;
      if (shakeRef.current < 0.5) shakeRef.current = 0;
    }

    // Player Move
    const dx = mouseRef.current.x - player.pos.x;
    const dy = mouseRef.current.y - player.pos.y;
    player.pos.x += dx * CONFIG.PLAYER_SPEED_LERP;
    player.pos.y += dy * CONFIG.PLAYER_SPEED_LERP;

    if (Math.hypot(dx, dy) > 5) {
      player.angle = Math.atan2(dy, dx);
    }
    
    // Clamp
    player.pos.x = Math.max(player.radius, Math.min(width - player.radius, player.pos.x));
    player.pos.y = Math.max(player.radius, Math.min(height - player.radius, player.pos.y));

    // Update Trail (Hard Mode Only)
    if (isHard) {
      playerTrailRef.current.push({ x: player.pos.x, y: player.pos.y });
      if (playerTrailRef.current.length > 20) {
        playerTrailRef.current.shift();
      }
    }

    // --- Dynamic Shooting Logic ---
    // RateMultiplier = 1 + (Math.log(ActiveEnemyCount + 1) * 0.3)
    const rateMultiplier = 1 + (Math.log(activeEnemyCount + 1) * 0.3);
    const fireInterval = Math.max(
      CONFIG.SHOOTING.MIN_INTERVAL, 
      CONFIG.SHOOTING.BASE_INTERVAL / rateMultiplier
    );

    if (now - lastShotTimeRef.current > fireInterval) {
      const tipX = player.pos.x + Math.cos(player.angle) * player.radius;
      const tipY = player.pos.y + Math.sin(player.angle) * player.radius;
      
      // Infinite initial range (screen diagonal)
      const maxRange = Math.hypot(width, height);

      bulletsRef.current.push({
        id: `b-${now}`,
        pos: { x: tipX, y: tipY },
        velocity: { 
          x: Math.cos(player.angle) * CONFIG.BULLET_SPEED, 
          y: Math.sin(player.angle) * CONFIG.BULLET_SPEED 
        },
        radius: CONFIG.BULLET_RADIUS,
        color: isHard ? COLORS.HARD.BULLET : COLORS.NORMAL.BULLET,
        markedForDeletion: false,
        distanceTraveled: 0,
        maxRange: maxRange,
        penetrationCount: 0
      });
      lastShotTimeRef.current = now;
      
      // Tiny shake on shoot for feel
      if (isHard) addShake(0.5);
    }

    handleSpawning(now, width, height);

    // --- Physics Update ---
    
    // Bullets (Distance & Penetration logic)
    bulletsRef.current.forEach(b => {
      b.pos.x += b.velocity.x;
      b.pos.y += b.velocity.y;
      
      // Track distance
      const travelDist = Math.hypot(b.velocity.x, b.velocity.y);
      b.distanceTraveled += travelDist;

      // Check max range (Penetration decay)
      if (b.distanceTraveled >= b.maxRange) {
        b.markedForDeletion = true;
      }

      // Check boundaries
      if (b.pos.x < -50 || b.pos.x > width + 50 || b.pos.y < -50 || b.pos.y > height + 50) {
        b.markedForDeletion = true;
      }
    });

    // Update Enemies with Calculated Speed
    enemiesRef.current.forEach(e => {
      const dx = player.pos.x - e.pos.x;
      const dy = player.pos.y - e.pos.y;
      const dist = Math.hypot(dx, dy);
      if (dist > 0) {
        e.pos.x += (dx / dist) * currentEnemySpeed;
        e.pos.y += (dy / dist) * currentEnemySpeed;
      }
    });

    const friction = isHard ? CONFIG.PARTICLE.HARD.FRICTION : CONFIG.PARTICLE.NORMAL.FRICTION;
    const decay = isHard ? CONFIG.PARTICLE.HARD.LIFE_DECAY : CONFIG.PARTICLE.NORMAL.LIFE_DECAY;

    particlesRef.current.forEach(p => {
      p.pos.x += p.velocity.x;
      p.pos.y += p.velocity.y;
      // Apply Friction
      p.velocity.x *= friction;
      p.velocity.y *= friction;
      
      p.life -= decay;
      if (p.life <= 0) p.markedForDeletion = true;
    });

    // --- Collision Logic (Penetration) ---
    enemiesRef.current.forEach(enemy => {
      if (enemy.markedForDeletion) return;

      bulletsRef.current.forEach(bullet => {
        if (bullet.markedForDeletion) return;
        
        const dist = Math.hypot(bullet.pos.x - enemy.pos.x, bullet.pos.y - enemy.pos.y);
        if (dist < enemy.radius + bullet.radius) {
          enemy.hp--;
          
          if (enemy.hp <= 0) {
            enemy.markedForDeletion = true;
            createExplosion(enemy.pos.x, enemy.pos.y, enemy.color);
            scoreRef.current += 10;
            killCountRef.current += 1;
            setScore(scoreRef.current);
          }
          
          // Penetration Logic
          bullet.penetrationCount++;
          
          // Recalculate Max Range
          // AddedDistance = BasePostHit * (DecayFactor ^ (count - 1))
          const addedDist = CONFIG.SHOOTING.BASE_POST_HIT_DISTANCE * Math.pow(CONFIG.SHOOTING.DECAY_FACTOR, bullet.penetrationCount - 1);
          bullet.maxRange = bullet.distanceTraveled + addedDist;
          
          // Note: We do NOT mark bullet for deletion here.
        }
      });

      const distPlayer = Math.hypot(player.pos.x - enemy.pos.x, player.pos.y - enemy.pos.y);
      if (distPlayer < (player.radius * 0.5) + enemy.radius) {
        setGamePhase('GAMEOVER');
        createExplosion(player.pos.x, player.pos.y, player.color);
        if (isHard) addShake(20); // Massive shake on death
      }
    });

    bulletsRef.current = bulletsRef.current.filter(e => !e.markedForDeletion);
    enemiesRef.current = enemiesRef.current.filter(e => !e.markedForDeletion);
    particlesRef.current = particlesRef.current.filter(e => !e.markedForDeletion);
  };

  const draw = (ctx: CanvasRenderingContext2D) => {
    const width = ctx.canvas.width;
    const height = ctx.canvas.height;
    const isHard = difficultyRef.current === 'HARD';
    const THEME = isHard ? COLORS.HARD : COLORS.NORMAL;

    // --- Background ---
    ctx.fillStyle = gamePhase === 'MENU' ? COLORS.NORMAL.BACKGROUND : THEME.BACKGROUND;
    ctx.fillRect(0, 0, width, height);

    ctx.save();
    
    // Apply Screen Shake
    if (shakeRef.current > 0 && gamePhase === 'PLAYING') {
      const sx = (Math.random() - 0.5) * shakeRef.current;
      const sy = (Math.random() - 0.5) * shakeRef.current;
      ctx.translate(sx, sy);
    }

    // Hard Mode Grid with Pulsing Effect
    if (isHard && gamePhase === 'PLAYING') {
      const pulse = gridPulseRef.current;
      
      // Check if we are close to target
      if (Math.abs(pulse.val - pulse.target) < 0.005) {
        // Pick new random target (Range 0.05 to 0.20)
        pulse.target = 0.05 + Math.random() * 0.15;
        // Pick random speed for irregular duration
        pulse.speed = 0.001 + Math.random() * 0.004;
      }

      // Approach target
      if (pulse.val < pulse.target) pulse.val += pulse.speed;
      else pulse.val -= pulse.speed;

      ctx.strokeStyle = `rgba(255, 255, 255, ${pulse.val})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      // Draw Grid with buffer for screen shake
      for (let x = -50; x < width + 50; x += 50) { ctx.moveTo(x, -50); ctx.lineTo(x, height + 50); }
      for (let y = -50; y < height + 50; y += 50) { ctx.moveTo(-50, y); ctx.lineTo(width + 50, y); }
      ctx.stroke();
    }

    if (gamePhase !== 'MENU') {
      // Apply Global Glow for Hard Mode
      if (isHard) {
        ctx.shadowBlur = 20;
      } else {
        ctx.shadowBlur = 0;
      }

      // --- Player Trail (Hard Mode) ---
      if (isHard && playerTrailRef.current.length > 1) {
        ctx.beginPath();
        ctx.strokeStyle = THEME.PLAYER;
        ctx.lineWidth = 2;
        ctx.moveTo(playerTrailRef.current[0].x, playerTrailRef.current[0].y);
        for (let i = 1; i < playerTrailRef.current.length; i++) {
          ctx.lineTo(playerTrailRef.current[i].x, playerTrailRef.current[i].y);
        }
        ctx.globalAlpha = 0.3;
        ctx.stroke();
        ctx.globalAlpha = 1.0;
      }

      // --- Bullets ---
      ctx.fillStyle = THEME.BULLET;
      if (isHard) ctx.shadowColor = THEME.BULLET;
      bulletsRef.current.forEach(b => {
        ctx.beginPath();
        ctx.arc(b.pos.x, b.pos.y, b.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      // --- Player ---
      const p = playerRef.current;
      ctx.save();
      ctx.translate(p.pos.x, p.pos.y);
      ctx.rotate(p.angle);
      
      ctx.fillStyle = p.color;
      ctx.strokeStyle = THEME.PLAYER_OUTLINE;
      if (isHard) ctx.shadowColor = p.color;
      ctx.lineWidth = 1.5; 
      ctx.lineJoin = 'round';
      
      ctx.beginPath();
      ctx.moveTo(p.radius, 0);
      ctx.lineTo(-p.radius, p.radius * 0.7);
      ctx.lineTo(-p.radius * 0.5, 0);
      ctx.lineTo(-p.radius, -p.radius * 0.7);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      ctx.restore();

      // --- Enemies ---
      enemiesRef.current.forEach(e => {
        ctx.beginPath();
        ctx.arc(e.pos.x, e.pos.y, e.radius, 0, Math.PI * 2);
        
        ctx.fillStyle = e.color;
        if (isHard) ctx.shadowColor = e.color;
        ctx.fill();

        ctx.strokeStyle = e.borderColor;
        ctx.lineWidth = 3;
        if (isHard) ctx.shadowColor = 'transparent'; // Don't blur the stroke too much
        ctx.stroke();
      });

      // --- Particles ---
      ctx.globalCompositeOperation = THEME.PARTICLE_BLEND;
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.life;
        ctx.fillStyle = p.color;
        if (isHard) ctx.shadowColor = p.color;
        
        ctx.beginPath();
        ctx.arc(p.pos.x, p.pos.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1.0;
      ctx.globalCompositeOperation = 'source-over';
    }

    ctx.restore(); // Restore from shake

    // --- Vignette (Hard Mode Only) ---
    if (isHard && gamePhase === 'PLAYING') {
      const grad = ctx.createRadialGradient(width / 2, height / 2, height / 2, width / 2, height / 2, height);
      grad.addColorStop(0, 'transparent');
      grad.addColorStop(1, 'rgba(0, 0, 0, 0.6)');
      
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, width, height);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    window.addEventListener('resize', handleResize);
    window.addEventListener('mousemove', handleMouseMove);

    let lastTime = 0;
    const loop = (timestamp: number) => {
      const dt = timestamp - lastTime;
      lastTime = timestamp;

      update(dt);
      
      const ctx = canvas.getContext('2d');
      if (ctx) draw(ctx);

      animationFrameId.current = requestAnimationFrame(loop);
    };

    animationFrameId.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId.current);
    };
  }, [gamePhase, score]); // Re-bind when phase/score changes

  return (
    <>
      <canvas ref={canvasRef} className="block w-full h-full" />
      <UIOverlay 
        score={score} 
        gamePhase={gamePhase}
        difficulty={difficultyRef.current}
        onStart={startGame}
        onRestart={restartGame}
        onBackToMenu={backToMenu}
      />
    </>
  );
};
