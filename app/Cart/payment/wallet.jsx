import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../../components/Component/MiniAlert';
import { useUserStore } from '../../../store/userStore';
import { paymentDarkTheme, paymentLightTheme } from '../../../Theme/Cart/paymentTheme';
import { createOrderFromCheckout, updateUserData } from '../../services/DBAPI';

const WalletPayment = () => {
  const params = useLocalSearchParams();
  const parsedPayload = useMemo(() => {
    const raw = params?.payload;
    if (!raw || Array.isArray(raw)) return null;
    try {
      return JSON.parse(raw);
    } catch {
      return null;
    }
  }, [params?.payload]);

  const [theme, setTheme] = useState(paymentLightTheme);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [loading, setLoading] = useState(true);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmationTimerRef = useRef(null);

  const [phone, setPhone] = useState('');

  const currentUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const userId = currentUser?.uid ? String(currentUser.uid) : null;

  const showAlert = (m, t = 'success') => { setAlertMsg(m); setAlertType(t); };

  const loadTheme = useCallback(async () => {
    const mode = await AsyncStorage.getItem('ThemeMode');
    setTheme(mode === '2' ? paymentDarkTheme : paymentLightTheme);
  }, []);

  useEffect(() => {
    const init = async () => {
      await loadTheme();
      if (!parsedPayload) {
        router.replace('/Cart/checkout');
        return;
      }
      setLoading(false);
    };
    init();
  }, [loadTheme, parsedPayload]);

  const subtotal = parsedPayload?.subtotal ?? 0;
  const shippingFee = parsedPayload?.shippingFee ?? 0;
  const total = parsedPayload?.total ?? 0;

  const validate = () => {
    const cleaned = phone.replace(/\D+/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) return 'Enter a valid phone number';
    return null;
  };

  useEffect(() => {
    return () => {
      if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    };
  }, []);

  const placeOrder = async () => {
    try {
      if (!parsedPayload) {
        router.replace('/Cart/checkout');
        return;
      }

      if (isPlacingOrder) return;
      setIsPlacingOrder(true);

      const finalPayload = {
        ...parsedPayload,
        paymentMethod: 'WALLET',
        paymentDetails: {
          walletnumber: phone,
        },
      };

      const res = await createOrderFromCheckout(finalPayload);

      if (!res.success) {
        showAlert(res.error || 'Failed to create order', 'error');
        setIsPlacingOrder(false);
        return;
      }

      setUser({ ...(currentUser || {}), Cart: [] });
      const syncRes = await updateUserData(userId, { Cart: [] });
      if (!syncRes?.success) {
        showAlert('Order placed but cart sync failed', 'error');
        setIsPlacingOrder(false);
        return;
      }

      setShowConfirmation(true);
      confirmationTimerRef.current = setTimeout(() => {
        setShowConfirmation(false);
        router.replace('/(tabs)/home');
      }, 4000);
    } catch {
      showAlert('Failed to create order', 'error');
      setIsPlacingOrder(false);
    }
  };

  const onConfirm = () => {
    const err = validate();
    if (err) { showAlert(err, 'error'); return; }
    placeOrder();
  };

  return (
    <>
      <Stack.Screen options={{ headerShown: true, title: 'Mobile Wallet', headerStyle: { backgroundColor: theme.background }, headerTintColor: theme.text }} />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {loading ? (
          <View style={styles.center}><ActivityIndicator size="large" color={theme.accentColor} /></View>
        ) : (
          <>
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.title, { color: theme.text }]}>Wallet Phone</Text>
              <TextInput
                placeholder="Enter phone number"
                placeholderTextColor={theme.placeholder}
                value={phone}
                onChangeText={setPhone}
                keyboardType="phone-pad"
                style={[styles.input, { borderColor: theme.border, color: theme.text }]}
              />
            </View>

            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.row}><Text style={{ color: theme.muted }}>Subtotal</Text><Text style={{ color: theme.text }}>{'$' + subtotal.toFixed(2)}</Text></View>
              <View style={styles.row}><Text style={{ color: theme.muted }}>Shipping</Text><Text style={{ color: theme.text }}>{'$' + shippingFee.toFixed(2)}</Text></View>
              <View style={styles.row}><Text style={[styles.total, { color: theme.text }]}>Total</Text><Text style={[styles.total, { color: theme.accentColor }]}>{'$' + total.toFixed(2)}</Text></View>
            </View>

            <TouchableOpacity
              style={[styles.payBtn, { backgroundColor: theme.accentColor, opacity: isPlacingOrder ? 0.7 : 1 }]}
              onPress={onConfirm}
              activeOpacity={0.9}
              disabled={isPlacingOrder}
            >
              <Text style={styles.payText}>{isPlacingOrder ? 'Processing...' : 'Pay and Place Order'}</Text>
            </TouchableOpacity>
          </>
        )}
      </View>

      {showConfirmation && (
        <View style={[styles.confirmOverlay, { backgroundColor: theme.background }]}
        >
          <Image
            source={require('../../../assets/images/ConfirmationOrder.gif')}
            style={styles.confirmGif}
            resizeMode="contain"
          />
        </View>
      )}

      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
          theme={theme}
        />
      )}
    </>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  card: { borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  title: { fontWeight: '700', fontSize: 16, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10, fontSize: 14 },
  row: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  total: { fontWeight: '800' },
  payBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  payText: { color: '#fff', fontWeight: '800' },
  confirmOverlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    zIndex: 999,
  },
  confirmGif: {
    width: '85%',
    height: 280,
  },
});

export default WalletPayment;
