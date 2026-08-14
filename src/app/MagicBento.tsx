"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { gsap } from 'gsap';

export interface BentoCardProps {
  color?: string;
  title?: string;
  description?: string;
  label?: string;
  textAutoHide?: boolean;
  disableAnimations?: boolean;
}

export interface BentoProps {
  textAutoHide?: boolean;
  enableStars?: boolean;
  enableSpotlight?: boolean;
  enableBorderGlow?: boolean;
  disableAnimations?: boolean;
  spotlightRadius?: number;
  particleCount?: number;
  enableTilt?: boolean;
  glowColor?: string;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  cards?: BentoCardProps[];
}

const DEFAULT_PARTICLE_COUNT = 12;
const DEFAULT_SPOTLIGHT_RADIUS = 300;
const DEFAULT_GLOW_COLOR = '192, 132, 252';
const MOBILE_BREAKPOINT = 768;

const defaultCardData: BentoCardProps[] = [
  {
    color: 'var(--bg-secondary)',
    title: 'Stateless Guarantee',
    description: 'Images are processed ephemerally in memory and returned instantly. We retain zero storage.',
    label: 'Stateless'
  },
  {
    color: 'var(--bg-secondary)',
    title: 'Privacy Policy',
    description: 'All transit is encrypted via secure HTTPS. We deploy zero cookies or tracking code.',
    label: 'Privacy'
  },
  {
    color: 'var(--bg-secondary)',
    title: 'Developer REST API',
    description: 'Integrate image conversion, processing, and background removal directly in your terminal.',
    label: 'API Access'
  },
  {
    color: 'var(--bg-secondary)',
    title: 'Telegram Bot',
    description: 'Access conversion, resizing, and filters on the go. Send media directly in your chats.',
    label: 'Chat Integration'
  },
  {
    color: 'var(--bg-secondary)',
    title: 'Open Source',
    description: 'Built under MIT on Next.js, OGL WebGL rendering systems, and Transformers local AI.',
    label: 'GitHub'
  },
  {
    color: 'var(--bg-secondary)',
    title: 'Zero Log Retention',
    description: 'Server logging logs only HTTP status codes to prevent data exposure of payload values.',
    label: 'Log Policy'
  }
];

const createParticleElement = (x: number, y: number, color: string = DEFAULT_GLOW_COLOR): HTMLDivElement => {
  const el = document.createElement('div');
  el.className = 'particle';
  el.style.cssText = `
    position: absolute;
    width: 4px;
    height: 4px;
    border-radius: 50%;
    background: rgba(${color}, 1);
    box-shadow: 0 0 6px rgba(${color}, 0.6);
    pointer-events: none;
    z-index: 100;
    left: ${x}px;
    top: ${y}px;
  `;
  return el;
};

const calculateSpotlightValues = (radius: number) => ({
  proximity: radius * 0.5,
  fadeDistance: radius * 0.75
});

const updateCardGlowProperties = (card: HTMLElement, mouseX: number, mouseY: number, glow: number, radius: number) => {
  const rect = card.getBoundingClientRect();
  const relativeX = ((mouseX - rect.left) / rect.width) * 100;
  const relativeY = ((mouseY - rect.top) / rect.height) * 100;

  card.style.setProperty('--glow-x', `${relativeX}%`);
  card.style.setProperty('--glow-y', `${relativeY}%`);
  card.style.setProperty('--glow-intensity', glow.toString());
  card.style.setProperty('--glow-radius', `${radius}px`);
};

