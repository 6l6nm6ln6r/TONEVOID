import { useState, useCallback, useEffect, useRef, useMemo, ReactNode, PointerEvent as ReactPointerEvent } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
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
import { useSynth, SynthSettings, ControlType } from './components/SynthEngine';
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

const ControlKnob = ({ label, value, min, max, step = 1, onChange, unit = "", color = "orange", type = "knobs" }: { 
  label: string, value: number, min: number, max: number, step?: number, onChange: (val: number) => void, unit?: string, color?: ColorKey, type?: ControlType
}) => {
  const theme = COLOR_MAPS[color];
  const isCompact = type !== 'knobs';
  
  return (
    <div className={`flex flex-col items-center p-2 sm:p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40 w-full max-w-[140px] ${isCompact ? 'gap-1' : 'gap-1.5 sm:gap-2'}`}>
      <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold text-center">{label}</span>
      
      {type === 'knobs' && (
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
      )}

      {type === 'sliders' && (
        <div className="w-full h-6 sm:h-8 flex items-center px-1">
          <div className="relative w-full h-1.5 sm:h-2 bg-zinc-800 rounded-full overflow-hidden border border-zinc-700/50">
            <input
              type="range"
              min={min}
              max={max}
              step={step}
              value={value}
              onChange={(e) => onChange(parseFloat(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
            />
            <div 
              className={`absolute top-0 left-0 h-full ${theme.bg} transition-all duration-75`}
              style={{ width: `${((value - min) / (max - min)) * 100}%` }}
            />
          </div>
        </div>
      )}

      {type === 'text' && (
        <div className="w-full h-6 sm:h-8 flex items-center justify-center">
          <input
            type="number"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => {
              const val = parseFloat(e.target.value);
              if (!isNaN(val)) onChange(val);
            }}
            className="w-full bg-black/40 border border-zinc-800 rounded-lg px-2 py-1 text-center text-[10px] font-mono text-zinc-300 focus:border-orange-500 outline-none transition-colors dark-arrows"
          />
        </div>
      )}

      {type === 'knobs' && (
        <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-zinc-800">
          {value.toFixed(step >= 1 ? 0 : 2)}{unit}
        </span>
      )}
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

interface UserPresetButtonProps {
  id: string;
  onSave: () => void;
  onLoad: () => void;
  hasPreset: boolean;
  isActive: boolean;
  key?: string;
}

const UserPresetButton = ({ id, onSave, onLoad, hasPreset, isActive }: UserPresetButtonProps) => {
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  const handlePointerDown = (e: ReactPointerEvent) => {
    // Prevent context menu on long press
    const target = e.currentTarget;
    const handleContextMenu = (ev: Event) => ev.preventDefault();
    target.addEventListener('contextmenu', handleContextMenu, { once: true });

    setIsSaving(false);
    timerRef.current = setTimeout(() => {
      setIsSaving(true);
      onSave();
      // Visual feedback
      setTimeout(() => setIsSaving(false), 1000);
    }, 800);
  };

  const handlePointerUp = () => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      if (!isSaving) {
        onLoad();
      }
      timerRef.current = null;
    }
  };

  return (
    <button
      onPointerDown={handlePointerDown}
      onPointerUp={handlePointerUp}
      onPointerLeave={() => {
        if (timerRef.current) {
          clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      }}
      className={`w-6 h-6 sm:w-8 sm:h-8 rounded-lg flex items-center justify-center text-[10px] font-black transition-all border relative overflow-hidden ${
        isSaving 
          ? 'bg-orange-500 text-black border-orange-400 scale-95' 
          : isActive
            ? 'bg-purple-600 text-white border-purple-400 shadow-[0_0_15px_rgba(168,85,247,0.5)]'
            : hasPreset 
              ? 'bg-zinc-800 text-orange-500 border-zinc-700 hover:border-orange-500' 
              : 'bg-zinc-900/50 text-zinc-600 border-zinc-800/50 hover:border-zinc-700'
      }`}
      title={hasPreset ? `Click to load, Long press to overwrite ${id}` : `Long press to save current to ${id}`}
    >
      {id}
      {isSaving && (
        <motion.div 
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 2, opacity: 1 }}
          className="absolute inset-0 bg-white/20 rounded-full pointer-events-none"
        />
      )}
    </button>
  );
};

export default function App() {
  const [octaveShift, setOctaveShift] = useState(0);
  const [visibleOctaves, setVisibleOctaves] = useState(4);
  const [keyboardHeight, setKeyboardHeight] = useState(220);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const [controlType, setControlType] = useState<ControlType>('knobs');
  const [collapsedPanels, setCollapsedPanels] = useState<Record<string, boolean>>({});
  const [currentPreset, setCurrentPreset] = useState("Vintage");
  const [activeUserPresetSlot, setActiveUserPresetSlot] = useState<string | null>(null);
  const [settings, setSettings] = useState<SynthSettings>({ ...PRESETS["Vintage"], basePresetName: "Vintage" });
  
  const [userPresets, setUserPresets] = useState<Record<string, SynthSettings | null>>(() => {
    try {
      const saved = localStorage.getItem('tonevoid_user_presets');
      return saved ? JSON.parse(saved) : { A: null, B: null, C: null };
    } catch (e) {
      return { A: null, B: null, C: null };
    }
  });

  const saveUserPreset = (id: string) => {
    const newPresets = { 
      ...userPresets, 
      [id]: { 
        ...settings,
        visibleOctaves,
        octaveShift,
        controlType,
        basePresetName: currentPreset
      } 
    };
    setUserPresets(newPresets);
    localStorage.setItem('tonevoid_user_presets', JSON.stringify(newPresets));
    setActiveUserPresetSlot(id);
  };

  const loadUserPreset = (id: string) => {
    const preset = userPresets[id];
    if (preset) {
      setSettings(preset);
      if (preset.visibleOctaves !== undefined) setVisibleOctaves(preset.visibleOctaves);
      if (preset.octaveShift !== undefined) setOctaveShift(preset.octaveShift);
      if (preset.controlType !== undefined) setControlType(preset.controlType);
      if (preset.basePresetName) setCurrentPreset(preset.basePresetName);
      setActiveUserPresetSlot(id);
    }
  };

  const togglePanel = (id: string) => {
    setCollapsedPanels(prev => ({ ...prev, [id]: !prev[id] }));
  };

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
      <header className="py-0 px-2 sm:py-[3px] sm:px-4 flex justify-between items-center border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <div className="flex items-center gap-2 sm:gap-3">
          <img src="/tvlogo.svg" alt="TONEVOID Logo" className="h-[38px] sm:h-[58px] w-auto" referrerPolicy="no-referrer" />
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* Preset Selector */}
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-900/80 p-1 sm:p-1.5 rounded-lg sm:rounded-xl border border-zinc-800">
            <div className="flex items-center gap-1 mr-1 sm:mr-2">
              {['A', 'B', 'C'].map(id => (
                <UserPresetButton 
                  key={id} 
                  id={id} 
                  hasPreset={!!userPresets[id]}
                  isActive={activeUserPresetSlot === id}
                  onSave={() => saveUserPreset(id)}
                  onLoad={() => loadUserPreset(id)}
                />
              ))}
            </div>
            <div className="w-px h-4 bg-zinc-800 mr-1 sm:mr-2" />
            <select 
              value={currentPreset}
              onChange={(e) => {
                const name = e.target.value;
                setCurrentPreset(name);
                if (PRESETS[name]) {
                  setSettings({ ...PRESETS[name], basePresetName: name });
                  setActiveUserPresetSlot(null);
                }
              }}
              className="bg-transparent text-zinc-300 text-[8px] md:text-[10px] font-black uppercase tracking-widest outline-none cursor-pointer px-2 md:px-3 py-0.5 sm:py-1"
            >
              <optgroup label="Voice / Factory Presets" className="bg-zinc-900 text-zinc-500 text-[8px]">
                {Object.keys(PRESETS).map(name => (
                  <option key={name} value={name} className="bg-zinc-900 text-zinc-300">
                    {name}
                  </option>
                ))}
              </optgroup>
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
      <main className="flex-1 p-2 sm:p-4 pb-[600px] overflow-y-auto custom-scrollbar">
        {/* Keyboard Controls Section */}
        <div className="mb-4 flex flex-wrap items-center gap-3 sm:gap-4 p-2 sm:p-3 bg-zinc-900/30 rounded-2xl border border-zinc-800/50">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            <span className="text-[10px] uppercase font-black tracking-widest text-zinc-400">Keyboard Config</span>
          </div>
          
          <div className="h-4 w-px bg-zinc-800 hidden sm:block" />

          <div className="flex flex-wrap items-center gap-4">
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

            <div className="h-4 w-px bg-zinc-800 hidden md:block" />

            {/* Control Style Selector */}
            <div className="flex items-center gap-2">
              <span className="text-[8px] uppercase tracking-[0.1em] text-zinc-600 font-black">Controls</span>
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-lg border border-zinc-800">
                {(['knobs', 'sliders', 'text'] as ControlType[]).map(type => (
                  <button
                    key={type}
                    onClick={() => setControlType(type)}
                    className={`px-2 py-1 rounded text-[8px] uppercase font-bold transition-all ${
                      controlType === type 
                        ? 'bg-indigo-500 text-black shadow-[0_0_10px_rgba(99,102,241,0.4)]' 
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {type}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Waveform Preview Section - Full Card with Overlapping Toggle */}
        <div className="mb-4 sm:mb-6 relative">
          <AnimatePresence initial={false}>
            {!collapsedPanels['visualizer'] ? (
              <motion.div
                key="expanded"
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.4, ease: [0.23, 1, 0.32, 1] }}
                className="overflow-hidden rounded-2xl border border-zinc-800/50 bg-black/40 shadow-2xl relative"
              >
                <div className="h-32 sm:h-40 md:h-48 w-full">
                  <WaveformPreview getAnalyser={getAnalyser} />
                </div>
                {/* Overlapping Toggle Button - Expanded */}
                <button 
                  onClick={() => togglePanel('visualizer')}
                  className="absolute top-3 right-3 z-20 p-2 rounded-xl bg-black/40 text-zinc-400 border border-zinc-800/50 hover:bg-orange-500 hover:text-black hover:border-orange-400 backdrop-blur-md transition-all duration-300"
                  title="Hide Visualizer"
                >
                  <ChevronDown className="w-4 h-4 rotate-180" />
                </button>
              </motion.div>
            ) : (
              <motion.div
                key="collapsed"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="flex justify-end"
              >
                <button 
                  onClick={() => togglePanel('visualizer')}
                  className="p-2 px-4 rounded-xl bg-zinc-900/80 text-zinc-400 border border-zinc-800 hover:bg-orange-500 hover:text-black hover:border-orange-400 transition-all duration-300 flex items-center gap-2 shadow-xl"
                >
                  <Activity className="w-4 h-4" />
                  <span className="text-[10px] font-black uppercase tracking-widest">Show Visualizer</span>
                  <ChevronDown className="w-3.5 h-3.5" />
                </button>
              </motion.div>
            )}
          </AnimatePresence>
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
                  type={controlType}
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
                  type={controlType}
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
                type={controlType}
              />
              <ControlKnob 
                label="Growl" 
                value={settings.growl} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, growl: val }))}
                color="emerald"
                type={controlType}
              />
              <ControlKnob 
                label="Dist" 
                value={settings.distortion} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, distortion: val }))}
                color="emerald"
                type={controlType}
              />
              <ControlKnob 
                label="Fuzz" 
                value={settings.fuzz} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, fuzz: val }))}
                color="emerald"
                type={controlType}
              />
              <ControlKnob 
                label="Reverb" 
                value={settings.reverb} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, reverb: val }))}
                color="emerald"
                type={controlType}
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
                type={controlType}
              />
              <ControlKnob 
                label="Mid" 
                value={settings.eqMid} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqMid: val }))}
                unit="dB"
                color="blue"
                type={controlType}
              />
              <ControlKnob 
                label="High" 
                value={settings.eqHigh} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqHigh: val }))}
                unit="dB"
                color="blue"
                type={controlType}
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
                type={controlType}
              />
              <div className="grid grid-cols-2 gap-2">
                <ControlKnob 
                  label="Res" 
                  value={settings.filterResonance} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterResonance: val }))}
                  color="purple"
                  type={controlType}
                />
                <ControlKnob 
                  label="Env" 
                  value={settings.filterEnvAmount} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterEnvAmount: val }))}
                  color="purple"
                  type={controlType}
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
                type={controlType}
              />
              <ControlKnob 
                label="Decay" 
                value={settings.decay} 
                min={0.01} max={2} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, decay: val }))}
                unit="s"
                color="yellow"
                type={controlType}
              />
              <ControlKnob 
                label="Sustain" 
                value={settings.sustain} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, sustain: val }))}
                color="yellow"
                type={controlType}
              />
              <ControlKnob 
                label="Release" 
                value={settings.release} 
                min={0.01} max={5} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, release: val }))}
                unit="s"
                color="yellow"
                type={controlType}
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
                type={controlType}
              />
              <ControlKnob 
                label="Depth" 
                value={settings.lfoDepth} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, lfoDepth: val }))}
                color="green"
                type={controlType}
              />
            </div>
          </CollapsiblePanel>

          {/* Extra Bottom Margin */}
          <div className="h-[500px] w-full pointer-events-none" />
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
        
        /* Dark themed number input arrows */
        .dark-arrows::-webkit-inner-spin-button,
        .dark-arrows::-webkit-outer-spin-button {
          filter: invert(1) brightness(0.5);
          cursor: pointer;
        }
      `}</style>
    </div>
  );
}
