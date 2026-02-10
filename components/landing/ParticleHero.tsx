// components/landing/ParticleHero.tsx
'use client';

import { useEffect, useRef, useCallback } from 'react';

type Particle = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  opacity: number;
  color: string;
  pulsePhase: number;
  pulseSpeed: number;
};

const COLORS = [
  'rgba(52, 211, 153, ',  // emerald-400
  'rgba(16, 185, 129, ',  // emerald-500
  'rgba(110, 231, 183, ', // emerald-300
  'rgba(251, 191, 36, ',  // amber-400
  'rgba(167, 243, 208, ', // emerald-200
];

export default function ParticleHero() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -1000, y: -1000 });
  const animationRef = useRef<number>(0);
  const particlesRef = useRef<Particle[]>([]);
  const dimensionsRef = useRef({ w: 0, h: 0 });

  const initParticles = useCallback((w: number, h: number) => {
    const count = Math.min(Math.floor((w * h) / 12000), 100);
    const particles: Particle[] = [];
    for (let i = 0; i < count; i++) {
      particles.push({
        x: Math.random() * w,
        y: Math.random() * h,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        radius: Math.random() * 2.5 + 1,
        opacity: Math.random() * 0.5 + 0.3,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
        pulsePhase: Math.random() * Math.PI * 2,
        pulseSpeed: Math.random() * 0.02 + 0.005,
      });
    }
    particlesRef.current = particles;
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const dpr = window.devicePixelRatio || 1;
      const rect = canvas.parentElement?.getBoundingClientRect();
      const w = rect?.width || window.innerWidth;
      const h = rect?.height || window.innerHeight;
      canvas.width = w * dpr;
      canvas.height = h * dpr;
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.scale(dpr, dpr);
      dimensionsRef.current = { w, h };
      initParticles(w, h);
    };

    resize();
    window.addEventListener('resize', resize);

    const handleMouse = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleLeave = () => {
      mouseRef.current = { x: -1000, y: -1000 };
    };

    canvas.addEventListener('mousemove', handleMouse);
    canvas.addEventListener('mouseleave', handleLeave);

    let frame = 0;
    const CONNECTION_DIST = 140;
    const MOUSE_DIST = 180;

    const animate = () => {
      const { w, h } = dimensionsRef.current;
      ctx.clearRect(0, 0, w, h);
      frame++;

      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      // Update and draw particles
      for (const p of particles) {
        // Gentle drift
        p.x += p.vx;
        p.y += p.vy;
        p.pulsePhase += p.pulseSpeed;

        // Soft mouse repulsion
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const mouseDist = Math.sqrt(dx * dx + dy * dy);
        if (mouseDist < MOUSE_DIST && mouseDist > 0) {
          const force = (MOUSE_DIST - mouseDist) / MOUSE_DIST * 0.015;
          p.vx += (dx / mouseDist) * force;
          p.vy += (dy / mouseDist) * force;
        }

        // Dampen velocity
        p.vx *= 0.995;
        p.vy *= 0.995;

        // Wrap edges
        if (p.x < -10) p.x = w + 10;
        if (p.x > w + 10) p.x = -10;
        if (p.y < -10) p.y = h + 10;
        if (p.y > h + 10) p.y = -10;

        // Pulse opacity
        const pulse = Math.sin(p.pulsePhase) * 0.15;
        const currentOpacity = Math.max(0.1, Math.min(0.8, p.opacity + pulse));

        // Draw glow
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 4);
        gradient.addColorStop(0, p.color + (currentOpacity * 0.3) + ')');
        gradient.addColorStop(1, p.color + '0)');
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 4, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        // Draw core
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = p.color + currentOpacity + ')';
        ctx.fill();
      }

      // Draw connections
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < CONNECTION_DIST) {
            const opacity = (1 - dist / CONNECTION_DIST) * 0.15;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(110, 231, 183, ${opacity})`;
            ctx.stroke();
          }
        }
      }

      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animationRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', handleMouse);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, [initParticles]);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-auto"
      style={{ opacity: 0.7 }}
    />
  );
}
