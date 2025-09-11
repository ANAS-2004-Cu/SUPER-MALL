import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack, router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, RefreshControl, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { auth, getDocument, updateDocument } from '../../Firebase/Firebase';
import AddressModal from '../../components/AddressModal';
import DeleteModal from '../../components/DeleteModal';
import MiniAlert from '../../components/MiniAlert';

interface Address {
  id: string;
  FullName: string;
  Street: string;
  City: string;
  State: string;
  ZIP: string;
  Phone: string;
  isDefault: boolean;
}

interface AddressCardProps {
  address: Address;
  onEdit: (address: Address) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

const AddressCard: React.FC<AddressCardProps> = ({ address, onEdit, onDelete, onSetDefault }) => {
  return (
    <View style={styles.addressCard}>
      <View style={styles.addressContent}>
        <View style={styles.addressHeader}>
          <Text style={styles.addressName}>{address.FullName}</Text>
          {address.isDefault && (
            <View style={styles.defaultBadge}>
              <Text style={styles.defaultText}>Default</Text>
            </View>
          )}
        </View>

        <Text style={styles.addressDetail}>{address.Street}</Text>
        <Text style={styles.addressDetail}>{`${address.City}, ${address.State} ${address.ZIP}`}</Text>
        <Text style={styles.addressDetail}>{address.Phone}</Text>
      </View>

      <View style={styles.addressActions}>
        <TouchableOpacity onPress={() => onEdit(address)} style={styles.actionButton}>
          <Ionicons name="create-outline" size={20} color="#5D4037" />
          <Text style={styles.actionText}>Edit</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onDelete(address.id)} style={styles.actionButton}>
          <Ionicons name="trash-outline" size={20} color="#FF5252" />
          <Text style={[styles.actionText, { color: '#FF5252' }]}>Delete</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={() => onSetDefault(address.id)} style={styles.actionButton}>
          <Ionicons
            name={address.isDefault ? "star" : "star-outline"}
            size={20}
            color="#FFB300"
          />
          <Text style={[styles.actionText, { color: '#FFB300' }]}>
            {address.isDefault ? "Remove Default" : "Set as Default"}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const EmptyAddresses = () => (
  <View style={styles.emptyContainer}>
    <Ionicons name="location-outline" size={80} color="#CCCCCC" />
    <Text style={styles.emptyText}>No saved addresses</Text>
    <Text style={styles.emptySubtext}>Add a new address for faster checkout</Text>
  </View>
);

const Address = () => {
  const [addresses, setAddresses] = useState<Address[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [deleteModalVisible, setDeleteModalVisible] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [selectedAddressId, setSelectedAddressId] = useState<string | null>(null);
  const [currentAddress, setCurrentAddress] = useState<Address | null>(null);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('success');

  useEffect(() => {
    fetchUserAddresses();
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' = 'success') => {
    setAlertMsg(message);
    setAlertType(type);
  };

  const getUserAddresses = async () => {
    const userId = auth.currentUser?.uid;
    if (!userId) return null;

    const userResult = await getDocument("Users", userId);
    return userResult.success ? (userResult.data as any)?.Address || [] : null;
  };

  const updateUserAddresses = async (newAddresses: any[]) => {
    const userId = auth.currentUser?.uid;
    if (!userId) return false;

    const updateResult = await updateDocument("Users", userId, { Address: newAddresses });
    return updateResult.success;
  };

  const fetchUserAddresses = async () => {
    try {
      setLoading(true);
      const userAddresses = await getUserAddresses();
      
      if (!userAddresses) {
        setLoading(false);
        setRefreshing(false);
        return;
      }

      const formattedAddresses = userAddresses
        .map((address: any, index: number) => ({
          id: address.id || `address-${index}`,
          FullName: address.FullName || '',
          Street: address.Street || '',
          City: address.City || '',
          State: address.State || '',
          ZIP: address.ZIP || '',
          Phone: address.Phone || '',
          isDefault: address.isDefault || false,
        }))
        .sort((a: Address, b: Address) => (a.isDefault ? -1 : b.isDefault ? 1 : 0));

      setAddresses(formattedAddresses);
    } catch (error) {
      showAlert("Failed to load addresses. Please try again.", 'error');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const performAddressOperation = async (operation: () => Promise<boolean>, successMessage: string) => {
    try {
      const success = await operation();
      if (success) {
        await fetchUserAddresses();
        showAlert(successMessage);
        return true;
      } else {
        showAlert("Operation failed. Please try again.", 'error');
        return false;
      }
    } catch (error) {
      showAlert("Operation failed. Please try again.", 'error');
      return false;
    }
  };

  const confirmDeleteAddress = async () => {
    if (!selectedAddressId) return;

    setDeleteLoading(true);
    const success = await performAddressOperation(
      async () => {
        const userAddresses = await getUserAddresses();
        if (!userAddresses) return false;
        const filteredAddresses = userAddresses.filter((addr: any) => addr.id !== selectedAddressId);
        return await updateUserAddresses(filteredAddresses);
      },
      "Address deleted successfully"
    );

    if (success) {
      setDeleteModalVisible(false);
    }
    setDeleteLoading(false);
    setSelectedAddressId(null);
  };

  const handleSetDefault = async (id: string) => {
    const userAddresses = await getUserAddresses();
    if (!userAddresses) return;

    const addressToUpdate = userAddresses.find((addr: any) => addr.id === id);
    if (!addressToUpdate) return;

    const isSettingAsDefault = !addressToUpdate.isDefault;
    
    await performAddressOperation(
      async () => {
        const updatedAddresses = userAddresses.map((addr: any) => ({
          ...addr,
          isDefault: addr.id === id ? isSettingAsDefault : false
        }));
        return await updateUserAddresses(updatedAddresses);
      },
      isSettingAsDefault ? "Default address updated successfully" : "Default address removed"
    );
  };

  const handleSubmitAddress = async (formData: Address) => {
    const userAddresses = await getUserAddresses();
    if (!userAddresses) return;

    const operation = async () => {
      let updatedAddresses;
      
      if (isEditing) {
        const existingIndex = userAddresses.findIndex((addr: any) => addr.id === formData.id);
        if (existingIndex === -1) return false;
        
        updatedAddresses = [...userAddresses];
        updatedAddresses[existingIndex] = {
          ...formData,
          isDefault: userAddresses[existingIndex].isDefault
        };
      } else {
        updatedAddresses = [...userAddresses, { ...formData, isDefault: false }];
      }
      
      return await updateUserAddresses(updatedAddresses);
    };

    const success = await performAddressOperation(
      operation,
      `Address ${isEditing ? 'updated' : 'added'} successfully`
    );

    if (success) {
      setModalVisible(false);
      setCurrentAddress(null);
    }
  };

  const handleEdit = (address: Address) => {
    setCurrentAddress(address);
    setIsEditing(true);
    setModalVisible(true);
  };

  const handleDelete = (id: string) => {
    setSelectedAddressId(id);
    setDeleteModalVisible(true);
  };

  const handleAddNew = () => {
    setCurrentAddress(null);
    setIsEditing(false);
    setModalVisible(true);
  };

  const onRefresh = () => {
    setRefreshing(true);
    fetchUserAddresses();
  };

  return (
    <>
      <Stack.Screen name="address" options={{ headerShown: false }} />
      <LinearGradient colors={['white', '#FFE4C4']} style={styles.container}>
        {alertMsg && (
          <MiniAlert
            message={alertMsg}
            type={alertType}
            onHide={() => setAlertMsg(null)}
          />
        )}

        <DeleteModal
          visible={deleteModalVisible}
          onClose={() => setDeleteModalVisible(false)}
          onConfirm={confirmDeleteAddress}
          isLoading={deleteLoading}
          title="Delete Address"
          message="Are you sure you want to delete this address?"
          warningMessage={selectedAddressId && addresses.find(a => a.id === selectedAddressId)?.isDefault
            ? "Warning: This is your default address."
            : undefined}
        />

        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Ionicons name="arrow-back-circle-outline" size={36} color="#5D4037" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>My Addresses</Text>
        </View>

        {loading && !refreshing ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#8D6E63" />
            <Text style={styles.loadingText}>Loading your addresses...</Text>
          </View>
        ) : addresses.length > 0 ? (
          <ScrollView
            style={styles.addressList}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#8D6E63']}
                tintColor="#8D6E63"
              />
            }
          >
            {addresses.map(address => (
              <AddressCard
                key={address.id}
                address={address}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSetDefault={handleSetDefault}
              />
            ))}
            <View style={styles.bottomSpace} />
          </ScrollView>
        ) : (
          <ScrollView
            contentContainerStyle={styles.emptyScrollContent}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={['#8D6E63']}
                tintColor="#8D6E63"
              />
            }
          >
            <EmptyAddresses />
          </ScrollView>
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddNew}
          disabled={loading}
        >
          <Ionicons name="add" size={24} color="white" />
          <Text style={styles.addButtonText}>Add New Address</Text>
        </TouchableOpacity>

        <AddressModal
          visible={modalVisible}
          onClose={() => setModalVisible(false)}
          onSubmit={handleSubmitAddress}
          currentAddress={currentAddress}
          isEditing={isEditing}
          loading={loading}
        />
      </LinearGradient>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(109, 76, 65, 0.2)',
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: '#4E342E',
  },
  backButton: {
    position: 'absolute',
    left: 15,
    top: 55,
  },
  addressList: {
    flex: 1,
    paddingHorizontal: 16,
    paddingTop: 20,
  },
  emptyScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressCard: {
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  addressContent: {
    marginBottom: 10,
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  addressName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5D4037',
  },
  defaultBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  defaultText: {
    color: 'white',
    fontSize: 12,
    fontWeight: 'bold',
  },
  addressDetail: {
    fontSize: 16,
    color: '#5D4037',
    marginBottom: 4,
  },
  addressActions: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    borderTopWidth: 1,
    borderTopColor: '#EADDD0',
    paddingTop: 10,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 16,
  },
  actionText: {
    marginLeft: 4,
    fontSize: 14,
    color: '#5D4037',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5D4037',
    borderRadius: 50,
    paddingVertical: 16,
    marginHorizontal: 16,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 4,
  },
  addButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5D4037',
    marginTop: 16,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#8D6E63',
    textAlign: 'center',
    marginTop: 8,
  },
  bottomSpace: {
    height: 80,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#6D4C41',
    marginTop: 15,
    fontSize: 16,
    fontWeight: '500',
  },
});

export default Address;