import { useState, useCallback, useEffect, useRef } from 'react';
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
  Volume2,
  Maximize2,
  Minimize2,
  AlertCircle,
  GripHorizontal,
  Sliders
} from 'lucide-react';
import { useSynth, SynthSettings } from './components/SynthEngine';
import { WaveformPreview } from './components/WaveformPreview';

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
    <div className="flex flex-col items-center gap-2 p-3 bg-zinc-900/40 rounded-xl border border-zinc-800/40 w-full max-w-[140px]">
      <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold text-center">{label}</span>
      <div className="relative w-14 h-14 flex items-center justify-center">
        <input
          type="range"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
        />
        <svg className="w-full h-full transform -rotate-90">
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
            className="w-8 h-8 bg-zinc-800 rounded-full shadow-xl border border-zinc-700 flex items-center justify-center transition-transform duration-200"
            style={{ transform: `rotate(${(value - min) / (max - min) * 270 - 135}deg)` }}
          >
            <div className="w-1 h-3 bg-orange-500 rounded-full -translate-y-2" />
          </div>
        </div>
      </div>
      <span className="text-[10px] font-mono text-zinc-400 bg-black/40 px-2 py-0.5 rounded-full border border-zinc-800">
        {value.toFixed(step >= 1 ? 0 : 2)}{unit}
      </span>
    </div>
  );
};

