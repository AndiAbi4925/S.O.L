import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Camera,
  Download,
  RefreshCw,
  Settings2,
  Sparkles,
  Clock,
  Heart,
  ArrowLeft,
  Maximize2,
  Film,
  Eye,
  Smile,
  ShieldCheck,
  Instagram,
  Play,
  Pause,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../lib/utils';
import {
  LAYOUTS,
  LayoutDef,
  CARD_THEMES,
  CardTheme,
  VISUAL_FILTERS,
  FilterType,
  renderStrip,
  LensEffectType
} from '../lib/renderUtils';
import { createGifExporter } from '../lib/exportUtils';
import { playTick, playShutter, playDing, startLofiBgm, stopLofiBgm } from '../lib/audioUtils';

type ScreenState = 'landing' | 'active' | 'review';
type CapturingState = 'idle' | 'countdown' | 'capturing' | 'completed';

interface HeartParticle {
  id: number;
  x: number;
  y: number;
  scale: number;
  rotation: number;
  wiggle: number;
  color: string;
}

function PixelHeart({ className, style }: { className?: string; style?: React.CSSProperties }) {
  return (
    <svg viewBox="0 0 9 8" className={className} style={style} fill="currentColor">
      {/* Row 0 */}
      <rect x="1" y="0" width="2" height="1" />
      <rect x="6" y="0" width="2" height="1" />
      {/* Row 1 */}
      <rect x="0" y="1" width="4" height="1" />
      <rect x="5" y="1" width="4" height="1" />
      {/* Row 2 & 3 */}
      <rect x="0" y="2" width="9" height="2" />
      {/* Row 4 */}
      <rect x="1" y="4" width="7" height="1" />
      {/* Row 5 */}
      <rect x="2" y="5" width="5" height="1" />
      {/* Row 6 */}
      <rect x="3" y="6" width="3" height="1" />
      {/* Row 7 */}
      <rect x="4" y="7" width="1" height="1" />
    </svg>
  );
}

