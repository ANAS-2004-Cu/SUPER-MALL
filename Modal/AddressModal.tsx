import { AntDesign } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Modal, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../components/Component/MiniAlert';
import { darkTheme, lightTheme } from '../Theme/Modal/AddressModalTheme';

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
    loading,
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
    const [isDarkMode, setIsDarkMode] = useState(false);
    const currentTheme = useMemo(() => (
        isDarkMode ? { ...darkTheme } : { ...lightTheme }
    ), [isDarkMode]);

    const [cityOptions, setCityOptions] = useState<string[]>(['cairo', 'giza', 'tnta', 'gharbia']);
    const [showCityModal, setShowCityModal] = useState(false);

    useEffect(() => {
        const loadTheme = async () => {
            try {
                const themeMode = await AsyncStorage.getItem('ThemeMode');
                setIsDarkMode(themeMode === '2');
            } catch (error) {
                setIsDarkMode(false);
            }
        };

        const loadRegions = async () => {
            if (!visible) return;

            try {
                const cached = await AsyncStorage.getItem('unUpadtingManageDocs');
                if (!cached) return;

                const parsed = JSON.parse(cached);
                const storedRegions = Array.isArray(parsed?.AvilableRegion) ? parsed.AvilableRegion : [];
                const normalized = storedRegions
                    .map((region: any) => String(region ?? '').trim())
                    .filter((region: string | any[]) => region.length > 0);

                if (normalized.length) {
                    setCityOptions(normalized);
                }
            } catch (error) {
                console.error('Failed to load available regions from storage:', error);
            }
        };

        loadTheme();
        loadRegions();
    }, [visible]);

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
        setShowCityModal(false); // close city modal on open/reset
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
        } catch {
            setAlertMsg('Failed to save address. Please try again.');
            setAlertType('error');
        }
    };

    const styles = StyleSheet.create({
        modalOverlay: {
            flex: 1,
            justifyContent: 'flex-end',
            backgroundColor: currentTheme.overlayBackground,
        },
        modalContent: {
            backgroundColor: currentTheme.modalBackground,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            padding: 22,
            height: '90%',
            shadowColor: currentTheme.shadowColor,
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
            borderBottomColor: currentTheme.borderBottomColor,
            marginBottom: 20,
        },
        modalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: currentTheme.titleColor,
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
            color: currentTheme.labelColor,
            marginBottom: 6,
        },
        formInput: {
            backgroundColor: currentTheme.inputBackground,
            borderRadius: 8,
            paddingHorizontal: 12,
            paddingVertical: 10,
            fontSize: 16,
            borderWidth: 1,
            borderColor: currentTheme.inputBorderColor,
            color: currentTheme.titleColor,
        },
        formRow: {
            flexDirection: 'row',
            marginBottom: 16,
        },
        noteContainer: {
            backgroundColor: currentTheme.noteBackground,
            borderRadius: 8,
            padding: 12,
            marginTop: 10,
            marginBottom: 10,
            borderLeftWidth: 4,
            borderLeftColor: currentTheme.noteBorderColor,
        },
        noteText: {
            fontSize: 14,
            color: currentTheme.noteTextColor,
            lineHeight: 18,
        },
        submitButton: {
            backgroundColor: currentTheme.submitButtonBackground,
            borderRadius: 12,
            paddingVertical: 16,
            alignItems: 'center',
            shadowColor: currentTheme.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.2,
            shadowRadius: 3,
            elevation: 4,
        },
        submitButtonText: {
            color: currentTheme.submitButtonTextColor,
            fontSize: 16,
            fontWeight: 'bold',
        },
        requiredMark: {
            color: currentTheme.requiredMarkColor,
            fontSize: 16,
        },
        cityModalOverlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(0,0,0,0.4)',
        },
        cityModalContent: {
            width: '80%',
            borderRadius: 12,
            padding: 16,
        },
        cityModalTitle: {
            fontSize: 16,
            fontWeight: '600',
            marginBottom: 8,
        },
        cityOption: {
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.inputBorderColor,
        },
        cityOptionText: {
            fontSize: 16,
        },
        cityCancelBtn: {
            paddingVertical: 12,
            alignItems: 'center',
        },
        cityCancelText: {
            fontSize: 16,
            fontWeight: '600',
        },
    });

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
                            <AntDesign name="close" size={24} color={currentTheme.closeIconColor} />
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
                                onChangeText={text => handleFormChange('FullName', text)}
                                placeholder="Enter your full name"
                                placeholderTextColor={currentTheme.titleColor + '80'}
                            />
                        </View>
                        <View style={styles.formGroup}>
                            <Text style={styles.formLabel}>Street Address <Text style={styles.requiredMark}>*</Text></Text>
                            <TextInput
                                style={styles.formInput}
                                value={formData.Street}
                                onChangeText={text => handleFormChange('Street', text)}
                                placeholder="Enter street address"
                                placeholderTextColor={currentTheme.titleColor + '80'}
                            />
                        </View>
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.formLabel}>City <Text style={styles.requiredMark}>*</Text></Text>
                                <TouchableOpacity
                                    style={styles.formInput}
                                    onPress={() => setShowCityModal(true)}
                                    activeOpacity={0.7}
                                >
                                    <Text style={{ color: currentTheme.titleColor }}>
                                        {formData.City ? formData.City : 'Select city'}
                                    </Text>
                                </TouchableOpacity>
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.formLabel}>State <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.State}
                                    onChangeText={text => handleFormChange('State', text)}
                                    placeholder="State"
                                    placeholderTextColor={currentTheme.titleColor + '80'}
                                />
                            </View>
                        </View>
                        <View style={styles.formRow}>
                            <View style={[styles.formGroup, { flex: 1, marginRight: 8 }]}>
                                <Text style={styles.formLabel}>ZIP Code <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.ZIP}
                                    onChangeText={text => handleFormChange('ZIP', text)}
                                    placeholder="ZIP Code"
                                    keyboardType="number-pad"
                                    placeholderTextColor={currentTheme.titleColor + '80'}
                                />
                            </View>
                            <View style={[styles.formGroup, { flex: 1, marginLeft: 8 }]}>
                                <Text style={styles.formLabel}>Phone Number <Text style={styles.requiredMark}>*</Text></Text>
                                <TextInput
                                    style={styles.formInput}
                                    value={formData.Phone}
                                    onChangeText={text => handleFormChange('Phone', text)}
                                    placeholder="Phone Number"
                                    keyboardType="phone-pad"
                                    placeholderTextColor={currentTheme.titleColor + '80'}
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

                    <Modal
                        visible={showCityModal}
                        transparent
                        animationType="fade"
                        onRequestClose={() => setShowCityModal(false)}
                    >
                        <View style={styles.cityModalOverlay}>
                            <View style={[styles.cityModalContent, { backgroundColor: currentTheme.modalBackground }]}>
                                <Text style={[styles.cityModalTitle, { color: currentTheme.titleColor }]}>Select City</Text>
                                {cityOptions.map((opt) => (
                                    <TouchableOpacity
                                        key={opt}
                                        style={styles.cityOption}
                                        onPress={() => {
                                            handleFormChange('City', opt);
                                            setShowCityModal(false);
                                        }}
                                    >
                                        <Text style={[styles.cityOptionText, { color: currentTheme.titleColor }]}>
                                            {opt}
                                        </Text>
                                    </TouchableOpacity>
                                ))}
                                <TouchableOpacity style={styles.cityCancelBtn} onPress={() => setShowCityModal(false)}>
                                    <Text style={[styles.cityCancelText, { color: currentTheme.titleColor }]}>Cancel</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

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

export default AddressModal;