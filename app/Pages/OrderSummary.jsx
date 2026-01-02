import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Stack, router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useCallback, useMemo, useState } from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { darkTheme, lightTheme } from '../../Theme/Pages/OrderSummaryTheme';

const formatCurrency = (value) => {
    const numeric = typeof value === 'number' ? value : Number(value) || 0;
    return `$${numeric.toFixed(2)}`;
};

const buildAddressLines = (address) => {
    if (!address || typeof address !== 'object') {
        return [];
    }

    const lines = [
        address.FullName,
        address.Street,
        [address.City, address.State , address.ZIP]
            .filter(Boolean)
            .join(', '),
        address.Phone,
    ];

    return lines.filter((line) => !!line && String(line).trim().length > 0);
};

const getLastFourDigits = (value) => {
    if (!value) {
        return '';
    }
    const digitsOnly = String(value).replace(/\D/g, '');
    return digitsOnly.slice(-4);
};

const normalizeNumberValue = (value, fallback = 0) => {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : fallback;
};

const getPaymentDisplay = (method, walletLastFour, cardLastFour) => {
    const label = method?.trim() || 'Not provided';
    const normalized = label.toLowerCase();

    if (normalized.includes('wallet') || normalized.includes('mobile')) {
        return {
            label,
            secondary: walletLastFour ? `Wallet Number ****${walletLastFour}` : null,
        };
    }

    if (normalized.includes('visa') || normalized.includes('card')) {
        return {
            label,
            secondary: cardLastFour ? `Card Number ****${cardLastFour}` : null,
        };
    }

    if (normalized.includes('cash')) {
        return { label, secondary: null };
    }

    return {
        label,
        secondary: cardLastFour
            ? `•••• ${cardLastFour}`
            : walletLastFour
                ? `•••• ${walletLastFour}`
                : null,
    };
};

