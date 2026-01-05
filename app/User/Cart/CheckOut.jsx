import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, Stack } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, FlatList, Image, Modal, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { createOrderFromCheckout, getProductsByIds, updateUserData } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { checkoutDarkTheme, checkoutLightTheme } from '../../../Theme/Cart/checkoutTheme';
import MiniAlert from '../../GeneralComponent/MiniAlert';

const computePricing = (product = {}) => {
  const price = Number(product.price) || 0;
  const discount = Number(product.discount) || 0;
  const finalPrice = Math.max(0, price - (price * discount / 100));
  return { price, discount, finalPrice };
};

const Checkout = () => {
  const [theme, setTheme] = useState(checkoutLightTheme);
  const [initializing, setInitializing] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [placingOrder, setPlacingOrder] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [showConfirmation, setShowConfirmation] = useState(false);
  const confirmationTimerRef = useRef(null);

  const [addresses, setAddresses] = useState([]);
  const [selectedAddress, setSelectedAddress] = useState(null);
  const [addressModalVisible, setAddressModalVisible] = useState(false);

  const [products, setProducts] = useState([]);
  const [paymentMethod, setPaymentMethod] = useState('CASH');
  const [shippingFee, setShippingFee] = useState(0);
  const [regionFees, setRegionFees] = useState({});

  const currentUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const isLoggedIn = useUserStore((state) => state.isLoggedIn);
  const userId = currentUser?.uid ? String(currentUser.uid) : null;

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg);
    setAlertType(type);
  };

  const loadTheme = useCallback(async () => {
    try {
      const mode = await AsyncStorage.getItem('ThemeMode');
      setTheme(mode === '2' ? checkoutDarkTheme : checkoutLightTheme);
    } catch { }
  }, []);

  const loadRegionFees = useCallback(async () => {
    try {
      const cached = await AsyncStorage.getItem('unUpadtingManageDocs');
      if (!cached) {
        setRegionFees({});
        return;
      }
      const parsed = JSON.parse(cached);
      const feeMap = parsed?.RegionFee;
      if (feeMap && typeof feeMap === 'object') {
        setRegionFees(feeMap);
      } else {
        setRegionFees({});
      }
    } catch {
      setRegionFees({});
    }
  }, []);

  useEffect(() => {
    const init = async () => {
      setInitializing(true);
      await Promise.all([loadTheme(), loadRegionFees()]);
      setInitializing(false);
    };
    init();
  }, [loadTheme, loadRegionFees]);

  useEffect(() => {
    return () => {
      if (confirmationTimerRef.current) clearTimeout(confirmationTimerRef.current);
    };
  }, []);

  useEffect(() => {
    if (initializing) return;
    if (!isLoggedIn || !currentUser) {
      showAlert('Login required', 'error');
      router.replace('../../Authentication/Login');
    }
  }, [currentUser, initializing, isLoggedIn]);

  useEffect(() => {
    const list = Array.isArray(currentUser?.Addresses) ? currentUser.Addresses : [];
    setAddresses(list);
    setSelectedAddress((prev) => {
      if (prev) {
        const existing = list.find((addr) => addr.id === prev.id);
        if (existing) return existing;
      }
      return list.find((addr) => addr.isDefault) || list[0] || null;
    });
  }, [currentUser?.Addresses]);

  const cartEntries = useMemo(() => {
    const rawCart = currentUser?.Cart;
    if (!Array.isArray(rawCart)) return [];
    return rawCart
      .filter((entry) => entry && entry.productId)
      .map((entry) => ({
        productId: String(entry.productId),
        quantity: Number(entry.quantity) > 0 ? Number(entry.quantity) : 1,
      }));
  }, [currentUser?.Cart]);

  const cartProductIds = useMemo(() => {
    const seen = new Set();
    return cartEntries
      .map((entry) => String(entry.productId))
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      });
  }, [cartEntries]);

  const cartIdsKey = useMemo(() => {
    if (!cartProductIds.length) return '';
    return [...cartProductIds].sort().join(',');
  }, [cartProductIds]);

  useEffect(() => {
    let active = true;
    if (!cartProductIds.length) {
      setProducts([]);
      setLoadingProducts(false);
      return () => { active = false; };
    }

    setLoadingProducts(true);
    (async () => {
      try {
        const res = await getProductsByIds(cartProductIds);
        if (!active) return;
        setProducts(res || []);
      } catch {
        if (active) setProducts([]);
      } finally {
        if (active) setLoadingProducts(false);
      }
    })();

    return () => {
      active = false;
    };
  }, [cartIdsKey, cartProductIds]);

  useEffect(() => {
    const city = selectedAddress?.City;
    if (!city) {
      setShippingFee(0);
      return;
    }

    const fee = regionFees && typeof regionFees === 'object' ? regionFees[city] : 0;
    const numericFee = Number(fee);
    setShippingFee(isNaN(numericFee) ? 0 : numericFee);
  }, [regionFees, selectedAddress]);

  const mergedItems = useMemo(() => {
    if (!cartEntries.length) return [];
    const map = new Map(products.map((p) => [String(p.id), p]));
    return cartEntries.map((entry) => ({
      productId: entry.productId,
      quantity: entry.quantity,
      product: map.get(String(entry.productId)) || {},
    }));
  }, [cartEntries, products]);

  const subtotal = useMemo(() => {
    return mergedItems.reduce((sum, it) => {
      const { finalPrice } = computePricing(it.product);
      const qty = Number(it.quantity) || 1;
      return sum + finalPrice * qty;
    }, 0);
  }, [mergedItems]);

  const total = useMemo(() => subtotal + (mergedItems.length ? shippingFee : 0), [subtotal, mergedItems.length, shippingFee]);

  const orderedProducts = useMemo(() => {
    return mergedItems.map(({ product, quantity }) => {
      const qty = Number(quantity) || 1;
      const { price, discount, finalPrice } = computePricing(product);
      return {
        productId: product.id || '',
        name: product.name || '',
        description: product.description || '',
        image: product.image || '',
        category: product.category || '',
        price,
        discount,
        finalPrice,
        quantity: qty,
        totalItemPrice: finalPrice * qty,
      };
    });
  }, [mergedItems]);

  const baseOrderPayload = useMemo(() => ({
    userId,
    OrderedProducts: orderedProducts,
    addressSnapshot: selectedAddress,
    paymentMethod: 'CASH',
    paymentDetails: null,
    shippingFee,
    subtotal,
    total,
  }), [orderedProducts, selectedAddress, shippingFee, subtotal, total, userId]);

  const onChangeAddressPress = useCallback(() => {
    setAddressModalVisible(true);
  }, []);

  const onPlaceOrderPress = async () => {

    if (!mergedItems.length) {
      showAlert('Cart is empty', 'error');
      return;
    }

    if (!selectedAddress) {
      showAlert('Select shipping address', 'error');
      return;
    }

    const payloadForPayment = { ...baseOrderPayload, paymentMethod };

    if (paymentMethod === 'CARD') {
      router.push({ pathname: './Payments/BankCard', params: { payload: JSON.stringify(payloadForPayment) } });
      return;
    }

    if (paymentMethod === 'WALLET') {
      router.push({ pathname: './Payments/MobileWallet', params: { payload: JSON.stringify(payloadForPayment) } });
      return;
    }

    setPlacingOrder(true);
    try {
      const res = await createOrderFromCheckout(baseOrderPayload);
      if (!res?.success) {
        showAlert(res?.error || 'Failed to create order', 'error');
        return;
      }

      setUser({ ...(currentUser || {}), Cart: [] });
      const syncRes = await updateUserData(userId, { Cart: [] });
      if (!syncRes?.success) {
        showAlert('Order placed but cart sync failed', 'error');
        return;
      }

      setShowConfirmation(true);
      confirmationTimerRef.current = setTimeout(() => {
        setShowConfirmation(false);
        router.replace('../(MainTaps)/Home');
      }, 4000);
    } catch (_error) {
      showAlert('Failed to place order', 'error');
    } finally {
      setPlacingOrder(false);
    }
  };

  const AddressRow = ({ label, value }) => (
    <Text style={[styles.addrLine, { color: theme.text }]} numberOfLines={1}>
      <Text style={[styles.addrLabel, { color: theme.muted }]}>{label}: </Text>{value || '-'}
    </Text>
  );

  const renderItem = ({ item }) => {
    const p = item.product || {};
    const { finalPrice } = computePricing(p);
    const qty = Number(item.quantity) || 1;
    return (
      <View style={styles.itemRow}>
        <Text style={[styles.itemName, { color: theme.text }]} numberOfLines={1}>
          {p.name || 'Product'}
        </Text>
        <Text style={[styles.itemQty, { color: theme.muted }]}>x{qty}</Text>
        <Text style={[styles.itemPrice, { color: theme.text }]}>{'$' + (finalPrice * qty).toFixed(2)}</Text>
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
          keyExtractor={(a, index) => a?.id || a?.FullName || String(index)}
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
            router.push('../(ProfileTabs)/Address');
          }}
        >
          <Text style={styles.manageBtnText}>Manage Addresses</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );

  const isLoading = initializing || loadingProducts;

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
        {isLoading ? (
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
                data={mergedItems}
                keyExtractor={(it) => it.productId}
                renderItem={renderItem}
                ItemSeparatorComponent={() => <View style={[styles.sep, { backgroundColor: theme.border }]} />}
                ListEmptyComponent={
                  <Text style={{ color: theme.muted, textAlign: 'center', paddingVertical: 12 }}>
                    Your cart is empty
                  </Text>
                }
              />
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.muted }]}>Subtotal</Text>
                <Text style={[styles.sumVal, { color: theme.text }]}>{'$' + subtotal.toFixed(2)}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.sumLabel, { color: theme.muted }]}>Shipping Fees</Text>
                <Text style={[styles.sumVal, { color: theme.text }]}>{mergedItems.length ? '$' + shippingFee.toFixed(2) : '$0.00'}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={[styles.totalLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.totalVal, { color: theme.accentColor }]}>{'$' + total.toFixed(2)}</Text>
              </View>
            </View>

            {/* Place Order */}
            <TouchableOpacity
              style={[styles.placeBtn, { backgroundColor: theme.accentColor, opacity: placingOrder || !mergedItems.length ? 0.75 : 1 }]}
              activeOpacity={0.9}
              onPress={onPlaceOrderPress}
              disabled={!mergedItems.length || placingOrder}
            >
              <Text style={styles.placeText}>
                {placingOrder
                  ? 'Placing Order...'
                  : paymentMethod === 'CASH'
                    ? 'Place Order (Cash)'
                    : paymentMethod === 'CARD'
                      ? 'Continue to Card Payment'
                      : 'Continue to Wallet Payment'}
              </Text>
              <Icon name="arrow-right" size={18} color="#fff" />
            </TouchableOpacity>
          </>
        )}
      </View>

      <AddressSelectModal />

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

export default Checkout;
