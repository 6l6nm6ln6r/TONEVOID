import { useEffect, useRef, useState, useCallback } from 'react';

// Moog-style 24dB/octave filter implementation (simplified)
// Based on Stilson/Smith model
class MoogFilter {
  private context: AudioContext;
  private input: GainNode;
  private output: GainNode;
  private nodes: AudioWorkletNode | BiquadFilterNode[];
  
  // For simplicity in standard Web Audio, we'll stack 4 BiquadFilters
  // to get 24dB/octave slope.
  private filters: BiquadFilterNode[] = [];

  constructor(context: AudioContext) {
    this.context = context;
    this.input = context.createGain();
    this.output = context.createGain();

    for (let i = 0; i < 4; i++) {
      const f = context.createBiquadFilter();
      f.type = 'lowpass';
      f.Q.value = 0; // Resonance handled separately or via Q
      this.filters.push(f);
    }

    this.input.connect(this.filters[0]);
    this.filters[0].connect(this.filters[1]);
    this.filters[1].connect(this.filters[2]);
    this.filters[2].connect(this.filters[3]);
    this.filters[3].connect(this.output);
  }

  setFrequency(freq: number, time: number = 0) {
    const f = Math.max(20, Math.min(20000, freq));
    this.filters.forEach(filter => {
      filter.frequency.setTargetAtTime(f, time, 0.01);
    });
  }

  setResonance(res: number, time: number = 0) {
    // Web Audio Biquad Q isn't exactly Moog resonance, but we can approximate
    // For a 4-pole filter, Q affects the peak.
    const q = Math.max(0, res * 20); 
    this.filters.forEach(filter => {
      filter.Q.setTargetAtTime(q / 4, time, 0.01);
    });
  }

  connect(destination: AudioNode) {
    this.output.connect(destination);
  }

  getInput() {
    return this.input;
  }
}

export interface SynthSettings {
  osc1Enabled: boolean;
  osc1Wave: OscillatorType;
  osc1Gain: number;
  osc2Enabled: boolean;
  osc2Wave: OscillatorType;
  osc2Gain: number;
  osc2Detune: number;
  noiseLevel: number;
  growl: number;
  distortion: number;
  fuzz: number;
  reverb: number;
  eqLow: number;
  eqMid: number;
  eqHigh: number;
  filterCutoff: number;
  filterResonance: number;
  filterEnvAmount: number;
  attack: number;
  decay: number;
  sustain: number;
  release: number;
  lfoRate: number;
  lfoDepth: number;
}