export default function Photobooth() {
  const [videoElement, setVideoElement] = useState<HTMLVideoElement | null>(null);
  const [hearts, setHearts] = useState<HeartParticle[]>([]);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [isCardHovered, setIsCardHovered] = useState(false);

  const handleCardMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = e.currentTarget;
    const rect = el.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    const rotateX = -(y / (rect.height / 2)) * 12;
    const rotateY = (x / (rect.width / 2)) * 12;
    setTilt({ x: rotateX, y: rotateY });
  }, []);

  const handleCardMouseLeave = useCallback(() => {
    setIsCardHovered(false);
    setTilt({ x: 0, y: 0 });
  }, []);

  const spawnHearts = useCallback(() => {
    const heartColors = ['#8e1616'];
    const newHearts = Array.from({ length: 8 }).map((_, i) => {
      const x = 25 + Math.random() * 50;
      const y = 60 + Math.random() * 20;
      const scale = 0.6 + Math.random() * 0.8;
      const rotation = -30 + Math.random() * 60;
      const wiggle = -50 + Math.random() * 100;
      const color = heartColors[Math.floor(Math.random() * heartColors.length)];
      return {
        id: Date.now() + i + Math.random(),
        x,
        y,
        scale,
        rotation,
        wiggle,
        color,
      };
    });
    setHearts((prev) => [...prev, ...newHearts]);
  }, []);

  const removeHeart = useCallback((id: number) => {
    setHearts((prev) => prev.filter((h) => h.id !== id));
  }, []);

  // App Navigation Flow
  const [screen, setScreen] = useState<ScreenState>('landing');

  // Custom Settings State
  const [activeLayoutId, setActiveLayoutId] = useState<string>('1x4');
  const [activeThemeId, setActiveThemeId] = useState<string>('alabaster');
  const [activeFilterId, setActiveFilterId] = useState<FilterType>('none');
  const [grainIntensity, setGrainIntensity] = useState<number>(30);
  const [showDate, setShowDate] = useState<boolean>(true);
  const [photoDelay, setPhotoDelay] = useState<number>(3); // custom delay in seconds
  const [lensEffect, setLensEffect] = useState<LensEffectType>('none');
  const [isBgmPlaying, setIsBgmPlaying] = useState<boolean>(false);
  const [isAnimatedPreview, setIsAnimatedPreview] = useState<boolean>(false);

  const toggleBgm = () => {
    if (isBgmPlaying) {
      stopLofiBgm();
      setIsBgmPlaying(false);
    } else {
      startLofiBgm();
      setIsBgmPlaying(true);
    }
  };

  // Camera & Capture Session State
  const [isCameraReady, setIsCameraReady] = useState(false);
  const [captureState, setCaptureState] = useState<CapturingState>('idle');
  const [countdownNum, setCountdownNum] = useState<number>(3);
  const [flash, setFlash] = useState(false);
  const [capturedPhotos, setCapturedPhotos] = useState<HTMLCanvasElement[][]>([]);
  const [previewCanvasDataUrl, setPreviewCanvasDataUrl] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [selectedPhotoIndex, setSelectedPhotoIndex] = useState<number>(2); // for static frame review (defaults to middle burst frame)

  const activeLayout = LAYOUTS[activeLayoutId];
  const activeTheme = CARD_THEMES[activeThemeId];
  const currentFilter = VISUAL_FILTERS[activeFilterId];

  // Initialize and keep Camera alive or stop based on navigation screen and video element mount
  useEffect(() => {
    let stream: MediaStream | null = null;
    let active = true;

    async function setupCamera() {
      try {
        const mediaStream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'user', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        });
        if (!active) {
          mediaStream.getTracks().forEach((track) => track.stop());
          return;
        }
        stream = mediaStream;
        if (videoElement) {
          videoElement.srcObject = stream;
          videoElement.onloadedmetadata = () => {
            if (!active) return;
            videoElement.play();
            setIsCameraReady(true);
          };
        }
      } catch (err) {
        console.error('Failed to access camera', err);
        setIsCameraReady(false);
      }
    }

    if (screen === 'active' && videoElement) {
      setupCamera();
    } else if (screen !== 'active') {
      // Cleanup camera streams in landing or review states to release device hooks
      if (videoElement?.srcObject) {
        const streamSrc = videoElement.srcObject as MediaStream;
        streamSrc.getTracks().forEach((track) => track.stop());
        videoElement.srcObject = null;
        setIsCameraReady(false);
      }
    }

    return () => {
      active = false;
      if (stream) {
        stream.getTracks().forEach((track) => track.stop());
      }
    };
  }, [screen, videoElement]);

  // Handle single slice static burst capture
  const captureFrame = useCallback((): HTMLCanvasElement => {
    const video = videoElement;
    if (!video) return document.createElement('canvas');

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      // Mirror the horizontal view
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
      ctx.drawImage(video, 0, 0);
    }
    return canvas;
  }, [videoElement]);

  // Run full photo session loop
  // Run full photo session loop
  const runSession = useCallback(async () => {
    setCapturedPhotos([]);
    const totalShots = activeLayout.slots.length;
    const newPhotos: HTMLCanvasElement[][] = [];

    for (let shot = 0; shot < totalShots; shot++) {
      // Countdown phase using selected photoDelay
      setCaptureState('countdown');
      for (let i = photoDelay; i > 0; i--) {
        setCountdownNum(i);
        playTick();
        await new Promise((r) => setTimeout(r, 1000));
      }

      // Capture phase (burst of 5 quick frames for animating GIF layout)
      setCaptureState('capturing');
      setFlash(true);
      spawnHearts();
      playShutter();
      setTimeout(() => setFlash(false), 80);

      const frames: HTMLCanvasElement[] = [];
      for (let f = 0; f < 5; f++) {
        frames.push(captureFrame());
        await new Promise((r) => setTimeout(r, 100)); // 100ms quick burst
      }
      newPhotos.push(frames);
      setCapturedPhotos([...newPhotos]); // Update active photo cache
    }

    setCaptureState('completed');
    setScreen('review');
  }, [activeLayout, photoDelay, spawnHearts, captureFrame]);

  // Listen for Spacebar or Enter to start the photo session
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (screen === 'active' && isCameraReady && captureState === 'idle') {
        if (e.key === ' ' || e.key === 'Enter') {
          e.preventDefault();
          runSession();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [screen, isCameraReady, captureState, runSession]);



  // Re-generate dynamic high-end preview strip on changes
  useEffect(() => {
    if (screen === 'review' && capturedPhotos.length > 0) {
      const cvs = renderStrip(
        capturedPhotos,
        activeLayout,
        grainIntensity,
        showDate,
        selectedPhotoIndex,
        activeThemeId,
        activeFilterId,
        lensEffect
      );
      setPreviewCanvasDataUrl(cvs.toDataURL('image/jpeg', 0.95));
    }
  }, [screen, capturedPhotos, activeLayout, grainIntensity, showDate, selectedPhotoIndex, activeThemeId, activeFilterId, lensEffect]);

  // Animated "Live" Preview cycling effect
  useEffect(() => {
    let interval: any = null;
    if (screen === 'review' && isAnimatedPreview) {
      interval = setInterval(() => {
        setSelectedPhotoIndex((prev) => (prev + 1) % 5);
      }, 130);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [screen, isAnimatedPreview]);

  // High quality exporters
  const handleExport = async (format: 'jpg' | 'png' | 'gif') => {
    if (!capturedPhotos.length) return;
    setIsExporting(true);

    try {
      let url = '';
      let filename = `SOL-Booth-${new Date().getTime()}`;

      if (format === 'jpg' || format === 'png') {
        const cvs = renderStrip(
          capturedPhotos,
          activeLayout,
          grainIntensity,
          showDate,
          selectedPhotoIndex,
          activeThemeId,
          activeFilterId,
          lensEffect
        );
        const mime = format === 'jpg' ? 'image/jpeg' : 'image/png';
        url = cvs.toDataURL(mime, 0.95);
        filename += `.${format}`;
      } else if (format === 'gif') {
        // Generate high performance frames with appropriate scaling to ensure no device lag
        const frames: HTMLCanvasElement[] = [];
        for (let i = 0; i < 5; i++) {
          frames.push(
            renderStrip(
              capturedPhotos,
              activeLayout,
              grainIntensity,
              showDate,
              i,
              activeThemeId,
              activeFilterId,
              lensEffect
            )
          );
        }

        // Downscale GIF dimensions (approx 0.5) to keep export performance instantaneous and light files
        const scale = 0.55;
        const gifFrames = frames.map(f => {
          const c = document.createElement('canvas');
          c.width = f.width * scale;
          c.height = f.height * scale;
          const gc = c.getContext('2d');
          if (gc) {
            gc.drawImage(f, 0, 0, c.width, c.height);
          }
          return c;
        });

        const blob = await createGifExporter(gifFrames, gifFrames[0].width, gifFrames[0].height, 8);
        url = URL.createObjectURL(blob);
        filename += '.gif';
      }

      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      playDing();
    } catch (e) {
      console.error('Export error', e);
    } finally {
      setIsExporting(false);
    }
  };

  const startNewSession = () => {
    setCapturedPhotos([]);
    setCaptureState('idle');
    setPreviewCanvasDataUrl(null);
    setLensEffect('none');
    stopLofiBgm();
    setIsBgmPlaying(false);
    setIsAnimatedPreview(false);
    setSelectedPhotoIndex(2);
    setScreen('active');
  };

  const returnToMenu = () => {
    setCapturedPhotos([]);
    setCaptureState('idle');
    setPreviewCanvasDataUrl(null);
    setLensEffect('none');
    setIsAnimatedPreview(false);
    setSelectedPhotoIndex(2);
    setScreen('landing');
  };

  return (
    <div className="h-[100dvh] w-screen overflow-hidden bg-[#080808] text-[#e0e0e0] font-sans flex flex-col items-center justify-center select-none relative md:p-4">

      {/* Background Ambience Light Glows (Corner Edges) */}
      <div className="absolute -top-[200px] -left-[200px] w-[500px] h-[500px] bg-[#8e1616] rounded-full blur-[140px] pointer-events-none z-0 animate-ambient-1" />
      <div className="absolute -bottom-[200px] -right-[200px] w-[500px] h-[500px] bg-[#8e1616] rounded-full blur-[140px] pointer-events-none z-0 animate-ambient-2" />
      <div className="absolute -top-[150px] -right-[150px] w-[400px] h-[400px] bg-[#dfccd5] rounded-full blur-[120px] pointer-events-none z-0 animate-ambient-3" />
      <div className="absolute -bottom-[150px] -left-[150px] w-[400px] h-[400px] bg-[#dfccd5] rounded-full blur-[120px] pointer-events-none z-0 animate-ambient-4" />

      <AnimatePresence mode="wait">

        {/* SCREEN 1: LANDING / OPENING PAGE */}
        {screen === 'landing' && (
          <motion.div
            key="landing"
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.98 }}
            transition={{ duration: 0.7, ease: 'easeOut' }}
            className="w-full max-w-4xl min-h-[85vh] bg-[#0f0f0f]/90 border border-[#222] backdrop-blur-2xl rounded-2xl p-8 md:p-14 flex flex-col md:flex-row gap-12 items-center justify-between shadow-3xl z-10 mx-4"
          >
            {/* Branding Text column */}
            <div className="flex-1 flex flex-col justify-center text-left space-y-8">
              <div className="space-y-4">
                <div className="inline-flex items-center gap-2 bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-full">
                  <Heart className="w-3.5 h-3.5 animate-pulse" style={{ color: '#8e1616', fill: 'rgba(142, 22, 22, 0.3)' }} />
                  <span className="text-[10px] uppercase font-mono tracking-[0.25em] text-[#bbb]">Snap of Love</span>
                </div>
                <h1 className="text-6xl md:text-7xl font-serif font-normal italic tracking-tight text-white leading-none">
                  S.O.L
                </h1>
                <p className="text-stone-400 text-lg md:text-xl font-normal leading-relaxed max-w-md">
                  S.O.L (Snap of Love) is an analog-digital photobooth crafted for archiving snapshots of memories, affection, and everyday poetry.
                </p>
              </div>

              {/* High precision info blocks */}
              <div className="grid grid-cols-2 gap-4 border-t border-[#222] pt-6 max-w-sm">
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Formats</p>
                  <p className="text-xs text-stone-300 font-medium">PNG, JPG, Animated GIF</p>
                </div>
                <div className="space-y-1">
                  <p className="text-[10px] font-mono uppercase tracking-widest text-stone-500">Presets</p>
                  <p className="text-xs text-stone-300 font-medium">Retro Film & Custom Stamp</p>
                </div>
              </div>

              {/* Start CTA & BGM Player */}
              <div className="flex flex-col gap-6">
                <div>
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={startNewSession}
                    className="px-8 py-5 bg-white text-black hover:bg-stone-100 rounded-none text-xs font-bold uppercase tracking-[0.3em] shadow-xl flex items-center justify-center gap-3 group transition-colors cursor-pointer animate-in fade-in duration-500"
                  >
                    <Camera className="w-4 h-4 transition-transform group-hover:rotate-12" />
                    Enter Studio
                  </motion.button>
                </div>

                {/* Cassette BGM Deck */}
                <div className="pt-6 border-t border-[#222]/80 max-w-xs">
                  <div className="bg-[#111] border border-[#222] rounded-lg p-3.5 flex items-center justify-between gap-4 shadow-2xl relative overflow-hidden select-none">
                    {/* Retro tape stripes */}
                    <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-red-500 via-amber-500 to-indigo-500 opacity-20" />
                    
                    {/* Cassette layout reels */}
                    <div className="flex items-center gap-3.5">
                      <div className="flex items-center justify-center relative w-11 h-7 bg-stone-900 border border-stone-800 rounded-xs overflow-hidden">
                        {/* Spindle Reels */}
                        <div className="flex gap-2">
                          <div className={cn("w-3 h-3 border border-[#333] rounded-full bg-[#1c1c1c] flex items-center justify-center", isBgmPlaying && "animate-spin")} style={{ animationDuration: '4s' }}>
                            <div className="w-1 h-1 bg-stone-500 rounded-full" />
                          </div>
                          <div className={cn("w-3 h-3 border border-[#333] rounded-full bg-[#1c1c1c] flex items-center justify-center", isBgmPlaying && "animate-spin")} style={{ animationDuration: '4s' }}>
                            <div className="w-1 h-1 bg-stone-500 rounded-full" />
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex flex-col justify-center text-left">
                        <p className="text-[9px] uppercase font-mono tracking-wider text-stone-500">Lo-Fi Ambient</p>
                        <p className="text-[10px] uppercase font-bold tracking-widest text-[#eaeaea] font-mono">SOL TAPE 01</p>
                      </div>
                    </div>

                    {/* Cassette deck control buttons */}
                    <div className="flex items-center gap-2">
                      {/* Active Led indicator */}
                      <div className="flex items-center justify-center pr-1.5">
                        <span className="relative flex h-2 w-2">
                          <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 bg-red-600", !isBgmPlaying && "hidden")} />
                          <span className={cn("relative inline-flex rounded-full h-2 w-2", isBgmPlaying ? "bg-red-600" : "bg-stone-800")} />
                        </span>
                      </div>

                      <button
                        onClick={toggleBgm}
                        className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center border transition-all cursor-pointer",
                          isBgmPlaying
                            ? "bg-white text-black border-white hover:bg-stone-200"
                            : "bg-transparent text-stone-400 border-stone-800 hover:text-white hover:border-[#444] hover:bg-white/5"
                        )}
                      >
                        {isBgmPlaying ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Simulated Animated Preview Column (Aesthetics Showcase) */}
            <div className="w-full md:w-80 shrink-0 flex items-center justify-center" style={{ perspective: 1000 }}>
              <motion.div
                onMouseEnter={() => setIsCardHovered(true)}
                onMouseMove={handleCardMouseMove}
                onMouseLeave={handleCardMouseLeave}
                animate={isCardHovered ? {
                  rotateX: tilt.x,
                  rotateY: tilt.y,
                  scale: 1.04,
                  rotateZ: 0,
                  y: -10,
                } : {
                  rotateX: 0,
                  rotateY: 0,
                  scale: 1,
                  rotateZ: 2, // base rotation
                  y: [0, -6, 0], // constant floating loop
                }}
                transition={isCardHovered ? {
                  type: 'spring',
                  stiffness: 150,
                  damping: 15
                } : {
                  y: {
                    repeat: Infinity,
                    duration: 5,
                    ease: 'easeInOut'
                  },
                  duration: 0.5
                }}
                style={{ transformStyle: 'preserve-3d' }}
                className="relative bg-[#fbebe7] text-[#1a1a1a] p-4 shadow-[0_24px_50px_-10px_rgba(0,0,0,0.8)] border border-[#dfccd5]/50 flex flex-col gap-3 justify-center items-center w-64 md:w-72 select-none cursor-pointer"
              >
                <div className="absolute top-2 right-2 text-stone-300 transform font-mono text-[9px] font-bold">PREVIEW SPECIMEN</div>

                {/* Simulated photocard frames */}
                <div className="w-full aspect-[4/3] bg-stone-900 border border-black/10 overflow-hidden relative flex items-center justify-center">
                  <div className="absolute inset-0 bg-gradient-to-t from-red-900/40 to-transparent z-10" />
                  <Heart className="w-8 h-8 text-white/30 animate-pulse relative z-10" />
                  <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#111_1px,transparent_1px)] [background-size:8px_8px]" />
                </div>

                <div className="w-full aspect-[4/3] bg-stone-800 border border-black/10 overflow-hidden relative flex items-center justify-center">
                  <p className="text-[11px] uppercase tracking-widest font-mono text-white/40">S.O.L STUDIO</p>
                  <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#fff_1px,transparent_1px)] [background-size:6px_6px]" />
                </div>

                {/* Stamp & Branding signoff */}
                <div className="w-full flex items-center justify-between text-black px-1 mt-1 text-[9px]">
                  <span className="font-mono text-[#8e1616] font-bold tracking-tighter">'26.05.20</span>
                  <span className="font-sans font-bold tracking-[0.15em] uppercase text-stone-700">SNAP OF LOVE</span>
                </div>
              </motion.div>
            </div>

          </motion.div>
        )}

        {/* SCREEN 2: ACTIVE PHOTOBOOTH WORKSPACE */}
        {screen === 'active' && (
          <motion.div
            key="workspace-active"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-[100dvh] md:min-h-0 md:h-[92vh] max-w-7xl flex flex-col md:flex-row bg-[#0c0c0c] border md:border-8 border-[#1a1a1a] shadow-3xl z-10 relative overflow-hidden shrink-0"
          >
            {/* BACK TO MENU / BRAND HEADER BAR (MOBILE) */}
            <div className="md:hidden flex justify-between items-center px-6 py-4 bg-[#0f0f0f] border-b border-[#222] order-1">
              <button
                onClick={returnToMenu}
                className="text-xs uppercase tracking-wider text-stone-400 hover:text-white flex items-center gap-1.5 font-mono"
              >
                <ArrowLeft className="w-4 h-4" /> Menu
              </button>
              <span className="font-serif italic text-lg leading-none text-white tracking-wide">S.O.L</span>
              <div className="w-2.5 h-2.5 rounded-full animate-pulse" style={{ backgroundColor: '#8e1616' }} />
            </div>

            {/* Workspace Sidebar controls */}
            <aside className="w-full md:w-80 bg-[#0f0f0f] md:border-r border-[#2a2a2a] p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto order-3 md:order-1">

              {/* Back to main landing */}
              <button
                onClick={returnToMenu}
                className="hidden md:flex items-center gap-2.5 text-[11px] font-mono text-stone-400 hover:text-white transition-colors uppercase tracking-widest mb-10 text-left bg-transparent border-0 cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4" /> Return to Menu
              </button>

              <div className="mb-8 hidden md:block">
                <h1 className="font-serif text-3xl italic tracking-tight text-white block">S.O.L</h1>
                <p className="text-[9px] uppercase tracking-[0.3em] text-[#666] mt-1">Snap of Love • Booth</p>
              </div>

              <div className="space-y-6 flex-grow">
                {/* 1. Layout Configuration Selection */}
                <section>
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-3">Frame Configuration</label>
                  <div className="grid grid-cols-5 md:grid-cols-3 gap-2">
                    {Object.values(LAYOUTS).map((layout) => (
                      <button
                        key={layout.id}
                        disabled={captureState === 'countdown' || captureState === 'capturing'}
                        onClick={() => setActiveLayoutId(layout.id)}
                        className={cn(
                          "aspect-square border flex flex-col gap-1 p-1.5 items-center justify-center transition-all disabled:opacity-30 rounded-xs cursor-pointer",
                          activeLayoutId === layout.id
                            ? "border-white bg-white/5 text-white"
                            : "border-[#222] hover:border-[#444] text-[#888] hover:text-white"
                        )}
                        title={layout.name}
                      >
                        {layout.id === '1x3' && <div className="w-3.5 h-5 border border-current opacity-60"></div>}
                        {layout.id === '1x4' && <div className="w-3.5 h-6 border border-current opacity-60"></div>}
                        {layout.id === '2x2' && (
                          <div className="grid grid-cols-2 gap-[1.5px] opacity-60">
                            <div className="w-2 h-2 border border-current"></div>
                            <div className="w-2 h-2 border border-current"></div>
                            <div className="w-2 h-2 border border-current"></div>
                            <div className="w-2 h-2 border border-current"></div>
                          </div>
                        )}
                        {layout.id === '1x1' && <div className="w-4 h-4 border border-current opacity-60 bg-current/10"></div>}
                        {layout.id === '2x1' && <div className="w-5 h-2.5 border border-current opacity-60"></div>}
                        {layout.id === 'scrapbook' && (
                          <div className="relative w-4 h-5 opacity-60">
                            <div className="absolute top-0.5 left-0.5 w-2.5 h-3.5 border border-current transform -rotate-12 bg-current/5"></div>
                            <div className="absolute top-1 left-2 w-2.5 h-3.5 border border-current transform rotate-12 bg-current/5"></div>
                          </div>
                        )}
                        <span className="text-[9px] uppercase font-mono tracking-tighter mt-1">{layout.id}</span>
                      </button>
                    ))}
                  </div>
                </section>

                {/* 2. Photo Timer Pose Delay */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold flex items-center gap-2 mb-2.5">
                    <Clock className="w-3.5 h-3.5 text-stone-400" /> Pose Interval (Sec)
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {[2, 3, 5, 10].map((sec) => (
                      <button
                        key={sec}
                        disabled={captureState === 'countdown' || captureState === 'capturing'}
                        onClick={() => setPhotoDelay(sec)}
                        className={cn(
                          "py-1.5 text-xs font-mono border transition-all cursor-pointer rounded-xs",
                          photoDelay === sec
                            ? "border-white bg-white text-black"
                            : "border-[#222] text-[#888] hover:text-white hover:border-[#444]"
                        )}
                      >
                        {sec}s
                      </button>
                    ))}
                  </div>
                </section>

                {/* 3. Live Previewable Filter */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold flex items-center gap-2 mb-2.5">
                    <Sparkles className="w-3.5 h-3.5 text-stone-400" /> Live Filter
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(VISUAL_FILTERS).map((f) => (
                      <button
                        key={f.id}
                        onClick={() => setActiveFilterId(f.id as FilterType)}
                        className={cn(
                          "py-2 px-3 text-[10px] uppercase font-bold text-left border transition-all truncate rounded-xs cursor-pointer",
                          activeFilterId === f.id
                            ? "border-white bg-white/5 text-white"
                            : "border-[#222] text-stone-400 hover:text-white hover:border-[#444]"
                        )}
                      >
                        {f.name}
                      </button>
                    ))}
                  </div>
                </section>
              </div>

              {/* Sidebar Action Button */}
              <div className="mt-8 pt-6 border-t border-[#2a2a2a]">
                <button
                  onClick={runSession}
                  disabled={!isCameraReady || captureState === 'countdown' || captureState === 'capturing'}
                  className="w-full py-4.5 bg-white text-black hover:bg-stone-100 text-xs font-bold uppercase tracking-[0.25em] flex items-center justify-center gap-3 transition-colors disabled:opacity-40 select-none cursor-pointer"
                >
                  <Camera className="w-4 h-4" />
                  {captureState === 'idle' ? 'Start Session' : 'Capturing...'}
                </button>
              </div>
            </aside>

            {/* Live Feed Video Viewport */}
            <main className="flex-grow relative flex items-center justify-center p-4 md:p-12 bg-[#080808] overflow-hidden min-h-[300px] md:min-h-[400px] order-2 md:order-2">
              {/* Vignette Shadow Overlay */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-20" />

              {/* Live Status Indicators (Desktop) */}
              <div className="absolute top-8 left-8 hidden md:flex items-center gap-3 z-10 font-mono">
                <div className="w-2 h-2 rounded-full animate-pulse" style={{ backgroundColor: '#8e1616' }}></div>
                <span className="text-[11px] uppercase tracking-widest text-[#aaa]">LIVE VIEW S.O.L CAM</span>
              </div>
              <div className="absolute bottom-8 right-8 hidden md:block text-right z-10 font-mono">
                <p className="text-[10px] text-white/20">PREVIEW COMPRESSOR: HIGH-RES 60FPS</p>
                <p className="text-[9px] text-[#666]">POSE GAP: {photoDelay} SECONDS</p>
              </div>

              {/* Stream Video Wrapper with applied selected LIVE FILTER style */}
              <div className="relative w-full max-w-4xl aspect-[4/3] bg-[#111] overflow-hidden border border-[#222] shadow-3xl z-10">
                <video
                  ref={setVideoElement}
                  muted
                  playsInline
                  autoPlay
                  style={{ filter: currentFilter.style }}
                  className="w-full h-full object-cover transform -scale-x-100 transition-all duration-300"
                />

                {/* Animated Film grain live overlay */}
                <div className="absolute inset-0 pointer-events-none opacity-[0.22] mix-blend-overlay z-15 bg-[radial-gradient(#fff_1.2px,transparent_1.2px)] [background-size:10px_10px]" />

                {/* Floating Pixelated Hearts Shutter Overlay */}
                <AnimatePresence>
                  {hearts.map((heart) => (
                    <motion.div
                      key={heart.id}
                      initial={{
                        opacity: 0,
                        scale: 0,
                        left: `${heart.x}%`,
                        top: `${heart.y}%`,
                        rotate: heart.rotation,
                      }}
                      animate={{
                        opacity: [0, 1, 1, 0],
                        scale: [0.2, heart.scale, heart.scale, 0],
                        y: [0, -180],
                        x: [0, heart.wiggle],
                      }}
                      transition={{
                        duration: 1.5,
                        ease: 'easeOut',
                      }}
                      onAnimationComplete={() => removeHeart(heart.id)}
                      style={{
                        position: 'absolute',
                        transform: 'translate(-50%, -50%)',
                        color: heart.color,
                      }}
                      className="absolute pointer-events-none z-30"
                    >
                      <PixelHeart className="w-8 h-8" />
                    </motion.div>
                  ))}
                </AnimatePresence>

                {/* Countdown Overlay */}
                {captureState === 'countdown' && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/45 backdrop-blur-xs z-20">
                    <motion.span
                      key={countdownNum}
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1.1, opacity: 1 }}
                      transition={{ duration: 0.45, ease: 'easeOut' }}
                      className="text-9xl md:text-[11rem] text-white font-serif italic font-medium drop-shadow-[0_15px_15px_rgba(0,0,0,0.6)]"
                    >
                      {countdownNum}
                    </motion.span>
                  </div>
                )}

                {/* White Flash shutter layer */}
                <AnimatePresence>
                  {flash && (
                    <motion.div
                      initial={{ opacity: 1 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.7, ease: 'easeOut' }}
                      className="absolute inset-0 bg-white z-50 pointer-events-none"
                    />
                  )}
                </AnimatePresence>

                {/* In-progress state overlay indicator */}
                {['countdown', 'capturing'].includes(captureState) && (
                  <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-3 bg-black/85 border border-[#333] px-5 py-2.5 text-[10px] font-mono uppercase tracking-[0.2em] text-[#e0e0e0] z-25 rounded-full shadow-lg">
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full opacity-75" style={{ backgroundColor: '#8e1616' }}></span>
                      <span className="relative inline-flex rounded-full h-2 w-2" style={{ backgroundColor: '#8e1616' }}></span>
                    </span>
                    <span>Pose {capturedPhotos.length + 1} of {activeLayout.slots.length}</span>
                  </div>
                )}
              </div>
            </main>
          </motion.div>
        )}

        {/* SCREEN 3: HIGH-RES REVIEW & RETAKE */}
        {screen === 'review' && (
          <motion.div
            key="workspace-review"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full min-h-[100dvh] md:min-h-0 md:h-[92vh] max-w-7xl flex flex-col-reverse md:flex-row bg-[#0c0c0c] border md:border-8 border-[#1a1a1a] shadow-3xl z-10 relative overflow-hidden shrink-0 animate-in fade-in duration-300"
          >
            {/* Sidebar controls for POST-PROCESSING */}
            <aside className="w-full md:w-80 bg-[#0f0f0f] md:border-r border-[#2a2a2a] p-6 md:p-8 flex flex-col shrink-0 overflow-y-auto">
              <div className="mb-6">
                <h1 className="font-serif text-3xl italic tracking-tight text-white mb-1">S.O.L</h1>
                <p className="text-[9px] uppercase tracking-[0.16em] text-[#888]">SNAP OF LOVE ARCHIVES</p>
              </div>

              <div className="space-y-6 flex-grow">

                {/* 1. Select Theme Card Template */}
                <section>
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-2.5">Card Material Theme</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.values(CARD_THEMES).map((theme) => (
                      <button
                        key={theme.id}
                        onClick={() => setActiveThemeId(theme.id)}
                        className={cn(
                          "px-2.5 py-2 border text-left rounded-xs transition-all flex flex-col justify-between h-[52px] select-none cursor-pointer",
                          activeThemeId === theme.id
                            ? "border-white bg-white/5"
                            : "border-[#222] hover:border-[#333] hover:bg-white/5"
                        )}
                      >
                        <span className="text-[10px] font-sans text-white truncate font-medium">{theme.name}</span>
                        <div className="flex gap-1 items-center">
                          <div className={cn("w-3.5 h-3", theme.bgClass, "border border-white/25")} />
                          <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: theme.stampColor }} />
                        </div>
                      </button>
                    ))}
                  </div>
                </section>

                {/* Display Mode (Classic Print vs. Live Digital) */}
                <section className="pt-4 border-t border-[#222]">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block mb-2.5">
                    Display Mode
                  </label>
                  <div className="relative bg-[#171717] border border-[#222] p-1 rounded-full flex items-center select-none">
                    {/* Sliding background pill */}
                    <div
                      className="absolute top-1 bottom-1 left-1 rounded-full bg-white transition-all duration-300 ease-out"
                      style={{
                        width: 'calc(50% - 4px)',
                        transform: isAnimatedPreview ? 'translateX(100%)' : 'translateX(0%)',
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => setIsAnimatedPreview(false)}
                      className={cn(
                        "relative flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 z-10 cursor-pointer rounded-full",
                        !isAnimatedPreview ? "text-black" : "text-stone-400 hover:text-stone-200"
                      )}
                    >
                      Classic Print
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsAnimatedPreview(true)}
                      className={cn(
                        "relative flex-1 py-1.5 text-center text-[10px] font-bold uppercase tracking-wider transition-colors duration-200 z-10 cursor-pointer rounded-full",
                        isAnimatedPreview ? "text-black" : "text-stone-400 hover:text-stone-200"
                      )}
                    >
                      Live Digital
                    </button>
                  </div>
                  <p className="text-[9px] text-[#555] mt-2 font-serif italic">
                    {isAnimatedPreview
                      ? "Live Digital: Auto-cycling photo frames to simulate a vintage animated loop."
                      : "Classic Print: A static high-res photo composite, ready for print/export."}
                  </p>
                </section>

                {/* 2. Captured Burst Index Selection */}
                <section className="pt-4 border-t border-[#222]">
                  <div className="flex justify-between items-center mb-2">
                    <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">Select Burst Motion Frame</label>
                    <span className="text-[10px] font-mono text-stone-500">
                      {isAnimatedPreview ? "Auto-cycling" : `Frame #${selectedPhotoIndex + 1}`}
                    </span>
                  </div>
                  <div className={cn("grid grid-cols-5 gap-1.5 transition-opacity duration-200", isAnimatedPreview && "opacity-40 pointer-events-none")}>
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <button
                        key={idx}
                        disabled={isAnimatedPreview}
                        onClick={() => setSelectedPhotoIndex(idx)}
                        className={cn(
                          "py-2 text-[10px] font-mono border transition-all cursor-pointer rounded-xs",
                          selectedPhotoIndex === idx
                            ? "border-white bg-white text-black"
                            : "border-[#222] text-stone-400 hover:text-white hover:border-[#333]"
                        )}
                      >
                        F{idx + 1}
                      </button>
                    ))}
                  </div>
                  <p className="text-[9px] text-[#555] mt-2 font-serif italic">Every photo captures a 5-frame emotional burst, select the one that looks finest, or export all loop-animated as a GIF.</p>
                </section>

                {/* 3. Dynamic Realtime Filters adjustment */}
                <section className="pt-4 border-t border-[#222] space-y-4">
                  <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">Post-Processing Aesthetics</label>

                  {/* Realtime filter dropdown option */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] text-stone-400">Tone Preset</span>
                    <select
                      value={activeFilterId}
                      onChange={(e) => setActiveFilterId(e.target.value as FilterType)}
                      className="w-full bg-[#171717] border border-[#222] text-xs font-mono py-2 px-2.5 text-white focus:outline-none focus:border-stone-500 rounded-xs cursor-pointer"
                    >
                      {Object.values(VISUAL_FILTERS).map((f) => (
                        <option key={f.id} value={f.id}>{f.name}</option>
                      ))}
                    </select>
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between text-[11px]">
                      <span>Analog Film Grain</span>
                      <span className="text-[#666] font-mono">{grainIntensity}%</span>
                    </div>
                    <input
                      type="range"
                      min="0" max="100"
                      value={grainIntensity}
                      onChange={(e) => setGrainIntensity(Number(e.target.value))}
                      className="w-full h-1 bg-[#222] rounded-none appearance-none cursor-pointer accent-white"
                    />
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px]">Nostalgic Camera Date Stamp</span>
                    <button
                      onClick={() => setShowDate(!showDate)}
                      className={cn(
                        "w-10 h-5 rounded-full flex items-center px-1 transition-colors relative cursor-pointer",
                        showDate ? "bg-white" : "bg-[#252525]"
                      )}
                    >
                      <div className={cn(
                        "w-3 h-3 rounded-full transition-transform absolute",
                        showDate ? "bg-black translate-x-5" : "bg-[#666]"
                      )} />
                    </button>
                  </div>

                  {/* Camera Lens Effect selector */}
                  <div className="space-y-1.5 pt-2 border-t border-white/5">
                    <span className="text-[10px] text-stone-400">Camera Lens Effect</span>
                    <select
                      value={lensEffect}
                      onChange={(e) => setLensEffect(e.target.value as LensEffectType)}
                      className="w-full bg-[#171717] border border-[#222] text-xs font-mono py-2 px-2.5 text-white focus:outline-none focus:border-stone-500 rounded-xs cursor-pointer animate-in fade-in duration-200"
                    >
                      <option value="none">Standard Lens</option>
                      <option value="fisheye">Wide Fish-Eye</option>
                      <option value="toycam">Retro Toy Cam</option>
                      <option value="filmburn">Film Burn Flare</option>
                    </select>
                  </div>
                </section>



              </div>

              {/* Export Deliverables Area */}
              <div className="mt-8 space-y-3 pt-6 border-t border-[#2a2a2a]">
                <label className="text-[11px] uppercase tracking-widest text-[#888] font-semibold block">Deliverables</label>

                <button
                  onClick={() => handleExport('jpg')}
                  disabled={isExporting}
                  className="w-full py-4 bg-white text-black text-[12px] font-bold uppercase tracking-widest hover:bg-[#ccc] transition-colors disabled:opacity-50 select-none cursor-pointer"
                >
                  Export High-Res JPG
                </button>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleExport('png')}
                    disabled={isExporting}
                    className="flex-1 py-2.5 border border-[#333] text-[#e0e0e0] hover:bg-white/5 text-[10px] uppercase tracking-tighter transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    Save PNG
                  </button>
                  <button
                    onClick={() => handleExport('gif')}
                    disabled={isExporting}
                    className="flex-1 py-2.5 border border-[#333] text-[#e0e0e0] hover:bg-white/5 text-[10px] uppercase tracking-tighter transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isExporting ? 'Encoding...' : 'Export GIF'}
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4">
                  <button
                    onClick={startNewSession}
                    className="py-3 text-stone-300 hover:text-white border border-[#222] hover:border-[#444] text-[10px] uppercase tracking-tighter transition-colors rounded-xs cursor-pointer"
                  >
                    Retake Session
                  </button>
                  <button
                    onClick={returnToMenu}
                    className="py-3 text-stone-500 hover:text-stone-300 text-[10px] uppercase tracking-tighter transition-colors cursor-pointer"
                  >
                    Return to Menu
                  </button>
                </div>

                {/* Thank You & Instagram CTA */}
                <div className="mt-6 pt-5 border-t border-[#2a2a2a]">
                  <div className="bg-gradient-to-br from-[#1a1018] to-[#140c0c] border border-[#2a2020] rounded-lg p-4 text-center space-y-3">
                    <Heart className="w-4 h-4 mx-auto" style={{ color: '#8e1616', fill: 'rgba(142, 22, 22, 0.4)' }} />
                    <p className="text-[11px] text-stone-300 leading-relaxed font-serif italic">
                      Thank you for using <span className="text-white font-semibold not-italic">S.O.L</span>! We hope this strip captures a moment worth keeping.
                    </p>
                    <p className="text-[9px] text-stone-500 uppercase tracking-widest">
                      Share your experience with us
                    </p>
                    <a
                      href="https://www.instagram.com/snapoflove.id/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-2 px-4.5 py-2 border border-[#333] hover:border-white hover:bg-white hover:text-black text-stone-300 text-[10px] font-bold uppercase tracking-wider rounded-full transition-all duration-300 cursor-pointer shadow-md"
                    >
                      <Instagram className="w-3.5 h-3.5" />
                      @snapoflove.id
                    </a>
                  </div>
                </div>
              </div>
            </aside>

            {/* High-res Rendered Specimen Preview */}
            <main className="flex-grow relative flex items-center justify-center p-4 md:p-12 bg-[#080808] overflow-hidden min-h-[350px] md:min-h-[450px]">
              {/* Vignette Shadow Overlay */}
              <div className="absolute inset-0 pointer-events-none shadow-[inset_0_0_150px_rgba(0,0,0,0.95)] z-20" />

              {previewCanvasDataUrl && (
                <div className="relative max-h-full max-w-full flex items-center justify-center animate-in fade-in zoom-in-95 duration-500 z-10 p-2 select-none md:p-6">
                  <img
                    src={previewCanvasDataUrl}
                    alt="Final composited strip"
                    className="max-h-[80vh] md:max-h-[84vh] w-auto max-w-full object-contain shadow-3xl transform md:rotate-1"
                    style={{
                      filter: 'drop-shadow(0 25px 50px rgba(0, 0, 0, 0.7))'
                    }}
                  />
                  {isExporting && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center">
                      <div className="w-8 h-8 border-4 border-[#333] border-t-white rounded-full animate-spin mb-4" />
                      <p className="text-white text-[11px] uppercase tracking-[0.2em] font-mono shadow-md">Encoding Frame data...</p>
                    </div>
                  )}
                </div>
              )}
            </main>
          </motion.div>
        )}

      </AnimatePresence>

    </div>
  );
}
