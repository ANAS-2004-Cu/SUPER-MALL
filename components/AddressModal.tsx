import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Modal, TextInput, TouchableOpacity, ActivityIndicator, ScrollView } from 'react-native';
import { AntDesign } from '@expo/vector-icons';
import MiniAlert from './MiniAlert';

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

interface AddressModalProps {
    visible: boolean;
    onClose: () => void;
    onSubmit: (formData: Address) => Promise<void>;
    currentAddress: Address | null;
    isEditing: boolean;
    loading: boolean;
}

const AddressModal: React.FC<AddressModalProps> = ({
    visible,
    onClose,
    onSubmit,
    currentAddress,
    isEditing,
    loading
}) => {
    const [formData, setFormData] = useState<Address>({
        id: '',
        FullName: '',
        Street: '',
        City: '',
        State: '',
        ZIP: '',
        Phone: '',
        isDefault: false,
    });
    const [alertMsg, setAlertMsg] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error'>('error');

    useEffect(() => {
        if (currentAddress) {
            setFormData(currentAddress);
        } else {
            setFormData({
                id: Date.now().toString(),
                FullName: '',
                Street: '',
                City: '',
                State: '',
                ZIP: '',
                Phone: '',
                isDefault: false,
            });
        }
        setAlertMsg(null);
    }, [currentAddress, visible]);

    const handleFormChange = (field: keyof Address, value: string | boolean) => {
        setFormData(prev => ({ ...prev, [field]: value }));
        if (alertMsg) setAlertMsg(null);
    };

    const validateForm = (): boolean => {
        if (!formData.FullName) {
            setAlertMsg('Please enter a full name');
            setAlertType('error');
            return false;
        }
        if (!formData.Street) {
            setAlertMsg('Please enter a street address');
            setAlertType('error');
            return false;
        }
        if (!formData.City) {
            setAlertMsg('Please enter a city');
            setAlertType('error');
            return false;
        }
        if (!formData.State) {
            setAlertMsg('Please enter a state');
            setAlertType('error');
            return false;
        }
        if (!formData.ZIP) {
            setAlertMsg('Please enter a ZIP code');
            setAlertType('error');
            return false;
        }
        if (!formData.Phone) {
            setAlertMsg('Please enter a phone number');
            setAlertType('error');
            return false;
        }
        return true;
    };

    const handleSubmit = async () => {
        if (!validateForm()) return;

        try {
            await onSubmit(formData);
        } catch (error) {
            console.error("Error submitting form:", error);
            setAlertMsg('Failed to save address. Please try again.');
            setAlertType('error');
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.modalOverlay}>
                {alertMsg && (
                    <MiniAlert
                        message={alertMsg}
                        type={alertType}
                        onHide={() => setAlertMsg(null)}
                    />
                )}
                <View style={styles.modalContent}>
                    <View style={styles.modalHeader}>
                        <TouchableOpacity
                            style={styles.closeButton}
                            onPress={onClose}
                            disabled={loading}
                        >
                            <AntDesign name="close" size={24} color="#5D4037" />
                        </TouchableOpacity>
                        <Text style={styles.modalTitle}>
                            {isEditing ? 'Edit Address' : 'Add New Address'}
                        </Text>
                    </View>


                    <ScrollView style={styles.formContainer}>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Full Name <Text style={styles.requiredMark}>*</Text></Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.FullName}
                                onChangeText={(text) => handleFormChange('FullName', text)}
                                placeholder="Enter your full name"
                            />
                        </View>

                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Street Address <Text style={styles.requiredMark}>*</Text></Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.Street}
                                onChangeText={(text) => handleFormChange('Street', text)}
                                placeholder="Enter street address"
                            />
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.formLabel}>City <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.City}
                                    onChangeText={(text) => handleFormChange('City', text)}
                                    placeholder="City"
                                />
                            </View>

                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.formLabel}>State <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.State}
                                    onChangeText={(text) => handleFormChange('State', text)}
                                    placeholder="State"
                                />
                            </View>
                        </View>

                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.formLabel}>ZIP Code <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.ZIP}
                                    onChangeText={(text) => handleFormChange('ZIP', text)}
                                    placeholder="ZIP Code"
                                    keyboardType="number-pad"
                                />
                            </View>

                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.formLabel}>Phone Number <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.Phone}
                                    onChangeText={(text) => handleFormChange('Phone', text)}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                />
                            </View>
                        </View>

                        {isEditing && (
                            <View style={styles.noteContainer}>
                                <Text style={styles.noteText}>
                                    Note: You can set this as your default address after saving.
                                </Text>
                            </View>
                        )}
                    </ScrollView>

                    <TouchableOpacity
                        style={styles.submitButton}
                        onPress={handleSubmit}
                        disabled={loading}
                    >
                        {loading ? (
                            <ActivityIndicator color="white" size="small" />
                        ) : (
                            <Text style={styles.submitButtonText}>
                                {isEditing ? 'Save Changes' : 'Save Address'}
                            </Text>
                        )}
                    </TouchableOpacity>
                </View>
            </View>
        </Modal>
    );
};

const styles = StyleSheet.create({
    modalOverlay: {
        flex: 1,
        justifyContent: 'flex-end',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalContent: {
        backgroundColor: 'white',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 22,
        height: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -2 },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    modalHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#EADDD0',
        marginBottom: 20,
    },
    modalTitle: {
        fontSize: 20,
        fontWeight: 'bold',
        color: '#5D4037',
    },
    closeButton: {
        position: 'absolute',
        left: 0,
        padding: 5,
    },
    formContainer: {
        flex: 1,
        marginBottom: 20,
    },
    formGroup: {
        marginBottom: 16,
    },
    formLabel: {
        fontSize: 14,
        fontWeight: '600',
        color: '#5D4037',
        marginBottom: 6,
    },
    formInput: {
        backgroundColor: '#F5F5F5',
        borderRadius: 8,
        paddingHorizontal: 12,
        paddingVertical: 10,
        fontSize: 16,
        borderWidth: 1,
        borderColor: '#E0E0E0',
    },
    formRow: {
        flexDirection: 'row',
        marginBottom: 16,
    },
    noteContainer: {
        backgroundColor: '#FFF8E1',
        borderRadius: 8,
        padding: 12,
        marginTop: 10,
        marginBottom: 10,
        borderLeftWidth: 4,
        borderLeftColor: '#FFB300',
    },
    noteText: {
        fontSize: 14,
        color: '#795548',
        lineHeight: 18,
    },
    submitButton: {
        backgroundColor: '#5D4037',
        borderRadius: 12,
        paddingVertical: 16,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 3,
        elevation: 4,
    },
    submitButtonText: {
        color: 'white',
        fontSize: 16,
        fontWeight: 'bold',
    },
    requiredMark: {
        color: '#F44336',
        fontSize: 16,
    },
});

export default AddressModal;