const OrderSummary = () => {
    const [theme, setTheme] = useState(lightTheme);
    const [themeVersion, setThemeVersion] = useState(0);
    const params = useLocalSearchParams();

    const loadThemePreference = useCallback(() => {
        let isActive = true;

        (async () => {
            try {
                const themeMode = await AsyncStorage.getItem('ThemeMode');
                const isDarkMode = themeMode === '2';
                const nextTheme = isDarkMode ? { ...darkTheme } : { ...lightTheme };

                if (isActive) {
                    setTheme(() => nextTheme);
                    setThemeVersion((value) => value + 1);
                }
            } catch (error) {
                console.error('Failed to load theme preference:', error);
            }
        })();

        return () => {
            isActive = false;
        };
    }, []);

    useFocusEffect(loadThemePreference);

    const order = useMemo(() => {
        if (!params?.order) {
            return null;
        }

        const payload = Array.isArray(params.order) ? params.order[0] : params.order;

        try {
            return JSON.parse(decodeURIComponent(payload));
        } catch (error) {
            console.error('Failed to parse order details:', error);
            return null;
        }
    }, [params.order]);

    if (!order) {
        return (
            <View style={[styles.fallbackContainer, { backgroundColor: theme.fallbackBackground }]}> 
                <Stack.Screen options={{ headerShown: false }} />
                <Text style={[styles.fallbackText, { color: theme.fallbackTextColor }]}>Unable to load order summary.</Text>
                <TouchableOpacity
                    style={[styles.backButtonFallback, { backgroundColor: theme.fallbackButtonBackground }]}
                    onPress={() => router.back()}
                >
                    <Text style={[styles.backButtonFallbackText, { color: theme.fallbackButtonTextColor }]}>Go Back</Text>
                </TouchableOpacity>
            </View>
        );
    }

    const addressLines = buildAddressLines(order.addressSnapshot);
    const subtotal = order.subtotal ?? order.orderTotal ?? 0;
    const shippingFee = order.shippingFee ?? 0;
    const total = order.total ?? order.orderTotal ?? 0;
    const paymentDetails = order.paymentDetails || {};
    const walletNumber = paymentDetails.walletnumber || paymentDetails.walletNumber || order.walletPhone || '';
    const cardNumber = paymentDetails.cardNum || paymentDetails.cardNumber || '';
    const walletLastFour = getLastFourDigits(walletNumber);
    const cardLastFour = getLastFourDigits(cardNumber);
    const paymentDisplay = getPaymentDisplay(order.paymentMethod, walletLastFour, cardLastFour);

    const handleProductPress = (productId) => {
        const targetId = productId || '';
        if (!targetId) {
            return;
        }

        try {
            router.push({
                pathname: '../Pages/singlepage',
                params: { id: targetId },
            });
        } catch (error) {
            console.error('Failed to navigate to product details:', error);
        }
    };

    return (
        <>
            <Stack.Screen options={{ headerShown: false }} />
            <ScrollView
                key={themeVersion}
                style={[styles.container, { backgroundColor: theme.screenBackground }]}
                contentContainerStyle={styles.contentContainer}
            >
                <View style={[styles.header, { backgroundColor: theme.headerBackground }]}> 
                    <TouchableOpacity onPress={() => router.back()} style={styles.headerBack}>
                        <Ionicons name="arrow-back-circle" size={36} color={theme.headerIconColor} />
                    </TouchableOpacity>
                    <Text style={[styles.headerTitle, { color: theme.headerTitleColor }]}>Order Summary</Text>
                </View>

                <View style={[styles.section, { backgroundColor: theme.sectionBackground }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Order Details</Text>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Order ID</Text>
                        <Text style={[styles.detailValue, { color: theme.detailValueColor }]}>{order.id}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Placed On</Text>
                        <Text style={[styles.detailValue, { color: theme.detailValueColor }]}>{order.createdAt || 'Unknown date'}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Payment Method</Text>
                        <View style={styles.paymentMethodValue}>
                            <Text style={[styles.detailValue, { color: theme.detailValueColor }]}>{paymentDisplay.label}</Text>
                            {paymentDisplay.secondary ? (
                                <Text style={[styles.paymentSecondaryText, { color: theme.paymentSecondaryColor }]}>
                                    {paymentDisplay.secondary}
                                </Text>
                            ) : null}
                        </View>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: theme.sectionBackground }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Payment Summary</Text>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Subtotal</Text>
                        <Text style={[styles.detailValue, { color: theme.detailValueColor }]}>{formatCurrency(subtotal)}</Text>
                    </View>
                    <View style={styles.detailRow}>
                        <Text style={[styles.detailLabel, { color: theme.detailLabelColor }]}>Shipping Fee</Text>
                        <Text style={[styles.detailValue, { color: theme.detailValueColor }]}>{formatCurrency(shippingFee)}</Text>
                    </View>
                    <View style={[styles.detailRow, styles.totalRow, { borderTopColor: theme.productBorderColor }]}> 
                        <Text style={[styles.detailLabel, styles.totalLabel, { color: theme.totalLabelColor }]}>Total</Text>
                        <Text style={[styles.detailValue, styles.totalValue, { color: theme.totalValueColor }]}>
                            {formatCurrency(total)}
                        </Text>
                    </View>
                </View>

                <View style={[styles.section, { backgroundColor: theme.sectionBackground }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Shipping Address</Text>
                    {addressLines.length ? (
                        addressLines.map((line, index) => (
                            <Text key={`${line}-${index}`} style={[styles.addressLine, { color: theme.addressTextColor }]}> 
                                {line}
                            </Text>
                        ))
                    ) : (
                        <Text style={[styles.addressLine, { color: theme.addressTextColor }]}>No address on file.</Text>
                    )}
                </View>

                <View style={[styles.section, { backgroundColor: theme.sectionBackground }]}> 
                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Items</Text>
                    {(order.OrderedProducts || []).map((product, index) => {
                        const unitPrice = normalizeNumberValue(product.finalPrice ?? product.price, 0);
                        const subtotalValue = normalizeNumberValue(product.totalItemPrice, 0);
                        const quantity = normalizeNumberValue(product.quantity, 0);
                        const productIdentifier = product.productId || product.id;

                        return (
                            <TouchableOpacity
                                key={product.id || `product_${index}`}
                                style={[styles.productCard, { borderBottomColor: theme.productBorderColor }]}
                                activeOpacity={0.85}
                                onPress={() => handleProductPress(productIdentifier)}
                            >
                                {product.image ? (
                                    <Image source={{ uri: product.image }} style={styles.productImage} />
                                ) : (
                                    <View style={[styles.productPlaceholder, { backgroundColor: theme.productBorderColor }]}> 
                                        <MaterialIcons name="image" size={24} color={theme.detailLabelColor} />
                                    </View>
                                )}
                                <View style={styles.productInfo}>
                                    <Text style={[styles.productName, { color: theme.productNameColor }]}>
                                        {product.name || 'Unnamed Product'}
                                    </Text>
                                    <Text style={[styles.productDescription, { color: theme.productDescriptionColor }]} numberOfLines={2}>
                                        {product.description || 'No description available.'}
                                    </Text>
                                    <View style={styles.productMetaRow}>
                                        <Text style={[styles.productMeta, { color: theme.productMetaColor }]}>Qty: {quantity}</Text>
                                        <Text style={[styles.productMeta, { color: theme.productMetaColor }]}>
                                            {formatCurrency(unitPrice)} / unit
                                        </Text>
                                    </View>
                                    <View style={[styles.productMetaRow, styles.productPriceRow]}>
                                        <Text style={[styles.productSubtotal, { color: theme.productMetaSecondaryColor }]}>
                                            Subtotal: {formatCurrency(subtotalValue)}
                                        </Text>
                                    </View>
                                </View>
                            </TouchableOpacity>
                        );
                    })}
                </View>
            </ScrollView>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
    },
    contentContainer: {
        paddingBottom: 40,
    },
    header: {
        paddingTop: 60,
        paddingHorizontal: 20,
        paddingBottom: 20,
        flexDirection: 'row',
        alignItems: 'center',
    },
    headerBack: {
        marginRight: 10,
    },
    headerTitle: {
        fontSize: 24,
        fontWeight: '700',
    },
    section: {
        marginHorizontal: 20,
        marginTop: 15,
        borderRadius: 16,
        padding: 16,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.08,
        shadowRadius: 6,
        elevation: 3,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        marginBottom: 12,
    },
    detailRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: 8,
    },
    detailLabel: {
        fontSize: 14,
    },
    detailValue: {
        fontSize: 15,
        fontWeight: '500',
    },
    paymentMethodValue: {
        alignItems: 'flex-end',
    },
    paymentSecondaryText: {
        fontSize: 13,
        marginTop: 2,
    },
    totalRow: {
        marginTop: 4,
        paddingTop: 8,
        borderTopWidth: 1,
        borderTopColor: 'rgba(0,0,0,0.1)',
    },
    totalLabel: {
        fontSize: 16,
    },
    totalValue: {
        fontSize: 18,
        fontWeight: '700',
    },
    addressLine: {
        fontSize: 15,
        marginBottom: 4,
    },
    productCard: {
        flexDirection: 'row',
        paddingVertical: 12,
        borderBottomWidth: 1,
    },
    productImage: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
    },
    productPlaceholder: {
        width: 60,
        height: 60,
        borderRadius: 8,
        marginRight: 12,
        backgroundColor: 'rgba(0,0,0,0.05)',
        alignItems: 'center',
        justifyContent: 'center',
    },
    productInfo: {
        flex: 1,
    },
    productName: {
        fontSize: 15,
        fontWeight: '600',
        marginBottom: 4,
    },
    productDescription: {
        fontSize: 13,
        marginBottom: 6,
    },
    productMetaRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
    },
    productMeta: {
        fontSize: 13,
    },
    productPriceRow: {
        marginTop: 6,
    },
    productSubtotal: {
        fontSize: 13,
        fontWeight: '600',
    },
    fallbackContainer: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        padding: 20,
    },
    fallbackText: {
        fontSize: 16,
        marginBottom: 20,
    },
    backButtonFallback: {
        paddingHorizontal: 20,
        paddingVertical: 10,
        borderRadius: 25,
    },
    backButtonFallbackText: {
        fontWeight: '600',
    },
});

export default OrderSummary;
