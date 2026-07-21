import { useEffect, useRef } from 'react';
import gsap from 'gsap';
import { Heart } from 'lucide-react';

interface PreloaderProps {
  onComplete: () => void;
}

export default function Preloader({ onComplete }: PreloaderProps) {
  const overlayRef = useRef<HTMLDivElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const photoRef = useRef<HTMLDivElement>(null);
  const glowRef = useRef<HTMLDivElement>(null);
  const stampLabelRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!overlayRef.current || !cardRef.current || !photoRef.current || !glowRef.current) return;

    // Set initial values
    gsap.set(cardRef.current, {
      y: 50,
      scale: 0.92,
      rotate: -3,
      opacity: 0,
    });
    gsap.set(photoRef.current, {
      opacity: 0,
      filter: 'blur(20px) contrast(3.5) brightness(0.6)',
      scale: 0.85,
    });
    gsap.set(glowRef.current, {
      opacity: 0,
      scale: 0.7,
    });

    const tl = gsap.timeline({
      onComplete: () => {
        // Trigger parent callback to unmount preloader
        onComplete();
      }
    });

    // 1. Initial fade-in of ambient red light glow and Polaroid card frame
    tl.to(glowRef.current, {
      opacity: 0.35,
      scale: 1.15,
      duration: 1.6,
      ease: 'sine.inOut',
    });

    tl.to(cardRef.current, {
      opacity: 1,
      y: 0,
      scale: 1,
      rotate: 1.5,
      duration: 1.2,
      ease: 'power2.out',
    }, 0.3);

    // 2. Slow photo development stage (Blur dissolves, contrast balances, elements sharpen)
    tl.to(photoRef.current, {
      opacity: 0.9,
      filter: 'blur(0px) contrast(1) brightness(1)',
      scale: 1,
      duration: 3.2,
      ease: 'power1.in',
    }, 1.0);

    // 3. Text label toggle when fully developed
    tl.to(stampLabelRef.current, {
      opacity: 0,
      duration: 0.25,
      onComplete: () => {
        if (stampLabelRef.current) {
          stampLabelRef.current.innerText = 'DEVELOPED';
          gsap.to(stampLabelRef.current, { opacity: 1, duration: 0.25 });
        }
      }
    }, 3.6);

    // 4. Slide up screen transition
    tl.to(overlayRef.current, {
      yPercent: -100,
      duration: 0.95,
      ease: 'power2.inOut',
    }, 4.8);

  }, [onComplete]);

  // Format current date in yy.MM.dd style
  const getFormattedDate = () => {
    const today = new Date();
    const yy = String(today.getFullYear()).slice(-2);
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    return `${yy}.${mm}.${dd}`;
  };

  return (
    <div
      ref={overlayRef}
      className="fixed inset-0 bg-[#080808] z-[99999] flex flex-col items-center justify-center overflow-hidden select-none pointer-events-auto"
    >
      {/* Dim red light glow (breathing ambient background bulb) */}
      <div
        ref={glowRef}
        className="absolute w-[450px] h-[450px] rounded-full bg-radial from-red-900/40 via-red-950/10 to-transparent blur-[100px] pointer-events-none z-0"
      />

      {/* Polaroid card container */}
      <div
        ref={cardRef}
        className="relative z-10 w-56 h-72 bg-[#faf9f6] p-4 flex flex-col justify-between shadow-[0_30px_70px_rgba(0,0,0,0.9)] border border-stone-200/50 rounded-sm"
      >
        <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-red-600/30 to-stone-500/10" />

        {/* Chemical Photo Tank area */}
        <div className="w-full aspect-square bg-[#0c0c0c] border border-stone-200/10 flex items-center justify-center relative overflow-hidden rounded-xs">
          <div
            ref={photoRef}
            className="flex flex-col items-center justify-center text-[#8e1616] p-2"
          >
            <Heart className="w-16 h-16 fill-[#8e1616] drop-shadow-[0_4px_12px_rgba(142,22,22,0.4)]" />
          </div>
        </div>

        {/* Polaroid caption signature stamp */}
        <div className="flex justify-between items-center mt-3 font-mono text-[9px] text-[#8e1616] font-bold">
          <span>{getFormattedDate()}</span>
          <span ref={stampLabelRef} className="tracking-widest">DEVELOPING</span>
        </div>
      </div>

      {/* Floating chemical code log */}
      <div className="absolute bottom-6 text-[8px] font-mono text-red-900/40 tracking-[0.3em] font-bold z-10">
        [ BATH_PROCESS: TANK_01 // ACTIVE_DEVELOPER ]
      </div>
    </div>
  );
}