const WaveSelector = ({ label, current, enabled, options, onChange, onToggle }: { 
  label: string, current: string, enabled: boolean, options: OscillatorType[], onChange: (val: OscillatorType) => void, onToggle: () => void
}) => (
  <div className={`flex flex-col gap-2 p-3 rounded-xl border transition-all ${enabled ? 'bg-zinc-900/40 border-zinc-800/40' : 'bg-zinc-950/20 border-zinc-900/50 opacity-60'}`}>
    <div className="flex justify-between items-center">
      <span className="text-[9px] uppercase tracking-[0.1em] text-zinc-500 font-bold">{label}</span>
      <div className={`w-1.5 h-1.5 rounded-full ${enabled ? 'bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]' : 'bg-zinc-800'}`} />
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
          className={`flex-1 py-2 rounded-lg text-[9px] uppercase font-bold tracking-tighter transition-all border ${
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

export default function App() {
  const [settings, setSettings] = useState<SynthSettings>({
    osc1Enabled: true,
    osc1Wave: 'sawtooth',
    osc1Gain: 0.8,
    osc2Enabled: true,
    osc2Wave: 'square',
    osc2Gain: 0.5,
    osc2Detune: 7,
    noiseLevel: 0,
    growl: 0,
    distortion: 0,
    fuzz: 0,
    reverb: 0,
    eqLow: 0,
    eqMid: 0,
    eqHigh: 0,
    filterCutoff: 2000,
    filterResonance: 0.5,
    filterEnvAmount: 0.5,
    attack: 0.1,
    decay: 0.3,
    sustain: 0.5,
    release: 0.8,
    lfoRate: 5,
    lfoDepth: 0,
  });

  const [octaveShift, setOctaveShift] = useState(0);
  const [visibleOctaves, setVisibleOctaves] = useState(4);
  const [keyboardHeight, setKeyboardHeight] = useState(220);
  const [isDraggingHeight, setIsDraggingHeight] = useState(false);
  const { playNote, stopNote, stopAllNotes, getAnalyser } = useSynth(settings);
  const [activeKeys, setActiveKeys] = useState<Set<number>>(new Set());
  const activeKeysRef = useRef(activeKeys);

  const keys = generateKeys(visibleOctaves, octaveShift);

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
      if (!target || !target.closest('.synth-key')) {
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
      <header className="p-4 flex justify-between items-center border-b border-zinc-900/50 backdrop-blur-md sticky top-0 z-50 bg-black/80">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-orange-500 rounded-xl flex items-center justify-center shadow-[0_0_20px_rgba(249,115,22,0.3)]">
            <Activity className="text-black w-6 h-6" />
          </div>
          <div>
            <h1 className="text-lg font-black tracking-tighter uppercase italic leading-none">TONEVOID</h1>
            <p className="text-[8px] text-zinc-500 uppercase tracking-[0.2em] font-mono mt-1">Poly-Synth</p>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {/* View Selector */}
          <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <div className="flex flex-col items-center px-2">
              <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-600 font-black">View</span>
              <div className="flex items-center gap-1.5">
                {[1, 2, 3, 4, 5].map(num => (
                  <button
                    key={num}
                    onClick={() => setVisibleOctaves(num)}
                    className={`w-5 h-5 rounded flex items-center justify-center text-[9px] font-bold transition-all ${
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

          {/* Octave Shift */}
          <div className="flex items-center gap-2 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
            <button 
              onClick={() => setOctaveShift(s => Math.max(-3, s - 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <div className="flex flex-col items-center min-w-[50px]">
              <span className="text-[7px] uppercase tracking-[0.1em] text-zinc-600 font-black">Octave</span>
              <span className="text-sm font-mono font-black text-orange-500">{octaveShift > 0 ? `+${octaveShift}` : octaveShift}</span>
            </div>
            <button 
              onClick={() => setOctaveShift(s => Math.min(3, s + 1))}
              className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400 transition-colors"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          {/* Panic Button */}
          <button 
            onClick={handlePanic}
            className="flex items-center gap-2 px-4 py-2 bg-zinc-900 hover:bg-red-900/40 text-zinc-600 hover:text-red-500 rounded-xl border border-zinc-800 transition-all group"
          >
            <AlertCircle className="w-4 h-4 group-hover:scale-110 transition-transform" />
            <span className="text-[10px] font-black uppercase tracking-widest">Panic</span>
          </button>
        </div>
      </header>

      {/* Grid Controls Area */}
      <main className="flex-1 p-4 pb-64 overflow-y-auto custom-scrollbar">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-12 gap-4">
          
          {/* Oscillators Section */}
          <div className="lg:col-span-4 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Waves className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">Oscillators</h2>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
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
                <div className="grid grid-cols-2 gap-2">
                  <ControlKnob 
                    label="O2 Gain" 
                    value={settings.osc2Gain} 
                    min={0} max={1} step={0.01}
                    onChange={(val) => setSettings(s => ({ ...s, osc2Gain: val }))}
                  />
                  <ControlKnob 
                    label="O2 Fine" 
                    value={settings.osc2Detune} 
                    min={-50} max={50} 
                    onChange={(val) => setSettings(s => ({ ...s, osc2Detune: val }))}
                    unit="ct"
                  />
                </div>
              </div>
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

          {/* Effects Section */}
          <div className="lg:col-span-4 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Zap className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">Effects</h2>
            </div>
            <div className="grid grid-cols-2 xl:grid-cols-4 gap-3">
              <ControlKnob 
                label="Growl" 
                value={settings.growl} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, growl: val }))}
              />
              <ControlKnob 
                label="Dist" 
                value={settings.distortion} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, distortion: val }))}
              />
              <ControlKnob 
                label="Fuzz" 
                value={settings.fuzz} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, fuzz: val }))}
              />
              <ControlKnob 
                label="Reverb" 
                value={settings.reverb} 
                min={0} max={1} step={0.01}
                onChange={(val) => setSettings(s => ({ ...s, reverb: val }))}
              />
            </div>
          </div>

          {/* EQ Section */}
          <div className="lg:col-span-4 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Sliders className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">EQ</h2>
            </div>
            <div className="grid grid-cols-3 gap-3">
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
          </div>

          {/* Filter Section */}
          <div className="lg:col-span-2 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Wind className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">Filter</h2>
            </div>
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
          </div>

          {/* Envelope Section */}
          <div className="lg:col-span-2 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Zap className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">Envelope</h2>
            </div>
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
          </div>

          {/* LFO Section */}
          <div className="lg:col-span-2 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Settings2 className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">LFO</h2>
            </div>
            <div className="grid grid-cols-1 gap-3">
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
          </div>

          {/* Waveform Preview Section */}
          <div className="lg:col-span-6 space-y-4 p-4 bg-zinc-900/20 rounded-2xl border border-zinc-800/20">
            <div className="flex items-center gap-2 text-zinc-500">
              <Activity className="w-4 h-4" />
              <h2 className="text-[10px] uppercase tracking-[0.2em] font-black">Visualizer</h2>
            </div>
            <WaveformPreview getAnalyser={getAnalyser} />
          </div>
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
          className="absolute top-0 left-0 w-full h-10 -translate-y-1/2 flex items-center justify-center cursor-ns-resize group z-[110]"
        >
          <div className="w-32 h-2 bg-zinc-800 rounded-full group-hover:bg-orange-500 transition-all flex items-center justify-center shadow-lg">
            <GripHorizontal className="w-5 h-5 text-zinc-600 group-hover:text-black transition-colors" />
          </div>
        </div>

        <div className="h-full w-full overflow-x-auto custom-scrollbar select-none pt-4">
          <div 
            className="relative h-full px-4"
            style={{ 
              minWidth: visibleOctaves === 1 ? '100%' : `${visibleOctaves * 240}px` 
            }}
          >
            {/* White Keys Layer */}
            <div className="flex h-full w-full">
              <AnimatePresence mode="popLayout">
                {keys.filter(k => !k.isBlack).map((note) => (
                  <motion.button
                    key={note.midi}
                    layout
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30,
                      opacity: { duration: 0.2 }
                    }}
                    onPointerDown={(e) => { 
                      e.currentTarget.setPointerCapture(e.pointerId); 
                      handleKeyDown(note.midi); 
                    }}
                    onPointerUp={(e) => { 
                      e.currentTarget.releasePointerCapture(e.pointerId); 
                      handleKeyUp(note.midi); 
                    }}
                    onPointerCancel={(e) => { 
                      e.currentTarget.releasePointerCapture(e.pointerId); 
                      handleKeyUp(note.midi); 
                    }}
                    className={`
                      synth-key relative flex-1 border-x border-zinc-900/20 transition-all duration-75
                      bg-zinc-100 h-full z-0 rounded-b-xl border-b-8 border-zinc-300
                      ${activeKeys.has(note.midi) ? 'bg-orange-400 translate-y-2 shadow-[0_0_20px_rgba(251,146,60,0.5)]' : ''}
                    `}
                  >
                    {keyboardHeight > 100 && (
                      <motion.div 
                        key={`${note.note}-${note.octave}`}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 text-zinc-400 pointer-events-none"
                      >
                        <span className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${Math.max(10, 24 - visibleOctaves * 3)}px` }}>{note.note}</span>
                        <span className="font-mono font-bold leading-none opacity-60" style={{ fontSize: `${Math.max(8, 18 - visibleOctaves * 2.5)}px` }}>{note.octave}</span>
                      </motion.div>
                    )}
                  </motion.button>
                ))}
              </AnimatePresence>
            </div>

            {/* Black Keys Layer */}
            <div className="absolute top-0 left-4 right-4 h-[60%] pointer-events-none">
              <AnimatePresence mode="popLayout">
                {keys.filter(k => k.isBlack).map((note) => {
                  // Calculate position based on the white key it follows
                  const whiteKeysPerOctave = 7;
                  const totalWhiteKeys = (visibleOctaves * whiteKeysPerOctave) + 1;
                  
                  let positionIndex = 0;
                  if (note.note === 'C#') positionIndex = 1;
                  if (note.note === 'D#') positionIndex = 2;
                  if (note.note === 'F#') positionIndex = 4;
                  if (note.note === 'G#') positionIndex = 5;
                  if (note.note === 'A#') positionIndex = 6;
                  
                  const leftPercent = ((note.octaveIndex * whiteKeysPerOctave) + positionIndex) / totalWhiteKeys * 100;
                  const widthPercent = (1 / totalWhiteKeys) * 0.7 * 100;

                  return (
                    <motion.button
                      key={note.midi}
                      layout
                      initial={{ opacity: 0, y: -20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      transition={{ 
                        type: "spring", 
                        stiffness: 400, 
                        damping: 35,
                        opacity: { duration: 0.15 }
                      }}
                      onPointerDown={(e) => { 
                        e.currentTarget.setPointerCapture(e.pointerId); 
                        handleKeyDown(note.midi); 
                      }}
                      onPointerUp={(e) => { 
                        e.currentTarget.releasePointerCapture(e.pointerId); 
                        handleKeyUp(note.midi); 
                      }}
                      onPointerCancel={(e) => { 
                        e.currentTarget.releasePointerCapture(e.pointerId); 
                        handleKeyUp(note.midi); 
                      }}
                      className={`
                        synth-key absolute top-0 z-10 rounded-b-lg border-b-4 border-zinc-800 transition-all duration-75 pointer-events-auto
                        bg-zinc-900 h-full
                        ${activeKeys.has(note.midi) ? 'bg-orange-600 translate-y-1 shadow-[0_0_20px_rgba(234,88,12,0.5)]' : ''}
                      `}
                      style={{
                        left: `${leftPercent}%`,
                        width: `${widthPercent}%`,
                        transform: 'translateX(-50%)'
                      }}
                    >
                      {keyboardHeight > 120 && (
                        <motion.div 
                          key={`${note.note}-${note.octave}`}
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 text-zinc-500 pointer-events-none"
                        >
                          <span className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${Math.max(8, 16 - visibleOctaves * 2)}px` }}>{note.note}</span>
                          <span className="font-mono font-bold leading-none opacity-60" style={{ fontSize: `${Math.max(7, 12 - visibleOctaves * 1.5)}px` }}>{note.octave}</span>
                        </motion.div>
                      )}
                    </motion.button>
                  );
                })}
              </AnimatePresence>
            </div>
          </div>
        </div>
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
