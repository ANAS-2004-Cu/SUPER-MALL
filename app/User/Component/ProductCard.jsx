import { useRouter } from 'expo-router';
import { useMemo } from "react";
import { Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import FAIcon from 'react-native-vector-icons/FontAwesome';
import { updateUserData } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { lightTheme } from '../../../Theme/Component/ProductCardTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width / 2) - 24;

const getMaxAllowedForProduct = (product = {}) => {
  const stock = Number(product.stockQuantity);
  const perOrder = Number(product.AvilableQuantityBerOeder);
  const validStock = !isNaN(stock) && stock > 0 ? stock : Infinity;
  const validPerOrder = !isNaN(perOrder) && perOrder > 0 ? perOrder : Infinity;
  const maxAllowed = Math.min(validStock, validPerOrder);
  return maxAllowed === Infinity ? (isNaN(stock) ? 9999 : stock) : maxAllowed;
};

const ProductCard = ({
  item,
  onShowAlert,
  theme = null,
}) => {
  const router = useRouter();
  const storeUser = useUserStore((state) => state.user);
  const setUser = useUserStore((state) => state.setUser);
  const currentUser = storeUser || null;
  const userId = currentUser?.uid || null;
  const showAlert = typeof onShowAlert === 'function' ? onShowAlert : () => { };

  const resolvedTheme = theme || lightTheme;
  const themedStyles = useMemo(() => styles(resolvedTheme), [resolvedTheme]);

  const favoriteIds = useMemo(() => {
    const favs = currentUser?.Fav;
    return Array.isArray(favs) ? favs.map((f) => String(f)) : [];
  }, [currentUser?.Fav]);

  const cartItems = useMemo(() => {
    const rawCart = currentUser?.Cart;
    if (!Array.isArray(rawCart)) {
      return [];
    }
    return rawCart
      .filter((entry) => entry && entry.productId)
      .map((entry) => ({
        productId: String(entry.productId),
        quantity: Number(entry.quantity) || 0,
      }));
  }, [currentUser?.Cart]);

  const isFavorite = useMemo(
    () => favoriteIds.includes(String(item.id)),
    [favoriteIds, item.id],
  );

  const isInStock = item.stockQuantity === undefined || item.stockQuantity > 0;

  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  const applyDiscount = (price, discount = 0) => Math.floor(price - (price * discount) / 100);

  const getCartQuantity = (productId) => {
    const cartItem = cartItems.find((c) => String(c.productId) === String(productId));
    return cartItem ? cartItem.quantity : 0;
  };

  const persistUserField = async (payload, nextUserSnapshot) => {
    if (!currentUser || !userId) return false;
    const previousUser = currentUser;
    setUser(nextUserSnapshot || null);
    const result = await updateUserData(String(userId), payload);
    if (!result?.success) {
      setUser(previousUser || null);
    }
    return Boolean(result?.success);
  };

  const handleAddToCart = async () => {
    if (!currentUser) {
      return showAlert('Please sign in to add products to your shopping cart', 'error');
    }

    if (!isInStock) {
      return showAlert('This item is currently out of stock', 'error');
    }

    const existingQty = getCartQuantity(item.id);
    const newQty = existingQty > 0 ? existingQty + 1 : 1;
    const maxAllowed = getMaxAllowedForProduct(item);

    if (newQty > maxAllowed) {
      if (!isNaN(Number(item.AvilableQuantityBerOeder))) {
        showAlert(`Max per order is ${item.AvilableQuantityBerOeder}`, 'error');
      } else if (!isNaN(Number(item.stockQuantity))) {
        showAlert(`Only ${item.stockQuantity} in stock`, 'error');
      } else {
        showAlert('Cannot increase quantity', 'error');
      }
      return;
    }

    const updatedCart = [...cartItems];
    const existingIndex = updatedCart.findIndex((c) => String(c.productId) === String(item.id));
    if (existingIndex >= 0) {
      updatedCart[existingIndex] = { ...updatedCart[existingIndex], quantity: newQty };
    } else {
      updatedCart.push({ productId: String(item.id), quantity: newQty });
    }

    const nextUserSnapshot = { ...currentUser, Cart: updatedCart };
    const ok = await persistUserField({ Cart: updatedCart }, nextUserSnapshot);
    if (!ok) {
      return showAlert('Failed to add product to cart', 'error');
    }
    showAlert(`${item.name.split(' ').slice(0, 2).join(' ')} Added to cart`);
  };

  const updateCartQuantity = async (newQuantity) => {
    if (!currentUser) return;

    const maxAllowed = getMaxAllowedForProduct(item);
    if (newQuantity > maxAllowed) {
      if (!isNaN(Number(item.AvilableQuantityBerOeder)) && maxAllowed === Number(item.AvilableQuantityBerOeder)) {
        showAlert(`Max per order is ${item.AvilableQuantityBerOeder}`, 'error');
      } else if (!isNaN(Number(item.stockQuantity))) {
        showAlert(`Only ${item.stockQuantity} in stock`, 'error');
      } else {
        showAlert('Cannot increase quantity', 'error');
      }
      return;
    }

    const updatedCart = cartItems
      .map((entry) => ({ ...entry }))
      .filter((entry) => String(entry.productId) !== String(item.id));

    if (newQuantity > 0) {
      updatedCart.push({ productId: String(item.id), quantity: newQuantity });
    }

    const nextUserSnapshot = { ...currentUser, Cart: updatedCart };
    const ok = await persistUserField({ Cart: updatedCart }, nextUserSnapshot);
    if (!ok) {
      showAlert('Failed to update cart', 'error');
    }
  };

  const toggleFavorite = async () => {
    if (!currentUser) {
      return showAlert('Please sign in to add to favorites', 'error');
    }
    const nextFavorites = isFavorite
      ? favoriteIds.filter((favId) => favId !== String(item.id))
      : [...favoriteIds, String(item.id)];
    const nextUserSnapshot = { ...currentUser, Fav: nextFavorites };
    const ok = await persistUserField({ Fav: nextFavorites }, nextUserSnapshot);
    if (!ok) {
      return showAlert('Failed to update favorites', 'error');
    }
  };

  const renderCartButton = () => {
    const quantity = getCartQuantity(item.id);
    const maxAllowed = getMaxAllowedForProduct(item);
    const disablePlus = quantity >= maxAllowed;

    if (!isInStock) {
      return (
        <View style={themedStyles.bottomButtonContainer}>
          <Text style={themedStyles.outOfStockText}>Out of Stock</Text>
        </View>
      );
    }

    if (quantity > 0) {
      return (
        <View style={themedStyles.bottomButtonContainer}>
          <TouchableOpacity
            style={[themedStyles.quantityButton, quantity === 1 && { opacity: 0.7 }]}
            onPress={(e) => {
              e.stopPropagation();
              updateCartQuantity(quantity - 1);
            }}
          >
            <Icon name="minus" size={16} color={resolvedTheme.quantityTextColor} />
          </TouchableOpacity>
          <Text style={themedStyles.quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={[themedStyles.quantityButton, disablePlus && { opacity: 0.4 }]}
            disabled={disablePlus}
            onPress={(e) => {
              e.stopPropagation();
              updateCartQuantity(quantity + 1);
            }}
          >
            <Icon name="plus" size={16} color={resolvedTheme.quantityTextColor} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={themedStyles.bottomButtonContainer}>
        <Icon name="shopping-cart" size={18} color={resolvedTheme.cartIconColor} />
        <Text style={themedStyles.addToCartText}>Add to Cart</Text>
      </View>
    );
  };

  const renderPriceDisplay = () => {
    const hasDiscount = item.discount !== undefined && Number(item.discount) > 0;
    const discountedPrice = applyDiscount(item.price, item.discount);

    return (
      <View style={themedStyles.priceContainer}>
        <View style={themedStyles.priceWrapper}>
          {hasDiscount ? (
            <>
              <Text style={themedStyles.originalPrice}>EGP {formatPrice(item.price)}</Text>
              <Text style={themedStyles.price}>EGP {formatPrice(discountedPrice)}</Text>
            </>
          ) : (
            <Text style={themedStyles.price}>EGP {formatPrice(discountedPrice)}</Text>
          )}
        </View>
        {hasDiscount && (
          <View style={themedStyles.discountBadge}>
            <Text style={themedStyles.discountText}>Save {item.discount}%</Text>
          </View>
        )}
      </View>
    );
  };

  const renderStockInfo = () => {
    if (item.stockQuantity !== undefined) {
      const isLowStock = isInStock && item.stockQuantity <= 5;
      if (isLowStock || !isInStock) {
        return (
          <View style={[
            themedStyles.stockContainer,
            { backgroundColor: resolvedTheme.stockContainerBackground }
          ]}>
            <Text style={[
              themedStyles.stockText,
              isInStock
                ? { color: resolvedTheme.lowStockColor, fontWeight: 'bold' }
                : themedStyles.outOfStockText
            ]}>
              {isInStock
                ? `Only ${item.stockQuantity} left!`
                : 'Out of Stock'
              }
            </Text>
          </View>
        );
      }
    }
    return null;
  };

  return (
    <TouchableOpacity
      style={themedStyles.cardTouchable}
      onPress={() => router.push({ pathname: "../Pages/SinglePage", params: { productId: item.id } })}
    >
      <View style={[
        themedStyles.card,
        !isInStock && themedStyles.outOfStockCard
      ]}>
        <TouchableOpacity
          style={themedStyles.favoriteButton}
          onPress={(e) => {
            e.stopPropagation();
            toggleFavorite();
          }}
        >
          <FAIcon
            name="heart"
            size={22}
            color={isFavorite ? '#e53935' : '#d1d1d1'}
          />
        </TouchableOpacity>

        {item.discount !== undefined && Number(item.discount) > 0 && (
          <View style={themedStyles.discountBadgeCorner}>
            <Text style={themedStyles.discountBadgeText}>-{item.discount}%</Text>
          </View>
        )}

        {!isInStock && (
          <View style={themedStyles.outOfStockOverlay}>
            <Text style={themedStyles.outOfStockOverlayText}>Out of Stock</Text>
          </View>
        )}

        <Image source={{ uri: item.image }} style={themedStyles.image} />
        <View style={themedStyles.textContainer}>
          <Text style={themedStyles.title} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          {renderStockInfo()}
          {renderPriceDisplay()}
        </View>

        <TouchableOpacity
          style={[
            themedStyles.fullWidthButton,
            !isInStock && themedStyles.disabledButton
          ]}
          onPress={(e) => {
            e.stopPropagation();
            if (isInStock) {
              const quantity = getCartQuantity(item.id);
              if (quantity === 0) {
                handleAddToCart();
              }
            }
          }}
          disabled={!isInStock}
        >
          {renderCartButton()}
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );
};

const styles = (theme) => StyleSheet.create({
  cardTouchable: {
    width: cardWidth,
    margin: 8,
  },
  card: {
    width: '100%',
    backgroundColor: theme.cardBackground,
    borderRadius: 12,
    padding: 0,
    paddingTop: 14,
    elevation: 4,
    shadowColor: theme.cardShadowColor,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    alignItems: 'center',
    minHeight: 300,
    position: 'relative',
    overflow: 'hidden',
    display: 'flex',
    flexDirection: 'column',
    borderWidth: 1,
    borderColor: theme.cardBorderColor,
  },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
    padding: 5,
  },
  image: {
    width: '90%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 10,
    marginTop: 10,
  },
  textContainer: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    width: '100%',
    paddingHorizontal: 14,
    paddingTop: 8,
    paddingBottom: 8,
  },
  title: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    color: theme.titleColor,
    marginBottom: 8,
    height: 36,
    overflow: 'hidden',
  },
  priceContainer: {
    width: '100%',
    marginBottom: 8,
    alignItems: 'center',
    padding: 4,
    backgroundColor: theme.priceContainerBackground,
    borderRadius: 8,
  },
  priceWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    flexWrap: 'wrap',
  },
  originalPrice: {
    fontSize: 12,
    color: theme.originalPriceColor,
    textDecorationLine: 'line-through',
    marginRight: 8,
  },
  price: {
    fontSize: 16,
    color: theme.priceColor,
    fontWeight: '700',
  },
  discountBadge: {
    backgroundColor: theme.discountBadgeBackground,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 5,
  },
  discountText: {
    color: theme.discountBadgeTextColor,
    fontWeight: 'bold',
    fontSize: 12,
  },
  discountBadgeCorner: {
    position: 'absolute',
    top: 0,
    left: 0,
    backgroundColor: theme.discountBadgeBackground,
    borderTopLeftRadius: 12,
    borderBottomRightRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    zIndex: 1,
  },
  discountBadgeText: {
    color: theme.discountBadgeTextColor,
    fontWeight: 'bold',
    fontSize: 12,
  },
  fullWidthButton: {
    width: '100%',
    backgroundColor: theme.fullWidthButtonBackground,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    height: 45,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 'auto',
  },
  bottomButtonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
  },
  addToCartText: {
    color: theme.addToCartTextColor,
    marginLeft: 8,
    fontWeight: '600',
    fontSize: 14,
  },
  quantityText: {
    color: theme.quantityTextColor,
    fontWeight: 'bold',
    fontSize: 16,
    paddingHorizontal: 12,
  },
  quantityButton: {
    backgroundColor: theme.quantityButtonBackground,
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 10,
  },
  outOfStockCard: {
    opacity: 0.8,
    borderColor: theme.outOfStockBorderColor || '#999',
  },
  outOfStockOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    zIndex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 12,
  },
  outOfStockOverlayText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 5,
    transform: [{ rotate: '-15deg' }],
  },
  disabledButton: {
    backgroundColor: theme.disabledButtonBackground || '#ccc',
  },
  stockContainer: {
    width: '100%',
    marginBottom: 6,
    alignItems: 'center',
    padding: 3,
    borderRadius: 4,
  },
  stockText: {
    fontSize: 12,
    fontWeight: '600',
  },
  inStockText: {
    color: theme.inStockColor || '#00a65a',
  },
  outOfStockText: {
    color: theme.outOfStockColor || '#d9534f',
    fontWeight: 'bold',
  },
});

export default ProductCard;
