import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect } from '@react-navigation/native';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { getFilteredProductsPage, getProductById, updateUserData } from '../../../Backend/Firebase/DBAPI';
import { useUserStore } from '../../../Backend/Zustand/UserStore';
import { darkTheme as cardDarkTheme, lightTheme as cardLightTheme } from '../../../Theme/Component/ProductCardTheme';
import { darkTheme as reviewDarkTheme, lightTheme as reviewLightTheme } from '../../../Theme/Component/ReviewTheme';
import { darkTheme as productDarkTheme, lightTheme as productLightTheme } from '../../../Theme/Pages/ProductTheme';
import MiniAlert from '../../GeneralComponent/MiniAlert';
import ModernAlert from '../../GeneralComponent/ModernAlert';
import ProductCard from '../Component/ProductCard';
import Review from '../Component/Review';

const buildMergedTheme = (isDarkMode) => {
    const baseTheme = isDarkMode ? productDarkTheme : productLightTheme;
    const cardTheme = isDarkMode ? cardDarkTheme : cardLightTheme;
    return { ...baseTheme, ...cardTheme };
};

const ProductDetails = () => {
    const router = useRouter();
    const params = useLocalSearchParams();

    const productId = useMemo(() => {
        const rawId = params.productId ?? params.id;
        return rawId ? String(rawId) : '';
    }, [params.id, params.productId]);

    const resolvedSnapshot = useMemo(() => {
        const rawSnapshot = params.productSnapshot ?? params.snapshot;
        if (!rawSnapshot) return null;
        if (typeof rawSnapshot === 'string') {
            try {
                return JSON.parse(rawSnapshot);
            } catch {
                return null;
            }
        }
        if (typeof rawSnapshot === 'object') {
            return rawSnapshot;
        }
        return null;
    }, [params.productSnapshot, params.snapshot]);

    const [snapshotProduct] = useState(resolvedSnapshot);
    const [resolvedProduct, setResolvedProduct] = useState(resolvedSnapshot || null);
    const [pageMode, setPageMode] = useState(null);

    const [theme, setTheme] = useState(() => buildMergedTheme(false));
    const [isDarkMode, setIsDarkMode] = useState(false);
    const [renderVersion, setRenderVersion] = useState(0);

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
    const user = useUserStore((state) => state.user);
    const setUser = useUserStore((state) => state.setUser);
    const isLoggedIn = useUserStore((state) => state.isLoggedIn);
    const userId = user?.uid || user?.id || null;

    const favoriteIds = useMemo(() => Array.isArray(user?.Fav) ? user.Fav.map(String) : [], [user?.Fav]);
    const isFavorite = useMemo(() => favoriteIds.includes(String(productId)), [favoriteIds, productId]);

    const cartEntries = useMemo(() => {
        const rawCart = user?.Cart;
        if (!Array.isArray(rawCart)) return [];
        return rawCart
            .filter((entry) => entry && entry.productId)
            .map((entry) => ({
                productId: String(entry.productId),
                quantity: Number(entry.quantity) > 0 ? Number(entry.quantity) : 1,
            }));
    }, [user?.Cart]);

    const isInCart = useMemo(
        () => cartEntries.some((entry) => String(entry.productId) === String(productId)),
        [cartEntries, productId]
    );

    const formatPrice = (price) => {
        const normalized = Number(price) || 0;
        return normalized.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",") || "0";
    };

    const parseDescription = (desc) => {
        if (!desc) return [];

        return desc.split('\n').map((line, index) => {
            const [label, data] = line.split(': ');
            return { label, data, key: `desc-item-${index}` };
        }).filter(item => item.label && item.data);
    };

    const applyDiscount = (price = 0, discountPercentage = 0) => {
        const priceNum = Number(price) || 0;
        const discountNum = Number(discountPercentage) || 0;
        return Math.floor(priceNum - (priceNum * discountNum) / 100);
    };

    const getMaxAllowedForProduct = (p = {}) => {
        const stock = Number(p.stockQuantity);
        const perOrder = Number(p.AvilableQuantityBerOeder);
        const validStock = !isNaN(stock) && stock > 0 ? stock : Infinity;
        const validPerOrder = !isNaN(perOrder) && perOrder > 0 ? perOrder : Infinity;
        const maxAllowed = Math.min(validStock, validPerOrder);
        return maxAllowed === Infinity ? (isNaN(stock) ? 9999 : stock) : maxAllowed;
    };

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

    const updateTheme = useCallback(async () => {
        try {
            const themeMode = await AsyncStorage.getItem('ThemeMode');
            const isDark = themeMode === '2';
            setTheme(() => buildMergedTheme(isDark));
            setIsDarkMode(isDark);
            setRenderVersion((version) => version + 1);
        } catch {
            setTheme(() => buildMergedTheme(false));
            setIsDarkMode(false);
            setRenderVersion((version) => version + 1);
        }
    }, []);

    useFocusEffect(
        useCallback(() => {
            updateTheme();
        }, [updateTheme])
    );

    useEffect(() => {
        let isActive = true;

        const resolveProduct = async () => {
            if (!productId && snapshotProduct) {
                setResolvedProduct(snapshotProduct);
                setPageMode('SNAPSHOT');
                setRelatedProducts([]);
                return;
            }

            const fetchedProduct = await getProductById(String(productId));
            if (!isActive) return;

            if (fetchedProduct) {
                setResolvedProduct(fetchedProduct);
                setPageMode('LIVE');
                return;
            }

            setResolvedProduct(snapshotProduct || {});
            setPageMode('SNAPSHOT');
            setRelatedProducts([]);
        };

        resolveProduct();

        return () => {
            isActive = false;
        };
    }, [productId, router, snapshotProduct]);

    useEffect(() => {
        if (pageMode !== 'LIVE') {
            setRelatedProducts([]);
            return;
        }

        const category = resolvedProduct?.category;
        if (!category) {
            setRelatedProducts([]);
            return;
        }

        let isMounted = true;
        (async () => {
            try {
                const result = await getFilteredProductsPage({ limit: 9, category: String(category) });
                if (!isMounted) return;
                const related = Array.isArray(result?.items)
                    ? result.items.filter((p) => String(p.id) !== String(productId)).slice(0, 9)
                    : [];
                setRelatedProducts(related);
            } catch {
                if (isMounted) setRelatedProducts([]);
            }
        })();

        return () => {
            isMounted = false;
        };
    }, [pageMode, productId, resolvedProduct?.category]);

    const persistUserSnapshot = useCallback(
        async (payload, nextUserSnapshot) => {
            if (!userId || !user) return false;
            const previousUser = user;
            setUser(nextUserSnapshot || null);
            const result = await updateUserData(String(userId), payload);
            if (!result?.success) {
                setUser(previousUser || null);
                return false;
            }
            return true;
        },
        [setUser, user, userId]
    );

    const isSnapshotMode = pageMode === 'SNAPSHOT';

    const normalizedProduct = useMemo(() => {
        if (!resolvedProduct) return {};
        if (isSnapshotMode) {
            return {
                ...resolvedProduct,
                price: resolvedProduct?.finalPrice ?? 0,
                description: resolvedProduct?.description,
            };
        }
        return resolvedProduct;
    }, [isSnapshotMode, resolvedProduct]);

    const handleFavorite = async () => {
        if (isSnapshotMode) {
            showAlert1('This product is no longer available', 'error');
            return;
        }

        if (!isLoggedIn || !userId || !user) {
            showAlert1('Please login to add items to your favorites', 'error');
            return;
        }

        const nextFavorites = isFavorite
            ? favoriteIds.filter((favId) => favId !== String(productId))
            : [...favoriteIds, String(productId)];

        const nextUserSnapshot = { ...user, Fav: nextFavorites };
        const ok = await persistUserSnapshot({ Fav: nextFavorites }, nextUserSnapshot);
        if (!ok) {
            showAlert1('Could not update favorites. Please try again.', 'error');
            return;
        }

        showAlert1(
            `${String(normalizedProduct?.name || 'Item').split(' ').slice(0, 2).join(' ')} ${isFavorite ? 'Removed from favorites!' : 'Added to favorites!'}`,
            isFavorite ? 'error' : 'success'
        );
    };

    const handleAddToCart = async () => {
        if (isSnapshotMode) {
            showAlert1('This product is no longer available', 'error');
            return;
        }

        if (!isLoggedIn || !userId || !user) {
            showAlert1('Please login to add products to your shopping cart', 'error');
            return;
        }

        if (!productId) {
            showAlert({
                title: 'Error',
                message: 'Product ID missing',
                type: 'error',
                primaryButtonText: 'OK',
            });
            return;
        }

        const stock = Number(normalizedProduct?.stockQuantity);
        const isInStockNow = isNaN(stock) || stock > 0;
        if (!isInStockNow) {
            showAlert1('This item is currently out of stock', 'error');
            return;
        }

        const maxAllowed = getMaxAllowedForProduct(normalizedProduct || {});
        const existingEntry = cartEntries.find((entry) => String(entry.productId) === String(productId));
        const nextQuantity = existingEntry ? existingEntry.quantity + 1 : 1;

        if (nextQuantity > maxAllowed) {
            if (!isNaN(Number(normalizedProduct?.AvilableQuantityBerOeder)) && maxAllowed === Number(normalizedProduct?.AvilableQuantityBerOeder)) {
                showAlert1(`Max per order is ${normalizedProduct?.AvilableQuantityBerOeder}`, 'error');
            } else if (!isNaN(Number(normalizedProduct?.stockQuantity))) {
                showAlert1(`Only ${normalizedProduct?.stockQuantity} in stock`, 'error');
            } else {
                showAlert1('Cannot increase quantity', 'error');
            }
            return;
        }

        const nextCart = existingEntry
            ? cartEntries.map((entry) =>
                String(entry.productId) === String(productId)
                    ? { ...entry, quantity: nextQuantity }
                    : entry
            )
            : [...cartEntries, { productId: String(productId), quantity: nextQuantity }];

        const nextUserSnapshot = { ...user, Cart: nextCart };
        const ok = await persistUserSnapshot({ Cart: nextCart }, nextUserSnapshot);
        if (!ok) {
            showAlert1('Failed to add product to cart. Please try again.', 'error');
            return;
        }

        showAlert({
            title: 'Added Successfully',
            message: `${normalizedProduct?.name || 'Item'} has been added to your cart`,
            type: 'cart',
            primaryButtonText: 'Continue Shopping',
            secondaryButtonText: 'Go to Cart',
            onPrimaryPress: () => router.back(),
            onSecondaryPress: () => router.push("../Cart/Cart"),
        });
    };

    const descriptionItems = parseDescription(normalizedProduct?.description);

    const resolvedMode = pageMode || (snapshotProduct ? 'SNAPSHOT' : 'LIVE');
    const showSnapshotBanner = resolvedMode === 'SNAPSHOT';
    const hasDiscount = Number(normalizedProduct?.discount) > 0;
    const finalPriceColor = hasDiscount ? theme.textPrimary : theme.price;
    const stockQuantityNumber = Number(normalizedProduct?.stockQuantity);
    const showStockInfo = !isSnapshotMode && typeof normalizedProduct?.stockQuantity !== 'undefined';

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
                disabled={load || isSnapshotMode}
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
                    {normalizedProduct?.image ? (
                        <Image
                            source={{ uri: normalizedProduct.image }}
                            style={styles.image}
                        />
                    ) : (
                        <View style={[styles.image, styles.imagePlaceholder, { backgroundColor: theme.sectionBg }]} />
                    )}
                </View>

                <View style={styles.productHeader}>
                    <Text style={[styles.name, { color: theme.textPrimary }]}>{normalizedProduct?.name}</Text>

                    {normalizedProduct?.category && (
                        <Text style={[styles.category, { color: theme.textSecondary }]}>{normalizedProduct.category}</Text>
                    )}

                    <View style={styles.priceStockRow}>
                        <View style={styles.priceBlock}>
                            {hasDiscount ? (
                                <>
                                    <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                                        <Text style={[styles.originalPrice, { color: theme.textSecondary }]}>
                                            {formatPrice(normalizedProduct?.price)} EGP
                                        </Text>
                                        <View style={[styles.discountBadge, { backgroundColor: theme.discountBadgeBg }]}>
                                            <Text style={[styles.discountText, { color: theme.discountBadgeText }]}>
                                                -{normalizedProduct?.discount}%
                                            </Text>
                                        </View>
                                    </View>
                                    <Text style={[styles.price1, { color: finalPriceColor }]}>
                                        {formatPrice(applyDiscount(normalizedProduct?.price, normalizedProduct?.discount))} EGP
                                    </Text>
                                </>
                            ) : (
                                <Text style={[styles.price1, { color: finalPriceColor }]}>
                                    {formatPrice(normalizedProduct?.price)} EGP
                                </Text>
                            )}
                        </View>

                        {showStockInfo && (
                            <View style={[styles.stockContainer, { backgroundColor: theme.stockContainerBackground || theme.sectionBg }]}>
                                <Text
                                    style={[
                                        styles.stockText,
                                        stockQuantityNumber <= 5
                                            ? { color: theme.lowStockColor }
                                            : { color: theme.inStockColor }
                                    ]}
                                >
                                    {stockQuantityNumber <= 5
                                        ? `Only ${stockQuantityNumber} left!`
                                        : 'In Stock'}
                                </Text>
                            </View>
                        )}
                    </View>

                    {showSnapshotBanner && (
                        <View style={[styles.snapshotBanner, { backgroundColor: theme.sectionBg }]}>
                            <Ionicons name="alert-circle-outline" size={18} color="#d9534f" style={{ marginRight: 6 }} />
                            <Text style={[styles.snapshotText, { color: theme.textPrimary }]}>This product is no longer available</Text>
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
                        <Text style={[styles.description, { color: theme.textPrimary }]}>{normalizedProduct?.description}</Text>
                    )}
                </View>

                {pageMode === 'LIVE' && relatedProducts.length > 0 && (
                    <>
                        <View style={styles.sectionHeader}>
                            <Text style={[styles.sectionTitle, { color: theme.textPrimary }]}>Related Products</Text>
                        </View>
                        <FlatList
                            data={relatedProducts}
                            keyExtractor={(item) => String(item.id)}
                            extraData={renderVersion}
                            renderItem={({ item }) => (
                                <ProductCard
                                    item={item}
                                    onShowAlert={showAlert1}
                                    theme={theme}
                                />
                            )}
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            contentContainerStyle={{ paddingBottom: 20 }}
                        />
                    </>
                )}

                {pageMode === 'LIVE' && (
                    <Review
                        key={productId}
                        productId={productId}
                        theme={isDarkMode ? reviewDarkTheme : reviewLightTheme}
                    />
                )}
            </ScrollView>

            <View style={[styles.footer, { backgroundColor: theme.cardBackground }]}>
                <TouchableOpacity
                    style={[styles.button, { backgroundColor: theme.accent }, isSnapshotMode && { opacity: 0.5 }]}
                    onPress={() => (isInCart ? router.push("../Cart/Cart") : handleAddToCart())}
                    activeOpacity={0.8}
                    disabled={isSnapshotMode}
                >
                    <View style={styles.priceContainer}>
                        <Text style={[styles.priceLabel, { color: theme.textSecondary }]}>Total Price</Text>
                        <Text style={[styles.price, { color: theme.price }]}>
                            {formatPrice(applyDiscount(normalizedProduct?.price, normalizedProduct?.discount))} EGP
                        </Text>
                    </View>
                    <View style={styles.addCartContainer}>
                        <Ionicons name="cart-outline" size={20} color={theme.textPrimary} style={{ marginRight: 8 }} />
                        <Text style={[styles.text, { color: theme.textPrimary }]}>
                            {isSnapshotMode ? 'Unavailable' : isInCart ? 'Go to cart' : 'Add to cart'}
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
                themeMode={isDarkMode ? 'dark' : 'light'}
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
    imagePlaceholder: {
        justifyContent: 'center',
        alignItems: 'center',
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
    category: {
        fontSize: 14,
        fontWeight: '600',
        marginBottom: 8,
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
    snapshotBanner: {
        marginTop: 12,
        padding: 10,
        borderRadius: 12,
        flexDirection: 'row',
        alignItems: 'center',
    },
    snapshotText: {
        fontSize: 14,
        fontWeight: '600',
    },
    stockContainer: {
        marginTop: 8,
        paddingVertical: 4,
        paddingHorizontal: 10,
        borderRadius: 8,
        alignSelf: 'flex-start',
        alignItems: 'center',
    },
    stockText: {
        fontSize: 12,
        fontWeight: '600',
    },
    priceStockRow: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 12,
        marginTop: 6,
    },
    priceBlock: {
        flex: 1,
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