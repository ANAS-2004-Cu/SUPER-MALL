import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useNavigation, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useState } from "react";
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
    getCart,
    getCurrentUser,
    getFavorites,
    getProductById,
    getProducts,
    queueCartOperation,
    toggleFavorite as toggleFavoriteBackend,
} from '../services/backend.ts';
import Review from '../../components/Component/Review';

import AsyncStorage from '@react-native-async-storage/async-storage';
import { darkTheme as productDarkTheme, lightTheme as productLightTheme } from '../../Theme/Pages/ProductTheme';
import MiniAlert from '../../components/Component/MiniAlert';
import ModernAlert from '../../components/Component/ModernAlert';
import ProductCard from '../../components/Component/ProductCard';

const ProductDetails = () => {
    const navigation = useNavigation();
    const { id } = useLocalSearchParams();
    const [product, setProduct] = useState({});
    const [isFavorite, setIsFavorite] = useState(false);
    const router = useRouter();

    const [theme, setTheme] = useState(productLightTheme);
    const loadTheme = useCallback(async () => {
        try {
            const themeMode = await AsyncStorage.getItem('ThemeMode');
            setTheme(themeMode === "2" ? productDarkTheme : productLightTheme);
        } catch { setTheme(productLightTheme); }
    }, []);
    useEffect(() => {
        loadTheme();
        const int = setInterval(loadTheme, 1000);
        return () => clearInterval(int);
    }, [loadTheme]);

    const [isInCart, setIsInCart] = useState(false);
    const [relatedProducts, setRelatedProducts] = useState([]);

    const [alertVisible, setAlertVisible] = useState(false);
    const [alertConfig, setAlertConfig] = useState({
        title: '',
        message: '',
        type: 'info',
        primaryButtonText: 'OK',
        secondaryButtonText: '',
        onPrimaryPress: () => { },
        onSecondaryPress: () => { }
    });
    const [alertMsg, setAlertMsg] = useState(null);
    const [alertType, setAlertType] = useState('success');
    const [load, setLoad] = useState(false);
    const showAlert1 = (message, type = 'success') => {
        setLoad(true);
        setAlertMsg(message);
        setAlertType(type);
        setTimeout(() => {
            setAlertMsg(null);
            setLoad(false);
        }, 3000);
    };

    const showAlert = (config) => {
        setAlertConfig(config);
        setAlertVisible(true);
    };

    // TODO replaced firebase call: "const currentUser = auth.currentUser;"
    const currentUser = getCurrentUser();
    const userId = currentUser ? currentUser.uid : null;

    const [favoritesList, setFavoritesList] = useState([]);

    const formatPrice = (price) => {
        return price ? price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") : "0";
    };

    const parseDescription = (desc) => {
        if (!desc) return [];

        return desc.split('\n').map((line, index) => {
            const [label, data] = line.split(': ');
            return { label, data, key: `desc-item-${index}` };
        }).filter(item => item.label && item.data);
    };
    const applyDiscount = (price, discountPercentage) => {
        return Math.floor(price - (price * discountPercentage) / 100);
    };

    const getMaxAllowedForProduct = (p = {}) => {
        const stock = Number(p.stockQuantity);
        const perOrder = Number(p.AvilableQuantityBerOeder);
        const validStock = !isNaN(stock) && stock > 0 ? stock : Infinity;
        const validPerOrder = !isNaN(perOrder) && perOrder > 0 ? perOrder : Infinity;
        const maxAllowed = Math.min(validStock, validPerOrder);
        return maxAllowed === Infinity ? (isNaN(stock) ? 9999 : stock) : maxAllowed;
    };

    useEffect(() => {
        const getProduct = async () => {
            try {
                // TODO replaced firebase call: "const docRef = doc(db, \"products\", id);"
                const fetchedProduct = await getProductById(String(id));
                if (fetchedProduct) {
                    setProduct(fetchedProduct);
                    try {
                        // TODO replaced firebase call: "const res = await getCollection(\"products\");"
                        const allProducts = await getProducts();
                        if (Array.isArray(allProducts)) {
                            const related = allProducts
                                .filter(p => p?.category === fetchedProduct?.category && p?.id !== id)
                                .slice(0, 15);
                            setRelatedProducts(related);
                        }
                    } catch { }
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching product: ", error);
            }
        };

        const checkInCart = async () => {
            if (!userId || !id) {
                setIsInCart(false);
                return;
            }
            try {
                // TODO replaced firebase call: "const inCart = await isProductInCart(userId, id);"
                const cartSnapshot = await getCart(userId, { productId: id });
                setIsInCart(Boolean(cartSnapshot?.hasProduct));
            } catch (error) {
                console.error("Error checking cart status:", error);
                setIsInCart(false);
            }
        };

        getProduct();
        checkInCart();

        // TODO replaced firebase call: "const currentUserId = auth.currentUser?.uid;"
        const currentUserId = getCurrentUser()?.uid;
        let unsubscribe = () => {};

        if (currentUserId) {
            // TODO replaced firebase call: "unsubscribe = listenToUserFavorites(currentUserId, (favoritesArray) => {"
            const maybeUnsubscribe = getFavorites(currentUserId, {
                subscribe: true,
                onUpdate: (favoritesArray) => {
                    setFavoritesList(favoritesArray);
                    if (id) {
                        setIsFavorite(favoritesArray.includes(id));
                    }
                },
            });
            if (typeof maybeUnsubscribe === 'function') {
                unsubscribe = maybeUnsubscribe;
            }
        } else {
            setFavoritesList([]);
            setIsFavorite(false);
        }
        
        return () => unsubscribe();

    }, [id, currentUser?.uid]);

    const handleFavorite = async () => {
        if (!userId) {
            showAlert1('Please login to add items to your favorites', 'error');
            return;
        }
        try {
            // TODO replaced firebase call: "const res = await toggleFavorite(userId, id);"
            const res = await toggleFavoriteBackend(userId, id);
            if (!res.success) throw new Error(res.error || 'Failed');
            showAlert1(
                `${String(product?.name).split(' ').slice(0, 2).join(' ')} ${res.newStatus ? 'Added to favorites!' : 'Removed from favorites!'}`,
                res.newStatus ? 'success' : 'error'
            );
        } catch (error) {
            showAlert1("Error", "Could not update favorites. Please try again.");
        }
    };

    const handleFavoriteToggle = async (productId) => {
        if (!userId) {
            showAlert1('Please login to add items to your favorites', 'error');
            return;
        }
        try {
            // TODO replaced firebase call: "const res = await toggleFavorite(userId, productId);"
            const res = await toggleFavoriteBackend(userId, productId);
            if (!res.success) return;

            const target = relatedProducts.find(p => String(p.id) === String(productId)) || product;
            const label = String(target?.name || 'Item').split(' ').slice(0, 2).join(' ');
            showAlert1(
              `${label} ${res.newStatus ? 'Added to favorites!' : 'Removed from favorites!'}`,
              res.newStatus ? 'success' : 'error'
            );
        } catch { /* silent */ }
    };

    const handleAddToCart = async () => {
        // TODO replaced firebase call: "const cu = getAuth().currentUser;"
        const cu = getCurrentUser();
        if (!cu) {
            showAlert1('Please login to add products to your shopping cart', 'error');
            return;
        }

        if (!id) {
            showAlert({
                title: 'Error',
                message: 'Product ID missing',
                type: 'error',
                primaryButtonText: 'OK',
            });
            return;
        }

        const stock = Number(product?.stockQuantity);
        const isInStock = isNaN(stock) || stock > 0;
        if (!isInStock) {
            showAlert1('This item is currently out of stock', 'error');
            return;
        }

        try {
            const maxAllowed = getMaxAllowedForProduct(product);
            // TODO replaced firebase call: "const cartDocRef = doc(db, 'Users', cu.uid, 'cart', id);"
            const operationResult = await queueCartOperation(cu.uid, {
                productId: String(id),
                type: 'increment',
                quantity: 1,
                maxQuantity: maxAllowed,
            });

            if (!operationResult.success) {
                if (operationResult.error === 'MAX_QUANTITY_EXCEEDED') {
                    if (!isNaN(Number(product?.AvilableQuantityBerOeder)) && maxAllowed === Number(product?.AvilableQuantityBerOeder)) {
                        showAlert1(`Max per order is ${product?.AvilableQuantityBerOeder}`, 'error');
                    } else if (!isNaN(Number(product?.stockQuantity))) {
                        showAlert1(`Only ${product?.stockQuantity} in stock`, 'error');
                    } else {
                        showAlert1('Cannot increase quantity', 'error');
                    }
                    return;
                }
                throw new Error(operationResult.error || 'Failed to update cart');
            }

            setIsInCart(true);
            showAlert({
                title: 'Added Successfully',
                message: `${product?.name} has been added to your cart`,
                type: 'cart',
                primaryButtonText: 'Continue Shopping',
                secondaryButtonText: 'Go to Cart',
                onPrimaryPress: () => router.back(),
                onSecondaryPress: () => router.push("/Cart/cart"),
            });
        } catch (error) {
            console.error("Error adding to cart:", error);
            showAlert({
                title: 'Error',
                message: 'Failed to add product to cart. Please try again.',
                type: 'error',
                primaryButtonText: 'OK',
            });
        }
    };

    const descriptionItems = parseDescription(product?.description);

    return (
        <View style={[styles.wrapper, { backgroundColor: theme.background }]}>
            {alertMsg && (
                <MiniAlert
                    message={alertMsg}
                    type={alertType}
                    onHide={() => setAlertMsg(null)}
                />
            )}
            <TouchableOpacity
                style={[styles.backButton, { top: 55, left: 15 }]}
                onPress={() => router.back()}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
            >
                <Ionicons name="arrow-back-circle-outline" size={36} color={theme.backButtonColor} />
            </TouchableOpacity>
            <TouchableOpacity
                onPress={handleFavorite}
                style={[styles.heartButton, { backgroundColor: theme.heartBg, top: 55, right: 15 }]}
                disabled={load}
            >
                <Ionicons
                    name={isFavorite ? "heart" : "heart-outline"}
                    size={24}
                    color={isFavorite ? "#FF6B6B" : theme.textPrimary}
                />
            </TouchableOpacity>

            <ScrollView
                contentContainerStyle={[styles.container, { backgroundColor: theme.background }]}
                showsVerticalScrollIndicator={false}
            >
                <View style={[styles.imageWrapper, { backgroundColor: theme.cardBackground }]}>
                    <Image
                        source={
                            typeof product.image === 'string'
                                ? { uri: product.image }
                                : require("../../assets/images/loading-buffering.gif")
                        }
                        style={styles.image}
                    />
                </View>

                <View style={styles.productHeader}>
                    <Text style={[styles.name, { color: theme.textPrimary }]}>{product?.name}</Text>

                    {Number(product?.discount) > 0 ? (
                        <>
                            <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>
                                    {formatPrice(product?.price)} EGP
                                </Text>
                                <View style={[styles.discountBadge, { backgroundColor: theme.discountBadgeBg }]}>
                                    <Text style={[styles.discountText, { color: theme.discountBadgeText }]}>
                                        -{product?.discount}%
                                    </Text>
                                </View>
                            </View>
                            <Text style={[styles.price1, { color: theme.priceAfter }]}>
                                {formatPrice(applyDiscount(product?.price, product?.discount))} EGP
                            </Text>
                        </>
                    ) : (
                        <Text style={[styles.price1, { color: theme.price }]}>
                            {formatPrice(product?.price)} EGP
                        </Text>
                    )}

                    {typeof product?.stockQuantity !== 'undefined' && (
                        <View style={{ marginTop: 8 }}>
                            {Number(product?.stockQuantity) <= 5
                                ? <Text style={{ color: '#e67e22', fontWeight: '600' }}>
                                    Only {Number(product?.stockQuantity)} left!
                                </Text>
                                : <Text style={{ color: '#2E7D32', fontWeight: '600' }}>
                                    In stock
                                </Text>}
                        </View>
                    )}
                </View>

                <View style={[styles.descriptionContainer, { backgroundColor: theme.sectionBg }]}>
                    <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Details</Text>

                    {descriptionItems.length > 0 ? (
                        descriptionItems.map((item) => (
                            <View key={item.key} style={[
                                styles.descriptionItem,
                                { borderBottomColor: theme.divider },
                                item.key === `desc-item-${descriptionItems.length - 1}` && { borderBottomWidth: 0 }
                            ]}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="information-circle-outline" size={16} color={theme.textSecondary} style={{ marginRight: 5 }} />
                                    <Text style={[styles.descriptionLabel, { color: theme.textSecondary }]}>{item.label}</Text>
                                </View>
                                <Text style={[styles.descriptionData, { color: theme.textPrimary }]}>{item.data}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={[styles.description, { color: theme.textPrimary }]}>{product?.description}</Text>
                    )}
                </View>

                {relatedProducts.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Related Products</Text>
                        </View>
                        <FlatList
                            data={relatedProducts}
                            keyExtractor={(item) => String(item.id)}
                            renderItem={({ item }) => (
                                <ProductCard
                                    item={item}
                                    currentUser={currentUser}
                                    onShowAlert={showAlert1}
                                    isFavorite={favoritesList.includes(item.id)}
                                    onFavoriteToggle={handleFavoriteToggle}
                                    customTheme={{
                                        cardBackground: theme.cardBackground,
                                        cardShadowColor: '#000',
                                        cardBorderColor: '#eee',
                                        titleColor: theme.textPrimary,
                                        priceContainerBackground: theme.sectionBg,
                                        originalPriceColor: theme.textSecondary,
                                        priceColor: theme.price,
                                        discountBadgeBackground: theme.discountBadgeBg,
                                        discountBadgeTextColor: theme.discountBadgeText,
                                        fullWidthButtonBackground: theme.accent,
                                        addToCartTextColor: theme.textPrimary,
                                        quantityTextColor: theme.textPrimary,
                                        quantityButtonBackground: theme.sectionBg,
                                        cartIconColor: theme.textPrimary,
                                        inStockColor: '#2E7D32',
                                        outOfStockColor: '#d9534f',
                                    }}
                                />
                            )}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </>
                )}

                <Review key={id} productId={id} />
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.accent }]}
                    onPress={() => (isInCart ? router.push("/Cart/cart") : handleAddToCart())}
                    activeOpacity={0.8}
                >
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Total Price</Text>
                        <Text style={[styles.price, { color: theme.price }]}>
                            {formatPrice(applyDiscount(product?.price, product?.discount))} EGP
                        </Text>
                    </View>
                    <View style={styles.addCartContainer}>
                        <Ionicons name="cart-outline" size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                        <Text style={[styles.text, { color: theme.textPrimary }]}>
                            {isInCart ? 'Go to cart' : 'Add to cart'}
                        </Text>
                    </View>
                </TouchableOpacity>
            </View>

            <ModernAlert
                visible={alertVisible}
                title={alertConfig.title}
                message={alertConfig.message}
                type={alertConfig.type}
                primaryButtonText={alertConfig.primaryButtonText}
                secondaryButtonText={alertConfig.secondaryButtonText}
                onPrimaryPress={alertConfig.onPrimaryPress}
                onSecondaryPress={alertConfig.onSecondaryPress}
                onClose={() => setAlertVisible(false)}
                themeMode={theme === productDarkTheme ? 'dark' : 'light'}
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
    },
    backButton: {
        position: 'absolute',
        zIndex: 10,
    },
    heartButton: {
        position: 'absolute',
        zIndex: 10,
        padding: 10,
        borderRadius: 50,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    container: {
        padding: 20,
        paddingBottom: 120,
    },
    imageWrapper: {
        borderRadius: 25,
        padding: 10,
        marginBottom: 15,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 2,
    },
    image: {
        width: '90%',
        height: undefined,
        aspectRatio: 1,
        resizeMode: 'contain',
        alignSelf: 'center',
        borderRadius: 50,
        marginVertical: 15,
    },
    productHeader: {
        marginVertical: 15,
        paddingBottom: 15,
        borderBottomWidth: 1,
        borderBottomColor: '#f0f0f0',
    },
    name: {
        fontSize: 24,
        fontWeight: 'bold',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    originalPrice: {
        textDecorationLine: 'line-through',
        marginRight: 8,
    },
    discountBadge: {
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 8,
    },
    discountText: {
        fontSize: 12,
        fontWeight: '700',
    },
    price1: {
        fontSize: 22,
        fontWeight: 'bold',
        marginTop: 6,
    },
    descriptionContainer: {
        marginTop: 20,
        borderRadius: 15,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginTop: 20,
        marginBottom: 10,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 10,
    },
    descriptionItem: {
        flexDirection: 'column',
        paddingVertical: 10,
        borderBottomWidth: 1,
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    descriptionLabel: {
        fontSize: 15,
        fontWeight: 'bold',
    },
    descriptionData: {
        fontSize: 15,
        marginLeft: 21,
        lineHeight: 22,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
    },
    footer: {
        position: 'absolute',
        bottom: 0,
        left: 0,
        right: 0,
        paddingVertical: 12,
        paddingHorizontal: 15,
        borderTopLeftRadius: 25,
        borderTopRightRadius: 25,
        alignItems: 'center',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: -3 },
        shadowOpacity: 0.1,
        shadowRadius: 5,
        elevation: 8,
    },
    button: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingVertical: 15,
        paddingHorizontal: 20,
        borderRadius: 30,
        width: '95%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 3,
        elevation: 2,
    },
    priceContainer: { flex: 1 },
    priceLabel: { fontSize: 12, marginBottom: 2 },
    price: { fontSize: 18, fontWeight: 'bold' },
    addCartContainer: { flexDirection: 'row', alignItems: 'center' },
    text: { fontSize: 16, fontWeight: 'bold' },
});

export default ProductDetails;