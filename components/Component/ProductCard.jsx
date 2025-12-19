import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { AppState, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import FAIcon from 'react-native-vector-icons/FontAwesome'; // added
import { darkTheme, lightTheme } from '../../Theme/Component/ProductCardTheme';
import { getCart, queueCartOperation, removeCartItem } from '../../app/services/backend';

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
  customTheme = null,
  currentUser,
  onShowAlert,
  isFavorite = false, // new prop
  onFavoriteToggle = () => {} // new prop
}) => {
  const router = useRouter();
  
  // Always use customTheme if provided from parent component
  const [theme, setTheme] = useState(customTheme || lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);
  const [cartItems, setCartItems] = useState([]);
  
  // Check if item is in stock
  const isInStock = item.stockQuantity === undefined || item.stockQuantity > 0;
  
  // Update theme whenever customTheme prop changes
  useEffect(() => {
    if (customTheme) {
      setTheme(customTheme);
    }
  }, [customTheme]);
  
  // Function to get current theme only when customTheme is not provided
  const checkTheme = async () => {
    try {
      if (!customTheme) {
        const themeMode = await AsyncStorage.getItem("ThemeMode");
        if (themeMode === "2") {
          setTheme(darkTheme);
        } else {
          setTheme(lightTheme);
        }
      }
    } catch (error) {
      console.error("Failed to load theme:", error);
    }
  };

  // Listen for app state changes
  useEffect(() => {
    // Only set up AppState listener if customTheme is not provided
    if (!customTheme) {
      const subscription = AppState.addEventListener("change", nextAppState => {
        if (appState.match(/inactive|background/) && nextAppState === "active") {
          // Check theme when app returns to active state
          checkTheme();
        }
        setAppState(nextAppState);
      });

      return () => {
        if (subscription && subscription.remove) {
          subscription.remove();
        }
      };
    }
  }, [appState, customTheme]);

  // Setup theme check on mount and periodically only if customTheme is not provided
  useEffect(() => {
    if (!customTheme) {
      // Check theme on component mount
      checkTheme();
      
      // Set up periodic theme check (every second)
      const themeCheckInterval = setInterval(checkTheme, 1000);
      
      // Clean up interval on unmount
      return () => {
        clearInterval(themeCheckInterval);
      };
    }
  }, [customTheme]);

  // Fetch cart data when user changes
  useEffect(() => {
    if (currentUser) {
      fetchUserCart();
    } else {
      setCartItems([]);
    }
  }, [currentUser]);

  const fetchUserCart = async () => {
    if (!currentUser) return;
    try {
      // TODO replaced firebase call: "const arr = await getUserCart(currentUser.uid);"
      const snapshot = await getCart(currentUser.uid);
      setCartItems(snapshot.items || []);
    } catch {
      setCartItems([]);
    }
  };

  // Format price with commas
  const formatPrice = (price) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
  };

  // Calculate discounted price
  const applyDiscount = (price, discount = 0) => Math.floor(price - (price * discount) / 100);

  // Add to cart handler
  const handleAddToCart = async () => {
    if (!currentUser) {
      return onShowAlert('Please sign in to add products to your shopping cart', 'error');
    }

    // Prevent adding out-of-stock items to cart
    if (!isInStock) {
      return onShowAlert('This item is currently out of stock', 'error');
    }

    try {
      const existingQty = getCartQuantity(item.id);
      const newQty = existingQty > 0 ? existingQty + 1 : 1;
      const maxAllowed = getMaxAllowedForProduct(item);
      if (newQty > maxAllowed) {
        if (!isNaN(Number(item.AvilableQuantityBerOeder))) {
          onShowAlert(`Max per order is ${item.AvilableQuantityBerOeder}`, 'error');
        } else if (!isNaN(Number(item.stockQuantity))) {
          onShowAlert(`Only ${item.stockQuantity} in stock`, 'error');
        } else {
          onShowAlert('Cannot increase quantity', 'error');
        }
        return;
      }
      // TODO replaced firebase call: "await updateCartItemQuantity(currentUser.uid, item.id, newQty);"
      await queueCartOperation(currentUser.uid, { productId: item.id, type: 'set', quantity: newQty });
      await fetchUserCart();
      onShowAlert(`${item.name.split(' ').slice(0, 2).join(' ')} Added to cart`);
    } catch {
      onShowAlert('Failed to add product to cart', 'error');
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (newQuantity) => {
    if (!currentUser) return;

    // If user decremented from 1 to 0 => remove item
    if (newQuantity < 1) {
      try {
        // TODO replaced firebase call: "await removeCartItem(currentUser.uid, item.id);"
        await removeCartItem(currentUser.uid, item.id);
        await fetchUserCart();
        onShowAlert('Removed from cart');
      } catch {
        onShowAlert('Failed to remove item', 'error');
      }
      return;
    }

    const maxAllowed = getMaxAllowedForProduct(item);
    if (newQuantity > maxAllowed) {
      if (!isNaN(Number(item.AvilableQuantityBerOeder)) && maxAllowed === Number(item.AvilableQuantityBerOeder)) {
        onShowAlert(`Max per order is ${item.AvilableQuantityBerOeder}`, 'error');
      } else if (!isNaN(Number(item.stockQuantity))) {
        onShowAlert(`Only ${item.stockQuantity} in stock`, 'error');
      } else {
        onShowAlert('Cannot increase quantity', 'error');
      }
      return;
    }

    try {
      // TODO replaced firebase call: "await updateCartItemQuantity(currentUser.uid, item.id, newQuantity);"
      await queueCartOperation(currentUser.uid, { productId: item.id, type: 'set', quantity: newQuantity });
      await fetchUserCart();
    } catch {
      onShowAlert('Failed to update cart', 'error');
    }
  };

  // Toggle favorite now delegates to parent
  const toggleFavorite = async () => {
    if (!currentUser) {
      return onShowAlert('Please sign in to add to favorites', 'error');
    }
    try {
      onFavoriteToggle && onFavoriteToggle(item.id);
    } catch {
      onShowAlert('Failed to update favorites', 'error');
    }
  };

  const getCartQuantity = (productId) => {
    const cartItem = cartItems.find(c => c.productId === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  // Cart button display
  const renderCartButton = () => {
    const quantity = getCartQuantity(item.id);
    const maxAllowed = getMaxAllowedForProduct(item);
    const disablePlus = quantity >= maxAllowed;

    // If out of stock, show out of stock message
    if (!isInStock) {
      return (
        <View style={styles(theme).bottomButtonContainer}>
          <Text style={styles(theme).outOfStockText}>Out of Stock</Text>
        </View>
      );
    }

    if (quantity > 0) {
      return (
        <View style={styles(theme).bottomButtonContainer}>
          <TouchableOpacity
            style={[styles(theme).quantityButton, quantity === 1 && { opacity: 0.7 }]}
            // no disabled: allow removal when quantity === 1
            onPress={(e) => {
              e.stopPropagation();
              updateCartQuantity(quantity - 1);
            }}
          >
            <Icon name="minus" size={16} color={theme.quantityTextColor} />
          </TouchableOpacity>
          <Text style={styles(theme).quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={[styles(theme).quantityButton, disablePlus && { opacity: 0.4 }]}
            disabled={disablePlus}
            onPress={(e) => {
              e.stopPropagation();
              updateCartQuantity(quantity + 1);
            }}
          >
            <Icon name="plus" size={16} color={theme.quantityTextColor} />
          </TouchableOpacity>
        </View>
      );
    }

    return (
      <View style={styles(theme).bottomButtonContainer}>
        <Icon name="shopping-cart" size={18} color={theme.cartIconColor} />
        <Text style={styles(theme).addToCartText}>Add to Cart</Text>
      </View>
    );
  };

  // Price display with discount
  const renderPriceDisplay = () => {
    const hasDiscount = item.discount !== undefined && Number(item.discount) > 0;
    const discountedPrice = applyDiscount(item.price, item.discount);
    
    return (
      <View style={styles(theme).priceContainer}>
        <View style={styles(theme).priceWrapper}>
          {hasDiscount ? (
            <>
              <Text style={styles(theme).originalPrice}>EGP {formatPrice(item.price)}</Text>
              <Text style={styles(theme).price}>EGP {formatPrice(discountedPrice)}</Text>
            </>
          ) : (
            <Text style={styles(theme).price}>EGP {formatPrice(discountedPrice)}</Text>
          )}
        </View>
        {hasDiscount && (
          <View style={styles(theme).discountBadge}>
            <Text style={styles(theme).discountText}>Save {item.discount}%</Text>
          </View>
        )}
      </View>
    );
  };

  // Stock display
  const renderStockInfo = () => {
    if (item.stockQuantity !== undefined) {
      const isLowStock = isInStock && item.stockQuantity <= 5;
      
      // Only show stock info if it's low stock or out of stock
      if (isLowStock || !isInStock) {
        return (
          <View style={[
            styles(theme).stockContainer,
            { backgroundColor: theme.stockContainerBackground }
          ]}>
            <Text style={[
              styles(theme).stockText,
              isInStock 
                ? { color: theme.lowStockColor, fontWeight: 'bold' }
                : styles(theme).outOfStockText
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
      style={styles(theme).cardTouchable}
      onPress={() => router.push({ pathname: "/Pages/singlepage", params: { id: item.id } })}
    >
      <View style={[
        styles(theme).card,
        !isInStock && styles(theme).outOfStockCard
      ]}>
        <TouchableOpacity
          style={styles(theme).favoriteButton}
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
          <View style={styles(theme).discountBadgeCorner}>
            <Text style={styles(theme).discountBadgeText}>-{item.discount}%</Text>
          </View>
        )}

        {!isInStock && (
          <View style={styles(theme).outOfStockOverlay}>
            <Text style={styles(theme).outOfStockOverlayText}>Out of Stock</Text>
          </View>
        )}

        <Image source={{ uri: item.image }} style={styles(theme).image} />
        <View style={styles(theme).textContainer}>
          <Text style={styles(theme).title} numberOfLines={2} ellipsizeMode="tail">{item.name}</Text>
          {renderStockInfo()}
          {renderPriceDisplay()}
        </View>
        
        <TouchableOpacity 
          style={[
            styles(theme).fullWidthButton,
            !isInStock && styles(theme).disabledButton
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
