import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack, useLocalSearchParams } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import MiniAlert from '../../../components/Component/MiniAlert';
import { paymentDarkTheme, paymentLightTheme } from '../../../Theme/Cart/paymentTheme';
import {
  getCurrentUser,
  getShippingFeeByCity,
  getUserAddresses,
  placeOrderFromCart,
} from '../../services/backend';

const computeProductPricing = (product = {}) => {
  const base = Number(product.price) || 0;
  let discountPercent = 0;
  let discounted = base;
  if (product.discountPrice !== undefined && product.discountPrice !== null) {
    const dp = Number(product.discountPrice);
    if (!isNaN(dp) && dp >= 0 && dp <= base) {
      discounted = dp;
      discountPercent = base > 0 ? Math.round((1 - discounted / base) * 100) : 0;
    }
  } else {
    const perc = product.discount ?? product.discountPercent ?? product.offerPercentage ?? product.off ?? product.percentageOff;
    if (perc !== undefined && perc !== null) {
      const pNum = Number(perc);
      if (!isNaN(pNum) && pNum > 0 && pNum < 100) {
        discountPercent = pNum;
        discounted = base * (1 - pNum / 100);
      }
    }
  }
  discounted = Math.max(0, discounted);
  return { base, discounted, discountPercent };
};

const WalletPayment = () => {
  const params = useLocalSearchParams();
  const selectedAddressId = (params?.addressId || '').toString();

  const [theme, setTheme] = useState(paymentLightTheme);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [loading, setLoading] = useState(true);
  const [cartItems, setCartItems] = useState([]);
  const [addressSnapshot, setAddressSnapshot] = useState(null);
  const [shippingFee, setShippingFee] = useState(0);

  const [phone, setPhone] = useState('');

  const showAlert = (m, t = 'success') => { setAlertMsg(m); setAlertType(t); };

  const loadTheme = useCallback(async () => {
    const mode = await AsyncStorage.getItem('ThemeMode');
    setTheme(mode === '2' ? paymentDarkTheme : paymentLightTheme);
  }, []);

  const fetchCart = useCallback(async () => {
    const raw = await AsyncStorage.getItem('UserCart');
    const parsed = raw ? JSON.parse(raw) : [];
    setCartItems(Array.isArray(parsed) ? parsed : []);
  }, []);

  const fetchAddress = useCallback(async () => {
    const user = getCurrentUser();
    // TODO replaced firebase call: "const uid = auth.currentUser?.uid;"
    const uid = user?.uid;
    if (!uid) return;
    const list = await getUserAddresses(uid);
    const found = list.find(a => a.id === selectedAddressId) || list.find(a => a.isDefault) || list[0] || null;
    setAddressSnapshot(found);
  }, [selectedAddressId]);

  useEffect(() => {
    const init = async () => {
      // TODO replaced firebase call: "if (!auth.currentUser) {"
      if (!getCurrentUser()) {
        router.replace('/Authentication/Login');
        return;
      }
      await loadTheme();
      await Promise.all([fetchCart(), fetchAddress()]);
      setLoading(false);
    };
    init();
  }, [loadTheme, fetchCart, fetchAddress]);

  useEffect(() => {
    const run = async () => {
      try {
        const city = addressSnapshot?.City|| '';
        if (!city) { setShippingFee(0); return; }
        // TODO replaced firebase call: "const fee = await getShippingFeeByCity(city);"
        const fee = await getShippingFeeByCity(city);
        setShippingFee(fee);
      } catch { setShippingFee(0); }
    };
    run();
  }, [addressSnapshot]);

  const subtotal = useMemo(() => cartItems.reduce((s, it) => {
    const { discounted } = computeProductPricing(it.product);
    return s + discounted * (Number(it.quantity) || 1);
  }, 0), [cartItems]);
  const total = useMemo(() => subtotal + (cartItems.length ? shippingFee : 0), [subtotal, cartItems.length, shippingFee]);

  const validate = () => {
    const cleaned = phone.replace(/\D+/g, '');
    if (cleaned.length < 10 || cleaned.length > 15) return 'Enter a valid phone number';
    return null;
  };

  const placeOrder = async () => {
    try {
      // TODO replaced firebase call: "const res = await placeOrderFromCart({"
      const res = await placeOrderFromCart({
        paymentMethod: 'WALLET',
        addressSnapshot,
        walletPhone: phone,
        shippingFee
      });

      if (!res.success) {
        showAlert(res.error || 'Failed to create order', 'error');
        return;
      }

      Alert.alert('Payment Success', 'Your order has been placed successfully.', [
        { text: 'OK', onPress: () => router.replace('/(tabs)/home') }
      ]);
    } catch {
      showAlert('Failed to create order', 'error');
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
              <View style={styles.row}><Text style={{ color: theme.muted }}>Shipping</Text><Text style={{ color: theme.text }}>{cartItems.length ? '$' + shippingFee.toFixed(2) : '$0.00'}</Text></View>
              <View style={styles.row}><Text style={[styles.total, { color: theme.text }]}>Total</Text><Text style={[styles.total, { color: theme.accentColor }]}>{'$' + total.toFixed(2)}</Text></View>
            </View>

            <TouchableOpacity style={[styles.payBtn, { backgroundColor: theme.accentColor }]} onPress={onConfirm} activeOpacity={0.9}>
              <Text style={styles.payText}>Pay and Place Order</Text>
            </TouchableOpacity>
          </>
        )}
      </View>
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
  payText: { color: '#fff', fontWeight: '800' }
});

export default WalletPayment;
