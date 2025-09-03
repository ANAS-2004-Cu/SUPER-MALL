import React, { useEffect, useState } from 'react';
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
    ActivityIndicator,
    RefreshControl
} from 'react-native';
import { getDocs, collection } from 'firebase/firestore';
import { auth, db, getUserData } from '../../Firebase/Firebase';
import { Stack, useRouter } from 'expo-router';
import { Ionicons, MaterialIcons, FontAwesome, MaterialCommunityIcons } from '@expo/vector-icons';
import MiniAlert from '../../components/MiniAlert';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { LinearGradient } from 'expo-linear-gradient';

interface OrderItem {
    id: string;
    productId: string;
    quantity: number;
}

interface User {
    id?: string;
    isAdmin?: boolean;
    username?: string;
    Orders?: OrderItem[];
}

interface Product {
    id?: string;
    category?: string;
    price?: number;
    name?: string;
    discount?: number;
}

const Admin = () => {
    const [adminName, setAdminName] = useState('Admin');
    const [users, setUsers] = useState<User[]>([]);
    const [products, setProducts] = useState<Product[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error'>('success');
    const [totalOrderedItems, setTotalOrderedItems] = useState(0);
    const [totalSpent, setTotalSpent] = useState(0);

    const router = useRouter();

    const fetchData = async () => {
        try {
            const [usersSnap, productsSnap] = await Promise.all([
                getDocs(collection(db, 'Users')),
                getDocs(collection(db, 'products'))
            ]);

            const usersData = usersSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as User));

            const productsData = productsSnap.docs.map(d => ({
                id: d.id,
                ...d.data()
            } as Product));

            setUsers(usersData);
            setProducts(productsData);

            let orderCount = 0;
            let totalAmount = 0;
            for (const user of usersData) {
                if (user.Orders && Array.isArray(user.Orders)) {
                    for (const orderItem of user.Orders) {
                        if (orderItem &&
                            typeof orderItem === 'object' &&
                            'productId' in orderItem &&
                            'quantity' in orderItem) {

                            const quantity = Number(orderItem.quantity) || 0;
                            orderCount += quantity;

                            const product = productsData.find(p => p.id === orderItem.productId);
                            if (product && product.price && product.discount) {
                                totalAmount += (product.price * quantity) - (product.price * product.discount / 100) * quantity;
                            }
                        }
                    }
                }
            }

            setTotalOrderedItems(orderCount);
            setTotalSpent(totalAmount);
        } catch (err) {
            console.error('Error fetching data:', err);
            setAlertMessage("Error loading data. Please try again.");
            setAlertType("error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchData();
    };

    useEffect(() => {
        const fetchUserData = async () => {
            await fetchData();
            const user = auth.currentUser;
            if (user) {
                const data = await getUserData(user.uid);
                setAdminName(data?.username || 'Admin');
            }
        };
        fetchUserData();
    }, []);

    const logout = async () => {
        await auth.signOut();
        await AsyncStorage.removeItem('DataForUser');
        setAlertMessage("Logged out successfully");
        setAlertType("error");
        setTimeout(() => {
            router.replace("../Login");
        }, 3000);
    };

    const totalUsers = users.length;
    const adminCount = users.filter(u => u.isAdmin).length;
    const productCategories = [
        { name: 'Mobile & Tablet', dbName: 'Mobile', icon: 'cellphone' },
        { name: 'Computers & Office Supplies', dbName: 'Computers', icon: 'laptop' },
        { name: 'TVs & Electronics', dbName: 'TVs', icon: 'fridge' },
        { name: "Men's Fashion", dbName: 'Men', icon: 'human-male' },
        { name: "Women's Fashion", dbName: 'Women', icon: 'human-female' },
        { name: 'Kids Fashion', dbName: 'Kids', icon: 'human-child' },
        { name: 'Other', dbName: 'Other', icon: 'shape' }
    ];

    const categorizedProducts = products.reduce<Record<string, number>>((acc, p) => {
        const validCategories = productCategories.map(cat => cat.dbName);
        const cat = p.category && validCategories.includes(p.category) ? p.category : 'Other';
        acc[cat] = (acc[cat] || 0) + 1;
        return acc;
    }, {});

    if (loading && !refreshing) {
        return (
            <View style={[styles.container, styles.loadingContainer]}>
                <ActivityIndicator size="large" color="#6200ee" />
                <Text style={styles.loadingText}>Loading data...</Text>
            </View>
        );
    }

    return (
        <>
            <Stack.Screen name="Admin" options={{ headerShown: false }} />
            <View style={styles.container}>
                {alertMessage && (
                    <MiniAlert
                        message={alertMessage}
                        type={alertType}
                        onHide={() => setAlertMessage(null)}
                    />
                )}
                <TouchableOpacity style={styles.logoutBtn} onPress={logout}>
                    <Ionicons name="log-out-outline" size={24} color="#fff" />
                </TouchableOpacity>

                <ScrollView
                    contentContainerStyle={styles.scrollContent}
                    refreshControl={
                        <RefreshControl
                            refreshing={refreshing}
                            onRefresh={onRefresh}
                            colors={['#4a90e2']}
                            tintColor="#4a90e2"
                        />
                    }
                    showsVerticalScrollIndicator={false}
                >
                    <View style={styles.header}>
                        <Text style={styles.title}>
                            <MaterialIcons name="dashboard" size={24} color="#2d3436" />
                            <Text>  </Text>
                            Dashboard
                        </Text>
                        <Text style={styles.welcomeText}>
                            Welcome, {String(adminName).toUpperCase()} 👋
                        </Text>
                    </View>
                    <View style={styles.card}>
                        <LinearGradient
                            colors={['#D1F4FF', '#f5ffff']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="people-alt" size={24} color="#4a90e2" />
                                <Text style={styles.sectionTitle}>Users</Text>
                            </View>
                            <View style={styles.innerRow}>
                                <View style={[styles.halfCard, styles.cardWithIcon]}>
                                    <FontAwesome name="users" size={20} color="#4a90e2" />
                                    <Text style={styles.cardLabel}>Total Users</Text>
                                    <Text style={styles.cardValue}>{totalUsers}</Text>
                                </View>
                                <View style={[styles.halfCard, styles.cardWithIcon]}>
                                    <Ionicons name="shield-checkmark" size={20} color="#4a90e2" />
                                    <Text style={styles.cardLabel}>Admins</Text>
                                    <Text style={styles.cardValue}>{adminCount}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>
                    <View style={styles.card}>
                        <LinearGradient
                            colors={['#D1F4FF', '#f5ffff']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.sectionHeader}>
                                <MaterialIcons name="shopping-cart" size={24} color="#4a90e2" />
                                <Text style={styles.sectionTitle}>Sales Summary</Text>
                            </View>
                            <View style={styles.innerRow}>
                                <View style={[styles.halfCard, styles.cardWithIcon]}>
                                    <Ionicons name="cart" size={20} color="#4a90e2" />
                                    <Text style={styles.cardLabel}>Total Items Ordered</Text>
                                    <Text style={styles.cardValue}>{totalOrderedItems}</Text>
                                </View>
                                <View style={[styles.halfCard, styles.cardWithIcon]}>
                                    <FontAwesome name="dollar" size={20} color="#4a90e2" />
                                    <Text style={styles.cardLabel}>Total Revenue</Text>
                                    <Text style={styles.cardValue}>${totalSpent.toFixed(2)}</Text>
                                </View>
                            </View>
                        </LinearGradient>
                    </View>

                    <View style={styles.card}>
                        <LinearGradient
                            colors={['#D1F4FF', '#f5ffff']}
                            style={styles.cardGradient}
                        >
                            <View style={styles.sectionHeader}>
                                <MaterialCommunityIcons name="package-variant" size={24} color="#4a90e2" />
                                <Text style={styles.sectionTitle}>Products by Category</Text>
                                <Text style={styles.totalProductsCount}>Total Products: {products.length}</Text>
                            </View>
                            <View style={styles.wrap}>
                                {productCategories.map((category, i) => {
                                    const count = categorizedProducts[category.dbName] || 0;
                                    return (
                                        <View key={i} style={[styles.categoryCard, styles.cardWithIcon]}>
                                            <MaterialCommunityIcons
                                                name={category.icon as any}
                                                size={24}
                                                color="#4a90e2"
                                            />
                                            <Text style={styles.categoryLabel}>{category.name}</Text>
                                            <Text style={styles.categoryValue}>{count}</Text>
                                        </View>
                                    );
                                })}
                            </View>
                        </LinearGradient>
                    </View>
                </ScrollView>
            </View>
        </>
    );
};

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: 'white',
    },
    loadingContainer: {
        justifyContent: 'center',
        alignItems: 'center',
    },
    loadingText: {
        color: '#2d3436',
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500'
    },
    logoutBtn: {
        position: 'absolute',
        top: 50,
        right: 16,
        backgroundColor: 'purple',
        padding: 8,
        borderRadius: 20,
        zIndex: 1
    },
    scrollContent: {
        paddingBottom: 80,
        paddingTop: 70
    },
    header: {
        padding: 20,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2d3436',
        textAlign: 'center',
    },
    welcomeText: {
        fontSize: 16,
        color: '#666',
        marginTop: 8
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginHorizontal: 15,
        marginBottom: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3.84,
    },
    sectionHeader: {
        alignItems: 'center',
        marginBottom: 16
    },
    sectionTitle: {
        fontSize: 18,
        fontWeight: '600',
        color: '#2d3436',
        marginLeft: 8
    },
    totalProductsCount: {
        fontSize: 14,
        fontWeight: '600',
        color: '#4a90e2',
    },
    innerRow: {
        flexDirection: 'row',
        justifyContent: 'space-between'
    },
    halfCard: {
        width: '48%',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 16,
        alignItems: 'center'
    },
    categoryCard: {
        width: '30%',
        backgroundColor: '#f8f9fa',
        borderRadius: 12,
        padding: 12,
        alignItems: 'center',
        marginBottom: 10,
        justifyContent: 'center'
    },
    cardWithIcon: {
        justifyContent: 'center',
        paddingVertical: 16
    },
    cardLabel: {
        fontSize: 14,
        color: '#555',
        textAlign: 'center',
        marginTop: 8,
        fontWeight: '500'
    },
    categoryLabel: {
        fontSize: 12,
        color: '#555',
        textAlign: 'center',
        marginTop: 6,
        fontWeight: '500'
    },
    cardValue: {
        fontSize: 22,
        fontWeight: 'bold',
        color: '#2d3436',
        marginTop: 8
    },
    categoryValue: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
        marginTop: 4
    },
    wrap: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        justifyContent: 'space-between',
        gap: 10
    },
    cardGradient: {
        padding: 20,
        borderRadius: 10,
    },
});

export default Admin;