"use client";

import { useState, useEffect } from 'react';

export const ParticleBackground = () => {
  const [particles, setParticles] = useState<React.ReactElement[]>([]);

  useEffect(() => {
    // This ensures that the particles are only rendered on the client side, preventing hydration errors.
    const generatedParticles = Array.from({ length: 50 }).map((_, i) => {
      const size = Math.random() * 3 + 1;
      const duration = Math.random() * 20 + 20;
      const delay = Math.random() * -40;
      const left = Math.random() * 100;
      const top = Math.random() * 100;

      const style: React.CSSProperties = {
        width: `${size}px`,
        height: `${size}px`,
        left: `${left}%`,
        top: `${top}%`,
        animationDuration: `${duration}s`,
        animationDelay: `${delay}s`,
      };
      return <div key={i} className="particle" style={style}></div>;
    });
    setParticles(generatedParticles);
  }, []);

  return <div className="particle-container">{particles}</div>;
};
