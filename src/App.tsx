import { useState, useCallback, useEffect, useRef, useMemo, ReactNode } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Activity, 
  Waves, 
  Zap, 
  Wind, 
  Settings2, 
  Music,
  Circle,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Volume2,
  Maximize2,
  Minimize2,
  AlertCircle,
  GripHorizontal,
  Sliders,
  Library
} from 'lucide-react';
import { useSynth, SynthSettings } from './components/SynthEngine';
import { WaveformPreview } from './components/WaveformPreview';
import { Keyboard } from './components/Keyboard';
import { PRESETS } from './lib/presets';

const OCTAVE_NOTES = [
  { note: 'C', isBlack: false, offset: 0 },
  { note: 'C#', isBlack: true, offset: 1 },
  { note: 'D', isBlack: false, offset: 2 },
  { note: 'D#', isBlack: true, offset: 3 },
  { note: 'E', isBlack: false, offset: 4 },
  { note: 'F', isBlack: false, offset: 5 },
  { note: 'F#', isBlack: true, offset: 6 },
  { note: 'G', isBlack: false, offset: 7 },
  { note: 'G#', isBlack: true, offset: 8 },
  { note: 'A', isBlack: false, offset: 9 },
  { note: 'A#', isBlack: true, offset: 10 },
  { note: 'B', isBlack: false, offset: 11 },
];

const generateKeys = (octaveCount: number, octaveShift: number) => {
  const keys = [];
  const baseMidi = 36 + (octaveShift * 12); // Start at C2 for shift 0
  for (let i = 0; i < octaveCount; i++) {
    for (const n of OCTAVE_NOTES) {
      keys.push({
        ...n,
        midi: baseMidi + (i * 12) + n.offset,
        octave: i + 2 + octaveShift,
        octaveIndex: i
      });
    }
  }
  keys.push({ 
    note: 'C', 
    isBlack: false, 
    offset: 0, 
    midi: baseMidi + (octaveCount * 12), 
    octave: octaveCount + 2 + octaveShift,
    octaveIndex: octaveCount
  });
  return keys;
};

const getFreq = (midi: number) => {
  return 440 * Math.pow(2, (midi - 69) / 12);
};

const COLOR_MAPS = {
  pink: { stroke: 'stroke-pink-500', bg: 'bg-pink-500', border: 'border-pink-400', text: 'text-pink-500', hoverText: 'group-hover:text-pink-400', shadow: 'shadow-[0_0_10px_rgba(236,72,153,0.4)]' },
  emerald: { stroke: 'stroke-emerald-500', bg: 'bg-emerald-500', border: 'border-emerald-400', text: 'text-emerald-500', hoverText: 'group-hover:text-emerald-400', shadow: 'shadow-[0_0_10px_rgba(16,185,129,0.4)]' },
  blue: { stroke: 'stroke-blue-500', bg: 'bg-blue-500', border: 'border-blue-400', text: 'text-blue-500', hoverText: 'group-hover:text-blue-400', shadow: 'shadow-[0_0_10px_rgba(59,130,246,0.4)]' },
  purple: { stroke: 'stroke-purple-500', bg: 'bg-purple-500', border: 'border-purple-400', text: 'text-purple-500', hoverText: 'group-hover:text-purple-400', shadow: 'shadow-[0_0_10px_rgba(168,85,247,0.4)]' },
  yellow: { stroke: 'stroke-yellow-500', bg: 'bg-yellow-500', border: 'border-yellow-400', text: 'text-yellow-500', hoverText: 'group-hover:text-yellow-400', shadow: 'shadow-[0_0_10px_rgba(234,179,8,0.4)]' },
  green: { stroke: 'stroke-green-500', bg: 'bg-green-500', border: 'border-green-400', text: 'text-green-500', hoverText: 'group-hover:text-green-400', shadow: 'shadow-[0_0_10px_rgba(34,197,94,0.4)]' },
  orange: { stroke: 'stroke-orange-500', bg: 'bg-orange-500', border: 'border-orange-400', text: 'text-orange-500', hoverText: 'group-hover:text-orange-400', shadow: 'shadow-[0_0_10px_rgba(249,115,22,0.4)]' },
  indigo: { stroke: 'stroke-indigo-500', bg: 'bg-indigo-500', border: 'border-indigo-400', text: 'text-indigo-500', hoverText: 'group-hover:text-indigo-400', shadow: 'shadow-[0_0_10px_rgba(99,102,241,0.4)]' },
};

