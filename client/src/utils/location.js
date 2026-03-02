import * as Location from 'expo-location';
import * as Linking from 'expo-linking';

// Get user's current location
export const getCurrentLocation = async () => {
  try {
    const { status } = await Location.requestForegroundPermissionsAsync();
    
    if (status !== 'granted') {
      throw new Error('Location permission denied');
    }

    const location = await Location.getCurrentPositionAsync({
      accuracy: Location.Accuracy.High,
    });

    return {
      latitude: location.coords.latitude,
      longitude: location.coords.longitude,
      altitude: location.coords.altitude,
      accuracy: location.coords.accuracy,
    };
  } catch (error) {
    console.error('Location error:', error);
    throw error;
  }
};

// Share location via SMS (mock)
export const shareLocation = async (phoneNumber, latitude, longitude) => {
  try {
    const message = `I'm at: https://maps.google.com/?q=${latitude},${longitude}`;
    const encodedMessage = encodeURIComponent(message);
    const url = `sms:${phoneNumber}?body=${encodedMessage}`;
    
    await Linking.openURL(url);
  } catch (error) {
    console.error('Share location error:', error);
    throw error;
  }
};

// Call emergency number
export const callEmergency = (phoneNumber = '108') => {
  try {
    Linking.openURL(`tel:${phoneNumber}`);
  } catch (error) {
    console.error('Call error:', error);
    throw error;
  }
};

// Format location URL
export const getLocationUrl = (latitude, longitude) => {
  return `https://maps.google.com/?q=${latitude},${longitude}`;
};

// Calculate distance between two coordinates (Haversine formula)
export const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Radius of the Earth in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};
