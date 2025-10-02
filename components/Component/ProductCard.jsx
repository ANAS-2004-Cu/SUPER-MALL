import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import React, { useEffect, useState } from "react";
import { AppState, Dimensions, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Icon from "react-native-vector-icons/Feather";
import { createDocument, deleteDocument, getCollection, getDocument, updateDocument } from '../../Firebase/Firebase';
import { darkTheme, lightTheme } from '../../Theme/Component/ProductCardTheme';

const { width } = Dimensions.get('window');
const cardWidth = (width / 2) - 24;

const ProductCard = ({
  item,
  customTheme = null,
  currentUser,
  onShowAlert,
}) => {
  const router = useRouter();
  
  // Always use customTheme if provided from parent component
  const [theme, setTheme] = useState(customTheme || lightTheme);
  const [appState, setAppState] = useState(AppState.currentState);
  const [cartItems, setCartItems] = useState([]);
  const [favorites, setFavorites] = useState([]);
  
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

  // Fetch cart and favorites data when user changes
  useEffect(() => {
    if (currentUser) {
      fetchCartItems();
      fetchUserFavorites();
    } else {
      setCartItems([]);
      setFavorites([]);
    }
  }, [currentUser]);

  const fetchUserFavorites = async () => {
    if (!currentUser) return;
    try {
      const userDoc = await getDocument('Users', currentUser.uid);
      if (userDoc.success && userDoc.data && userDoc.data.Fav) {
        setFavorites(userDoc.data.Fav);
      } else {
        setFavorites([]);
      }
    } catch (error) {
      setFavorites([]);
    }
  };

  const fetchCartItems = async () => {
    if (!currentUser) return;
    try {
      const result = await getCollection(`Users/${currentUser.uid}/cart`);
      if (result.success) {
        setCartItems(result.data);
      }
    } catch (error) {
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
      const cartResult = await getCollection(`Users/${currentUser.uid}/cart`);
      const existingItem = cartResult.success ? cartResult.data.find(cartItem => cartItem.productId === item.id) : null;

      if (existingItem) {
        // Check if adding one more would exceed stock quantity
        if (item.stockQuantity !== undefined && existingItem.quantity + 1 > item.stockQuantity) {
          return onShowAlert(`Sorry, only ${item.stockQuantity} items available in stock`, 'error');
        }
        
        await updateDocument(`Users/${currentUser.uid}/cart`, existingItem.id, {
          quantity: existingItem.quantity + 1,
          updatedAt: new Date(),
        });
      } else {
        await createDocument(`Users/${currentUser.uid}/cart`, {
          productId: item.id,
          name: item.name,
          price: item.price,
          image: item.image,
          discount: item.discount || 0,
          quantity: 1,
          description: item.description || '',
          category: item.category || 'Uncategorized',
          createdAt: new Date(),
        });
      }

      fetchCartItems();
      onShowAlert(`${item.name.split(' ').slice(0, 2).join(' ')} Added to cart`);
    } catch (error) {
      onShowAlert('Failed to add product to cart', 'error');
    }
  };

  // Update cart quantity
  const updateCartQuantity = async (newQuantity) => {
    if (!currentUser) return;

    try {
      const cartItem = cartItems.find(cartItem => cartItem.productId === item.id);
      if (!cartItem) return;

      // Check if the new quantity would exceed stock
      if (item.stockQuantity !== undefined && newQuantity > item.stockQuantity) {
        return onShowAlert(`Sorry, only ${item.stockQuantity} items available in stock`, 'error');
      }

      if (newQuantity <= 0) {
        await deleteDocument(`Users/${currentUser.uid}/cart`, cartItem.id);
      } else {
        await updateDocument(`Users/${currentUser.uid}/cart`, cartItem.id, {
          quantity: newQuantity,
          updatedAt: new Date(),
        });
      }

      fetchCartItems();
    } catch (error) {
      onShowAlert('Failed to update cart', 'error');
    }
  };

  // Toggle favorite
  const toggleFavorite = async () => {
    if (!currentUser) {
      return onShowAlert('Please sign in to add to favorites', 'error');
    }

    try {
      const isCurrentlyFavorite = favorites.includes(item.id);
      let updatedFavorites;

      if (isCurrentlyFavorite) {
        updatedFavorites = favorites.filter(id => id !== item.id);
        onShowAlert('Removed from favorites');
      } else {
        updatedFavorites = [...favorites, item.id];
        onShowAlert('Added to favorites');
      }

      await updateDocument('Users', currentUser.uid, {
        Fav: updatedFavorites
      });

      setFavorites(updatedFavorites);
    } catch (error) {
      onShowAlert('Failed to update favorites', 'error');
    }
  };

  const getCartQuantity = (productId) => {
    const cartItem = cartItems.find(item => item.productId === productId);
    return cartItem ? cartItem.quantity : 0;
  };

  const isFavorite = (productId) => {
    return favorites.includes(productId);
  };

  // Cart button display
  const renderCartButton = () => {
    const quantity = getCartQuantity(item.id);

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
            style={styles(theme).quantityButton}
            onPress={(e) => {
              e.stopPropagation();
              updateCartQuantity(quantity - 1);
            }}
          >
            <Icon name="minus" size={16} color={theme.quantityTextColor} />
          </TouchableOpacity>
          <Text style={styles(theme).quantityText}>{quantity}</Text>
          <TouchableOpacity
            style={styles(theme).quantityButton}
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
      onPress={() => router.push({ pathname: "/singlepage", params: { id: item.id } })}
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
          <Icon
            name="heart"
            size={20}
            color={isFavorite(item.id) ? theme.favoriteIconActiveColor : theme.favoriteIconInactiveColor}
            fill={isFavorite(item.id) ? theme.favoriteIconActiveColor : "transparent"}
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
