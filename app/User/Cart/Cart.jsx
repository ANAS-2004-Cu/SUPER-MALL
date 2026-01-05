import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Alert, FlatList, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { getProductsByIds, updateUserData } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { cartDarkTheme, cartLightTheme } from '../../../Theme/Cart/cartTheme';
import MiniAlert from '../../GeneralComponent/MiniAlert';

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
  const [products, setProducts] = useState([]);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');

  const currentUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const userId = currentUser?.uid ? String(currentUser.uid) : null;

  const showAlert = (msg, type = 'success') => {
    setAlertMsg(msg);
    setAlertType(type);
    setTimeout(() => setAlertMsg(null), 2500);
  };

  const loadTheme = useCallback(async () => {
    try {
      const mode = await AsyncStorage.getItem('ThemeMode');
      setTheme(mode === '2' ? cartDarkTheme : cartLightTheme);
    } catch { }
  }, []);

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
    loadTheme();
    const interval = setInterval(loadTheme, 1000);
    return () => clearInterval(interval);
  }, [loadTheme]);

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
  }, [cartIdsKey]);

  const persistCart = useCallback(
    async (nextCart) => {
      if (!currentUser || !userId) return false;
      const previousUser = currentUser;
      setUser({ ...previousUser, Cart: nextCart });
      const result = await updateUserData(userId, { Cart: nextCart });
      if (!result?.success) {
        setUser(previousUser);
        return false;
      }
      return true;
    },
    [currentUser, setUser, userId]
  );

  const updateQuantity = async (productId, delta) => {
    const target = cartEntries.find((c) => String(c.productId) === String(productId));
    if (!target) return;
    const product = products.find((p) => String(p.id) === String(productId)) || {};
    const maxAllowed = getMaxAllowedForProduct(product);
    const currentQty = target?.quantity || 1;
    let desired = currentQty + delta;

    if (desired < 1) {
      showAlert('Minimum quantity is 1', 'error');
      return;
    }

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
      return;
    }

    if (desired === currentQty) return;

    const nextCart = cartEntries.map((entry) => {
      if (String(entry.productId) !== String(productId)) return entry;
      return { productId: String(productId), quantity: desired };
    });

    const ok = await persistCart(nextCart);
    if (!ok) {
      showAlert('Failed to update cart', 'error');
    }
  };

  const removeItem = async (productId) => {
    const nextCart = cartEntries.filter((entry) => String(entry.productId) !== String(productId));
    const ok = await persistCart(nextCart);
    if (!ok) {
      showAlert('Failed to remove item', 'error');
    } else {
      showAlert('Item removed', 'success');
    }
  };

  const clearCart = () => {
    Alert.alert('Clear Cart', 'Remove all items?', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Yes',
        style: 'destructive',
        onPress: async () => {
          const ok = await persistCart([]);
          if (!ok) {
            showAlert('Failed to clear cart', 'error');
            return;
          }
          showAlert('Cart cleared', 'success');
        }
      }
    ]);
  };

  const mergedItems = useMemo(() => {
    if (!cartEntries.length) return [];
    const map = new Map(products.map((p) => [String(p.id), p]));
    return cartEntries.map((entry) => ({
      productId: entry.productId,
      quantity: entry.quantity,
      product: map.get(String(entry.productId)) || {},
    }));
  }, [cartEntries, products]);

  const totalItems = cartEntries.length;
  const grandTotal = mergedItems.reduce((sum, it) => {
    const { discounted } = computeProductPricing(it.product);
    const qty = Number(it.quantity) || 1;
    return sum + discounted * qty;
  }, 0);

  const formatPrice = (n) => {
    const num = Number(n);
    const safe = isNaN(num) ? 0 : num;
    return '$' + safe.toFixed(2);
  };

  const handleCheckout = () => {
    if (!mergedItems.length) {
      showAlert('Cart is empty', 'error');
      return;
    }
    router.push('./CheckOut');
  };

  const renderItem = ({ item }) => {
    const qty = item.quantity || 1;
    const p = item.product || {};
    const { base, discounted, discountPercent } = computeProductPricing(p);
    const hasDiscount = discountPercent > 0 && discounted < base;
    const maxAllowed = getMaxAllowedForProduct(p);
    const disablePlus = qty >= maxAllowed;
    const disableMinus = qty <= 1;
    const totalPrice = discounted * qty;
    const originalTotal = base * qty;

    return (
      <View style={[styles.itemContainer, { backgroundColor: theme.cardBackground, shadowColor: theme.searchBarShadow }]}>
        <View style={{ position: 'relative' }}>
          <TouchableOpacity
            style={styles.imageWrapper}
            onPress={() => router.push({ pathname: '../Pages/SinglePage', params: { id: item.productId } })}
          >
            {p.image ? (
              <Image
                source={{ uri: p.image }}
                style={styles.itemImage}
                resizeMode="cover"
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
            <View>
              <Text style={[styles.itemPrice, { color: theme.accentColor }]}>
                {formatPrice(totalPrice)}
              </Text>
              {hasDiscount && (
                <Text style={[styles.originalPrice, { color: theme.inputPlaceholder }]}>
                  {formatPrice(originalTotal)}
                </Text>
              )}
            </View>
            <Text style={[styles.perItemPrice, { color: theme.inputPlaceholder }]}>
              {formatPrice(discounted)} / Piece
            </Text>
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
            mergedItems.length > 0 ? (
              <TouchableOpacity onPress={clearCart} style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12 }}>
                <Icon name="x-circle" size={20} color={theme.accentColor} />
                <Text style={{ color: theme.accentColor, marginLeft: 6, fontSize: 12, fontWeight: '600' }}>Delete All</Text>
              </TouchableOpacity>
            ) : null
          )
        }}
      />
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {loadingProducts ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={theme.loadingIndicator || theme.accentColor} />
          </View>
        ) : mergedItems.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon name="shopping-cart" size={70} color={theme.accentColor} />
            <Text style={[styles.emptyText, { color: theme.text }]}>Your cart is empty</Text>
            <TouchableOpacity
              style={[styles.shopBtn, { backgroundColor: theme.accentColor }]}
              onPress={() => router.push('../(MainTaps)/Home')}
            >
              <Text style={styles.shopBtnText}>Start Shopping</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <>
            <FlatList
              data={mergedItems}
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
  priceRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between', marginTop: 4 },
  itemPrice: { marginTop: 4, fontSize: 15, fontWeight: '700' },
  originalPrice: {
    fontSize: 12,
    textDecorationLine: 'line-through',
    marginTop: 2,
    fontWeight: '500'
  },
  perItemPrice: { fontSize: 12, fontWeight: '700' },
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