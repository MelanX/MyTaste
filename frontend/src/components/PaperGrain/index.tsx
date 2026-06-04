import React, { useEffect, useRef } from 'react';

interface PaperGrainProps {
  backgroundColor?: string;
  grainColor?: string;
  grainDensity?: number;
  grainOpacity?: number;
  maxGrainSize?: number;
}

// Resolve a semantic token to its concrete color so it can be used as a
// canvas fillStyle (canvas does not understand CSS `var(...)`).
const resolveToken = (name: string, fallbackVar: string): string => {
  if (typeof window === 'undefined') return fallbackVar;
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim();
  return value || fallbackVar;
};

const PaperGrain: React.FC<PaperGrainProps> = ({
  backgroundColor, // Cream paper color (defaults to the --color-bg token)
  grainColor = 'rgb(0 0 0)', // Black grain dots
  grainDensity = 15000, // Number of grain dots
  grainOpacity = 0.08, // Opacity of the grain
  maxGrainSize = 1.5, // Maximum size of grain dots in pixels
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const context = canvas.getContext('2d');
    if (!context) return;

    // Draw the grain pattern. Re-reads the background token each call so a theme
    // switch (data-theme change) repaints with the new --color-bg.
    const drawGrain = () => {
      const resolvedBackground = backgroundColor ?? resolveToken('--color-bg', 'rgb(248 244 233)');

      context.globalAlpha = 1;
      context.fillStyle = resolvedBackground;
      context.fillRect(0, 0, canvas.width, canvas.height);

      // Set grain color with opacity
      context.fillStyle = grainColor;
      context.globalAlpha = grainOpacity;

      // Draw random grain dots
      for (let i = 0; i < grainDensity; i++) {
        const x = Math.random() * canvas.width;
        const y = Math.random() * canvas.height;
        const size = Math.random() * (maxGrainSize - 0.5) + 0.5; // Random size between 0.5 and {maxGrainSize}px

        context.beginPath();
        context.arc(x, y, size, 0, Math.PI * 2);
        context.fill();
      }
    };

    // Make canvas fullscreen
    const resizeCanvas = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      drawGrain();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);

    // Repaint immediately when the theme is toggled (ThemeToggle dispatches
    // this event), and also catch any external data-theme change.
    window.addEventListener('mytaste:themechange', drawGrain);
    const themeObserver = new MutationObserver(drawGrain);
    themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

    return () => {
      window.removeEventListener('resize', resizeCanvas);
      window.removeEventListener('mytaste:themechange', drawGrain);
      themeObserver.disconnect();
    };
  }, [backgroundColor, grainColor, grainDensity, grainOpacity, maxGrainSize]);

  return (
    <canvas
      ref={canvasRef}
      className={'no-print'}
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: -1,
      }}
    />
  );
};

export default PaperGrain;
