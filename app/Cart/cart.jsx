import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import MiniAlert from '../../components/Component/MiniAlert';
import { auth, clearUserCart, getDocument, getUserCart, removeCartItem, updateCartItemQuantity } from '../../Firebase/Firebase';
import { cartDarkTheme, cartLightTheme } from '../../Theme/Cart/cartTheme';

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

// Helper: compute maximum allowed purchase quantity for a product
const getMaxAllowedForProduct = (product = {}) => {
  const stock = Number(product.stockQuantity);
  const perOrder = Number(product.AvilableQuantityBerOeder);
  const validStock = !isNaN(stock) && stock > 0 ? stock : Infinity;
  const validPerOrder = !isNaN(perOrder) && perOrder > 0 ? perOrder : Infinity;
  const maxAllowed = Math.min(validStock, validPerOrder);
  return maxAllowed === Infinity ? (isNaN(stock) ? 9999 : stock) : maxAllowed;
};

const CartPage = () => {
  const router = useRouter();
  const [theme, setTheme] = useState(cartLightTheme);
  const [cartItems, setCartItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [fetchingProducts, setFetchingProducts] = useState(false);

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg);
    setAlertType(type);
    setTimeout(() => setAlertMsg(null), 2500);
  };

  const loadTheme = useCallback(async () => {
    try {
      const mode = await AsyncStorage.getItem('ThemeMode');
      setTheme(mode === '2' ? cartDarkTheme : cartLightTheme);
    } catch {}
  }, []);

  const checkLogin = useCallback(async () => {
    try {
      const userJson = await AsyncStorage.getItem('UserObject');
      setIsLoggedIn(!!auth.currentUser || (userJson && userJson !== 'undefined'));
    } catch {
      setIsLoggedIn(false);
    }
  }, []);

  const loadCartFromFirestore = useCallback(async () => {
    if (!auth.currentUser) {
      setCartItems([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const rawCart = await getUserCart(auth.currentUser.uid);
      if (!rawCart.length) {
        setCartItems([]);
        return;
      }
      setFetchingProducts(true);
      const enriched = [];
      for (const entry of rawCart) {
        try {
          const prodRes = await getDocument('products', entry.productId);
          if (prodRes.success) {
            enriched.push({
              productId: entry.productId,
              quantity: entry.quantity || 1,
              product: prodRes.data
            });
          }
        } catch {}
      }
      // Clamp any quantities that exceed constraints
      const adjusted = [];
      for (const ci of enriched) {
        const maxAllowed = getMaxAllowedForProduct(ci.product);
        let q = ci.quantity || 1;
        if (q > maxAllowed) {
          q = maxAllowed < 1 ? 1 : maxAllowed;
          // persist correction
          await updateCartItemQuantity(auth.currentUser?.uid, ci.productId, q);
        }
        adjusted.push({ ...ci, quantity: q });
      }
      setCartItems(adjusted);
    } finally {
      setFetchingProducts(false);
      setLoading(false);
    }
  }, []);

  // Persist enriched cart snapshot for Checkout/Card/Wallet screens
  useEffect(() => {
    const persist = async () => {
      try {
        await AsyncStorage.setItem('UserCart', JSON.stringify(cartItems || []));
      } catch {}
    };
    persist();
  }, [cartItems]);

  useEffect(() => {
    loadTheme();
    const interval = setInterval(loadTheme, 1000);
    return () => clearInterval(interval);
  }, [loadTheme]);

  useEffect(() => {
    checkLogin();
  }, [checkLogin, auth.currentUser]);

  useEffect(() => {
    loadCartFromFirestore();
  }, [loadCartFromFirestore, auth.currentUser]);

  const updateQuantity = async (productId, delta) => {
    const target = cartItems.find(c => c.productId === productId);
    if (!target) return;
    const product = target.product || {};
    const maxAllowed = getMaxAllowedForProduct(product);
    const current = target.quantity || 1;
    // Prevent going below 1
    if (delta < 0 && current <= 1) {
      showAlert('Minimum quantity is 1', 'error');
      return;
    }
    let desired = current + delta;
    if (desired < 1) desired = 1;
    if (desired > maxAllowed) {
      const stock = Number(product.stockQuantity);
      const perOrder = Number(product.AvilableQuantityBerOeder);
      if (!isNaN(perOrder) && perOrder > 0 && maxAllowed === perOrder) {
        showAlert(`Max per order is ${perOrder}`, 'error');
      } else if (!isNaN(stock) && stock > 0) {
        showAlert(`Only ${stock} in stock`, 'error');
      } else {
        showAlert('Cannot increase quantity', 'error');
      }
      desired = Math.min(current, maxAllowed);
    }
    if (desired === current) return;
    setCartItems(prev =>
      prev.map(ci =>
        ci.productId === productId ? { ...ci, quantity: desired } : ci
      )
    );
    await updateCartItemQuantity(auth.currentUser?.uid, productId, desired);
  };

  const removeItem = async (productId) => {
    setCartItems(prev => prev.filter(ci => ci.productId !== productId));
    await removeCartItem(auth.currentUser?.uid, productId);
    showAlert('Item removed', 'success');
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          setCartItems([]);
          await clearUserCart(auth.currentUser?.uid);
          // AsyncStorage will be updated by the cartItems effect
          showAlert('Cart cleared', 'success');
        }
      }
    ]);
  };

  const totalItems = cartItems.reduce((s, it) => s + (Number(it.quantity) || 1), 0);
  const grandTotal = cartItems.reduce((sum, it) => {
    const { discounted } = computeProductPricing(it.product);
    const qty = Number(it.quantity) || 1;
    return sum + discounted * qty;
  }, 0);

  const formatPrice = (n) => '$' + (n || 0).toFixed(2);

  const handleCheckout = () => {
    if (!isLoggedIn) {
      showAlert('Login required', 'error');
      return;
    }
    if (cartItems.length === 0) {
      showAlert('Cart is empty', 'error');
      return;
    }
    router.push('./checkout');
  };

  const renderItem = ({ item }) => {
    const qty = item.quantity || 1;
    const p = item.product || {};
    const { base, discounted, discountPercent } = computeProductPricing(p);
    const hasDiscount = discountPercent > 0 && discounted < base;
    const maxAllowed = getMaxAllowedForProduct(p);
    const disablePlus = qty >= maxAllowed;
    const disableMinus = qty <= 1;

    return (
      <View style={[styles.itemContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.searchBarShadow }]}>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={styles.imageWrapper}
            onPress={() => router.push({ pathname: '/Pages/singlepage', params: { id: item.productId } })}
          >
            {p.image ? (
              <Image
                source={{ uri: p.image }}
                style={styles.itemImage}
                resizeMode="cover"
                defaultSource={require('../../assets/images/loading-buffering.gif')}
              />
            ) : (
              <View style={[styles.itemImage, { justifyContent: 'center', alignItems: 'center' }]}>
                <Icon name="image" size={22} color={theme.inputPlaceholder} />
              </View>
            )}
          </TouchableOpacity>
          {hasDiscount && (
            <View style={[styles.discountBadge, { backgroundColor: theme.accentColor }]}>
              <Text style={styles.discountBadgeText}>-{discountPercent}%</Text>
            </View>
          )}
        </View>
        <View style={styles.itemInfo}>
          <Text style={[styles.itemTitle, { color: theme.text }]} numberOfLines={2}>{p.name || 'Unknown product'}</Text>
          <View style={styles.priceRow}>
            <Text style={[styles.itemPrice, { color: theme.accentColor }]}>
              {formatPrice(discounted)}
            </Text>
            {hasDiscount && (
              <Text style={[styles.originalPrice, { color: theme.inputPlaceholder }]}>
                {formatPrice(base)}
              </Text>
            )}
          </View>
          <View style={styles.qtyRow}>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.headerIconBackground, opacity: disableMinus ? 0.4 : 1 }]}
              disabled={disableMinus}
              onPress={() => updateQuantity(item.productId, -1)}
            >
              <Icon name="minus" size={16} color={theme.headerIconColor} />
            </TouchableOpacity>
            <Text style={[styles.qtyValue, { color: theme.text }]}>{qty}</Text>
            <TouchableOpacity
              style={[styles.qtyBtn, { backgroundColor: theme.headerIconBackground, opacity: disablePlus ? 0.4 : 1 }]}
              disabled={disablePlus}
              onPress={() => updateQuantity(item.productId, +1)}
            >
              <Icon name="plus" size={16} color={theme.headerIconColor} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.removeBtn} onPress={() => removeItem(item.productId)}>
              <Icon name="trash-2" size={18} color={theme.errorText || '#e53935'} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <>
      <Stack.Screen
        options={{
          headerShown: true,
          title: `Cart (${totalItems})`,
          headerStyle: { backgroundColor: theme.background },
          headerTintColor: theme.text,
          headerRight: () => (
            cartItems.length > 0 ? (
              <TouchableOpacity onPress={clearCart} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <Icon name="x-circle" size={20} color={theme.accentColor} />
                <Text style={{ color: theme.accentColor, marginLeft: 6, fontSize: 12, fontWeight: '600' }}>Delete All</Text>
              </TouchableOpacity>
            ) : null
          )
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {!isLoggedIn ? (
          <View style={styles.emptyContainer}>
            <Icon name="lock" size={70} color={theme.accentColor} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Login to view your cart</Text>
            <TouchableOpacity
              style={[styles.shopBtn, { backgroundColor: theme.accentColor }]}
              onPress={() => router.push('/Authentication/Login')}
            >
              <Text style={styles.shopBtnText}>Login</Text>
            </TouchableOpacity>
          </View>
        ) : loading || fetchingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.loadingIndicator || theme.accentColor} />
          </View>
        ) : cartItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shopping-cart" size={70} color={theme.accentColor} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Your cart is empty</Text>
            <TouchableOpacity
              style={[styles.shopBtn, { backgroundColor: theme.accentColor }]}
              onPress={() => router.push('/(tabs)/home')}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={cartItems}
              keyExtractor={(it) => it.productId?.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ paddingBottom: 140 }}
              showsVerticalScrollIndicator={false}
            />
            <View style={[styles.footer, { backgroundColor: theme.cardBackground, shadowColor: theme.searchBarShadow }]}>
              <View style={[styles.totalRow, { marginTop: 4 }]}>
                <Text style={[styles.grandLabel, { color: theme.text }]}>Total</Text>
                <Text style={[styles.grandValue, { color: theme.accentColor }]}>{formatPrice(grandTotal)}</Text>
              </View>
              <TouchableOpacity
                style={[styles.checkoutBtn, { backgroundColor: theme.accentColor }]}
                onPress={handleCheckout}
                activeOpacity={0.85}
              >
                <Text style={styles.checkoutText}>Proceed to Checkout</Text>
                <Icon name="arrow-right" size={18} color="#fff" />
              </TouchableOpacity>
            </View>
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
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  emptyText: { fontSize: 18, fontWeight: '600', marginTop: 16, marginBottom: 20, textAlign: 'center' },
  shopBtn: { paddingHorizontal: 24, paddingVertical: 12, borderRadius: 25 },
  shopBtnText: { color: '#fff', fontWeight: '600', fontSize: 14 },
  itemContainer: {
    flexDirection: 'row',
    borderRadius: 14,
    padding: 12,
    marginBottom: 14,
    elevation: 2,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4
  },
  imageWrapper: { width: 90, height: 90, borderRadius: 10, overflow: 'hidden', marginRight: 12 },
  itemImage: { width: '100%', height: '100%' },
  itemInfo: { flex: 1, justifyContent: 'space-between' },
  itemTitle: { fontSize: 14, fontWeight: '600' },
  priceRow: { flexDirection: 'row', alignItems: 'center', marginTop: 4 },
  itemPrice: { marginTop: 4, fontSize: 15, fontWeight: '700' },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginLeft: 8,
    fontWeight: '500'
  },
  discountBadge: {
    position: 'absolute',
    top: 4,
    left: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6
  },
  discountBadgeText: { color: '#fff', fontSize: 10, fontWeight: '700' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', marginTop: 10 },
  qtyBtn: { width: 32, height: 32, borderRadius: 8, justifyContent: 'center', alignItems: 'center' },
  qtyValue: { width: 36, textAlign: 'center', fontSize: 15, fontWeight: '600' },
  removeBtn: { marginLeft: 'auto', padding: 6 },
  footer: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 24,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    elevation: 12,
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.15,
    shadowRadius: 8
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  totalLabel: { fontSize: 16, fontWeight: '600' },
  totalValue: { fontSize: 18, fontWeight: '700' },
  savingsLabel: { fontSize: 14, fontWeight: '600' },
  savingsValue: { fontSize: 16, fontWeight: '700' },
  checkoutBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 30
  },
  checkoutText: { color: '#fff', fontWeight: '700', fontSize: 15, marginRight: 8 },
  grandLabel: { fontSize: 16, fontWeight: '700' },
  grandValue: { fontSize: 20, fontWeight: '800' },
});

export default CartPage;