type ColorKey = keyof typeof COLOR_MAPS;

const ControlKnob = ({ label, value, min, max, step = 1, onChange, unit = "", color = "orange" }: { 
  label: string, value: number, min: number, max: number, step?: number, onChange: (val: number) => void, unit?: string, color?: ColorKey
}) => {
  const theme = COLOR_MAPS[color];
  
  return (
    <div className="flex flex-col items-center gap-1.5 sm:gap-2 p-2 sm:p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40 w-full max-w-[140px]">
      <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold text-center">{label}</span>
      <div className="relative w-12 h-12 sm:w-14 sm:h-14 flex items-center justify-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <svg className="w-full h-full transform -rotate-90" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r="24" className="stroke-zinc-800 fill-none" strokeWidth="3" />
          <circle
            cx="28"
            cy="28"
            r="24"
            className={`${theme.stroke} fill-none transition-all duration-200`}
            strokeWidth="3"
            strokeDasharray={150.8}
            strokeDashoffset={150.8 - (150.8 * (value - min)) / (max - min)}
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div 
            className="w-6 h-6 sm:w-8 sm:h-8 bg-zinc-800 rounded-full shadow-xl border border-zinc-700 flex items-center justify-center transition-transform duration-200"
            style={{ transform: `rotate(${(value - min) / (max - min) * 270 - 135}deg)` }}
          >
            <div className={`w-0.5 h-2 sm:w-1 sm:h-3 ${theme.bg} rounded-full -translate-y-1.5 sm:-translate-y-2`} />
          </div>
        </div>
      </div>
      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-zinc-800">
        {value.toFixed(step >= 1 ? 0 : 2)}{unit}
      </span>
    </div>
  );
};

