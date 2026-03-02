import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Switch,
  Alert,
  SafeAreaView,
  ActivityIndicator,
} from 'react-native';
import * as API from '../api/endpoints';
import { useAuth } from '../context/AuthContext';
import { Button, colors, Card } from '../components/UI';
import { TextInputField, SelectField } from '../components/FormFields';

export const ProfileScreen = ({ navigation }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editMode, setEditMode] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [sex, setSex] = useState('');
  const [age, setAge] = useState('');
  const [healthCondition, setHealthCondition] = useState('');
  const [bloodGroup, setBloodGroup] = useState('');
  const [fallDetectionEnabled, setFallDetectionEnabled] = useState(true);
  const [pushNotificationsEnabled, setPushNotificationsEnabled] = useState(true);

  // Fetch user profile on mount
  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await API.getUserProfile();
      const { user: userData } = response.data;

      setName(userData.name || '');
      setSex(userData.sex || '');
      setAge(userData.age?.toString() || '');
      setHealthCondition(userData.healthCondition || '');
      setBloodGroup(userData.bloodGroup || '');
      setFallDetectionEnabled(userData.fallDetectionEnabled ?? true);
      setPushNotificationsEnabled(userData.pushNotificationsEnabled ?? true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load profile');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProfile = async () => {
    setSaving(true);
    try {
      await API.updateUserProfile({
        name,
        sex,
        age: age ? parseInt(age) : undefined,
        healthCondition,
        bloodGroup,
        fallDetectionEnabled,
        pushNotificationsEnabled,
      });
      Alert.alert('Success', 'Profile updated successfully');
      setEditMode(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel' },
      {
        text: 'Logout',
        onPress: async () => {
          const result = await logout();
          if (result.success) {
            navigation.reset({
              index: 0,
              routes: [{ name: 'Login' }],
            });
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const sexOptions = [
    { label: 'Male', value: 'Male' },
    { label: 'Female', value: 'Female' },
    { label: 'Other', value: 'Other' },
  ];

  const bloodGroupOptions = [
    { label: 'O+', value: 'O+' },
    { label: 'O-', value: 'O-' },
    { label: 'A+', value: 'A+' },
    { label: 'A-', value: 'A-' },
    { label: 'B+', value: 'B+' },
    { label: 'B-', value: 'B-' },
    { label: 'AB+', value: 'AB+' },
    { label: 'AB-', value: 'AB-' },
  ];

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {user?.name?.[0]?.toUpperCase() || 'U'}
            </Text>
          </View>
          <Text style={styles.userName}>{user?.name || 'User Name'}</Text>
          <Text style={styles.userPhone}>{user?.phone || '+91 XXXXX XXXXX'}</Text>
        </View>

        <View style={styles.content}>
          {/* Profile Information Card */}
          <Card>
            <View style={styles.cardHeader}>
              <Text style={styles.cardTitle}>Personal Information</Text>
              <Pressable
                onPress={() => {
                  setEditMode(!editMode);
                  if (editMode) {
                    fetchProfile();
                  }
                }}
              >
                <Text style={styles.editButton}>{editMode ? 'Cancel' : 'Edit'}</Text>
              </Pressable>
            </View>

            {editMode ? (
              <View style={styles.editForm}>
                <TextInputField
                  label="Full Name"
                  placeholder="Your name"
                  value={name}
                  onChangeText={setName}
                  editable={false}
                />

                <SelectField
                  label="Sex"
                  selectedValue={sex}
                  onSelect={setSex}
                  options={sexOptions}
                />

                <TextInputField
                  label="Age"
                  placeholder="Enter your age"
                  value={age}
                  onChangeText={setAge}
                  keyboardType="numeric"
                />

                <TextInputField
                  label="Health Condition"
                  placeholder="e.g., Diabetes - Type II"
                  value={healthCondition}
                  onChangeText={setHealthCondition}
                />

                <SelectField
                  label="Blood Group"
                  selectedValue={bloodGroup}
                  onSelect={setBloodGroup}
                  options={bloodGroupOptions}
                />

                <Button
                  label="Save Changes"
                  onPress={handleSaveProfile}
                  loading={saving}
                  size="lg"
                  style={styles.saveButton}
                />
              </View>
            ) : (
              <View style={styles.infoSection}>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Sex</Text>
                  <Text style={styles.infoValue}>{sex || 'Not specified'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Age</Text>
                  <Text style={styles.infoValue}>{age || 'Not specified'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Health Condition</Text>
                  <Text style={styles.infoValue}>{healthCondition || 'None'}</Text>
                </View>
                <View style={styles.infoRow}>
                  <Text style={styles.infoLabel}>Blood Group</Text>
                  <Text style={styles.infoValue}>{bloodGroup || 'Not specified'}</Text>
                </View>
              </View>
            )}
          </Card>

          {/* Safety Settings Card */}
          <Card>
            <Text style={styles.cardTitle}>Safety Settings</Text>

            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Fall Detection</Text>
                <Text style={styles.settingDescription}>
                  Automatically detect falls and trigger SOS
                </Text>
              </View>
              <Switch
                value={fallDetectionEnabled}
                onValueChange={setFallDetectionEnabled}
              />
            </View>

            <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
              <View style={styles.settingInfo}>
                <Text style={styles.settingLabel}>Push Notifications</Text>
                <Text style={styles.settingDescription}>Receive app notifications</Text>
              </View>
              <Switch
                value={pushNotificationsEnabled}
                onValueChange={setPushNotificationsEnabled}
              />
            </View>

            {editMode === false && (
              <Button
                label="Save Settings"
                onPress={handleSaveProfile}
                loading={saving}
                size="lg"
                style={styles.settingsSaveButton}
              />
            )}
          </Card>

          {/* Account Actions */}
          <View style={styles.actionsSection}>
            <Button
              label="Logout"
              onPress={handleLogout}
              variant="secondary"
              size="lg"
              style={styles.logoutButton}
            />
          </View>

          {/* App Info */}
          <View style={styles.appInfo}>
            <Text style={styles.appInfoText}>Smart SOS+ v1.0.0</Text>
            <Text style={styles.appInfoSubtext}>Always stay safe</Text>
          </View>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    paddingVertical: 24,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: colors.light,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  avatarText: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userName: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
  },
  userPhone: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  content: {
    padding: 20,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.primary,
  },
  editButton: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  editForm: {
    gap: 4,
  },
  saveButton: {
    marginTop: 8,
  },
  infoSection: {
    gap: 0,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
  },
  infoValue: {
    fontSize: 14,
    fontWeight: '500',
    color: colors.primary,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flex: 1,
    marginRight: 12,
  },
  settingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.primary,
  },
  settingDescription: {
    fontSize: 12,
    color: colors.secondary,
    marginTop: 2,
  },
  settingsSaveButton: {
    marginTop: 12,
  },
  actionsSection: {
    marginBottom: 20,
  },
  logoutButton: {
    marginTop: 0,
  },
  appInfo: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  appInfoText: {
    fontSize: 12,
    color: colors.secondary,
    fontWeight: '600',
  },
  appInfoSubtext: {
    fontSize: 11,
    color: colors.secondary,
    marginTop: 4,
  },
});
