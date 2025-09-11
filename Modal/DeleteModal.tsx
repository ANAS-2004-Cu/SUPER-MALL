import { MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, { useEffect, useState } from 'react';
import { ActivityIndicator, Modal, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { darkTheme, lightTheme } from '../Theme/Modal/DeleteModalTheme';

interface DeleteModalProps {
    visible: boolean;
    onClose: () => void;
    onConfirm: () => void;
    isLoading: boolean;
    title?: string;
    message?: string;
    warningMessage?: string;
    confirmButtonText?: string;
    cancelButtonText?: string;
}

const DeleteModal = ({
    visible,
    onClose,
    onConfirm,
    isLoading,
    title = "Delete Item",
    message = "Are you sure you want to delete this item?",
    warningMessage,
    confirmButtonText = "Delete",
    cancelButtonText = "Cancel"
}: DeleteModalProps) => {
    const [currentTheme, setCurrentTheme] = useState(lightTheme);

    useEffect(() => {
        const getThemeMode = async () => {
            try {
                const themeMode = await AsyncStorage.getItem('ThemeMode');
                if (themeMode === '2') {
                    setCurrentTheme(darkTheme);
                } else {
                    setCurrentTheme(lightTheme);
                }
            } catch (error) {
                console.error('Error reading theme mode from storage:', error);
                setCurrentTheme(lightTheme); // Default to light theme
            }
        };

        getThemeMode();
    }, [visible]); // Re-check theme when modal becomes visible

    const styles = StyleSheet.create({
        deleteModalOverlay: {
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: currentTheme.overlayBackground,
        },
        deleteModalContent: {
            width: '85%',
            backgroundColor: currentTheme.modalBackground,
            borderRadius: 15,
            padding: 22,
            alignItems: 'center',
            shadowColor: currentTheme.shadowColor,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.25,
            shadowRadius: 3.84,
            elevation: 5,
        },
        deleteModalHeader: {
            alignItems: 'center',
            marginBottom: 15,
        },
        deleteModalTitle: {
            fontSize: 20,
            fontWeight: 'bold',
            color: currentTheme.titleColor,
            marginTop: 10,
        },
        deleteModalText: {
            fontSize: 16,
            color: currentTheme.textColor,
            textAlign: 'center',
            marginBottom: 20,
        },
        deleteModalButtons: {
            flexDirection: 'row',
            justifyContent: 'space-between',
            width: '100%',
        },
        deleteModalButton: {
            paddingVertical: 12,
            paddingHorizontal: 20,
            borderRadius: 8,
            minWidth: 120,
            alignItems: 'center',
            justifyContent: 'center',
        },
        cancelButton: {
            backgroundColor: currentTheme.cancelButtonBackground,
            marginRight: 10,
        },
        cancelButtonText: {
            color: currentTheme.cancelTextColor,
            fontWeight: 'bold',
        },
        confirmButton: {
            backgroundColor: currentTheme.confirmButtonBackground,
        },
        confirmButtonText: {
            color: currentTheme.confirmTextColor,
            fontWeight: 'bold',
        },
        warningText: {
            color: currentTheme.warningTextColor,
            fontWeight: 'bold',
        },
    });

    return (
        <Modal
            visible={visible}
            animationType="fade"
            transparent={true}
            onRequestClose={onClose}
        >
            <View style={styles.deleteModalOverlay}>
                <View style={styles.deleteModalContent}>
                    <View style={styles.deleteModalHeader}>
                        <MaterialIcons name="delete" size={36} color={currentTheme.iconColor} />
                        <Text style={styles.deleteModalTitle}>
                            {title}
                        </Text>
                    </View>

                    <Text style={styles.deleteModalText}>
                        {message}
                        {warningMessage && (
                            <Text style={styles.warningText}>
                                {"\n\n"}{warningMessage}
                            </Text>
                        )}
                    </Text>

                    <View style={styles.deleteModalButtons}>
                        <TouchableOpacity
                            style={[styles.deleteModalButton, styles.cancelButton]}
                            onPress={onClose}
                            disabled={isLoading}
                        >
                            <Text style={styles.cancelButtonText}>{cancelButtonText}</Text>
                        </TouchableOpacity>

                        <TouchableOpacity
                            style={[styles.deleteModalButton, styles.confirmButton]}
                            onPress={onConfirm}
                            disabled={isLoading}
                        >
                            {isLoading ? (
                                <ActivityIndicator size="small" color="white" />
                            ) : (
                                <Text style={styles.confirmButtonText}>{confirmButtonText}</Text>
                            )}
                        </TouchableOpacity>
                    </View>
                </View>
            </View>
        </Modal>
    );
};

export default DeleteModal;