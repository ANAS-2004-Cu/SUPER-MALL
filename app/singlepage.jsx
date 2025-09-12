import React, { useEffect, useState } from "react";
import { View, Text, Image, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useLocalSearchParams, useNavigation } from 'expo-router';
import Ionicons from 'react-native-vector-icons/Ionicons';
import { auth, db } from "../Firebase/Firebase";
import { doc, getDoc, updateDoc, arrayUnion, arrayRemove, increment, setDoc } from 'firebase/firestore';
import Review from './Review'
import { getAuth } from 'firebase/auth';
import { useRouter } from 'expo-router';
import ModernAlert from '../components/ModernAlert';
import MiniAlert from '../components/Component/MiniAlert';



const ProductDetails = () => {
    const navigation = useNavigation();
    const { id } = useLocalSearchParams();
    const [product, setProduct] = useState({});
    const [isFavorite, setIsFavorite] = useState(false);
    const router = useRouter();

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

    const currentUser = auth.currentUser;
    const userId = currentUser ? currentUser.uid : null;

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
    useEffect(() => {
        const getProduct = async () => {
            try {
                const docRef = doc(db, "products", id);
                const docSnap = await getDoc(docRef);

                if (docSnap.exists()) {
                    setProduct(docSnap.data());
                } else {
                    console.log("No such document!");
                }
            } catch (error) {
                console.error("Error fetching product: ", error);
            }
        };

        const checkFavoriteStatus = async () => {
            if (!userId) {
                setIsFavorite(false);
                return;
            }

            try {
                const userDocRef = doc(db, "Users", userId);
                const userDoc = await getDoc(userDocRef);

                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    const favoritesList = userData.Fav || [];
                    setIsFavorite(favoritesList.includes(id));
                }
            } catch (error) {
                console.error("Error checking favorite status:", error);
            }
        };

        getProduct();
        checkFavoriteStatus();
    }, [id, userId]);

    const handleFavorite = async () => {
        if (!userId) {
            showAlert({
                title: 'Sign in required',
                message: 'Please sign in to add items to your favorites',
                type: 'warning',
                primaryButtonText: 'Sign In',
                secondaryButtonText: 'Cancel',
                onPrimaryPress: () => router.push("/Login"),
            });
            return;
        }

        try {
            const userDocRef = doc(db, "Users", userId);

            if (isFavorite) {
                await updateDoc(userDocRef, {
                    Fav: arrayRemove(id)
                });
                setIsFavorite(false);
                showAlert1(`${String(product?.name).split(' ').slice(0, 2).join(' ')} Removed from favorites!`, 'erroe');
            } else {
                await updateDoc(userDocRef, {
                    Fav: arrayUnion(id)
                });
                setIsFavorite(true);
                showAlert1(`${String(product?.name).split(' ').slice(0, 2).join(' ')} Added to favorites!`, "success");
            }
        } catch (error) {
            console.error("Error updating favorites:", error);
            showAlert1("Error", "Could not update favorites. Please try again.");
        }
    };

    const handleAddToCart = async () => {
        const currentUser = getAuth().currentUser;
        if (!currentUser) {
            showAlert({
                title: 'Sign in required',
                message: 'Please sign in to add products to your shopping cart',
                type: 'warning',
                primaryButtonText: 'Sign In',
                secondaryButtonText: 'Cancel',
                onPrimaryPress: () => router.push("/Login"),
            });
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

        try {
            const cartDocRef = doc(db, 'Users', currentUser.uid, 'cart', id);
            const cartDocSnap = await getDoc(cartDocRef);

            if (cartDocSnap.exists()) {
                await updateDoc(cartDocRef, {
                    quantity: increment(1),
                });
            } else {
                await setDoc(cartDocRef, {
                    productId: id,
                    name: product?.name,
                    price: product?.price,
                    image: product?.image,
                    discount: product?.discount || 0,
                    quantity: 1,
                    createdAt: new Date(),
                });
            }

            showAlert({
                title: 'Added Successfully',
                message: `${product?.name} has been added to your cart`,
                type: 'cart',
                primaryButtonText: 'Continue Shopping',
                secondaryButtonText: 'Go to Cart',
                onPrimaryPress: () => { },
                onSecondaryPress: () => router.push("/cart"),
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
        <View style={styles.wrapper}>
            {alertMsg && (
                <MiniAlert
                    message={alertMsg}
                    type={alertType}
                    onHide={() => setAlertMsg(null)}
                />
            )}
            <View style={styles.headerWrapper}>
                <View style={styles.header}>
                    <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
                        <Ionicons name="arrow-back" size={24} color="#333" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={handleFavorite} style={styles.heartButton} disabled={load}>
                        <Ionicons
                            name={isFavorite ? "heart" : "heart-outline"}
                            size={24}
                            color={isFavorite ? "#FF6B6B" : "#333"}
                        />
                    </TouchableOpacity>
                </View>
            </View>

            <ScrollView
                contentContainerStyle={styles.container}
                showsVerticalScrollIndicator={false}
            >
                <View style={styles.imageWrapper}>
                    <Image
                        source={
                            typeof product.image === 'string'
                                ? { uri: product.image }
                                : require("../assets/images/loading-buffering.gif")
                        }
                        style={styles.image}
                    />
                </View>

                <View style={styles.productHeader}>
                    <Text style={styles.name}>{product?.name}</Text>
                    <Text style={{ textDecorationLine: "line-through", }}>{formatPrice(product?.price)} EGP</Text>
                    <Text style={styles.price1}>{formatPrice(applyDiscount(product?.price, product?.discount))} EGP</Text>


                </View>

                <View style={styles.descriptionContainer}>
                    <Text style={styles.sectionTitle}>Details</Text>

                    {descriptionItems.length > 0 ? (
                        descriptionItems.map((item) => (
                            <View key={item.key} style={[
                                styles.descriptionItem,
                                item.key === `desc-item-${descriptionItems.length - 1}` && { borderBottomWidth: 0 }
                            ]}>
                                <View style={styles.labelContainer}>
                                    <Ionicons name="information-circle-outline" size={16} color="#666" style={{ marginRight: 5 }} />
                                    <Text style={styles.descriptionLabel}>{item.label}</Text>
                                </View>
                                <Text style={styles.descriptionData}>{item.data}</Text>
                            </View>
                        ))
                    ) : (
                        <Text style={styles.description}>{product?.description}</Text>
                    )}
                </View>
                <Review key={id} productId={id} />
            </ScrollView>

            <View style={styles.footer}>
                <TouchableOpacity style={styles.button} onPress={handleAddToCart} activeOpacity={0.8}>
                    <View style={styles.priceContainer}>
                        <Text style={styles.priceLabel}>Total Price</Text>
                        <Text style={styles.price}>{formatPrice(applyDiscount(product?.price, product?.discount))} EGP</Text>
                    </View>
                    <View style={styles.addCartContainer}>
                        <Ionicons name="cart-outline" size={20} color="#333" style={{ marginRight: 8 }} />
                        <Text style={styles.text}>Add to cart</Text>
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
            />
        </View>
    );
};

const styles = StyleSheet.create({
    wrapper: {
        flex: 1,
        backgroundColor: '#fff',
    },
    headerWrapper: {
        backgroundColor: '#fff',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.1,
        shadowRadius: 4,
        elevation: 3,
        zIndex: 10,
    },
    container: {
        padding: 20,
        backgroundColor: '#fff',
        paddingBottom: 100,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 15,
        paddingVertical: 12,
    },
    backButton: {
        backgroundColor: '#FAE5D3',
        padding: 10,
        borderRadius: 50,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    heartButton: {
        backgroundColor: '#FAE5D3',
        padding: 10,
        borderRadius: 50,
        elevation: 2,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.1,
        shadowRadius: 2,
    },
    imageWrapper: {
        backgroundColor: '#fff',
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
        color: '#333',
        marginBottom: 10,
        letterSpacing: 0.5,
    },
    price1: {

        fontSize: 22,
        color: '#2E7D32',
        fontWeight: 'bold',
        marginTop: 5,
    },
    ratingRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 12,
    },
    ratingText: {
        marginLeft: 4,
        color: '#777',
        fontSize: 14,
    },
    descriptionContainer: {
        marginTop: 20,
        backgroundColor: '#f9f9f9',
        borderRadius: 15,
        padding: 18,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.05,
        shadowRadius: 3,
        elevation: 1,
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: 'bold',
        marginBottom: 15,
        color: '#333',
        letterSpacing: 0.3,
    },
    descriptionItem: {
        flexDirection: 'column',
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eaeaea',
    },
    labelContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 5,
    },
    descriptionLabel: {
        fontSize: 15,
        fontWeight: 'bold',
        color: '#666',
    },
    descriptionData: {
        fontSize: 15,
        color: '#333',
        marginLeft: 21,
        lineHeight: 22,
    },
    description: {
        fontSize: 16,
        textAlign: 'center',
        marginBottom: 10,
        lineHeight: 24,
        color: '#4A3222',
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
        backgroundColor: '#fff',
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
        backgroundColor: '#f5e1d7',
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
    priceContainer: {
        flex: 1,
    },
    priceLabel: {
        fontSize: 12,
        color: '#777',
        marginBottom: 2,
    },
    price: {

        fontSize: 18,
        color: '#333',
        fontWeight: 'bold',
    },
    addCartContainer: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    text: {
        fontSize: 16,
        fontWeight: 'bold',
        color: '#333',
    },
});

export default ProductDetails;