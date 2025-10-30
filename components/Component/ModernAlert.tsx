import { Ionicons } from '@expo/vector-icons';
import React, { useEffect, useRef } from 'react';
import {
  Animated,
  Dimensions,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  useColorScheme,
  View
} from 'react-native';
import { darkAlertTheme, lightAlertTheme } from '../../Theme/Component/AlertTheme';

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
  themeMode?: 'light' | 'dark';
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
  onClose,
  themeMode
}) => {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.9)).current;

  const scheme = useColorScheme();
  const selected = themeMode ?? scheme ?? 'light';
  const alertTheme = selected === 'dark' ? darkAlertTheme : lightAlertTheme;

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
          backgroundColor: alertTheme.bodyBg.success,
          iconColor: alertTheme.header.success.icon,
          iconName: 'checkmark-circle',
          headerBgColor: alertTheme.header.success.bg
        };
      case 'error':
        return {
          backgroundColor: alertTheme.bodyBg.error,
          iconColor: alertTheme.header.error.icon,
          iconName: 'alert-circle',
          headerBgColor: alertTheme.header.error.bg
        };
      case 'warning':
        return {
          backgroundColor: alertTheme.bodyBg.warning,
          iconColor: alertTheme.header.warning.icon,
          iconName: 'warning',
          headerBgColor: alertTheme.header.warning.bg
        };
      case 'cart':
        return {
          backgroundColor: alertTheme.bodyBg.cart,
          iconColor: alertTheme.header.cart.icon,
          iconName: 'cart',
          headerBgColor: alertTheme.header.cart.bg
        };
      default:
        return {
          backgroundColor: alertTheme.bodyBg.info,
          iconColor: alertTheme.header.info.icon,
          iconName: 'information-circle',
          headerBgColor: alertTheme.header.info.bg
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
      <Pressable style={[styles.modalOverlay, { backgroundColor: alertTheme.overlay }]} onPress={onClose}>
        <Animated.View
          style={[
            styles.alertContainer,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
              backgroundColor: alertTheme.containerBg
            }
          ]}
        >
          <Pressable style={{ width: '100%' }} onPress={(e) => e.stopPropagation()}>
            <View style={[styles.alertHeader, { backgroundColor: alertStyle.headerBgColor }]}>
              <Ionicons name={alertStyle.iconName as any} size={28} color={alertStyle.iconColor} />
              <Text style={[styles.titleText, { color: alertTheme.headerText }]}>{title}</Text>
            </View>
            
            <View style={[styles.alertBody, { backgroundColor: alertStyle.backgroundColor }]}>
              <Text style={[styles.messageText, { color: alertTheme.bodyText }]}>{message}</Text>
              
              <View style={styles.buttonsContainer}>
                {secondaryButtonText && (
                  <TouchableOpacity 
                    style={[
                      styles.button,
                      styles.secondaryButton,
                      { backgroundColor: alertTheme.button.secondaryBg, borderColor: alertTheme.button.secondaryBorder }
                    ]} 
                    onPress={handleSecondaryPress}
                  >
                    <Text style={[styles.secondaryButtonText, { color: alertTheme.button.secondaryText }]}>{secondaryButtonText}</Text>
                  </TouchableOpacity>
                )}
                
                <TouchableOpacity 
                  style={[
                    styles.button,
                    styles.primaryButton,
                    { backgroundColor: alertTheme.button.primaryBg }
                  ]} 
                  onPress={handlePrimaryPress}
                >
                  <Text style={[styles.primaryButtonText, { color: alertTheme.button.primaryText }]}>{primaryButtonText}</Text>
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