const ParticleCard: React.FC<{
  children: React.ReactNode;
  className?: string;
  disableAnimations?: boolean;
  style?: React.CSSProperties;
  particleCount?: number;
  glowColor?: string;
  enableTilt?: boolean;
  clickEffect?: boolean;
  enableMagnetism?: boolean;
  onClick?: () => void;
}> = ({
  children,
  className = '',
  disableAnimations = false,
  style,
  particleCount = DEFAULT_PARTICLE_COUNT,
  glowColor = DEFAULT_GLOW_COLOR,
  enableTilt = true,
  clickEffect = false,
  enableMagnetism = false,
  onClick
}) => {
  const cardRef = useRef<HTMLDivElement>(null);
  const visualRef = useRef<HTMLDivElement>(null);
  const particlesRef = useRef<HTMLDivElement[]>([]);
  const timeoutsRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const isHoveredRef = useRef(false);
  const memoizedParticles = useRef<HTMLDivElement[]>([]);
  const particlesInitialized = useRef(false);
  const magnetismAnimationRef = useRef<gsap.core.Tween | null>(null);

  const initializeParticles = useCallback(() => {
    if (particlesInitialized.current || !visualRef.current) return;

    const { width, height } = visualRef.current.getBoundingClientRect();
    memoizedParticles.current = Array.from({ length: particleCount }, () =>
      createParticleElement(Math.random() * width, Math.random() * height, glowColor)
    );
    particlesInitialized.current = true;
  }, [particleCount, glowColor]);

  const clearAllParticles = useCallback(() => {
    timeoutsRef.current.forEach(clearTimeout);
    timeoutsRef.current = [];
    magnetismAnimationRef.current?.kill();

    particlesRef.current.forEach(particle => {
      gsap.to(particle, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        onComplete: () => {
          try {
            particle.parentNode?.removeChild(particle);
          } catch {}
        }
      });
    });
    particlesRef.current = [];
  }, []);

  const animateParticles = useCallback(() => {
    if (!visualRef.current || !isHoveredRef.current) return;

    if (!particlesInitialized.current) {
      initializeParticles();
    }

    memoizedParticles.current.forEach((particle, index) => {
      const timeoutId = setTimeout(() => {
        if (!isHoveredRef.current || !visualRef.current) return;

        const clone = particle.cloneNode(true) as HTMLDivElement;
        visualRef.current.appendChild(clone);
        particlesRef.current.push(clone);

        gsap.fromTo(clone, { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.3 });

        gsap.to(clone, {
          x: (Math.random() - 0.5) * 60,
          y: (Math.random() - 0.5) * 60,
          rotation: Math.random() * 360,
          duration: 3 + Math.random() * 3,
          ease: 'none',
          repeat: -1,
          yoyo: true
        });

        gsap.to(clone, {
          opacity: 0.3,
          duration: 1.5,
          ease: 'power2.inOut',
          repeat: -1,
          yoyo: true
        });
      }, index * 120);

      timeoutsRef.current.push(timeoutId);
    });
  }, [initializeParticles]);

  useEffect(() => {
    if (disableAnimations || !cardRef.current || !visualRef.current) return;

    const element = cardRef.current;
    const visualElement = visualRef.current;

    const handleMouseEnter = () => {
      isHoveredRef.current = true;
      if (particleCount > 0) {
        animateParticles();
      }

      if (enableTilt) {
        gsap.to(visualElement, {
          rotateX: 2,
          rotateY: 2,
          duration: 0.3,
          ease: 'power2.out',
          transformPerspective: 800
        });
      }
    };

    const handleMouseLeave = () => {
      isHoveredRef.current = false;
      clearAllParticles();

      if (enableTilt) {
        gsap.to(visualElement, {
          rotateX: 0,
          rotateY: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }

      if (enableMagnetism) {
        gsap.to(visualElement, {
          x: 0,
          y: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleMouseMove = (e: MouseEvent) => {
      if (!enableTilt && !enableMagnetism) return;

      const rect = element.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;
      const centerX = rect.width / 2;
      const centerY = rect.height / 2;

      if (enableTilt) {
        const rotateX = ((y - centerY) / centerY) * -4;
        const rotateY = ((x - centerX) / centerX) * 4;

        gsap.to(visualElement, {
          rotateX,
          rotateY,
          duration: 0.1,
          ease: 'power2.out',
          transformPerspective: 800
        });
      }

      if (enableMagnetism) {
        const magnetX = (x - centerX) * 0.04;
        const magnetY = (y - centerY) * 0.04;

        magnetismAnimationRef.current = gsap.to(visualElement, {
          x: magnetX,
          y: magnetY,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    const handleClick = (e: MouseEvent) => {
      if (clickEffect) {
        const rect = visualElement.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        const maxDistance = Math.max(
          Math.hypot(x, y),
          Math.hypot(x - rect.width, y),
          Math.hypot(x, y - rect.height),
          Math.hypot(x - rect.width, y - rect.height)
        );

        const ripple = document.createElement('div');
        ripple.style.cssText = `
          position: absolute;
          width: ${maxDistance * 2}px;
          height: ${maxDistance * 2}px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(${glowColor}, 0.35) 0%, rgba(${glowColor}, 0.15) 30%, transparent 70%);
          left: ${x - maxDistance}px;
          top: ${y - maxDistance}px;
          pointer-events: none;
          z-index: 1000;
        `;

        visualElement.appendChild(ripple);

        gsap.fromTo(
          ripple,
          {
            scale: 0,
            opacity: 1
          },
          {
            scale: 1,
            opacity: 0,
            duration: 0.8,
            ease: 'power2.out',
            onComplete: () => {
              try {
                ripple.remove();
              } catch {}
            }
          }
        );
      }
      onClick?.();
    };

    element.addEventListener('mouseenter', handleMouseEnter);
    element.addEventListener('mouseleave', handleMouseLeave);
    element.addEventListener('mousemove', handleMouseMove);
    element.addEventListener('click', handleClick);

    return () => {
      isHoveredRef.current = false;
      element.removeEventListener('mouseenter', handleMouseEnter);
      element.removeEventListener('mouseleave', handleMouseLeave);
      element.removeEventListener('mousemove', handleMouseMove);
      element.removeEventListener('click', handleClick);
      clearAllParticles();
    };
  }, [animateParticles, clearAllParticles, disableAnimations, enableTilt, enableMagnetism, clickEffect, glowColor, onClick, particleCount]);

  return (
    <div
      ref={cardRef}
      className={className.includes('bento-detail-card') ? '' : 'card-wrapper'}
      style={{
        position: 'relative',
        width: '100%',
        boxSizing: 'border-box'
      }}
    >
      <div
        ref={visualRef}
        className={className}
        style={{
          ...style,
          width: '100%',
          height: '100%',
          boxSizing: 'border-box',
          overflow: 'hidden'
        }}
      >
        {children}
      </div>
    </div>
  );
};

const GlobalSpotlight: React.FC<{
  gridRef: React.RefObject<HTMLDivElement | null>;
  disableAnimations?: boolean;
  enabled?: boolean;
  spotlightRadius?: number;
  glowColor?: string;
}> = ({
  gridRef,
  disableAnimations = false,
  enabled = true,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  glowColor = DEFAULT_GLOW_COLOR
}) => {
  const spotlightRef = useRef<HTMLDivElement | null>(null);
  const isInsideSection = useRef(false);

  useEffect(() => {
    if (disableAnimations || !gridRef?.current || !enabled) return;

    const spotlight = document.createElement('div');
    spotlight.className = 'global-spotlight';
    spotlight.style.cssText = `
      position: fixed;
      width: 800px;
      height: 800px;
      border-radius: 50%;
      pointer-events: none;
      background: radial-gradient(circle,
        rgba(${glowColor}, 0.12) 0%,
        rgba(${glowColor}, 0.06) 15%,
        rgba(${glowColor}, 0.03) 25%,
        rgba(${glowColor}, 0.01) 40%,
        transparent 65%
      );
      z-index: 200;
      opacity: 0;
      transform: translate(-50%, -50%);
      mix-blend-mode: screen;
    `;
    document.body.appendChild(spotlight);
    spotlightRef.current = spotlight;

    const handleMouseMove = (e: MouseEvent) => {
      if (!spotlightRef.current || !gridRef.current) return;

      const section = gridRef.current;
      const rect = section.getBoundingClientRect();
      const mouseInside =
        e.clientX >= rect.left && e.clientX <= rect.right && e.clientY >= rect.top && e.clientY <= rect.bottom;

      isInsideSection.current = mouseInside;
      const cards = gridRef.current.querySelectorAll('.card');

      if (!mouseInside) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
        cards.forEach(card => {
          (card as HTMLElement).style.setProperty('--glow-intensity', '0');
        });
        return;
      }

      const { proximity, fadeDistance } = calculateSpotlightValues(spotlightRadius);
      let minDistance = Infinity;

      cards.forEach(card => {
        const cardElement = card as HTMLElement;
        const cardRect = cardElement.getBoundingClientRect();
        const centerX = cardRect.left + cardRect.width / 2;
        const centerY = cardRect.top + cardRect.height / 2;
        const distance =
          Math.hypot(e.clientX - centerX, e.clientY - centerY) - Math.max(cardRect.width, cardRect.height) / 2;
        const effectiveDistance = Math.max(0, distance);

        minDistance = Math.min(minDistance, effectiveDistance);

        let glowIntensity = 0;
        if (effectiveDistance <= proximity) {
          glowIntensity = 1;
        } else if (effectiveDistance <= fadeDistance) {
          glowIntensity = (fadeDistance - effectiveDistance) / (fadeDistance - proximity);
        }

        updateCardGlowProperties(cardElement, e.clientX, e.clientY, glowIntensity, spotlightRadius);
      });

      gsap.to(spotlightRef.current, {
        left: e.clientX,
        top: e.clientY,
        duration: 0.1,
        ease: 'power2.out'
      });

      const targetOpacity =
        minDistance <= proximity
          ? 0.8
          : minDistance <= fadeDistance
            ? ((fadeDistance - minDistance) / (fadeDistance - proximity)) * 0.8
            : 0;

      gsap.to(spotlightRef.current, {
        opacity: targetOpacity,
        duration: targetOpacity > 0 ? 0.2 : 0.5,
        ease: 'power2.out'
      });
    };

    const handleMouseLeave = () => {
      isInsideSection.current = false;
      gridRef.current?.querySelectorAll('.card').forEach(card => {
        (card as HTMLElement).style.setProperty('--glow-intensity', '0');
      });
      if (spotlightRef.current) {
        gsap.to(spotlightRef.current, {
          opacity: 0,
          duration: 0.3,
          ease: 'power2.out'
        });
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseleave', handleMouseLeave);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseleave', handleMouseLeave);
      try {
        spotlightRef.current?.parentNode?.removeChild(spotlightRef.current);
      } catch {}
    };
  }, [gridRef, disableAnimations, enabled, spotlightRadius, glowColor]);

  return null;
};

const BentoCardGrid: React.FC<{
  children: React.ReactNode;
  gridRef?: React.RefObject<HTMLDivElement | null>;
}> = ({ children, gridRef }) => (
  <div
    className="bento-section select-none relative"
    ref={gridRef}
  >
    {children}
  </div>
);

const useMobileDetection = () => {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth <= MOBILE_BREAKPOINT);

    checkMobile();
    window.addEventListener('resize', checkMobile);

    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return isMobile;
};

const MagicBento: React.FC<BentoProps> = ({
  textAutoHide = false,
  enableStars = true,
  enableSpotlight = true,
  enableBorderGlow = true,
  disableAnimations = false,
  spotlightRadius = DEFAULT_SPOTLIGHT_RADIUS,
  particleCount = DEFAULT_PARTICLE_COUNT,
  enableTilt = true,
  glowColor = DEFAULT_GLOW_COLOR,
  clickEffect = true,
  enableMagnetism = true,
  cards = defaultCardData
}) => {
  const gridRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isMobile = useMobileDetection();
  const shouldDisableAnimations = disableAnimations || isMobile;

  const [activeCardIndex, setActiveCardIndex] = useState<number | null>(null);
  const [animating, setAnimating] = useState(false);

  const handleCardClick = (index: number) => {
    if (animating) return;
    setAnimating(true);

    const gridEl = containerRef.current?.querySelector('.bento-grid-wrapper');
    if (gridEl) {
      gsap.to(gridEl, {
        opacity: 0,
        scale: 0.96,
        y: -15,
        duration: 0.22,
        ease: 'power2.inOut',
        onComplete: () => {
          setActiveCardIndex(index);
          setAnimating(false);
        }
      });
    } else {
      setActiveCardIndex(index);
      setAnimating(false);
    }
  };

  const handleClose = () => {
    if (animating) return;
    setAnimating(true);

    const detailEl = containerRef.current?.querySelector('.bento-detail-wrapper');
    if (detailEl) {
      gsap.to(detailEl, {
        opacity: 0,
        scale: 0.96,
        y: 15,
        duration: 0.22,
        ease: 'power2.inOut',
        onComplete: () => {
          setActiveCardIndex(null);
          setAnimating(false);
        }
      });
    } else {
      setActiveCardIndex(null);
      setAnimating(false);
    }
  };

  useEffect(() => {
    if (activeCardIndex === null) {
      const gridEl = containerRef.current?.querySelector('.bento-grid-wrapper');
      if (gridEl) {
        gsap.fromTo(gridEl,
          { opacity: 0, scale: 0.96, y: 15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'all' }
        );
      }
    } else {
      const detailEl = containerRef.current?.querySelector('.bento-detail-wrapper');
      if (detailEl) {
        gsap.fromTo(detailEl,
          { opacity: 0, scale: 0.96, y: -15 },
          { opacity: 1, scale: 1, y: 0, duration: 0.4, ease: 'power3.out', clearProps: 'all' }
        );
      }
    }
  }, [activeCardIndex]);

  return (
    <div ref={containerRef} style={{ width: '100%' }}>
      <style>
        {`
          .card-wrapper {
            position: relative;
            width: 100%;
            aspect-ratio: 1.45 / 1;
            min-height: 180px;
            box-sizing: border-box;
            perspective: 1000px;
            z-index: 1;
            transition: z-index 0.3s ease;
          }
          
          .card-wrapper:hover {
            z-index: 10;
          }
          
          @media (max-width: 599px) {
            .card-wrapper {
              aspect-ratio: auto;
              min-height: 160px;
            }
          }

          .bento-section {
            --glow-x: 50%;
            --glow-y: 50%;
            --glow-intensity: 0;
            --glow-radius: 200px;
            --glow-color: ${glowColor};
            --border-color: var(--border-color);
            --background-dark: var(--bg-secondary);
            --white: hsl(0, 0%, 100%);
            
            display: grid;
            gap: 1rem;
            width: 100%;
            max-width: 1200px;
            user-select: none;
            position: relative;
            box-sizing: border-box;
            margin: 0 auto;
          }
          
          .card-responsive {
            display: grid;
            gap: 1rem;
            width: 100%;
          }
          
          @media (min-width: 600px) {
            .card-responsive {
              grid-template-columns: repeat(2, 1fr);
            }
          }
          
          @media (min-width: 1024px) {
            .card-responsive {
              grid-template-columns: repeat(3, 1fr);
            }
          }
          
          .card {
            display: flex;
            flex-direction: column;
            justify-content: space-between;
            position: relative;
            aspect-ratio: inherit;
            min-height: inherit;
            width: 100%;
            box-sizing: border-box;
            padding: 1.75rem;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background-color: var(--background-dark);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            overflow: hidden;
            transition: border-color 0.3s ease, box-shadow 0.3s ease, background-color 0.3s ease;
            cursor: pointer;
          }
          
          .card__header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            position: relative;
            color: var(--text-secondary);
            font-family: var(--font-mono);
            font-size: 0.72rem;
            text-transform: uppercase;
            letter-spacing: 0.05em;
          }
          
          .card__label {
            opacity: 0.7;
          }
          
          .card__content {
            display: flex;
            flex-direction: column;
            position: relative;
            color: var(--text-primary);
            gap: 0.5rem;
          }
          
          .card__title {
            font-family: var(--font-sans);
            font-size: 1.05rem;
            font-weight: 600;
            margin: 0;
            color: var(--text-primary);
          }
          
          .card__description {
            font-family: var(--font-sans);
            font-size: 0.82rem;
            line-height: 1.5;
            color: var(--text-secondary);
            margin: 0;
          }
          
          .card--border-glow::after {
            content: '';
            position: absolute;
            inset: 0;
            padding: 1px;
            background: radial-gradient(var(--glow-radius) circle at var(--glow-x) var(--glow-y),
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.85)) 0%,
                rgba(${glowColor}, calc(var(--glow-intensity) * 0.4)) 35%,
                transparent 70%);
            border-radius: inherit;
            -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            -webkit-mask-composite: xor;
            mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
            mask-composite: exclude;
            pointer-events: none;
            z-index: 1;
          }
          
          .card--border-glow:hover {
            border-color: rgba(${glowColor}, 0.25);
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4), 0 0 20px rgba(${glowColor}, 0.15);
          }
          
          .particle::before {
            content: '';
            position: absolute;
            top: -2px;
            left: -2px;
            right: -2px;
            bottom: -2px;
            background: rgba(${glowColor}, 0.2);
            border-radius: 50%;
            z-index: -1;
          }
          
          .text-clamp-1 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 1;
            line-clamp: 1;
            overflow: hidden;
            text-overflow: ellipsis;
          }
          
          .text-clamp-2 {
            display: -webkit-box;
            -webkit-box-orient: vertical;
            -webkit-line-clamp: 2;
            line-clamp: 2;
            overflow: hidden;
            text-overflow: ellipsis;
          }

          /* Bento Details Expanded Layout */
          .bento-detail-card {
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
            box-sizing: border-box;
            padding: 3rem 2.5rem;
            border-radius: 4px;
            border: 1px solid var(--border-color);
            background-color: var(--background-dark);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            position: relative;
            box-shadow: 0 8px 30px rgba(0, 0, 0, 0.4), 0 0 20px rgba(${glowColor}, 0.1);
            display: flex;
            flex-direction: column;
            gap: 1.5rem;
            overflow: hidden;
          }
          
          .bento-detail-close-btn {
            position: absolute;
            top: 2rem;
            right: 2rem;
            background: none;
            border: none;
            color: var(--text-secondary);
            font-size: 1.5rem;
            cursor: pointer;
            transition: color 0.2s ease, transform 0.2s ease;
            z-index: 1002;
          }
          
          .bento-detail-close-btn:hover {
            color: var(--text-primary);
            transform: scale(1.1);
          }
          
          .bento-modal-body {
            display: flex;
            flex-direction: column;
            gap: 1rem;
            color: var(--text-secondary);
            font-size: 0.92rem;
            line-height: 1.6;
            z-index: 1001;
            position: relative;
          }
          
          .bento-modal-body p {
            margin: 0;
          }
          
          .bento-modal-body h4 {
            color: var(--text-primary);
            font-size: 1.15rem;
            font-weight: 700;
            letter-spacing: -0.01em;
            margin: 0;
            text-transform: uppercase;
          }
          
          .bento-modal-body strong {
            color: var(--text-primary);
          }
          
          .bento-modal-body code {
            font-family: var(--font-mono);
            font-size: 0.8rem;
            background-color: rgba(0, 0, 0, 0.3);
            border: 1px solid var(--border-color);
            padding: 0.2rem 0.4rem;
            border-radius: 3px;
            color: var(--text-primary);
          }
          
          .bento-modal-code-block {
            background-color: rgba(0, 0, 0, 0.25);
            border: 1px solid var(--border-color);
            border-radius: 4px;
            padding: 1rem;
            font-family: var(--font-mono);
            font-size: 0.78rem;
            color: var(--text-primary);
            overflow-x: auto;
            margin-top: 0.5rem;
            z-index: 1002;
            position: relative;
          }
          
          .bento-modal-code-block pre {
            margin: 0;
            white-space: pre-wrap;
            line-height: 1.5;
          }

          .bento-modal-btn {
            display: inline-flex;
            align-items: center;
            justify-content: center;
            background-color: var(--bg-secondary);
            border: 1px solid var(--border-color);
            color: var(--text-primary);
            padding: 0.75rem 1.5rem;
            border-radius: 4px;
            font-family: var(--font-mono);
            font-size: 0.8rem;
            font-weight: 500;
            cursor: pointer;
            transition: all 0.2s ease;
            letter-spacing: 0.05em;
            text-transform: uppercase;
            text-decoration: none;
            width: fit-content;
            margin-top: 0.75rem;
            z-index: 1002;
            position: relative;
          }
          
          .bento-modal-btn:hover {
            background-color: var(--bg-tertiary);
            border-color: rgba(${glowColor}, 0.5);
          }
          
          @media (max-width: 599px) {
            .card-responsive {
              grid-template-columns: 1fr;
              width: 100%;
            }
            
            .card-responsive .card {
              width: 100%;
              min-height: 160px;
              aspect-ratio: auto;
            }
            
            .bento-detail-card {
              padding: 2rem 1.5rem;
            }
          }
        `}
      </style>

      {enableSpotlight && activeCardIndex === null && (
        <GlobalSpotlight
          gridRef={gridRef}
          disableAnimations={shouldDisableAnimations}
          enabled={enableSpotlight}
          spotlightRadius={spotlightRadius}
          glowColor={glowColor}
        />
      )}

      {activeCardIndex === null ? (
        <div className="bento-grid-wrapper" style={{ width: '100%' }}>
          <BentoCardGrid gridRef={gridRef}>
            <div className="card-responsive">
              {cards.map((card, index) => {
                const baseClassName = `card ${enableBorderGlow ? 'card--border-glow' : ''}`;

                const cardStyle = {
                  backgroundColor: card.color || 'var(--bg-secondary)',
                  borderColor: 'var(--border-color)',
                  color: 'var(--white)',
                  '--glow-x': '50%',
                  '--glow-y': '50%',
                  '--glow-intensity': '0',
                  '--glow-radius': '200px'
                } as React.CSSProperties;

                return (
                  <ParticleCard
                    key={index}
                    className={baseClassName}
                    style={cardStyle}
                    disableAnimations={shouldDisableAnimations}
                    particleCount={enableStars ? particleCount : 0}
                    glowColor={glowColor}
                    enableTilt={enableTilt}
                    clickEffect={clickEffect}
                    enableMagnetism={enableMagnetism}
                    onClick={() => handleCardClick(index)}
                  >
                    <div className="card__header">
                      <span className="card__label">{card.label}</span>
                    </div>
                    <div className="card__content">
                      <h3 className={`card__title ${textAutoHide ? 'text-clamp-1' : ''}`}>
                        {card.title}
                      </h3>
                      <p className={`card__description ${textAutoHide ? 'text-clamp-2' : ''}`}>
                        {card.description}
                      </p>
                    </div>
                  </ParticleCard>
                );
              })}
            </div>
          </BentoCardGrid>
        </div>
      ) : (
        <div className="bento-detail-wrapper" style={{ width: '100%' }}>
          <ParticleCard
            className={`bento-detail-card ${enableBorderGlow ? 'card--border-glow' : ''}`}
            style={{
              backgroundColor: 'var(--bg-secondary)',
              borderColor: 'var(--border-color)',
              color: 'var(--white)',
              '--glow-x': '50%',
              '--glow-y': '50%',
              '--glow-intensity': '0',
              '--glow-radius': '360px'
            } as React.CSSProperties}
            disableAnimations={shouldDisableAnimations}
            particleCount={enableStars ? particleCount * 2 : 0}
            glowColor={glowColor}
            enableTilt={enableTilt}
            clickEffect={clickEffect}
            enableMagnetism={false}
          >
            <button className="bento-detail-close-btn" onClick={handleClose}>✕</button>
            <div className="card__header" style={{ marginBottom: '0.5rem', zIndex: 1001, position: 'relative' }}>
              <span>{cards[activeCardIndex].label}</span>
            </div>
            <div className="bento-modal-body" style={{ zIndex: 1001, position: 'relative' }}>
              {activeCardIndex === 0 && (
                <>
                  <h4>Stateless Guarantee</h4>
                  <p>
                    Chimera is engineered to run completely statelessly. When you convert, crop, or process an image, all data is held in transient server RAM memory and returned directly to your browser download stack.
                  </p>
                  <p>
                    <strong>No Storage:</strong> We do not deploy databases or local disk mounts. Files are immediately discarded upon response stream closure.
                  </p>
                  <p>
                    <strong>No Metadata Scraping:</strong> We do not extract EXIF data or scan properties for diagnostic metrics.
                  </p>
                </>
              )}
              {activeCardIndex === 1 && (
                <>
                  <h4>Privacy Policy</h4>
                  <p>
                    Your security and privacy are fundamental.
                  </p>
                  <p>
                    <strong>TLS Transit:</strong> All file uploads and API calls are fully encrypted in transit using standard TLS HTTPS protocols.
                  </p>
                  <p>
                    <strong>No Ad-Tracking:</strong> We deploy no analytics beacons, third-party cookies, Google Analytics, Meta pixels, or advertising scripts.
                  </p>
                  <p>
                    <strong>Edge Infrastructure:</strong> Hosted securely via Vercel edges, offering automatic DDoS protection without inspecting request bodies.
                  </p>
                </>
              )}
              {activeCardIndex === 2 && (
                <>
                  <h4>Developer REST API</h4>
                  <p>
                    Integrate Chimera directly into automated pipelines or local terminal scripts.
                  </p>
                  <p><strong>Format Conversion &amp; Processing:</strong></p>
                  <div className="bento-modal-code-block">
                    <pre>
{`curl -X POST https://chimera.sh/api/process \\
  -F "file=@image.png" \\
  -F "format=webp" \\
  -F "operation=convert"`}
                    </pre>
                  </div>
                  <p style={{ marginTop: '0.5rem' }}><strong>Background Removal:</strong></p>
                  <div className="bento-modal-code-block">
                    <pre>
{`curl -X POST https://chimera.sh/api/process \\
  -F "file=@image.jpg" \\
  -F "operation=remove-background"`}
                    </pre>
                  </div>
                </>
              )}
              {activeCardIndex === 3 && (
                <>
                  <h4>Telegram Bot</h4>
                  <p>
                    Edit and convert photos directly from your favorite chat app. Send images to our bot to start a stateless process in seconds.
                  </p>
                  <p>
                    <strong>On-the-go workflow:</strong> Convert to WebP/AVIF, crop aspect ratios, or remove backgrounds instantly without downloading desktop software.
                  </p>
                  <a href="https://t.me/ChimeraImageBot" target="_blank" rel="noreferrer" className="bento-modal-btn">
                    Open Telegram Bot
                  </a>
                </>
              )}
              {activeCardIndex === 4 && (
                <>
                  <h4>Open Source Stack</h4>
                  <p>
                    Chimera is open-source and free software released under the MIT License.
                  </p>
                  <p>
                    <strong>Next.js Framework:</strong> Built for performance and serverless route handling.
                    Deploy directly onto Vercel infrastructure.
                  </p>
                  <p>
                    <strong>Transformers.js:</strong> Client and server-side machine learning running ONNX models natively.
                  </p>
                  <a href="https://github.com/krreeshhh/Chimera" target="_blank" rel="noreferrer" className="bento-modal-btn">
                    View GitHub Repository
                  </a>
                </>
              )}
              {activeCardIndex === 5 && (
                <>
                  <h4>Zero Log Retention</h4>
                  <p>
                    Our server routing engines are configured strictly to log metadata paths and status codes rather than request parameters.
                  </p>
                  <p>
                    <strong>No Body Logging:</strong> File buffers are fully excluded from system print messages.
                  </p>
                  <p>
                    <strong>Rotated Ephemerally:</strong> Log files are kept for real-time error auditing and auto-rotated out within 24 hours.
                  </p>
                </>
              )}
            </div>
          </ParticleCard>
        </div>
      )}
    </div>
  );
};

export default MagicBento;
