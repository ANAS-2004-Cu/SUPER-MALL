import React, { useEffect, useRef } from 'react';
import { 
  Animated, 
  Text, 
  View, 
  StyleSheet, 
  TouchableOpacity, 
  Dimensions,
  Modal,
  Pressable
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface ModernAlertProps {
  visible: boolean;
  title: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info' | 'cart';
  primaryButtonText?: string;
  secondaryButtonText?: string;
  onPrimaryPress?: () => void;
  onSecondaryPress?: () => void;
  onClose: () => void;
}

const { width } = Dimensions.get('window');

const ModernAlert: React.FC<ModernAlertProps> = ({
  visible,
  title,
  message,
  type = 'info',
  primaryButtonText = 'OK',
  secondaryButtonText = 'Cancel',
  onPrimaryPress,
  onSecondaryPress,
  onClose
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    if (visible) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          friction: 8,
          tension: 40,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }).start();
    }
  }, [visible]);

  const getAlertStyle = () => {
    switch (type) {
      case 'success':
        return {
          backgroundColor: '#f8f2f6',
          iconColor: '#f7cfae',
          iconName: 'checkmark-circle',
          headerBgColor: '#f7cfae'
        };
      case 'error':
        return {
          backgroundColor: '#fff2f2',
          iconColor: '#ff4d4f',
          iconName: 'alert-circle',
          headerBgColor: '#ff4d4f'
        };
      case 'warning':
        return {
          backgroundColor: '#fffbe6',
          iconColor: '#faad14',
          iconName: 'warning',
          headerBgColor: '#faad14'
        };
      case 'cart':
        return {
          backgroundColor: '#f0f7ff',
          iconColor: '#f7cfae',
          iconName: 'cart',
          headerBgColor: '#f7cfae'
        };
      default:
        return {
          backgroundColor: '#f0f7ff',
          iconColor: '#1890ff',
          iconName: 'information-circle',
          headerBgColor: '#1890ff'
        };
    }
  };

  const alertStyle = getAlertStyle();

  const handlePrimaryPress = () => {
    onClose();
    if (onPrimaryPress) {
      onPrimaryPress();
    }
  };

  const handleSecondaryPress = () => {
    onClose();
    if (onSecondaryPress) {
      onSecondaryPress();
    }
  };

  if (!visible) return null;

  return (
    <Modal
      transparent
      visible={visible}
      animationType="none"
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <Pressable style={{ width: '100%' }} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.alertHeader, { backgroundColor: alertStyle.headerBgColor }]}>
              <Ionicons name={alertStyle.iconName as any} size={28} color="#fff" />
              <Text style={styles.titleText}>{title}</Text>
            </View>
            
            <View style={[styles.alertBody, { backgroundColor: alertStyle.backgroundColor }]}>
              <Text style={styles.messageText}>{message}</Text>
              
              <View style={styles.buttonsContainer}>
                {secondaryButtonText && (
                  <TouchableOpacity 
                    style={[styles.button, styles.secondaryButton]} 
                    onPress={handleSecondaryPress}
                  >
                    <Text style={styles.secondaryButtonText}>{secondaryButtonText}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[styles.button, styles.primaryButton]} 
                  onPress={handlePrimaryPress}
                >
                  <Text style={styles.primaryButtonText}>{primaryButtonText}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Pressable>
        </Animated.View>
      </Pressable>
    </Modal>
  );
};

export default ModernAlert;

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center'
  },
  alertContainer: {
    width: width * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20
  },
  alertBody: {
    padding: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20
  },
  titleText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#fff',
    marginLeft: 10
  },
  messageText: {
    fontSize: 16,
    color: '#333',
    marginBottom: 20,
    lineHeight: 22
  },
  buttonsContainer: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: 5
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    marginLeft: 10,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center'
  },
  primaryButton: {
    backgroundColor: '#f7cfae',
    shadowColor: 'rgba(247, 207, 174, 0.4)',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 3
  },
  secondaryButton: {
    backgroundColor: '#f5f5f5',
    borderColor: '#ddd',
    borderWidth: 1
  },
  primaryButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16
  },
  secondaryButtonText: {
    color: '#666',
    fontWeight: '500',
    fontSize: 16
  }
});