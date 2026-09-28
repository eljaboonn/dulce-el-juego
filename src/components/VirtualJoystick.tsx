import React, { useCallback, useEffect, useRef, useState } from 'react';

interface VirtualJoystickProps {
  onMove: (x: number, y: number) => void;
  className?: string;
  size?: number; // size in px
}

export const VirtualJoystick: React.FC<VirtualJoystickProps> = ({
  onMove,
  className = '',
  size = 140,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const [isActive, setIsActive] = useState(false);
  const touchIdRef = useRef<number | null>(null);

  const radius = size / 2;
  const maxDistance = radius * 0.75;

  const handlePointerDown = (clientX: number, clientY: number, id: number | null) => {
    if (!containerRef.current) return;
    touchIdRef.current = id;
    setIsActive(true);
    updateKnob(clientX, clientY);
  };

  const updateKnob = useCallback((clientX: number, clientY: number) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;

    const dx = clientX - centerX;
    const dy = clientY - centerY;
    const distance = Math.hypot(dx, dy);

    if (distance <= 0) {
      setKnobPos({ x: 0, y: 0 });
      onMove(0, 0);
      return;
    }

    const clampedDist = Math.min(distance, maxDistance);
    const angle = Math.atan2(dy, dx);
    const clampedX = Math.cos(angle) * clampedDist;
    const clampedY = Math.sin(angle) * clampedDist;

    setKnobPos({ x: clampedX, y: clampedY });

    // Normalize -1 to 1 for game engine (x: right, y: forward/down in 3D scene)
    const normX = clampedX / maxDistance;
    const normY = clampedY / maxDistance;
    onMove(normX, normY);
  }, [maxDistance, onMove]);

  const handlePointerUp = useCallback(() => {
    setIsActive(false);
    touchIdRef.current = null;
    setKnobPos({ x: 0, y: 0 });
    onMove(0, 0);
  }, [onMove]);

  // Touch Listeners
  const onTouchStart = (e: React.TouchEvent) => {
    if (touchIdRef.current === null && e.changedTouches.length > 0) {
      const touch = e.changedTouches[0];
      handlePointerDown(touch.clientX, touch.clientY, touch.identifier);
    }
  };

  const onTouchMove = useCallback((e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      const touch = e.changedTouches[i];
      if (touch.identifier === touchIdRef.current) {
        updateKnob(touch.clientX, touch.clientY);
        break;
      }
    }
  }, [updateKnob]);

  const onTouchEnd = useCallback((e: TouchEvent) => {
    if (touchIdRef.current === null) return;
    for (let i = 0; i < e.changedTouches.length; i++) {
      if (e.changedTouches[i].identifier === touchIdRef.current) {
        handlePointerUp();
        break;
      }
    }
  }, [handlePointerUp]);

  // Mouse Listeners
  const onMouseDown = (e: React.MouseEvent) => {
    handlePointerDown(e.clientX, e.clientY, -1);
  };

  const onMouseMove = useCallback((e: MouseEvent) => {
    if (touchIdRef.current === -1) {
      updateKnob(e.clientX, e.clientY);
    }
  }, [updateKnob]);

  const onMouseUp = useCallback(() => {
    if (touchIdRef.current === -1) {
      handlePointerUp();
    }
  }, [handlePointerUp]);

  // Global window listeners for drag release outside bounding box
  useEffect(() => {
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    window.addEventListener('touchcancel', onTouchEnd);
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);

    return () => {
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('touchcancel', onTouchEnd);
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
    };
  }, [onTouchMove, onTouchEnd, onMouseMove, onMouseUp]);

  // Keyboard controls for desktop testing (WASD / Arrows)
  useEffect(() => {
    const keysPressed: Record<string, boolean> = {};

    const handleKeyDown = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        keysPressed[e.key.toLowerCase()] = true;
        recalcKeys();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'w', 'a', 's', 'd', 'W', 'A', 'S', 'D'].includes(e.key)) {
        keysPressed[e.key.toLowerCase()] = false;
        recalcKeys();
      }
    };

    const recalcKeys = () => {
      let kx = 0;
      let ky = 0;
      if (keysPressed['a'] || keysPressed['arrowleft']) kx -= 1;
      if (keysPressed['d'] || keysPressed['arrowright']) kx += 1;
      if (keysPressed['w'] || keysPressed['arrowup']) ky -= 1;
      if (keysPressed['s'] || keysPressed['arrowdown']) ky += 1;

      if (kx !== 0 && ky !== 0) {
        kx *= 0.7071;
        ky *= 0.7071;
      }

      onMove(kx, ky);
      setKnobPos({ x: kx * maxDistance, y: ky * maxDistance });
      setIsActive(kx !== 0 || ky !== 0);
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [maxDistance, onMove]);

  return (
    <div
      ref={containerRef}
      onTouchStart={onTouchStart}
      onMouseDown={onMouseDown}
      className={`relative select-none touch-none flex items-center justify-center cursor-pointer transition-transform ${className}`}
      style={{
        width: `${size}px`,
        height: `${size}px`,
      }}
    >
      {/* Outer Frosted Candy Ring */}
      <div
        className={`absolute inset-0 rounded-full border-2 transition-colors duration-200 ${
          isActive
            ? 'border-pink-400 bg-pink-950/45 shadow-[0_0_24px_rgba(244,114,182,0.5)]'
            : 'border-pink-500/40 bg-purple-950/35 backdrop-blur-xs'
        }`}
      >
        {/* Subtle crosshair guide */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-20">
          <div className="w-full h-0.5 bg-pink-400" />
          <div className="absolute h-full w-0.5 bg-pink-400" />
        </div>
      </div>

      {/* Central Peppermint Candy Knob */}
      <div
        className="absolute rounded-full shadow-lg pointer-events-none flex items-center justify-center transition-shadow"
        style={{
          width: `${size * 0.44}px`,
          height: `${size * 0.44}px`,
          transform: `translate(${knobPos.x}px, ${knobPos.y}px)`,
          transition: isActive ? 'none' : 'transform 0.18s cubic-bezier(0.16, 1, 0.3, 1)',
        }}
      >
        {/* Swirl Peppermint Knob Design */}
        <div
          className={`w-full h-full rounded-full border-2 border-white/80 overflow-hidden relative shadow-md ${
            isActive ? 'ring-2 ring-pink-400 scale-105' : ''
          }`}
          style={{
            background: 'radial-gradient(circle at 35% 35%, #ff4d8d, #be185d 70%, #831843)',
          }}
        >
          {/* Peppermint Spiral Highlights */}
          <div className="absolute inset-0 opacity-40 mix-blend-overlay">
            <svg viewBox="0 0 100 100" className="w-full h-full animate-[spin_12s_linear_infinite]">
              <path d="M50 50 L50 0 A50 50 0 0 1 85 15 Z" fill="#ffffff" />
              <path d="M50 50 L100 50 A50 50 0 0 1 85 85 Z" fill="#ffffff" />
              <path d="M50 50 L50 100 A50 50 0 0 1 15 85 Z" fill="#ffffff" />
              <path d="M50 50 L0 50 A50 50 0 0 1 15 15 Z" fill="#ffffff" />
            </svg>
          </div>
          {/* Center gloss dot */}
          <div className="absolute top-2 left-2 w-3 h-3 rounded-full bg-white/60 blur-[1px]" />
        </div>
      </div>
    </div>
  );
};
