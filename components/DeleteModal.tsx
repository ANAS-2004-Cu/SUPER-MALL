import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, ActivityIndicator } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';

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
                        <MaterialIcons name="delete" size={36} color="#FF5252" />
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

const styles = StyleSheet.create({
    deleteModalOverlay: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.5)',
    },
    deleteModalContent: {
        width: '85%',
        backgroundColor: 'white',
        borderRadius: 15,
        padding: 22,
        alignItems: 'center',
        shadowColor: '#000',
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
        color: '#333',
        marginTop: 10,
    },
    deleteModalText: {
        fontSize: 16,
        color: '#555',
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
        backgroundColor: '#f1f2f6',
        marginRight: 10,
    },
    cancelButtonText: {
        color: '#555',
        fontWeight: 'bold',
    },
    confirmButton: {
        backgroundColor: '#FF5252',
    },
    confirmButtonText: {
        color: 'white',
        fontWeight: 'bold',
    },
    warningText: {
        color: '#FF9800',
        fontWeight: 'bold',
    },
});

export default DeleteModal;