export const useSynth = (settings: SynthSettings) => {
  const audioCtx = useRef<AudioContext | null>(null);
  const masterGain = useRef<GainNode | null>(null);
  const analyser = useRef<AnalyserNode | null>(null);
  const activeOscillators = useRef<Map<number, any>>(new Map());
  const allVoices = useRef<Set<any>>(new Set());

  const noiseBuffer = useRef<AudioBuffer | null>(null);

  useEffect(() => {
    return () => {
      if (audioCtx.current) {
        audioCtx.current.close();
      }
    };
  }, []);

  const createNoiseBuffer = (ctx: AudioContext) => {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const output = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      output[i] = Math.random() * 2 - 1;
    }
    return buffer;
  };

  const makeDistortionCurve = (amount: number) => {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = amount * 100;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      // Soft saturation curve
      curve[i] = (Math.PI + k) * x / (Math.PI + k * Math.abs(x));
    }
    return curve;
  };

  const makeFuzzCurve = (amount: number) => {
    const n_samples = 44100;
    const curve = new Float32Array(n_samples);
    const k = amount * 20;
    for (let i = 0; i < n_samples; ++i) {
      const x = (i * 2) / n_samples - 1;
      if (amount === 0) {
        curve[i] = x;
      } else {
        // Harder clipping for fuzz, normalized to keep volume consistent
        curve[i] = Math.tanh(x * k) / Math.tanh(k || 1);
      }
    }
    return curve;
  };

  const createReverbBuffer = (ctx: AudioContext) => {
    const length = ctx.sampleRate * 2; // 2 seconds
    const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
    for (let channel = 0; channel < 2; channel++) {
      const data = buffer.getChannelData(channel);
      for (let i = 0; i < length; i++) {
        data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 3);
      }
    }
    return buffer;
  };

  const initAudio = useCallback(() => {
    if (!audioCtx.current) {
      audioCtx.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      masterGain.current = audioCtx.current.createGain();
      masterGain.current.gain.value = 0.3;
      
      analyser.current = audioCtx.current.createAnalyser();
      analyser.current.fftSize = 2048;
      
      masterGain.current.connect(analyser.current);
      analyser.current.connect(audioCtx.current.destination);
      
      noiseBuffer.current = createNoiseBuffer(audioCtx.current);
    }
    if (audioCtx.current.state === 'suspended') {
      audioCtx.current.resume();
    }
    
    // Ensure master gain is restored if it was muted by stopAllNotes
    if (masterGain.current) {
      const currentGain = masterGain.current.gain.value;
      if (currentGain < 0.1) {
        masterGain.current.gain.cancelScheduledValues(audioCtx.current.currentTime);
        masterGain.current.gain.setTargetAtTime(0.3, audioCtx.current.currentTime, 0.05);
      }
    }
  }, []);

  const stopNote = useCallback((midiNote: number, immediate: boolean = false) => {
    const voice = activeOscillators.current.get(midiNote);
    if (voice && audioCtx.current) {
      const now = audioCtx.current.currentTime;
      const releaseTime = immediate ? 0.001 : Math.max(0.001, settings.release);
      
      try {
        voice.gain.gain.cancelScheduledValues(now);
        const currentVal = voice.gain.gain.value;
        voice.gain.gain.setValueAtTime(currentVal, now);
        
        if (currentVal > 0) {
          voice.gain.gain.exponentialRampToValueAtTime(0.001, now + releaseTime);
        } else {
          voice.gain.gain.linearRampToValueAtTime(0, now + releaseTime);
        }
        
        const cleanup = () => {
          try {
            voice.osc1.stop();
            voice.osc2.stop();
            voice.noise.stop();
            voice.osc1.disconnect();
            voice.osc2.disconnect();
            voice.noise.disconnect();
            voice.gain.disconnect();
          } catch (e) {
            // Already stopped
          }
          allVoices.current.delete(voice);
          if (activeOscillators.current.get(midiNote) === voice) {
            activeOscillators.current.delete(midiNote);
          }
        };

        if (immediate) {
          cleanup();
        } else {
          // Use a slightly longer timeout to ensure the exponential ramp completes
          setTimeout(cleanup, (releaseTime * 1000) + 100);
        }
      } catch (e) {
        activeOscillators.current.delete(midiNote);
      }
    }
  }, [settings.release]);

  const playNote = useCallback((frequency: number, midiNote: number) => {
    initAudio();
    if (!audioCtx.current || !masterGain.current || !noiseBuffer.current) return;

    // If note already playing, stop it first to avoid artifacts
    if (activeOscillators.current.has(midiNote)) {
      stopNote(midiNote, true);
    }

    const now = audioCtx.current.currentTime;

    // Create Oscillators
    const osc1 = audioCtx.current.createOscillator();
    const osc2 = audioCtx.current.createOscillator();
    const noise = audioCtx.current.createBufferSource();
    const noiseGain = audioCtx.current.createGain();
    const osc1Gain = audioCtx.current.createGain();
    const osc2Gain = audioCtx.current.createGain();
    const oscGain = audioCtx.current.createGain();
    
    // Effects chain
    const growlNode = audioCtx.current.createWaveShaper();
    const distNode = audioCtx.current.createWaveShaper();
    const fuzzNode = audioCtx.current.createWaveShaper();
    const reverbNode = audioCtx.current.createConvolver();
    const reverbGain = audioCtx.current.createGain();
    const dryGain = audioCtx.current.createGain();
    const wetGain = audioCtx.current.createGain();
    
    // EQ Section
    const lowEq = audioCtx.current.createBiquadFilter();
    const midEq = audioCtx.current.createBiquadFilter();
    const highEq = audioCtx.current.createBiquadFilter();
    
    lowEq.type = 'lowshelf';
    lowEq.frequency.value = 320;
    lowEq.gain.value = settings.eqLow;
    
    midEq.type = 'peaking';
    midEq.frequency.value = 1000;
    midEq.Q.value = 0.5;
    midEq.gain.value = settings.eqMid;
    
    highEq.type = 'highshelf';
    highEq.frequency.value = 3200;
    highEq.gain.value = settings.eqHigh;

    const filter = new MoogFilter(audioCtx.current);

    osc1.type = settings.osc1Wave;
    osc1.frequency.setValueAtTime(frequency, now);
    osc1Gain.gain.setValueAtTime(settings.osc1Enabled ? settings.osc1Gain : 0, now);

    osc2.type = settings.osc2Wave;
    osc2.frequency.setValueAtTime(frequency, now);
    osc2.detune.setValueAtTime(settings.osc2Detune, now);
    osc2Gain.gain.setValueAtTime(settings.osc2Enabled ? settings.osc2Gain : 0, now);

    noise.buffer = noiseBuffer.current;
    noise.loop = true;
    noiseGain.gain.setValueAtTime(settings.noiseLevel, now);

    // Growl/Overdrive logic - more aggressive
    const growlDrive = audioCtx.current.createGain();
    growlDrive.gain.setValueAtTime(1 + settings.growl * 15, now);
    growlNode.curve = makeDistortionCurve(settings.growl);
    
    // Distortion logic
    const distDrive = audioCtx.current.createGain();
    distDrive.gain.setValueAtTime(1 + settings.distortion * 20, now);
    distNode.curve = makeDistortionCurve(settings.distortion);
    
    // Fuzz logic
    const fuzzDrive = audioCtx.current.createGain();
    fuzzDrive.gain.setValueAtTime(1 + settings.fuzz * 50, now);
    fuzzNode.curve = makeFuzzCurve(settings.fuzz);
    
    // Reverb logic
    reverbNode.buffer = createReverbBuffer(audioCtx.current);
    reverbGain.gain.setValueAtTime(settings.reverb, now);

    // ADSR Envelope
    const attackTime = Math.max(0.001, settings.attack);
    const decayTime = Math.max(0.001, settings.decay);
    
    oscGain.gain.setValueAtTime(0, now);
    oscGain.gain.linearRampToValueAtTime(1, now + attackTime);
    oscGain.gain.linearRampToValueAtTime(settings.sustain, now + attackTime + decayTime);

    // Filter Envelope
    const baseCutoff = settings.filterCutoff;
    filter.setFrequency(baseCutoff, now);
    filter.setResonance(settings.filterResonance, now);

    osc1.connect(osc1Gain);
    osc1Gain.connect(oscGain);
    
    osc2.connect(osc2Gain);
    osc2Gain.connect(oscGain);
    
    noise.connect(noiseGain);
    noiseGain.connect(oscGain);
    
    // Connect chain
    let chain: AudioNode = oscGain;
    
    // Effects
    chain.connect(growlDrive);
    growlDrive.connect(growlNode);
    chain = growlNode;
    
    const distIn = audioCtx.current.createGain();
    chain.connect(distIn);
    distIn.connect(distDrive);
    distDrive.connect(distNode);
    chain = distNode;
    
    const fuzzIn = audioCtx.current.createGain();
    chain.connect(fuzzIn);
    fuzzIn.connect(fuzzDrive);
    fuzzDrive.connect(fuzzNode);
    chain = fuzzNode;
    
    // EQ
    chain.connect(lowEq);
    lowEq.connect(midEq);
    midEq.connect(highEq);
    chain = highEq;
    
    // Filter
    chain.connect(filter.getInput());
    
    // Reverb (Parallel)
    filter.connect(dryGain);
    filter.connect(reverbNode);
    reverbNode.connect(reverbGain);
    reverbGain.connect(wetGain);
    
    dryGain.connect(masterGain.current);
    wetGain.connect(masterGain.current);

    osc1.start();
    osc2.start();
    noise.start();

    const voice = { osc1, osc2, noise, gain: oscGain, filter, midiNote };
    allVoices.current.add(voice);
    activeOscillators.current.set(midiNote, voice);
  }, [settings, initAudio, stopNote]);

  const stopAllNotes = useCallback(() => {
    if (masterGain.current && audioCtx.current) {
      const now = audioCtx.current.currentTime;
      // Mute master gain immediately as a safety measure
      masterGain.current.gain.cancelScheduledValues(now);
      masterGain.current.gain.setValueAtTime(0, now);
      
      // Restore master gain after a short delay
      setTimeout(() => {
        if (masterGain.current && audioCtx.current) {
          masterGain.current.gain.setTargetAtTime(0.3, audioCtx.current.currentTime, 0.05);
        }
      }, 300);
    }

    // Stop EVERY voice in the set to kill zombie voices
    allVoices.current.forEach(voice => {
      try {
        voice.osc1.stop();
        voice.osc2.stop();
        voice.noise.stop();
        voice.osc1.disconnect();
        voice.osc2.disconnect();
        voice.noise.disconnect();
        voice.gain.disconnect();
      } catch (e) {
        // Already stopped
      }
    });

    allVoices.current.clear();
    activeOscillators.current.clear();
  }, []);

  return { playNote, stopNote, stopAllNotes, getAnalyser: () => analyser.current };
};
