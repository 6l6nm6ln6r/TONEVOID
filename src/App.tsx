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

const ControlKnob = ({ label, value, min, max, step = 1, onChange, unit = "" }: { 
  label: string, value: number, min: number, max: number, step?: number, onChange: (val: number) => void, unit?: string 
}) => {
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
            className="stroke-orange-500 fill-none transition-all duration-200"
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
            <div className="w-0.5 h-2 sm:w-1 sm:h-3 bg-orange-500 rounded-full -translate-y-1.5 sm:-translate-y-2" />
          </div>
        </div>
      </div>
      <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-zinc-800">
        {value.toFixed(step >= 1 ? 0 : 2)}{unit}
      </span>
    </div>
  );
};

const WaveSelector = ({ label, current, enabled, options, onChange, onToggle }: { 
  label: string, current: string, enabled: boolean, options: OscillatorType[], onChange: (val: OscillatorType) => void, onToggle: () => void
}) => (
  <div className={`flex flex-col gap-1.5 sm:gap-2 p-2 sm:p-3 rounded-xl border transition-all ${enabled ? 'bg-zinc-900/40 border-zinc-800/40' : 'bg-zinc-950/20 border-zinc-900/50 opacity-60'}`}>
    <div className="flex justify-between items-center">
      <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold">{label}</span>
      <div className={`w-1 h-1 sm:w-1.5 sm:h-1.5 rounded-full ${enabled ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-zinc-800'}`} />
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
            current === opt && enabled
              ? 'bg-orange-500 text-black border-orange-400' 
              : 'bg-zinc-800 text-zinc-500 border-zinc-700 hover:bg-zinc-700'
          }`}
        >
          {opt}
        </button>
      ))}
    </div>
  </div>
);

const CollapsiblePanel = ({ 
  title, 
  icon: Icon, 
  children, 
  isCollapsed, 
  onToggle 
}: { 
  title: string, 
  icon: any, 
  children: ReactNode, 
  isCollapsed: boolean, 
  onToggle: () => void 
}) => {
  return (
    <div className="flex flex-col bg-zinc-900/20 rounded-2xl border border-zinc-800/20 overflow-hidden transition-all duration-300 h-fit">
      <button 
        onClick={onToggle}
        className="flex items-center justify-between p-3 sm:p-4 hover:bg-zinc-800/20 transition-colors w-full text-left group"
      >
        <div className="flex items-center gap-2 text-zinc-500 group-hover:text-zinc-300 transition-colors">
          <Icon className="w-3.5 h-3.5 sm:w-4 h-4" />
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

  const keys = useMemo(() => generateKeys(visibleOctaves, octaveShift), [visibleOctaves, octaveShift]);

  useEffect(() => {
    activeKeysRef.current = activeKeys;
  }, [activeKeys]);

  const handlePanic = useCallback(() => {
    stopAllNotes();
    setActiveKeys(new Set());
  }, [stopAllNotes]);

  const handleKeyDown = useCallback((midi: number) => {
    if (activeKeysRef.current.has(midi)) return;
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.add(midi);
      return next;
    });
    playNote(getFreq(midi), midi);
  }, [playNote]);

  const handleKeyUp = useCallback((midi: number) => {
    if (!activeKeysRef.current.has(midi)) return;
    setActiveKeys(prev => {
      const next = new Set(prev);
      next.delete(midi);
      return next;
    });
    stopNote(midi);
  }, [stopNote]);

  // Global cleanup to prevent stuck notes
  useEffect(() => {
    const handleGlobalUp = (e: PointerEvent) => {
      // If we're not touching a key, clear everything
      const target = e.target as HTMLElement;
      if (!target || typeof target.closest !== 'function' || !target.closest('.synth-key')) {
        // Only clear if we actually have active keys to avoid unnecessary state updates
        if (activeKeysRef.current.size > 0) {
          activeKeysRef.current.forEach(midi => handleKeyUp(midi));
        }
      }
    };
    
    const handleBlur = () => {
      if (activeKeysRef.current.size > 0) {
        activeKeysRef.current.forEach(midi => handleKeyUp(midi));
      }
      stopAllNotes();
    };

    window.addEventListener('pointerup', handleGlobalUp);
    window.addEventListener('pointercancel', handleGlobalUp);
    window.addEventListener('blur', handleBlur);
    
    const handlePointerMove = (e: PointerEvent) => {
      if (isDraggingHeight) {
        const newHeight = window.innerHeight - e.clientY;
        // Clamp height between 80px and 60% of viewport
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
              <span className="md:hidden">TV</span>
              <span className="hidden md:inline">TONEVOID</span>
            </h1>
            <p className="text-[6px] sm:text-[8px] text-zinc-500 uppercase tracking-[0.2em] font-mono mt-0.5 sm:mt-1 hidden md:block">Poly-Synth</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2 md:gap-4">
          {/* View Selector */}
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-900/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-zinc-800">
            <div className="flex flex-col items-center px-1 sm:px-2">
              <span className="text-[6px] sm:text-[7px] uppercase tracking-[0.1em] text-zinc-600 font-black hidden md:block">View</span>
              <div className="flex items-center gap-1 sm:gap-1.5">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setVisibleOctaves(num)}
                    className={`w-4 h-4 md:w-5 md:h-5 rounded flex items-center justify-center text-[8px] md:text-[9px] font-bold transition-all ${
                      visibleOctaves === num 
                        ? 'bg-orange-500 text-black' 
                        : 'bg-zinc-800 text-zinc-500 hover:bg-zinc-700'
                    }`}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          </div>

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

          {/* Octave Shift */}
          <div className="flex items-center gap-1 md:gap-2 bg-zinc-900/80 p-0.5 sm:p-1 rounded-lg sm:rounded-xl border border-zinc-800">
            <button 
              onClick={() => setOctaveShift(s => Math.max(-3, s - 1))}
              className="p-1 md:p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ChevronLeft className="w-3 h-3 md:w-4 md:h-4" />
            </button>
            <div className="flex flex-col items-center min-w-[30px] md:min-w-[50px]">
              <span className="text-[6px] sm:text-[7px] uppercase tracking-[0.1em] text-zinc-600 font-black hidden md:block">Octave</span>
              <span className="text-xs md:text-sm font-mono font-black text-orange-500">{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
            </div>
            <button 
              onClick={() => setOctaveShift(s => Math.min(3, s + 1))}
              className="p-1 md:p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ChevronRight className="w-3 h-3 md:w-4 md:h-4" />
            </button>
          </div>

          {/* Panic Button */}
          <button 
            onClick={handlePanic}
            className="flex items-center justify-center w-8 h-8 md:w-10 md:h-10 bg-zinc-900 hover:bg-red-900/40 text-zinc-600 hover:text-red-500 rounded-lg sm:rounded-xl border border-zinc-800 transition-all group"
            title="Panic"
          >
            <AlertCircle className="w-4 h-4 md:w-5 md:h-5 group-hover:scale-110 transition-transform" />
          </button>
        </div>
      </header>

      {/* Grid Controls Area */}
      <main className="flex-1 p-2 sm:p-4 pb-64 overflow-y-auto custom-scrollbar">
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
                />
                <ControlKnob 
                  label="O1 Gain" 
                  value={settings.osc1Gain} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, osc1Gain: val }))}
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
                />
                <ControlKnob 
                  label="O2 Gain" 
                  value={settings.osc2Gain} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, osc2Gain: val }))}
                />
              </div>

              <div className="pt-2 border-t border-zinc-800/30">
                <ControlKnob 
                  label="Noise" 
                  value={settings.noiseLevel} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, noiseLevel: val }))}
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
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Growl" 
                value={settings.growl} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, growl: val }))}
              />
              <ControlKnob 
                label="Dist" 
                value={settings.distortion} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, distortion: val }))}
              />
              <ControlKnob 
                label="Fuzz" 
                value={settings.fuzz} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, fuzz: val }))}
              />
              <ControlKnob 
                label="Reverb" 
                value={settings.reverb} 
                min={0} max={10} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, reverb: val }))}
              />
            </div>
          </CollapsiblePanel>

          {/* EQ Section */}
          <CollapsiblePanel 
            title="EQ" 
            icon={Sliders} 
            isCollapsed={collapsedPanels['eq']} 
            onToggle={() => togglePanel('eq')}
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Low" 
                value={settings.eqLow} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqLow: val }))}
                unit="dB"
              />
              <ControlKnob 
                label="Mid" 
                value={settings.eqMid} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqMid: val }))}
                unit="dB"
              />
              <ControlKnob 
                label="High" 
                value={settings.eqHigh} 
                min={-12} max={12} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, eqHigh: val }))}
                unit="dB"
              />
            </div>
          </CollapsiblePanel>

          {/* Filter Section */}
          <CollapsiblePanel 
            title="Filter" 
            icon={Wind} 
            isCollapsed={collapsedPanels['filter']} 
            onToggle={() => togglePanel('filter')}
          >
            <div className="grid grid-cols-1 gap-3">
              <ControlKnob 
                label="Cutoff" 
                value={settings.filterCutoff} 
                min={20} max={10000} step={10}
                onChange={(val) => setSettings(s => ({ ...s, filterCutoff: val }))}
                unit="Hz"
              />
              <div className="grid grid-cols-2 gap-2">
                <ControlKnob 
                  label="Res" 
                  value={settings.filterResonance} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterResonance: val }))}
                />
                <ControlKnob 
                  label="Env" 
                  value={settings.filterEnvAmount} 
                  min={0} max={1} step={0.01}
                  onChange={(val) => setSettings(s => ({ ...s, filterEnvAmount: val }))}
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
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Attack" 
                value={settings.attack} 
                min={0.01} max={2} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, attack: val }))}
                unit="s"
              />
              <ControlKnob 
                label="Decay" 
                value={settings.decay} 
                min={0.01} max={2} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, decay: val }))}
                unit="s"
              />
              <ControlKnob 
                label="Sustain" 
                value={settings.sustain} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, sustain: val }))}
              />
              <ControlKnob 
                label="Release" 
                value={settings.release} 
                min={0.01} max={5} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, release: val }))}
                unit="s"
              />
            </div>
          </CollapsiblePanel>

          {/* LFO Section */}
          <CollapsiblePanel 
            title="LFO" 
            icon={Settings2} 
            isCollapsed={collapsedPanels['lfo']} 
            onToggle={() => togglePanel('lfo')}
          >
            <div className="grid grid-cols-2 gap-3">
              <ControlKnob 
                label="Rate" 
                value={settings.lfoRate} 
                min={0.1} max={20} step={0.1}
                onChange={(val) => setSettings(s => ({ ...s, lfoRate: val }))}
                unit="Hz"
              />
              <ControlKnob 
                label="Depth" 
                value={settings.lfoDepth} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, lfoDepth: val }))}
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
