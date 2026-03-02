import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  Modal,
  Alert,
  ActivityIndicator,
  SafeAreaView,
} from 'react-native';
import { useFallDetection } from '../hooks/useFallDetection';
import { getCurrentLocation, callEmergency } from '../utils/location';
import { triggerEmergency } from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Button, colors, Card } from '../components/UI';

export const HomeScreen = () => {
  const [sosPressed, setSosPressed] = useState(false);
  const [pressTime, setPressTime] = useState(0);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [emergencyTriggered, setEmergencyTriggered] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fallDetectionActive, setFallDetectionActive] = useState(false);
  const pressTimerRef = useRef(null);
  
  const { user } = useAuth();
  const { fallDetected, resetFallDetection } = useFallDetection(true);

  // Handle fall detection
  useEffect(() => {
    if (fallDetected) {
      showFallDetectionModal();
    }
  }, [fallDetected]);

  const handleSOSPressIn = () => {
    setSosPressed(true);
    setPressTime(0);

    pressTimerRef.current = setInterval(() => {
      setPressTime((prev) => prev + 1);
    }, 100);
  };

  const handleSOSPressOut = () => {
    setSosPressed(false);
    if (pressTimerRef.current) {
      clearInterval(pressTimerRef.current);
    }

    // If held for 3 seconds (30 * 100ms)
    if (pressTime >= 30) {
      triggerSOSAlert();
    }

    setPressTime(0);
  };

  const triggerSOSAlert = async () => {
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await triggerEmergency('manual', location.latitude, location.longitude);
      
      setShowConfirmation(true);
      setEmergencyTriggered(true);
      
      // Call 108 automatically
      callEmergency('108');
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger SOS. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const showFallDetectionModal = () => {
    setFallDetectionActive(true);
  };

  const handleFallDetectionYes = async () => {
    setFallDetectionActive(false);
    setLoading(true);
    try {
      const location = await getCurrentLocation();
      await triggerEmergency('fall', location.latitude, location.longitude);
      setEmergencyTriggered(true);
      callEmergency('108');
    } catch (error) {
      Alert.alert('Error', 'Failed to trigger emergency');
    } finally {
      setLoading(false);
      resetFallDetection();
    }
  };

  const handleFallDetectionNo = () => {
    setFallDetectionActive(false);
    resetFallDetection();
  };

  const sosPercentage = Math.min((pressTime / 30) * 100, 100);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.greeting}>Hello, {user?.name || 'User'}</Text>
        <Text style={styles.subtext}>Stay safe today</Text>
      </View>

      <View style={styles.sosContainer}>
        <Pressable
          onPressIn={handleSOSPressIn}
          onPressOut={handleSOSPressOut}
          style={[
            styles.sosButton,
            sosPressed && styles.sosButtonPressed,
            emergencyTriggered && styles.sosButtonTriggered,
          ]}
        >
          <Text style={styles.sosText}>SOS</Text>
          {sosPressed && <Text style={styles.pressText}>{Math.round(sosPercentage)}%</Text>}
        </Pressable>
        <Text style={styles.sosHint}>Hold for 3 seconds to activate</Text>
      </View>

      <View style={styles.quickActions}>
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          <Pressable
            style={styles.actionButton}
            onPress={() => callEmergency('108')}
          >
            <Text style={styles.actionIcon}>📞</Text>
            <Text style={styles.actionLabel}>Call 108</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => triggerSOSAlert()}
          >
            <Text style={styles.actionIcon}>📍</Text>
            <Text style={styles.actionLabel}>Share Location</Text>
          </Pressable>

          <Pressable
            style={styles.actionButton}
            onPress={() => triggerSOSAlert()}
          >
            <Text style={styles.actionIcon}>🚨</Text>
            <Text style={styles.actionLabel}>Alert Contacts</Text>
          </Pressable>
        </View>
      </View>

      {/* Fall Detection Modal */}
      <Modal visible={fallDetectionActive} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Fall Detected!</Text>
            <Text style={styles.modalText}>Are you safe?</Text>

            <View style={styles.countdownContainer}>
              <Text style={styles.countdownText}>Auto-triggering in 5s...</Text>
            </View>

            <View style={styles.modalButtons}>
              <Button
                label="I'm Safe"
                onPress={handleFallDetectionNo}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                label="Trigger SOS"
                onPress={handleFallDetectionYes}
                loading={loading}
                style={{ flex: 1, marginLeft: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* Confirmation Modal */}
      <Modal visible={showConfirmation} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationContent}>
            <Text style={styles.confirmIcon}>✓</Text>
            <Text style={styles.confirmTitle}>Emergency Triggered</Text>
            <Text style={styles.confirmText}>Emergency services have been notified</Text>
            <Text style={styles.confirmText}>Your location is being shared</Text>

            <Button
              label="Close"
              onPress={() => {
                setShowConfirmation(false);
                setEmergencyTriggered(false);
              }}
              style={styles.confirmButton}
            />
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
    paddingHorizontal: 20,
  },
  header: {
    marginTop: 20,
    marginBottom: 40,
  },
  greeting: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtext: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  sosContainer: {
    alignItems: 'center',
    marginBottom: 60,
  },
  sosButton: {
    width: 180,
    height: 180,
    borderRadius: 90,
    backgroundColor: colors.light,
    borderWidth: 3,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  sosButtonPressed: {
    backgroundColor: colors.red,
    borderColor: colors.red,
    transform: [{ scale: 0.95 }],
  },
  sosButtonTriggered: {
    backgroundColor: colors.green,
    borderColor: colors.green,
  },
  sosText: {
    fontSize: 48,
    fontWeight: 'bold',
    color: colors.primary,
  },
  pressText: {
    fontSize: 16,
    color: colors.red,
    marginTop: 8,
    fontWeight: '600',
  },
  sosHint: {
    fontSize: 12,
    color: colors.secondary,
    textAlign: 'center',
  },
  quickActions: {
    marginBottom: 40,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 12,
  },
  actionsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  actionButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 8,
    backgroundColor: colors.light,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
  },
  actionIcon: {
    fontSize: 24,
    marginBottom: 4,
  },
  actionLabel: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    minWidth: 280,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.red,
    marginBottom: 8,
  },
  modalText: {
    fontSize: 16,
    color: colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  countdownContainer: {
    marginBottom: 16,
    padding: 12,
    backgroundColor: colors.light,
    borderRadius: 8,
    width: '100%',
  },
  countdownText: {
    fontSize: 14,
    color: colors.secondary,
    textAlign: 'center',
    fontWeight: '600',
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    width: '100%',
  },
  confirmationContent: {
    backgroundColor: colors.white,
    borderRadius: 16,
    padding: 32,
    alignItems: 'center',
    minWidth: 280,
  },
  confirmIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  confirmTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.green,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmText: {
    fontSize: 14,
    color: colors.secondary,
    marginBottom: 8,
    textAlign: 'center',
  },
  confirmButton: {
    marginTop: 16,
    width: '100%',
  },
});