const WaveSelector = ({ label, current, enabled, options, onChange, onToggle, color = "orange" }: { 
  label: string, current: string, enabled: boolean, options: OscillatorType[], onChange: (val: OscillatorType) => void, onToggle: () => void, color?: ColorKey
}) => {
  const theme = COLOR_MAPS[color];
  const dotColorClass = enabled ? theme.bg : 'bg-zinc-800';
  const activeBtnClass = enabled ? `${theme.bg} text-black ${theme.border}` : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700';

  return (
    <div className={`flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border transition-all ${enabled ? 'bg-zinc-900/40 border-zinc-800/40' : 'bg-zinc-950/20 border-zinc-900/50 opacity-60'}`}>
      <div className="flex justify-between items-center">
        <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold">{label}</span>
        <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${dotColorClass} ${enabled ? 'shadow-lg' : ''}`} />
      </div>
      <div className="flex gap-1 w-full">
        {options.map((opt) => (
          <button
            key={opt}
            onClick={() => {
              if (current === opt) {
                onToggle();
              } else {
                onChange(opt);
                if (!enabled) onToggle();
              }
            }}
            className={`flex-1 py-1.5 sm:py-2 rounded-lg text-[8px] sm:text-[9px] uppercase font-bold tracking-tighter transition-all border ${
              current === opt && enabled ? activeBtnClass : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
            }`}
          >
            {opt}
          </button>
        ))}
      </div>
    </div>
  );
};

const CollapsiblePanel = ({ 
  title, 
  icon: Icon, 
  children, 
  isCollapsed, 
  onToggle,
  color = "orange"
}: { 
  title: string, 
  icon: any, 
  children: ReactNode, 
  isCollapsed: boolean, 
  onToggle: () => void,
  color?: ColorKey
}) => {
  const theme = COLOR_MAPS[color];
  
  return (
    <div className="flex flex-col bg-zinc-900/20 rounded-2xl border border-zinc-800/20 overflow-hidden transition-all duration-300 h-fit">
      <button 
        onClick={onToggle}
        className="flex items-center justify-between p-3 sm:p-4 hover:bg-zinc-800/20 transition-colors w-full text-left group"
      >
        <div className={`flex items-center gap-2 text-zinc-500 ${theme.hoverText} transition-colors`}>
          <Icon className={`w-3.5 h-3.5 sm:w-4 h-4 ${isCollapsed ? '' : theme.text}`} />
          <h2 className="text-[9px] sm:text-[10px] uppercase tracking-[0.2em] font-black">{title}</h2>
        </div>
        <ChevronDown className={`w-3.5 h-3.5 sm:w-4 h-4 text-zinc-600 transition-transform duration-300 ${isCollapsed ? '' : 'rotate-180'}`} />
      </button>
      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <div className="p-3 sm:p-4 pt-0 space-y-3 sm:space-y-4">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default function App() {
  const [settings, setSettings] = useState<SynthSettings>(PRESETS["Vintage"]);
  const [currentPreset, setCurrentPreset] = useState("Vintage");
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});

  const togglePanel = (id: string) => {
    setCollapsedPanels(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const [octaveShift, setOctaveShift] = useState(0);
  const [visibleOctaves, setVisibleOctaves] = useState(4);
  const [keyboardHeight, setKeyboardHeight] = useState(220);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const { playNote, stopNote, stopAllNotes, getAnalyser } = useSynth(settings);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const activeKeysRef = useRef(activeKeys);
  const pointerMapRef = useRef<Map<number, number>>(new Map());

  const keys = useMemo(() => generateKeys(visibleOctaves, octaveShift), [visibleOctaves, octaveShift]);

  useEffect(() => {
    activeKeysRef.current = activeKeys;
  }, [activeKeys]);

  const handlePanic = useCallback(() => {
    stopAllNotes();
    setActiveKeys(new Set());
    pointerMapRef.current.clear();
  }, [stopAllNotes]);

  const handleKeyDown = useCallback((midi: number, pointerId?: number) => {
    if (pointerId !== undefined) {
      const prevMidi = pointerMapRef.current.get(pointerId);
      if (prevMidi === midi) return;
      if (prevMidi !== undefined) {
        // Release previous key for this pointer (glissando)
        stopNote(prevMidi);
        setActiveKeys(prev => {
          const next = new Set(prev);
          // Only delete if no other pointer is holding this key
          const otherPointersHoldingKey = Array.from(pointerMapRef.current.entries())
            .some(([pId, m]) => pId !== pointerId && m === prevMidi);
          if (!otherPointersHoldingKey) {
            next.delete(prevMidi);
          }
          return next;
        });
      }
      pointerMapRef.current.set(pointerId, midi);
    }

    setActiveKeys(prev => {
      if (prev.has(midi)) return prev;
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    playNote(getFreq(midi), midi);
  }, [playNote, stopNote]);

  const handleKeyUp = useCallback((midi: number, pointerId?: number) => {
    if (pointerId !== undefined) {
      pointerMapRef.current.delete(pointerId);
    }

    // Only stop if no other pointer is holding this key
    const otherPointersHoldingKey = Array.from(pointerMapRef.current.entries())
      .some(([_, m]) => m === midi);
    
    if (otherPointersHoldingKey) return;

    setActiveKeys(prev => {
      if (!prev.has(midi)) return prev;
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    stopNote(midi);
  }, [stopNote]);

  // Global cleanup to prevent stuck notes
  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      const midi = pointerMapRef.current.get(e.pointerId);
      if (midi !== undefined) {
        handleKeyUp(midi, e.pointerId);
      }
    };
    
    const handleBlur = () => {
      setActiveKeys(new Set());
      pointerMapRef.current.clear();
      stopAllNotes();
    };

    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    window.addEventListener('blur', handleBlur);
    
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingHeight) {
        const newHeight = window.innerHeight - e.clientY;
        setKeyboardHeight(Math.max(80, Math.min(window.innerHeight * 0.6, newHeight)));
      }
    };

    const handlePointerUp = () => {
      setIsDraggingHeight(false);
    };

    if (isDraggingHeight) {
      window.addEventListener('pointermove', handlePointerMove);
      window.addEventListener('pointerup', handlePointerUp);
    }

    return () => {
      window.removeEventListener('pointerup', handleGlobalUp);
      window.removeEventListener('pointercancel', handleGlobalUp);
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };
  }, [handleKeyUp, stopAllNotes, isDraggingHeight]);

  return (
    <div className="min-h-screen bg-[#050505] text-zinc-100 font-sans selection:bg-orange-500/30 flex flex-col relative overflow-hidden">
      {/* Header */}
      <header className="p-2 sm:p-4 flex justify-between items-center border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <div className="w-8 h-8 sm:w-10 sm:h-10 bg-orange-500 rounded-lg sm:rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Activity className="text-black w-5 h-5 sm:w-6 sm:h-6" />
          </div>
          <div>
            <h1 className="text-sm md:text-lg font-black tracking-tighter uppercase italic leading-none">
              TONEVOID
            </h1>
            <p className="text-[6px] sm:text-[8px] text-zinc-500 uppercase tracking-[0.2em] font-mono mt-0.5 sm:mt-1">Poly-Synth</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Preset Selector */}
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-900/50 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-zinc-800/50">
            <select 
              value={currentPreset}
              onChange={(e) => {
                const name = e.target.value;
                setCurrentPreset(name);
                setSettings(PRESETS[name]);
              }}
              className="bg-transparent text-zinc-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer px-2 md:px-3 py-0.5 sm:py-1"
            >
              {Object.keys(PRESETS).map(name => (
                <option key={name} value={name} className="bg-zinc-900 text-zinc-300">
                  {name}
                </option>
              ))}
            </select>
          </div>

          <div className="h-6 sm:h-8 w-px bg-zinc-800/50 hidden md:block" />

          {/* Volume & Panic Control */}
          <div className="flex items-center gap-1 sm:gap-2 bg-zinc-900/80 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-zinc-800 group">
            <div className="flex items-center gap-1.5 sm:gap-2 px-1 sm:px-2">
              <Volume2 className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-zinc-500 group-hover:text-orange-500 transition-colors" />
              <div className="relative w-12 sm:w-24 h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={settings.masterVolume}
                  onChange={(e) => setSettings(s => ({ ...s, masterVolume: parseFloat(e.target.value) }))}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                />
                <div 
                  className="absolute top-0 left-0 h-full bg-orange-500 transition-all duration-75"
                  style={{ width: `${settings.masterVolume * 100}%` }}
                />
              </div>
            </div>
            <div className="w-px h-4 bg-zinc-800 mx-0.5 sm:mx-1" />
            <button 
              onClick={handlePanic}
              className="p-1 sm:p-1.5 hover:bg-red-900/40 text-zinc-600 hover:text-red-500 rounded-lg transition-all"
              title="Panic"
            >
              <AlertCircle className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Grid Controls Area */}
      <main className="flex-1 p-2 sm:p-4 pb-[450px] overflow-y-auto custom-scrollbar">
        {/* Keyboard Controls Section */}
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Keyboard Config</span>
          </div>
          
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex items-center gap-4">
            {/* View Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-zinc-600 font-black">Visible Octaves</span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setVisibleOctaves(num)}
                    className={`w-6 h-6 rounded flex items-center justify-center text-[10px] font-bold transition-all ${
                      visibleOctaves === num 
                        ? 'bg-indigo-500 text-black shadow-[0_0_10px_rgba(99,102,241,0.4)]' 
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>

            <div className="h-4 w-px bg-zinc-800" />

            {/* Octave Shift */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-zinc-600 font-black">Octave Shift</span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
                <button 
                  onClick={() => setOctaveShift(s => Math.max(-3, s - 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="min-w-[24px] text-center">
                  <span className="text-xs font-mono font-black text-indigo-500">{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
                </div>
                <button 
                  onClick={() => setOctaveShift(s => Math.min(3, s + 1))}
                  className="w-6 h-6 flex items-center justify-center hover:bg-zinc-800 rounded text-zinc-400 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Waveform Preview Section - Now Collapsible */}
        <div className="mb-4 sm:mb-6">
          <CollapsiblePanel 
            title="Live Waveform Visualizer" 
            icon={Activity} 
            isCollapsed={collapsedPanels['visualizer']} 
            onToggle={() => togglePanel('visualizer')}
          >
            <div className="h-24 sm:h-32 md:h-40 w-full rounded-xl sm:rounded-2xl overflow-hidden border border-zinc-800/50 bg-black/40">
              <WaveformPreview getAnalyser={getAnalyser} />
            </div>
          </CollapsiblePanel>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-6 gap-4 items-start">
          
          {/* Oscillators Section */}
          <CollapsiblePanel 
            title="Oscillators" 
            icon={Waves} 
            isCollapsed={collapsedPanels['oscillators']} 
            onToggle={() => togglePanel('oscillators')}
            color="pink"
          >
            <div className="space-y-4">
              <div className="space-y-3">
                <WaveSelector 
                  label="Osc 1" 
                  current={settings.osc1Wave} 
                  enabled={settings.osc1Enabled}
                  options={['sawtooth', 'square', 'sine', 'triangle']}
                  onChange={(val) => setSettings(s => ({ ...s, osc1Wave: val }))}
                  onToggle={() => setSettings(s => ({ ...s, osc1Enabled: !s.osc1Enabled }))}
                  color="pink"
                />
                <ControlKnob 
                  label="O1 Gain" 
                  value={settings.osc1Gain} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, osc1Gain: val }))}
                  color="pink"
                />
              </div>

              <div className="space-y-3">
                <WaveSelector 
                  label="Osc 2" 
                  current={settings.osc2Wave} 
                  enabled={settings.osc2Enabled}
                  options={['sawtooth', 'square', 'sine', 'triangle']}
                  onChange={(val) => setSettings(s => ({ ...s, osc2Wave: val }))}
                  onToggle={() => setSettings(s => ({ ...s, osc2Enabled: !s.osc2Enabled }))}
                  color="pink"
                />
                <ControlKnob 
                  label="O2 Gain" 
                  value={settings.osc2Gain} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, osc2Gain: val }))}
                  color="pink"
                />
              </div>
            </div>
          </CollapsiblePanel>

          {/* Effects Section */}
          <CollapsiblePanel 
            title="Effects" 
            icon={Zap} 
            isCollapsed={collapsedPanels['effects']} 
            onToggle={() => togglePanel('effects')}
            color="emerald"
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Noise" 
                value={settings.noiseLevel} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, noiseLevel: val }))}
                color="emerald"
              />
              <ControlKnob 
                label="Growl" 
                value={settings.growl} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, growl: val }))}
                color="emerald"
              />
              <ControlKnob 
                label="Dist" 
                value={settings.distortion} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, distortion: val }))}
                color="emerald"
              />
              <ControlKnob 
                label="Fuzz" 
                value={settings.fuzz} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, fuzz: val }))}
                color="emerald"
              />
              <ControlKnob 
                label="Reverb" 
                value={settings.reverb} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, reverb: val }))}
                color="emerald"
              />
            </div>
          </CollapsiblePanel>

          {/* EQ Section */}
          <CollapsiblePanel 
            title="EQ" 
            icon={Sliders} 
            isCollapsed={collapsedPanels['eq']} 
            onToggle={() => togglePanel('eq')}
            color="blue"
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Low" 
                value={settings.eqLow} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqLow: val }))}
                unit="dB"
                color="blue"
              />
              <ControlKnob 
                label="Mid" 
                value={settings.eqMid} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqMid: val }))}
                unit="dB"
                color="blue"
              />
              <ControlKnob 
                label="High" 
                value={settings.eqHigh} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqHigh: val }))}
                unit="dB"
                color="blue"
              />
            </div>
          </CollapsiblePanel>

          {/* Filter Section */}
          <CollapsiblePanel 
            title="Filter" 
            icon={Wind} 
            isCollapsed={collapsedPanels['filter']} 
            onToggle={() => togglePanel('filter')}
            color="purple"
          >
            <div className="grid grid-cols-1 gap-3">
              <ControlKnob 
                label="Cutoff" 
                value={settings.filterCutoff} 
                min={20} max={10000} step={10}
                onChange={(val) => setSettings(s => ({ ...s, filterCutoff: val }))}
                unit="Hz"
                color="purple"
              />
              <div className="grid grid-cols-2 gap-2">
                <ControlKnob 
                  label="Res" 
                  value={settings.filterResonance} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterResonance: val }))}
                  color="purple"
                />
                <ControlKnob 
                  label="Env" 
                  value={settings.filterEnvAmount} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterEnvAmount: val }))}
                  color="purple"
                />
              </div>
            </div>
          </CollapsiblePanel>

          {/* Envelope Section */}
          <CollapsiblePanel 
            title="Envelope" 
            icon={Zap} 
            isCollapsed={collapsedPanels['envelope']} 
            onToggle={() => togglePanel('envelope')}
            color="yellow"
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Attack" 
                value={settings.attack} 
                min={0.01} max={2} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, attack: val }))}
                unit="s"
                color="yellow"
              />
              <ControlKnob 
                label="Decay" 
                value={settings.decay} 
                min={0.01} max={2} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, decay: val }))}
                unit="s"
                color="yellow"
              />
              <ControlKnob 
                label="Sustain" 
                value={settings.sustain} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, sustain: val }))}
                color="yellow"
              />
              <ControlKnob 
                label="Release" 
                value={settings.release} 
                min={0.01} max={5} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, release: val }))}
                unit="s"
                color="yellow"
              />
            </div>
          </CollapsiblePanel>

          {/* LFO Section */}
          <CollapsiblePanel 
            title="LFO" 
            icon={Settings2} 
            isCollapsed={collapsedPanels['lfo']} 
            onToggle={() => togglePanel('lfo')}
            color="green"
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Rate" 
                value={settings.lfoRate} 
                min={0.1} max={20} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, lfoRate: val }))}
                unit="Hz"
                color="green"
              />
              <ControlKnob 
                label="Depth" 
                value={settings.lfoDepth} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, lfoDepth: val }))}
                color="green"
              />
            </div>
          </CollapsiblePanel>
        </div>
      </main>

      {/* Floating Keyboard Section */}
      <motion.footer 
        initial={false}
        animate={{ height: keyboardHeight }}
        className="fixed bottom-0 left-0 w-full bg-black/95 backdrop-blur-2xl border-t border-zinc-800 z-[100] shadow-[0_-10px_40px_rgba(0,0,0,0.8)]"
      >
        {/* Drag Handle */}
        <div 
          onPointerDown={() => setIsDraggingHeight(true)}
          className="absolute top-0 left-0 w-full h-16 -translate-y-1/2 flex items-center justify-center cursor-ns-resize group z-[110]"
        >
          <div className="w-12 h-8 bg-zinc-800/80 rounded-2xl group-hover:bg-orange-500 transition-all flex items-center justify-center shadow-2xl border border-zinc-700/50 group-hover:border-orange-400">
            <GripHorizontal className="w-6 h-6 text-zinc-600 group-hover:text-black transition-colors" />
          </div>
        </div>

        <Keyboard 
          keys={keys}
          activeKeys={activeKeys}
          keyboardHeight={keyboardHeight}
          visibleOctaves={visibleOctaves}
          handleKeyDown={handleKeyDown}
          handleKeyUp={handleKeyUp}
        />
      </motion.footer>

      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 4px;
          height: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #27272a;
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #3f3f46;
        }
      `}</style>
    </div>
  );
}
