// hooks/useSound.ts
import * as Audio from 'expo-av';
import { useRef, useCallback } from 'react';

export function useSound() {
  const soundRef = useRef<Audio.Sound | null>(null);

  const play = useCallback(async (file: any, volume: number = 0.7) => {
    try {
      if (soundRef.current) {
        await soundRef.current.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync(file, {
        shouldPlay: true,
        volume,
        rate: 1.0,
        pitchCorrectionQuality: Audio.PitchCorrectionQuality.High,
      });

      soundRef.current = sound;

      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
    } catch (e) {
      console.log('Sound error:', e);
    }
  }, []);

  return { play };
}