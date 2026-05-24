"use client";
import React, { useEffect, useRef } from "react";

export default function ParticleBackground() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[] = [];
    let shockwaves: { x: number; y: number; radius: number; maxRadius: number; speed: number; opacity: number }[] = [];
    
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      initParticles();
    };

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      color: string;
      maxSpeed: number = 1.5;

      constructor(w: number, h: number) {
        this.x = Math.random() * w;
        this.y = Math.random() * h;
        // Slow drifting velocities
        this.vx = (Math.random() - 0.5) * 0.3;
        this.vy = (Math.random() - 0.5) * 0.3;
        this.radius = Math.random() * 1.8 + 0.6;
        // Deep blue, cyan, and indigo particles
        const colors = [
          "rgba(6, 240, 255, ", // Cyber Cyan
          "rgba(59, 130, 246, ", // Neon Blue
          "rgba(99, 102, 241, "  // Indigo
        ];
        this.color = colors[Math.floor(Math.random() * colors.length)] + (Math.random() * 0.22 + 0.08) + ")";
      }

      update(w: number, h: number) {
        this.x += this.vx;
        this.y += this.vy;

        // Apply friction to dampen shockwaves
        this.vx *= 0.98;
        this.vy *= 0.98;

        // Add small drift back if velocity gets too slow
        if (Math.abs(this.vx) < 0.05) this.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(this.vy) < 0.05) this.vy += (Math.random() - 0.5) * 0.1;

        // Clamp speed
        const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
        if (speed > this.maxSpeed) {
          this.vx = (this.vx / speed) * this.maxSpeed;
          this.vy = (this.vy / speed) * this.maxSpeed;
        }

        // Wrap around borders with small padding
        if (this.x < -10) this.x = w + 10;
        if (this.x > w + 10) this.x = -10;
        if (this.y < -10) this.y = h + 10;
        if (this.y > h + 10) this.y = -10;
      }

      draw(c: CanvasRenderingContext2D) {
        c.beginPath();
        c.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        c.fillStyle = this.color;
        c.fill();
      }
    }

    const initParticles = () => {
      const count = Math.min(100, Math.floor((canvas.width * canvas.height) / 16000));
      particles = [];
      for (let i = 0; i < count; i++) {
        particles.push(new Particle(canvas.width, canvas.height));
      }
    };

    const handleWindowClick = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      
      shockwaves.push({
        x,
        y,
        radius: 0,
        maxRadius: 160,
        speed: 5,
        opacity: 0.8
      });
    };

    const animate = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw static background glowing hubs
      // Top left soft cyan glow
      const g1 = ctx.createRadialGradient(canvas.width * 0.25, canvas.height * 0.2, 0, canvas.width * 0.25, canvas.height * 0.2, Math.max(canvas.width, canvas.height) * 0.45);
      g1.addColorStop(0, "rgba(6, 240, 255, 0.025)");
      g1.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g1;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      
      // Bottom right soft blue/indigo glow
      const g2 = ctx.createRadialGradient(canvas.width * 0.75, canvas.height * 0.8, 0, canvas.width * 0.75, canvas.height * 0.8, Math.max(canvas.width, canvas.height) * 0.45);
      g2.addColorStop(0, "rgba(59, 130, 246, 0.02)");
      g2.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = g2;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Draw active grid overlay scan lines
      ctx.strokeStyle = "rgba(59, 130, 246, 0.005)";
      ctx.lineWidth = 1;
      const gridSize = 70;
      for (let x = 0; x < canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
      }
      for (let y = 0; y < canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
      }

      // Update and draw shockwaves
      for (let i = shockwaves.length - 1; i >= 0; i--) {
        const sw = shockwaves[i];
        sw.radius += sw.speed;
        sw.opacity -= 0.022;

        // Draw glowing ring
        ctx.strokeStyle = `rgba(0, 240, 255, ${sw.opacity})`;
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
        ctx.stroke();

        // Push particles away radially
        particles.forEach((p) => {
          const dx = p.x - sw.x;
          const dy = p.y - sw.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist > 0 && Math.abs(dist - sw.radius) < 25) {
            const force = (25 - Math.abs(dist - sw.radius)) * 0.18;
            p.vx += (dx / dist) * force;
            p.vy += (dy / dist) * force;
          }
        });

        // Clean up finished shockwaves
        if (sw.opacity <= 0 || sw.radius >= sw.maxRadius) {
          shockwaves.splice(i, 1);
        }
      }

      // Update and draw particles
      particles.forEach((p) => {
        p.update(canvas.width, canvas.height);
        p.draw(ctx);
      });

      // Connect close particles with thin neural lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 110) {
            const alpha = (1 - dist / 110) * 0.085;
            ctx.strokeStyle = `rgba(59, 130, 246, ${alpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    window.addEventListener("resize", resizeCanvas);
    window.addEventListener("click", handleWindowClick);
    
    resizeCanvas();
    animate();

    return () => {
      window.removeEventListener("resize", resizeCanvas);
      window.removeEventListener("click", handleWindowClick);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas 
      ref={canvasRef} 
      className="fixed top-0 left-0 w-full h-full pointer-events-none z-0 bg-[#020306]" 
    />
  );
}
