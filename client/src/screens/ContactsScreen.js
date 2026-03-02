import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Modal,
  Alert,
  SafeAreaView,
  Pressable,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import * as API from '../api/endpoints';
import { Button, colors, Card } from '../components/UI';
import { TextInputField, SelectField } from '../components/FormFields';

export const ContactsScreen = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [priority, setPriority] = useState('1');
  const [tag, setTag] = useState('Secondary');
  const [actionLoading, setActionLoading] = useState(false);

  // Fetch contacts on mount
  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      setLoading(true);
      const response = await API.getContacts();
      setContacts(response.data.contacts);
    } catch (error) {
      Alert.alert('Error', 'Failed to fetch contacts');
    } finally {
      setLoading(false);
    }
  };

  const handleAddContact = async () => {
    if (!name || !phone) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }

    setActionLoading(true);
    try {
      if (editingId) {
        await API.updateContact(editingId, name, phone, parseInt(priority), tag);
        Alert.alert('Success', 'Contact updated');
      } else {
        await API.createContact(name, phone, parseInt(priority), tag);
        Alert.alert('Success', 'Contact added');
      }
      resetForm();
      setShowAddModal(false);
      fetchContacts();
    } catch (error) {
      Alert.alert('Error', 'Failed to save contact');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEditContact = (contact) => {
    setEditingId(contact._id);
    setName(contact.name);
    setPhone(contact.phone);
    setPriority(contact.priority.toString());
    setTag(contact.tag);
    setShowAddModal(true);
  };

  const handleDeleteContact = (id) => {
    Alert.alert('Delete Contact', 'Are you sure?', [
      { text: 'Cancel' },
      {
        text: 'Delete',
        onPress: async () => {
          try {
            await API.deleteContact(id);
            fetchContacts();
            Alert.alert('Success', 'Contact deleted');
          } catch (error) {
            Alert.alert('Error', 'Failed to delete contact');
          }
        },
        style: 'destructive',
      },
    ]);
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setPhone('');
    setPriority('1');
    setTag('Secondary');
  };

  const tagOptions = [
    { label: 'Primary', value: 'Primary' },
    { label: 'Secondary', value: 'Secondary' },
    { label: 'Emergency', value: 'Emergency' },
  ];

  const priorityOptions = [
    { label: '1 - Highest', value: '1' },
    { label: '2', value: '2' },
    { label: '3 - Lowest', value: '3' },
  ];

  const renderContact = ({ item }) => (
    <Card style={styles.contactCard}>
      <View style={styles.contactHeader}>
        <View style={{ flex: 1 }}>
          <Text style={styles.contactName}>{item.name}</Text>
          <Text style={styles.contactPhone}>{item.phone}</Text>
        </View>
        <View style={styles.tagBadge}>
          <Text style={styles.tagText}>{item.tag}</Text>
        </View>
      </View>
      <View style={styles.contactActions}>
        <Pressable
          style={styles.actionButton}
          onPress={() => handleEditContact(item)}
        >
          <Text style={styles.actionButtonText}>Edit</Text>
        </Pressable>
        <Pressable
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => handleDeleteContact(item._id)}
        >
          <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
        </Pressable>
      </View>
    </Card>
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Emergency Contacts</Text>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : contacts.length === 0 ? (
        <View style={styles.centerContainer}>
          <Text style={styles.emptyText}>No contacts added yet</Text>
          <Button
            label="Add First Contact"
            onPress={() => {
              resetForm();
              setShowAddModal(true);
            }}
            style={{ marginTop: 16 }}
          />
        </View>
      ) : (
        <FlatList
          data={contacts}
          renderItem={renderContact}
          keyExtractor={(item) => item._id}
          scrollEnabled={true}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* Add/Edit Modal */}
      <Modal visible={showAddModal} transparent animationType="slide">
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {editingId ? 'Edit Contact' : 'Add Contact'}
            </Text>

            <TextInputField
              label="Name"
              placeholder="Contact name"
              value={name}
              onChangeText={setName}
            />

            <TextInputField
              label="Phone"
              placeholder="+91 XXXXX XXXXX"
              value={phone}
              onChangeText={setPhone}
              keyboardType="phone-pad"
            />

            <SelectField
              label="Priority"
              selectedValue={priority}
              onSelect={setPriority}
              options={priorityOptions}
            />

            <SelectField
              label="Tag"
              selectedValue={tag}
              onSelect={setTag}
              options={tagOptions}
            />

            <View style={styles.modalButtons}>
              <Button
                label="Cancel"
                onPress={() => {
                  setShowAddModal(false);
                  resetForm();
                }}
                variant="secondary"
                style={{ flex: 1 }}
              />
              <Button
                label="Save"
                onPress={handleAddContact}
                loading={actionLoading}
                style={{ flex: 1, marginLeft: 12 }}
              />
            </View>
          </View>
        </View>
      </Modal>

      {/* FAB */}
      <Pressable
        style={styles.fab}
        onPress={() => {
          resetForm();
          setShowAddModal(true);
        }}
      >
        <Text style={styles.fabText}>+</Text>
      </Pressable>
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: colors.secondary,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingVertical: 12,
  },
  contactCard: {
    marginBottom: 12,
  },
  contactHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  contactName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.primary,
  },
  contactPhone: {
    fontSize: 14,
    color: colors.secondary,
    marginTop: 4,
  },
  tagBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.light,
    borderRadius: 4,
  },
  tagText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  contactActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: colors.light,
    borderRadius: 6,
    alignItems: 'center',
  },
  deleteButton: {
    borderWidth: 1,
    borderColor: colors.red,
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.primary,
  },
  deleteButtonText: {
    color: colors.red,
  },
  fab: {
    position: 'absolute',
    bottom: 30,
    right: 30,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 28,
    color: colors.white,
    fontWeight: 'bold',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: colors.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    minHeight: '70%',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    marginBottom: 20,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
});
