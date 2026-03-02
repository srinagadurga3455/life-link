import { useEffect, useState, useRef } from 'react';
import { Accelerometer } from 'expo-sensors';

// Custom hook for fall detection
export const useFallDetection = (enabled = true) => {
  const [accelerationData, setAccelerationData] = useState({ x: 0, y: 0, z: 0 });
  const [fallDetected, setFallDetected] = useState(false);
  const motionlessTimeRef = useRef(0);
  const lastSpikeTriggerRef = useRef(0);

  useEffect(() => {
    if (!enabled) return;

    // Set accelerometer update interval to 100ms
    Accelerometer.setUpdateInterval(100);

    const subscription = Accelerometer.addListener((data) => {
      setAccelerationData(data);

      // Calculate total acceleration magnitude
      const magnitude = Math.sqrt(data.x ** 2 + data.y ** 2 + data.z ** 2);

      // Gravity is approximately 9.8 m/s^2
      const g = 9.8;
      const accelerationThreshold = 2.5 * g;

      // Check if spike detected (acceleration > 2.5g)
      if (magnitude > accelerationThreshold) {
        // Spike detected, mark the time
        lastSpikeTriggerRef.current = Date.now();

        // Start counting motionless time
        motionlessTimeRef.current = 0;
      } else {
        // No motion, increment time
        if (lastSpikeTriggerRef.current > 0) {
          const timeSinceSpike = Date.now() - lastSpikeTriggerRef.current;

          // If no movement for 1-2 seconds after spike, trigger fall detection
          if (timeSinceSpike > 1500 && timeSinceSpike < 2500 && magnitude < g * 0.5) {
            setFallDetected(true);
            lastSpikeTriggerRef.current = 0; // Reset
          }
        }
      }
    });

    return () => {
      subscription.remove();
    };
  }, [enabled]);

  const resetFallDetection = () => {
    setFallDetected(false);
    lastSpikeTriggerRef.current = 0;
    motionlessTimeRef.current = 0;
  };

  return {
    fallDetected,
    accelerationData,
    resetFallDetection,
  };
};
