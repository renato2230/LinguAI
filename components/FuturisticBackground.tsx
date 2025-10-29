import React, { useRef, useEffect } from 'react';

const FuturisticBackground: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const mouse = useRef({ x: Infinity, y: Infinity });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let particles: Particle[];

    const handleMouseMove = (event: MouseEvent) => {
        mouse.current.x = event.clientX;
        mouse.current.y = event.clientY;
    };
    window.addEventListener('mousemove', handleMouseMove);

    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };

    class Particle {
      x: number;
      y: number;
      size: number;
      speedX: number;
      speedY: number;

      constructor(c: HTMLCanvasElement) {
        this.x = Math.random() * c.width;
        this.y = Math.random() * c.height;
        this.size = Math.random() * 1.5 + 0.5;
        this.speedX = (Math.random() - 0.5) * 0.2;
        this.speedY = (Math.random() - 0.5) * 0.2;
      }

      update(c: HTMLCanvasElement) {
        this.x += this.speedX;
        this.y += this.speedY;

        if (this.x < 0 || this.x > c.width) this.speedX *= -1;
        if (this.y < 0 || this.y > c.height) this.speedY *= -1;
      }

      draw(c: CanvasRenderingContext2D) {
        c.fillStyle = 'rgba(255, 255, 255, 0.8)';
        c.beginPath();
        c.arc(this.x, this.y, this.size, 0, Math.PI * 2);
        c.fill();
      }
    }

    const init = () => {
      resizeCanvas();
      particles = [];
      const numberOfParticles = (canvas.width * canvas.height) / 9000;
      for (let i = 0; i < numberOfParticles; i++) {
        particles.push(new Particle(canvas));
      }
    };

    const connect = () => {
        if(!ctx) return;
        // Particle-to-particle connections
        for (let a = 0; a < particles.length; a++) {
            for (let b = a; b < particles.length; b++) {
                const distance = Math.sqrt(
                    Math.pow(particles[a].x - particles[b].x, 2) +
                    Math.pow(particles[a].y - particles[b].y, 2)
                );
                if (distance < 120) {
                    const opacityValue = 1 - (distance / 120);
                    ctx.strokeStyle = `rgba(123, 92, 255, ${opacityValue})`;
                    ctx.lineWidth = 0.5;
                    ctx.beginPath();
                    ctx.moveTo(particles[a].x, particles[a].y);
                    ctx.lineTo(particles[b].x, particles[b].y);
                    ctx.stroke();
                }
            }
        }
        
        // Particle-to-mouse connections
        for (let i = 0; i < particles.length; i++) {
            const distance = Math.sqrt(
                Math.pow(particles[i].x - mouse.current.x, 2) +
                Math.pow(particles[i].y - mouse.current.y, 2)
            );

            if (distance < 250) { // A larger radius for mouse interaction
                const opacityValue = 1 - (distance / 250);
                ctx.strokeStyle = `rgba(0, 224, 255, ${opacityValue})`; // Cyan for interactivity
                ctx.lineWidth = 0.7;
                ctx.beginPath();
                ctx.moveTo(particles[i].x, particles[i].y);
                ctx.lineTo(mouse.current.x, mouse.current.y);
                ctx.stroke();
            }
        }
    };

    const animate = () => {
      if(!ctx) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      particles.forEach(particle => {
        particle.update(canvas);
        particle.draw(ctx);
      });
      connect();
      animationFrameId = requestAnimationFrame(animate);
    };

    init();
    animate();

    window.addEventListener('resize', init);

    return () => {
      window.removeEventListener('resize', init);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        zIndex: -1,
        background: 'linear-gradient(to bottom, #05060A, #0D0F16)',
      }}
    />
  );
};

export default FuturisticBackground;