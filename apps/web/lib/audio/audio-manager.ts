"use client";

type SoundType = "new-ticket" | "rush-ticket" | "eighty-six" | "bump";

interface AudioManagerState {
  enabled: boolean;
  volume: number;
  audioContext: AudioContext | null;
  buffers: Map<SoundType, AudioBuffer>;
  initialized: boolean;
}

const SOUND_URLS: Record<SoundType, string> = {
  "new-ticket": "/sounds/new-ticket.mp3",
  "rush-ticket": "/sounds/rush-ticket.mp3",
  "eighty-six": "/sounds/eighty-six.mp3",
  "bump": "/sounds/bump.mp3",
};

// Fallback: Generate simple beep tones using Web Audio API
function generateTone(
  context: AudioContext,
  frequency: number,
  duration: number,
  type: OscillatorType = "sine"
): AudioBuffer {
  const sampleRate = context.sampleRate;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Apply envelope for smoother sound
    const envelope = Math.min(1, 10 * t) * Math.min(1, 5 * (duration - t));
    data[i] = envelope * Math.sin(2 * Math.PI * frequency * t) * 0.3;
  }

  return buffer;
}

function generateDoubleBeep(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const beepDuration = 0.1;
  const gap = 0.05;
  const totalDuration = beepDuration * 2 + gap;
  const length = sampleRate * totalDuration;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  const frequency = 880; // A5

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    let value = 0;

    // First beep
    if (t < beepDuration) {
      const envelope = Math.min(1, 20 * t) * Math.min(1, 20 * (beepDuration - t));
      value = envelope * Math.sin(2 * Math.PI * frequency * t);
    }
    // Second beep
    else if (t > beepDuration + gap && t < totalDuration) {
      const t2 = t - beepDuration - gap;
      const envelope = Math.min(1, 20 * t2) * Math.min(1, 20 * (beepDuration - t2));
      value = envelope * Math.sin(2 * Math.PI * frequency * t2);
    }

    data[i] = value * 0.3;
  }

  return buffer;
}

function generateWarningTone(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = 0.3;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    // Descending frequency for warning effect
    const frequency = 600 - 200 * (t / duration);
    const envelope = Math.min(1, 10 * t) * Math.min(1, 10 * (duration - t));
    data[i] = envelope * Math.sin(2 * Math.PI * frequency * t) * 0.4;
  }

  return buffer;
}

function generateSoftClick(context: AudioContext): AudioBuffer {
  const sampleRate = context.sampleRate;
  const duration = 0.05;
  const length = sampleRate * duration;
  const buffer = context.createBuffer(1, length, sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < length; i++) {
    const t = i / sampleRate;
    const envelope = Math.exp(-t * 50);
    data[i] = envelope * Math.sin(2 * Math.PI * 1000 * t) * 0.2;
  }

  return buffer;
}

class AudioManager {
  private state: AudioManagerState = {
    enabled: true,
    volume: 0.7,
    audioContext: null,
    buffers: new Map(),
    initialized: false,
  };

  private initPromise: Promise<void> | null = null;

  async initialize(): Promise<void> {
    if (this.state.initialized) return;
    if (this.initPromise) return this.initPromise;

    this.initPromise = this._doInitialize();
    return this.initPromise;
  }

  private async _doInitialize(): Promise<void> {
    if (typeof window === "undefined") return;

    try {
      // Create AudioContext (may need user interaction first)
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.state.audioContext = new AudioContextClass();

      // Try to load MP3 files, fall back to generated tones
      await this.loadSounds();

      this.state.initialized = true;
    } catch (error) {
      console.warn("AudioManager initialization failed:", error);
      // Generate fallback sounds
      this.generateFallbackSounds();
      this.state.initialized = true;
    }
  }

  private async loadSounds(): Promise<void> {
    if (!this.state.audioContext) return;

    const loadPromises = Object.entries(SOUND_URLS).map(async ([type, url]) => {
      try {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load ${url}`);
        const arrayBuffer = await response.arrayBuffer();
        const audioBuffer = await this.state.audioContext!.decodeAudioData(arrayBuffer);
        this.state.buffers.set(type as SoundType, audioBuffer);
      } catch (error) {
        console.warn(`Failed to load sound ${type}, using fallback:`, error);
        this.generateFallbackSound(type as SoundType);
      }
    });

    await Promise.allSettled(loadPromises);
  }

  private generateFallbackSounds(): void {
    if (!this.state.audioContext) return;

    (Object.keys(SOUND_URLS) as SoundType[]).forEach((type) => {
      this.generateFallbackSound(type);
    });
  }

  private generateFallbackSound(type: SoundType): void {
    if (!this.state.audioContext) return;

    let buffer: AudioBuffer;
    switch (type) {
      case "new-ticket":
        buffer = generateTone(this.state.audioContext, 880, 0.15); // A5
        break;
      case "rush-ticket":
        buffer = generateDoubleBeep(this.state.audioContext);
        break;
      case "eighty-six":
        buffer = generateWarningTone(this.state.audioContext);
        break;
      case "bump":
        buffer = generateSoftClick(this.state.audioContext);
        break;
    }
    this.state.buffers.set(type, buffer);
  }

  async playSound(type: SoundType): Promise<void> {
    if (!this.state.enabled) return;

    // Initialize on first play (needs user interaction)
    if (!this.state.initialized) {
      await this.initialize();
    }

    if (!this.state.audioContext) return;

    // Resume context if suspended (happens after page load without interaction)
    if (this.state.audioContext.state === "suspended") {
      await this.state.audioContext.resume();
    }

    const buffer = this.state.buffers.get(type);
    if (!buffer) {
      console.warn(`Sound not found: ${type}`);
      return;
    }

    try {
      const source = this.state.audioContext.createBufferSource();
      const gainNode = this.state.audioContext.createGain();

      source.buffer = buffer;
      gainNode.gain.value = this.state.volume;

      source.connect(gainNode);
      gainNode.connect(this.state.audioContext.destination);

      source.start(0);
    } catch (error) {
      console.warn(`Failed to play sound ${type}:`, error);
    }
  }

  setEnabled(enabled: boolean): void {
    this.state.enabled = enabled;
  }

  isEnabled(): boolean {
    return this.state.enabled;
  }

  setVolume(volume: number): void {
    this.state.volume = Math.max(0, Math.min(1, volume));
  }

  getVolume(): number {
    return this.state.volume;
  }

  // Preload sounds (call after user interaction)
  async preload(): Promise<void> {
    await this.initialize();
  }
}

// Singleton instance
export const audioManager = new AudioManager();

// React hook for audio
import { useCallback, useEffect, useState } from "react";

export function useAudio() {
  const [enabled, setEnabledState] = useState(audioManager.isEnabled());
  const [volume, setVolumeState] = useState(audioManager.getVolume());

  useEffect(() => {
    // Preload on mount (after user has interacted with page)
    const handleInteraction = () => {
      audioManager.preload();
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };

    document.addEventListener("click", handleInteraction);
    document.addEventListener("touchstart", handleInteraction);

    return () => {
      document.removeEventListener("click", handleInteraction);
      document.removeEventListener("touchstart", handleInteraction);
    };
  }, []);

  const playSound = useCallback((type: SoundType) => {
    audioManager.playSound(type);
  }, []);

  const setEnabled = useCallback((value: boolean) => {
    audioManager.setEnabled(value);
    setEnabledState(value);
  }, []);

  const setVolume = useCallback((value: number) => {
    audioManager.setVolume(value);
    setVolumeState(value);
  }, []);

  return {
    enabled,
    volume,
    playSound,
    setEnabled,
    setVolume,
  };
}
