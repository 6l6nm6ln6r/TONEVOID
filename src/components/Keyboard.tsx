import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';

interface Key {
  note: string;
  isBlack: boolean;
  offset: number;
  midi: number;
  octave: number;
  octaveIndex: number;
}

interface KeyboardProps {
  keys: Key[];
  activeKeys: Set<number>;
  keyboardHeight: number;
  visibleOctaves: number;
  handleKeyDown: (midi: number, pointerId?: number) => void;
  handleKeyUp: (midi: number, pointerId?: number) => void;
}

export const Keyboard = React.memo(({ 
  keys, 
  activeKeys, 
  keyboardHeight, 
  visibleOctaves, 
  handleKeyDown, 
  handleKeyUp 
}: KeyboardProps) => {
  const whiteKeys = useMemo(() => keys.filter(k => !k.isBlack), [keys]);
  const blackKeys = useMemo(() => keys.filter(k => k.isBlack), [keys]);
  const totalWhiteKeys = whiteKeys.length;

  const handlePointerMove = (e: React.PointerEvent) => {
    if (e.buttons !== 1 && e.pointerType === 'mouse') return;
    
    const target = document.elementFromPoint(e.clientX, e.clientY) as HTMLElement;
    const keyElement = target?.closest('.synth-key') as HTMLElement;
    
    if (keyElement) {
      const midi = parseInt(keyElement.getAttribute('data-midi') || '');
      if (!isNaN(midi)) {
        handleKeyDown(midi, e.pointerId);
      }
    }
  };

  return (
    <div 
      className="h-full w-full overflow-x-auto custom-scrollbar select-none pt-4 touch-none"
      onPointerMove={handlePointerMove}
    >
      <div 
        className="relative h-full"
        style={{ 
          minWidth: visibleOctaves === 1 ? '100%' : `${visibleOctaves * 240}px` 
        }}
      >
        {/* White Keys Layer */}
        <div className="flex h-full w-full px-4">
          {whiteKeys.map((note) => (
            <motion.button
              key={note.midi}
              data-midi={note.midi}
              animate={{ 
                opacity: 1, 
                scale: 1,
                y: activeKeys.has(note.midi) ? 8 : 0
              }}
              transition={{ 
                type: "spring", 
                stiffness: 300, 
                damping: 30,
                y: { duration: 0.1 }
              }}
                onPointerDown={(e) => { 
                  (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                  handleKeyDown(note.midi, e.pointerId); 
                }}
                onPointerUp={(e) => { 
                  handleKeyUp(note.midi, e.pointerId); 
                }}
                onPointerCancel={(e) => { 
                  handleKeyUp(note.midi, e.pointerId); 
                }}
                className={`
                  synth-key relative flex-1 border-x border-zinc-900/20 transition-colors duration-75
                  bg-zinc-100 h-full z-0 rounded-b-xl border-b-8 border-zinc-300 touch-none
                  ${activeKeys.has(note.midi) 
                    ? 'bg-gradient-to-b from-orange-300 to-orange-500 shadow-[0_0_30px_rgba(249,115,22,0.6),inset_0_4px_10px_rgba(0,0,0,0.2)] border-b-0' 
                    : 'hover:bg-zinc-50'}
                `}
              >
                {/* Active Indicator Dot */}
                {activeKeys.has(note.midi) && (
                  <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                )}
                
                {keyboardHeight > 100 && (
                  <motion.div 
                    key={`${note.note}-${note.octave}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ 
                      opacity: 1, 
                      y: 0,
                      color: activeKeys.has(note.midi) ? '#000000' : '#a1a1aa'
                    }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none"
                  >
                    <span className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${Math.max(10, 24 - visibleOctaves * 3)}px` }}>{note.note}</span>
                    <span className="font-mono font-bold leading-none opacity-60" style={{ fontSize: `${Math.max(8, 18 - visibleOctaves * 2.5)}px` }}>{note.octave}</span>
                  </motion.div>
                )}
              </motion.button>
            ))}
        </div>

        {/* Black Keys Layer */}
        <div className="absolute top-0 left-0 w-full h-[60%] px-4 pointer-events-none">
          <div className="relative w-full h-full">
            {blackKeys.map((note) => {
                const whiteKeysPerOctave = 7;
                
                let positionIndex = 0;
                if (note.note === 'C#') positionIndex = 1;
                if (note.note === 'D#') positionIndex = 2;
                if (note.note === 'F#') positionIndex = 4;
                if (note.note === 'G#') positionIndex = 5;
                if (note.note === 'A#') positionIndex = 6;
                
                const leftPercent = ((note.octaveIndex * whiteKeysPerOctave) + positionIndex) / totalWhiteKeys * 100;
                const widthPercent = (1 / totalWhiteKeys) * 0.65 * 100;

              return (
                <motion.button
                  key={note.midi}
                  data-midi={note.midi}
                  initial={{ opacity: 0, y: -20, x: "-50%" }}
                  animate={{ 
                    opacity: 1, 
                    y: activeKeys.has(note.midi) ? 4 : 0, 
                    x: "-50%" 
                  }}
                  exit={{ opacity: 0, y: -20, x: "-50%" }}
                  transition={{ 
                    type: "spring", 
                    stiffness: 400, 
                    damping: 35,
                    opacity: { duration: 0.15 },
                    y: { duration: 0.1 }
                  }}
                  onPointerDown={(e) => { 
                    (e.target as HTMLElement).releasePointerCapture(e.pointerId);
                    handleKeyDown(note.midi, e.pointerId); 
                  }}
                  onPointerUp={(e) => { 
                    handleKeyUp(note.midi, e.pointerId); 
                  }}
                  onPointerCancel={(e) => { 
                    handleKeyUp(note.midi, e.pointerId); 
                  }}
                  className={`
                    synth-key absolute top-0 z-10 rounded-b-lg border-b-4 border-zinc-800 transition-colors duration-75 pointer-events-auto
                    bg-zinc-900 h-full touch-none
                    ${activeKeys.has(note.midi) 
                      ? 'bg-gradient-to-b from-orange-500 to-orange-700 shadow-[0_0_25px_rgba(234,88,12,0.7),inset_0_2px_5px_rgba(255,255,255,0.2)] border-b-0' 
                      : 'hover:bg-zinc-800'}
                  `}
                  style={{
                    left: `${leftPercent}%`,
                    width: `${widthPercent}%`
                  }}
                >
                  {/* Active Indicator Dot (Black Key) */}
                  {activeKeys.has(note.midi) && (
                    <div className="absolute top-2 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-orange-200 shadow-[0_0_5px_white]" />
                  )}

                  {keyboardHeight > 120 && (
                    <motion.div 
                      key={`${note.note}-${note.octave}`}
                      initial={{ opacity: 0 }}
                      animate={{ 
                        opacity: 1,
                        color: activeKeys.has(note.midi) ? '#ffffff' : '#71717a'
                      }}
                      exit={{ opacity: 0 }}
                      className="absolute bottom-4 left-1/2 -translate-x-1/2 flex flex-col items-center gap-0.5 pointer-events-none"
                    >
                      <span className="font-black uppercase tracking-tighter leading-none" style={{ fontSize: `${Math.max(8, 16 - visibleOctaves * 2)}px` }}>{note.note}</span>
                      <span className="font-mono font-bold leading-none opacity-60" style={{ fontSize: `${Math.max(7, 12 - visibleOctaves * 1.5)}px` }}>{note.octave}</span>
                    </motion.div>
                  )}
                </motion.button>
            );
          })}
          </div>
        </div>
      </div>
    </div>
  );
});
