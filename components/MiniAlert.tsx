import React, { useEffect } from 'react';
import { Animated, Text, View, StyleSheet } from 'react-native';
import { FontAwesome } from '@expo/vector-icons';

interface MiniAlertProps {
    message: string;
    type: 'success' | 'error';
    onHide: () => void;
}

const MiniAlert: React.FC<MiniAlertProps> = ({ message, type, onHide }) => {
    const translateY = new Animated.Value(-100);

    useEffect(() => {
        Animated.timing(translateY, {
            toValue: 0,
            duration: 400,
            useNativeDriver: true,
        }).start();
        const timer = setTimeout(() => {
            Animated.timing(translateY, {
                toValue: -100,
                duration: 400,
                useNativeDriver: true,
            }).start(() => onHide());
        }, 2500);

        return () => clearTimeout(timer);
    }, []);

    return (
        <Animated.View
            style={[
                styles.alertContainer,
                {
                    backgroundColor: type === 'success' ? '#4CAF50' : '#F44336',
                    transform: [{ translateY }],
                },
            ]}
        >
            <FontAwesome
                name={type === 'success' ? 'check-circle' : 'exclamation-circle'}
                size={20}
                color="#fff"
                style={{ position: 'absolute', left: 10, top: "50%" }}
            />
            <Text style={styles.alertText}>{message}</Text>
        </Animated.View>
    );
};

export default MiniAlert;

const styles = StyleSheet.create({
    alertContainer: {
        flexDirection: 'row',
        position: 'absolute',
        top: 50,
        left: 20,
        right: 10,
        padding: 12,
        borderRadius: 10,
        zIndex: 999,
        alignItems: 'center',
        elevation: 10,
        shadowColor: '#000',
        shadowOpacity: 0.2,
        shadowRadius: 10,
        width: '90%',
        shadowOffset: { width: 0, height: 2 },
        paddingHorizontal: 30,
    },
    alertText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
        textAlign: "center",
        width: '100%',
    },
});