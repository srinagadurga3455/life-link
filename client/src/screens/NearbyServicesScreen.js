import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  SafeAreaView,
  Linking,
} from 'react-native';
import { Button, colors, Card } from '../components/UI';
import { callEmergency } from '../utils/location';

export const NearbyServicesScreen = () => {
  const [selectedFilter, setSelectedFilter] = useState('all');

  // Dummy services data
  const services = [
    {
      id: 1,
      name: 'City General Hospital',
      type: 'hospital',
      distance: '0.8 km',
      address: '123 Medical Street',
      phone: '+91 98765 43210',
      rating: 4.5,
    },
    {
      id: 2,
      name: 'Apollo Clinic',
      type: 'hospital',
      distance: '1.1 km',
      address: '456 Health Avenue',
      phone: '+91 98765 43211',
      rating: 4.8,
    },
    {
      id: 3,
      name: 'Main Police Station',
      type: 'police',
      distance: '0.5 km',
      address: '789 Security Lane',
      phone: '+91 98765 43212',
      rating: 4.2,
    },
    {
      id: 4,
      name: 'MedPlus Pharmacy',
      type: 'pharmacy',
      distance: '0.3 km',
      address: '321 Medicine Street',
      phone: '+91 98765 43213',
      rating: 4.6,
    },
    {
      id: 5,
      name: 'Quick Clinic',
      type: 'hospital',
      distance: '1.5 km',
      address: '654 Care Boulevard',
      phone: '+91 98765 43214',
      rating: 4.3,
    },
    {
      id: 6,
      name: 'Central Fire Station',
      type: 'emergency',
      distance: '1.2 km',
      address: '987 Emergency Street',
      phone: '+91 98765 43215',
      rating: 4.7,
    },
  ];

  const filters = [
    { id: 'all', label: 'All' },
    { id: 'hospital', label: 'Hospitals' },
    { id: 'police', label: 'Police' },
    { id: 'pharmacy', label: 'Pharmacies' },
    { id: 'emergency', label: 'Emergency' },
  ];

  const filteredServices =
    selectedFilter === 'all'
      ? services
      : services.filter((s) => s.type === selectedFilter);

  const getTypeIcon = (type) => {
    const icons = {
      hospital: '🏥',
      police: '🚔',
      pharmacy: '💊',
      emergency: '🚨',
    };
    return icons[type] || '📍';
  };

  const renderService = (service) => (
    <Card key={service.id} style={styles.serviceCard}>
      <View style={styles.serviceHeader}>
        <View style={{ flex: 1 }}>
          <View style={styles.serviceTitleRow}>
            <Text style={styles.serviceIcon}>{getTypeIcon(service.type)}</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.serviceName}>{service.name}</Text>
              <Text style={styles.serviceDistance}>{service.distance}</Text>
            </View>
          </View>
          <Text style={styles.serviceAddress}>{service.address}</Text>
        </View>
        <View style={styles.ratingBadge}>
          <Text style={styles.ratingText}>{service.rating}</Text>
        </View>
      </View>
      <View style={styles.serviceFooter}>
        <Pressable
          style={styles.callButton}
          onPress={() => Linking.openURL(`tel:${service.phone}`)}
        >
          <Text style={styles.callButtonIcon}>☎️</Text>
          <Text style={styles.callButtonText}>Call</Text>
        </Pressable>
        <Text style={styles.servicePhone}>{service.phone}</Text>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Nearby Services</Text>
        <Text style={styles.subtitle}>Quick access to emergency services</Text>
      </View>

      {/* Filter Buttons */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.filterScroll}
        contentContainerStyle={styles.filterContent}
      >
        {filters.map((filter) => (
          <Pressable
            key={filter.id}
            onPress={() => setSelectedFilter(filter.id)}
            style={[
              styles.filterButton,
              selectedFilter === filter.id && styles.filterButtonActive,
            ]}
          >
            <Text
              style={[
                styles.filterText,
                selectedFilter === filter.id && styles.filterTextActive,
              ]}
            >
              {filter.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {/* Map Preview (Placeholder) */}
      <View style={styles.mapPreview}>
        <Text style={styles.mapIcon}>🗺️</Text>
        <Text style={styles.mapText}>Map View</Text>
        <Text style={styles.mapSubtext}>
          {filteredServices.length} services nearby
        </Text>
      </View>

      {/* Services List */}
      <ScrollView style={styles.servicesList} showsVerticalScrollIndicator={false}>
        <View style={styles.servicesContent}>
          <Text style={styles.resultsTitle}>Results ({filteredServices.length})</Text>
          {filteredServices.map(renderService)}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.white,
  },
  header: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  subtitle: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  filterScroll: {
    maxHeight: 50,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterContent: {
    paddingHorizontal: 20,
    paddingVertical: 8,
    gap: 8,
  },
  filterButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: colors.light,
    borderWidth: 1,
    borderColor: colors.border,
  },
  filterButtonActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  filterText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  filterTextActive: {
    color: colors.white,
  },
  mapPreview: {
    height: 120,
    margin: 20,
    backgroundColor: colors.light,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mapIcon: {
    fontSize: 40,
    marginBottom: 8,
  },
  mapText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.primary,
  },
  mapSubtext: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
  },
  servicesList: {
    flex: 1,
  },
  servicesContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  resultsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 12,
  },
  serviceCard: {
    marginBottom: 12,
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  serviceTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  serviceIcon: {
    fontSize: 20,
    marginRight: 8,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '600',
    color: colors.primary,
  },
  serviceDistance: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  serviceAddress: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 4,
    marginLeft: 28,
  },
  ratingBadge: {
    backgroundColor: colors.light,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    height: 'fit-content',
  },
  ratingText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  serviceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  callButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 10,
    backgroundColor: colors.light,
    borderRadius: 6,
  },
  callButtonIcon: {
    fontSize: 14,
    marginRight: 4,
  },
  callButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  servicePhone: {
    fontSize: 12,
    color: colors.secondary,
    flex: 1,
    marginLeft: 12,
  },
});
