import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, FlatList, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MiniAlert from '../../components/Component/MiniAlert';
import { checkoutDarkTheme, checkoutLightTheme } from '../../Theme/Cart/checkoutTheme';
import {
  getCurrentUser,
  getShippingFeeByCity,
  getUserAddresses,
  placeOrderFromCart,
} from '../services/backend';

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

const Checkout = () => {
  const [theme, setTheme] = useState(checkoutLightTheme);
  const [loading, setLoading] = useState(true);
  const [fetchingCart, setFetchingCart] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const [cartItems, setCartItems] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH'); // 'CASH' | 'CARD' | 'WALLET'
  const [shippingFee, setShippingFee] = useState(0);

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg);
    setAlertType(type);
  };

  const loadTheme = useCallback(async () => {
    try {
      const mode = await AsyncStorage.getItem('ThemeMode');
      setTheme(mode === '2' ? checkoutDarkTheme : checkoutLightTheme);
    } catch {}
  }, []);

  const fetchAddresses = useCallback(async () => {
    const user = getCurrentUser();
    // TODO replaced firebase call: "const uid = auth.currentUser?.uid;"
    const uid = user?.uid;
    if (!uid) return;
    const list = await getUserAddresses(uid);
    setAddresses(list);
    const def = list.find(a => a.isDefault) || list[0] || null;
    setSelectedAddress(def);
  }, []);

  const onChangeAddressPress = React.useCallback(async () => {
    await fetchAddresses();
    setAddressModalVisible(true);
  }, [fetchAddresses]);

  const fetchCart = useCallback(async () => {
    setFetchingCart(true);
    try {
      const raw = await AsyncStorage.getItem('UserCart');
      const parsed = raw ? JSON.parse(raw) : [];
      setCartItems(Array.isArray(parsed) ? parsed : []);
    } finally {
      setFetchingCart(false);
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setLoading(true);
      await loadTheme();
      // TODO replaced firebase call: "if (!auth.currentUser) {"
      if (!getCurrentUser()) {
        showAlert('Login required', 'error');
        router.replace('/Authentication/Login');
        return;
      }
      await Promise.all([fetchAddresses(), fetchCart()]);
      setLoading(false);
    };
    init();
  }, [loadTheme, fetchAddresses, fetchCart]);

  useEffect(() => {
    const run = async () => {
      try {
        const city = selectedAddress?.City || '';
        if (!city) { setShippingFee(0); return; }
        // TODO replaced firebase call: "const fee = await getShippingFeeByCity(city);"
        const fee = await getShippingFeeByCity(city);
        setShippingFee(fee);
      } catch { setShippingFee(0); }
    };
    run();
  }, [selectedAddress]);

  const subtotal = useMemo(() => {
    return cartItems.reduce((sum, it) => {
      const { discounted } = computeProductPricing(it.product);
      const qty = Number(it.quantity) || 1;
      return sum + discounted * qty;
    }, 0);
  }, [cartItems]);

  const total = useMemo(() => subtotal + (cartItems.length ? shippingFee : 0), [subtotal, cartItems.length, shippingFee]);

  const onPlaceOrderPress = async () => {
    if (!selectedAddress) {
      showAlert('Select shipping address', 'error');
      return;
    }
    if (paymentMethod === 'CASH') {
      // TODO replaced firebase call: "const res = await placeOrderFromCart({"
      const res = await placeOrderFromCart({
        paymentMethod: 'CASH',
        addressSnapshot: selectedAddress,
        shippingFee
      });
      if (res.success) {
        showAlert('Order placed successfully');
        setTimeout(() => {
          router.replace('/(tabs)/home');
        }, 800);
      } else {
        showAlert(res.error || 'Failed to create order', 'error');
      }
    } else if (paymentMethod === 'CARD') {
      router.push({ pathname: './payment/card', params: { addressId: selectedAddress?.id || '' } });
    } else {
      router.push({ pathname: './payment/wallet', params: { addressId: selectedAddress?.id || '' } });
    }
  };

  const AddressRow = ({ label, value }) => (
    <Text style={[styles.addrLine, { color: theme.text }]} numberOfLines={1}>
      <Text style={[styles.addrLabel, { color: theme.muted }]}>{label}: </Text>{value || '-'}
    </Text>
  );

  const renderItem = ({ item }) => {
    const p = item.product || {};
    const { discounted } = computeProductPricing(p);
    const qty = Number(item.quantity) || 1;
    return (
      <View style={styles.itemRow}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
          {p.name || 'Product'}
        </Text>
        <Text style={[styles.itemQty, { color: theme.muted }]}>x{qty}</Text>
        <Text style={[styles.itemPrice, { color: theme.text }]}>{'$' + (discounted * qty).toFixed(2)}</Text>
      </View>
    );
  };

  const AddressSelectModal = () => (
    <Modal visible={addressModalVisible} transparent animationType="slide" onRequestClose={() => setAddressModalVisible(false)}>
      <Pressable style={styles.modalBackdrop} onPress={() => setAddressModalVisible(false)} />
      <View style={[styles.modalSheet, { backgroundColor: theme.card, borderTopColor: theme.border }]}>
        <Text style={[styles.modalTitle, { color: theme.text }]}>Choose Shipping Address</Text>
        <FlatList
          data={addresses}
          keyExtractor={(a) => a.id}
          renderItem={({ item }) => (
            <TouchableOpacity
              style={[styles.addrOption, { borderColor: (selectedAddress?.id === item.id) ? theme.accentColor : theme.border }]}
              onPress={() => {
                setSelectedAddress(item); // do not change default in DB
                setAddressModalVisible(false);
              }}
            >
              <Text style={[styles.addrName, { color: theme.text }]}>{item.FullName}</Text>
              <Text style={[styles.addrSmall, { color: theme.muted }]} numberOfLines={1}>
                {item.Street}
              </Text>
              <Text style={[styles.addrSmall, { color: theme.muted }]} numberOfLines={1}>
                {`${item.City}, ${item.State} ${item.ZIP}`}
              </Text>
              {item.isDefault ? (
                <Text style={[styles.defaultPill, { color: theme.accentColor }]}>(Default)</Text>
              ) : null}
            </TouchableOpacity>
          )}
          ListEmptyComponent={
            <Text style={{ color: theme.muted, textAlign: 'center', paddingVertical: 12 }}>
              No saved addresses found
            </Text>
          }
        />
        <TouchableOpacity
          style={[styles.manageBtn, { backgroundColor: theme.accentColor }]}
          onPress={() => {
            setAddressModalVisible(false);
            router.push('/(ProfileTabs)/address');
          }}
        >
          <Text style={styles.manageBtnText}>Manage Addresses</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: 'Checkout',
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {loading || fetchingCart ? (
          <View style={styles.center}>
            <ActivityIndicator size="large" color={theme.accentColor} />
          </View>
        ) : (
          <>
            {/* Shipping Address */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <View style={styles.cardHeader}>
                <Text style={[styles.cardTitle, { color: theme.text }]}>Shipping Address</Text>
                <TouchableOpacity onPress={onChangeAddressPress}>
                  <Text style={{ color: theme.accentColor, fontWeight: '600' }}>Change</Text>
                </TouchableOpacity>
              </View>
              {selectedAddress ? (
                <>
                  <AddressRow label="Name" value={selectedAddress.FullName} />
                  <AddressRow label="Street" value={selectedAddress.Street} />
                  <AddressRow label="City" value={`${selectedAddress.City}, ${selectedAddress.State} ${selectedAddress.ZIP}`} />
                  <AddressRow label="Phone" value={selectedAddress.Phone} />
                </>
              ) : (
                <Text style={{ color: theme.muted }}>No address selected</Text>
              )}
            </View>

            {/* Payment Method */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Payment Method</Text>
              <View style={styles.payRow}>
                {['CASH', 'CARD', 'WALLET'].map(key => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.payOption,
                      { borderColor: paymentMethod === key ? theme.accentColor : theme.border, backgroundColor: theme.pill }
                    ]}
                    onPress={() => setPaymentMethod(key)}
                  >
                    <Icon name={key === 'CASH' ? 'dollar-sign' : key === 'CARD' ? 'credit-card' : 'smartphone'} size={16} color={theme.text} />
                    <Text style={[styles.payText, { color: theme.text }]}>
                      {key === 'CASH' ? 'Cash' : key === 'CARD' ? 'VISA/MASTER' : 'Mobile Wallet'}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Order Summary */}
            <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
              <Text style={[styles.cardTitle, { color: theme.text }]}>Order Summary</Text>
              <FlatList
                data={cartItems}
                keyExtractor={(it) => it.productId}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: theme.border }]} />}
              />
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.muted }]}>Subtotal</Text>
                <Text style={[styles.sumVal, { color: theme.text }]}>{'$' + subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.muted }]}>Shipping</Text>
                <Text style={[styles.sumVal, { color: theme.text }]}>{cartItems.length ? '$' + shippingFee.toFixed(2) : '$0.00'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.totalVal, { color: theme.accentColor }]}>{'$' + total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Place Order */}
            <TouchableOpacity
              style={[styles.placeBtn, { backgroundColor: theme.accentColor }]}
              activeOpacity={0.9}
              onPress={onPlaceOrderPress}
              disabled={!cartItems.length}
            >
              <Text style={styles.placeText}>
                {paymentMethod === 'CASH' ? 'Place Order (Cash)' : paymentMethod === 'CARD' ? 'Continue to Card Payment' : 'Continue to Wallet Payment'}
              </Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <AddressSelectModal />

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
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  cardTitle: { fontSize: 16, fontWeight: '700', marginBottom: 6 },
  addrLine: { fontSize: 13, marginBottom: 4 },
  addrLabel: { fontWeight: '600' },
  payRow: { flexDirection: 'row', gap: 8 },
  payOption: { flexDirection: 'row', alignItems: 'center', paddingVertical: 10, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1 },
  payText: { marginLeft: 6, fontWeight: '600', fontSize: 12 },
  itemRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { flex: 1, fontSize: 13, fontWeight: '600' },
  itemQty: { width: 36, textAlign: 'center', fontSize: 12 },
  itemPrice: { width: 90, textAlign: 'right', fontSize: 13, fontWeight: '700' },
  sep: { height: 1, marginVertical: 8, opacity: 0.6 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  sumLabel: { fontSize: 13 },
  sumVal: { fontSize: 13, fontWeight: '700' },
  totalLabel: { fontSize: 15, fontWeight: '800', marginTop: 8 },
  totalVal: { fontSize: 18, fontWeight: '900', marginTop: 8 },
  placeBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 12, marginTop: 8 },
  placeText: { color: '#fff', fontWeight: '800', marginRight: 8 },

  modalBackdrop: { flex: 1, backgroundColor: '#0008' },
  modalSheet: { position: 'absolute', left: 0, right: 0, bottom: 0, maxHeight: '70%', padding: 14, borderTopLeftRadius: 16, borderTopRightRadius: 16, borderTopWidth: 1 },
  modalTitle: { fontSize: 16, fontWeight: '700', marginBottom: 10 },
  addrOption: { borderWidth: 1, borderRadius: 10, padding: 10, marginBottom: 8 },
  addrName: { fontWeight: '700', fontSize: 14 },
  addrSmall: { fontSize: 12 },
  defaultPill: { fontSize: 12, fontWeight: '700', marginTop: 4 },
  manageBtn: { marginTop: 8, paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  manageBtnText: { color: '#fff', fontWeight: '800' },
});

export default Checkout;
