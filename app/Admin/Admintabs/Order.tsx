// import { AntDesign, Entypo, Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
// import { LinearGradient } from 'expo-linear-gradient';
// import { Stack } from 'expo-router';
// import { collection, doc, getDoc, getDocs } from 'firebase/firestore';
// import React, { useEffect, useState } from 'react';
// import {
//   ActivityIndicator,
//   FlatList,
//   Image,
//   Keyboard,
//   LayoutAnimation,
//   Platform,
//   RefreshControl,
//   StyleSheet,
//   Text,
//   TextInput,
//   TouchableOpacity,
//   View,
// } from 'react-native';
// import { db } from '../../Firebase/Firebase';
// import MiniAlert from '../../GeneralComponent/MiniAlert';

// interface OrderItem {
//     id: string;
//     productId: string;
//     quantity: number;
// }

// interface Product {
//     id: string;
//     name?: string;
//     price?: number;
//     image?: string;
//     description?: string;
//     quantity?: number;
//     discount?: number;
// }

// interface User {
//     id: string;
//     username?: string;
//     fullname?: string;
//     email?: string;
//     phone?: string;
//     image?: string;
//     Orders?: OrderItem[];
//     totalItems?: number;
//     totalSpent?: number;
//     products?: Product[];
// }

// type FilterOption = 'orders' | 'amount' | null;

// const OrdersScreen = () => {
//     const [users, setUsers] = useState<User[]>([]);
//     const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
//     const [loading, setLoading] = useState(true);
//     const [refreshing, setRefreshing] = useState(false);
//     const [expandedUser, setExpandedUser] = useState<string | null>(null);
//     const [alertMessage, setAlertMessage] = useState<string | null>(null);
//     const [alertType, setAlertType] = useState<'success' | 'error'>('success');
//     const [searchQuery, setSearchQuery] = useState<string>('');
//     const [activeFilter, setActiveFilter] = useState<FilterOption>(null);

//     const fetchUsersWithOrders = async () => {
//         try {
//             setLoading(true);

//             const usersSnapshot = await getDocs(collection(db, "Users"));

//             const usersWithOrdersPromises = usersSnapshot.docs
//                 .map(userDoc => {
//                     const userData = userDoc.data();

//                     if (!userData.Orders || !Array.isArray(userData.Orders) || userData.Orders.length === 0) {
//                         return null;
//                     }

//                     const totalItems = userData.Orders.reduce(
//                         (sum: number, order: OrderItem) => sum + (order.quantity || 0),
//                         0
//                     );

//                     const user: User = {
//                         id: userDoc.id,
//                         username: userData.username,
//                         fullname: userData.fullname || userData.username,
//                         email: userData.email,
//                         phone: userData.phone,
//                         image: userData.image,
//                         Orders: userData.Orders,
//                         totalItems: totalItems,
//                         products: [],
//                         totalSpent: 0
//                     };

//                     return fetchProductsForUser(user);
//                 })
//                 .filter(Boolean);

//             const usersWithOrders = await Promise.all(usersWithOrdersPromises);

//             const validUsers = usersWithOrders.filter(user =>
//                 user && user.products && user.products.length > 0
//             );

//             const fetchedUsers = validUsers.filter((user): user is User => user !== null);
//             setUsers(fetchedUsers);
//             setFilteredUsers(fetchedUsers);

//         } catch (error) {
//             console.error("Error fetching users with orders:", error);
//             setAlertMessage("Error fetching order data");
//             setAlertType("error");
//         } finally {
//             setLoading(false);
//             setRefreshing(false);
//         }
//     };

//     useEffect(() => {
//         if (users.length === 0) return;

//         let result = [...users];

//         if (searchQuery.trim()) {
//             const query = searchQuery.toLowerCase().trim();
//             result = result.filter(user =>
//             (user.username?.toLowerCase().includes(query) ||
//                 user.fullname?.toLowerCase().includes(query) ||
//                 user.phone?.toLowerCase().includes(query))
//             );
//         }

//         if (activeFilter === 'orders') {
//             result = [...result].sort((a, b) =>
//                 (b.totalItems || 0) - (a.totalItems || 0)
//             );
//         } else if (activeFilter === 'amount') {
//             result = [...result].sort((a, b) =>
//                 (b.totalSpent || 0) - (a.totalSpent || 0)
//             );
//         }

//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setFilteredUsers(result);
//     }, [searchQuery, activeFilter, users]);

//     const fetchProductsForUser = async (user: User): Promise<User> => {
//         try {
//             const productMap = new Map<string, Product>();
//             let totalSpent = 0;

//             if (user.Orders && Array.isArray(user.Orders)) {
//                 for (const order of user.Orders) {
//                     if (!order || !order.productId || !order.quantity) continue;

//                     const { productId, quantity } = order;

//                     if (productMap.has(productId)) {
//                         const product = productMap.get(productId)!;
//                         productMap.set(productId, {
//                             ...product,
//                             quantity: (product.quantity || 0) + quantity
//                         });
//                     } else {
//                         productMap.set(productId, {
//                             id: productId,
//                             quantity: quantity
//                         });
//                     }
//                 }
//             }

//             const productPromises = Array.from(productMap.keys()).map(async (productId) => {
//                 try {
//                     const productDoc = await getDoc(doc(db, "products", productId));
//                     if (productDoc.exists()) {
//                         const productData = productDoc.data();
//                         const product = productMap.get(productId)!;
//                         const quantity = product.quantity || 0;
//                         const price = productData.price || 0;
//                         const discount = productData.discount || 0;
//                         totalSpent += (price * quantity) - (price * discount / 100) * quantity;

//                         return {
//                             id: productDoc.id,
//                             name: productData.name,
//                             price: price,
//                             image: productData.image,
//                             description: productData.description,
//                             quantity: quantity,
//                             discount: discount,
//                         };
//                     }
//                 } catch (error) {
//                     console.error(`Error fetching product ${productId}:`, error);
//                 }
//                 return null;
//             });

//             const fetchedProducts = (await Promise.all(productPromises)).filter(Boolean) as Product[];

//             return {
//                 ...user,
//                 products: fetchedProducts,
//                 totalSpent
//             };
//         } catch (error) {
//             console.error("Error fetching products for user:", error);
//             return user;
//         }
//     };

//     const onRefresh = () => {
//         setRefreshing(true);
//         fetchUsersWithOrders();
//         setSearchQuery('');
//         setActiveFilter(null);
//     };

//     useEffect(() => {
//         fetchUsersWithOrders();
//     }, []);

//     const toggleExpand = (userId: string) => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setExpandedUser(expandedUser === userId ? null : userId);
//     };

//     const handleFilterToggle = (filter: FilterOption) => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setActiveFilter(activeFilter === filter ? null : filter);
//     };

//     const clearSearch = () => {
//         LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
//         setSearchQuery('');
//         Keyboard.dismiss();
//     };

//     const renderUserCard = ({ item }: { item: User }) => (
//         <TouchableOpacity
//             style={styles.card}
//             onPress={() => toggleExpand(item.id)}
//             activeOpacity={0.9}
//         >
//             <LinearGradient
//                 colors={['#D1F4FF', '#ffffff']}
//                 style={styles.cardGradient}
//             >
//                 <View style={styles.userHeader}>
//                     {item.image ? (
//                         <Image source={{ uri: item.image }} style={styles.userImage} />
//                     ) : (
//                         <View style={[styles.userImage, styles.defaultImage]}>
//                             <FontAwesome name="user" size={20} color="#fff" />
//                         </View>
//                     )}

//                     <View style={styles.userInfoContainer}>
//                         <Text style={styles.username}>{item.username || 'No name'}</Text>
//                         <Text style={styles.fullname}>{item.fullname || 'No name'}</Text>

//                         <View style={styles.infoRow}>
//                             <MaterialIcons name="email" size={16} color="#777" />
//                             <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
//                         </View>

//                         <View style={styles.infoRow}>
//                             <MaterialIcons name="phone" size={16} color="#777" />
//                             <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
//                         </View>
//                     </View>

//                     <View style={styles.orderStatsContainer}>
//                         <View style={styles.statBadge}>
//                             <Ionicons name="cart" size={16} color="#fff" />
//                             <Text style={styles.badgeText}>{item.totalItems}</Text>
//                         </View>

//                         <View style={styles.totalAmount}>
//                             <Text style={styles.totalLabel}>Total:</Text>
//                             <Text style={styles.totalValue}>${item.totalSpent?.toFixed(2)}</Text>
//                         </View>
//                     </View>
//                 </View>

//                 <View style={styles.expandIconContainer}>
//                     <Feather
//                         name={expandedUser === item.id ? "chevron-up" : "chevron-down"}
//                         size={22}
//                         color="#888"
//                     />
//                 </View>

//                 {expandedUser === item.id && item.products && (
//                     <View style={styles.expandedContent}>
//                         <View style={styles.productsHeaderRow}>
//                             <MaterialIcons name="shopping-bag" size={18} color="#4a90e2" />
//                             <Text style={styles.productsHeader}>Ordered Products</Text>
//                         </View>

//                         {item.products.map(product => (
//                             <View key={product.id} style={styles.productItem}>
//                                 {product.image ? (
//                                     <Image source={{ uri: product.image }} style={styles.productImage} />
//                                 ) : (
//                                     <View style={[styles.productImage, styles.noProductImage]}>
//                                         <MaterialIcons name="image-not-supported" size={20} color="#bbb" />
//                                     </View>
//                                 )}

//                                 <View style={styles.productDetails}>
//                                     <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
//                                     <Text style={styles.productDescription} numberOfLines={1}>
//                                         {product.description || 'No description'}
//                                     </Text>

//                                     <View style={styles.priceQuantityRow}>
//                                         <View style={styles.priceContainer}>
//                                             {(product.discount || 0) > 0 ? (
//                                                 <View style={styles.priceWithDiscountContainer}>
//                                                     <View style={styles.originalPriceContainer}>
//                                                         <FontAwesome name="dollar" size={12} color="#777" />
//                                                         <Text style={styles.originalPrice}>
//                                                             {product.price?.toFixed(2)}
//                                                         </Text>
//                                                     </View>
//                                                     <View style={styles.discountedPriceContainer}>
//                                                         <FontAwesome name="dollar" size={14} color="#4CAF50" />
//                                                         <Text style={styles.discountedPrice}>
//                                                             {((product.price || 0) - ((product.price || 0) * (product.discount || 0) / 100)).toFixed(2)}
//                                                         </Text>
//                                                         <View style={styles.discountPercentBadge}>
//                                                             <Text style={styles.discountPercentText}>-{product.discount}%</Text>
//                                                         </View>
//                                                     </View>
//                                                 </View>
//                                             ) : (
//                                                 <View style={styles.regularPriceContainer}>
//                                                     <FontAwesome name="dollar" size={14} color="#4CAF50" />
//                                                     <Text style={styles.productPrice}>
//                                                         {product.price?.toFixed(2)}
//                                                     </Text>
//                                                 </View>
//                                             )}
//                                         </View>

//                                         <View style={styles.quantityContainer}>
//                                             <AntDesign name="tags" size={14} color="#ff6b6b" />
//                                             <Text style={styles.quantityText}>
//                                                 {product.quantity} {product.quantity === 1 ? 'item' : 'items'}
//                                             </Text>
//                                         </View>
//                                     </View>

//                                     <View style={styles.subtotalRow}>
//                                         <Text style={styles.subtotalLabel}>Subtotal:</Text>
//                                         <View style={styles.subtotalValues}>
//                                             {(product.discount || 0) > 0 && (
//                                                 <Text style={styles.originalSubtotal}>
//                                                     ${((product.price || 0) * (product.quantity || 0)).toFixed(2)}
//                                                 </Text>
//                                             )}
//                                             <Text style={styles.subtotalValue}>
//                                                 ${(((product.price || 0) * (product.quantity || 0)) - ((product.price || 0) * (product.discount || 0) / 100) * (product.quantity || 0)).toFixed(2)}
//                                             </Text>
//                                         </View>
//                                     </View>
//                                 </View>
//                             </View>
//                         ))}
//                     </View>
//                 )}
//             </LinearGradient>
//         </TouchableOpacity>
//     );

//     return (
//         <>
//             <Stack.Screen name="Order" options={{ headerShown: false }} />
//             <View style={styles.container}>
//                 {alertMessage && (
//                     <MiniAlert
//                         message={alertMessage}
//                         type={alertType}
//                         onHide={() => setAlertMessage(null)}
//                     />
//                 )}

//                 <View style={styles.header}>
//                     <MaterialIcons name="shopping-bag" size={24} color="#2d3436" />
//                     <Text style={styles.title}>User Orders</Text>
//                 </View>

//                 <View style={styles.searchContainer}>
//                     <View style={styles.searchInputContainer}>
//                         <MaterialIcons name="search" size={22} color="#888" style={styles.searchIcon} />
//                         <TextInput
//                             style={styles.searchInput}
//                             placeholder="Search for customer..."
//                             value={searchQuery}
//                             onChangeText={setSearchQuery}
//                             placeholderTextColor="#999"
//                         />
//                         {searchQuery ? (
//                             <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
//                                 <Ionicons name="close-circle" size={20} color="#888" />
//                             </TouchableOpacity>
//                         ) : null}
//                     </View>
//                 </View>

//                 <View style={styles.filterContainer}>
//                     <Text style={styles.filterLabel}>Filter by:</Text>
//                     <View style={styles.filterButtons}>
//                         <TouchableOpacity
//                             style={[
//                                 styles.filterButton,
//                                 activeFilter === 'orders' && styles.activeFilterButton
//                             ]}
//                             onPress={() => handleFilterToggle('orders')}
//                         >
//                             <Ionicons
//                                 name="cart"
//                                 size={16}
//                                 color={activeFilter === 'orders' ? '#fff' : '#333'}
//                             />
//                             <Text
//                                 style={[
//                                     styles.filterButtonText,
//                                     activeFilter === 'orders' && styles.activeFilterText
//                                 ]}
//                             >
//                                 Number of Orders
//                             </Text>
//                         </TouchableOpacity>

//                         <TouchableOpacity
//                             style={[
//                                 styles.filterButton,
//                                 activeFilter === 'amount' && styles.activeFilterButton
//                             ]}
//                             onPress={() => handleFilterToggle('amount')}
//                         >
//                             <Entypo
//                                 name="credit"
//                                 size={16}
//                                 color={activeFilter === 'amount' ? '#fff' : '#333'}
//                             />
//                             <Text
//                                 style={[
//                                     styles.filterButtonText,
//                                     activeFilter === 'amount' && styles.activeFilterText
//                                 ]}
//                             >
//                                 Total Amount
//                             </Text>
//                         </TouchableOpacity>
//                     </View>
//                 </View>

//                 <View style={styles.resultsContainer}>
//                     <Text style={styles.resultsText}>
//                         {filteredUsers.length} {filteredUsers.length === 1 ? 'customer' : 'customers'}
//                     </Text>
//                 </View>

//                 {loading && !refreshing ? (
//                     <View style={styles.loadingContainer}>
//                         <ActivityIndicator size="large" color="purple" />
//                         <Text style={styles.loadingText}>Loading orders...</Text>
//                     </View>
//                 ) : filteredUsers.length === 0 ? (
//                     <View style={styles.emptyContainer}>
//                         <MaterialIcons name="search-off" size={50} color="#777" />
//                         <Text style={styles.emptyText}>
//                             {users.length === 0 ? 'No orders found' : 'No results match the search'}
//                         </Text>
//                     </View>
//                 ) : (
//                     <FlatList
//                         data={filteredUsers}
//                         renderItem={renderUserCard}
//                         keyExtractor={item => item.id}
//                         contentContainerStyle={styles.listContent}
//                         refreshControl={
//                             <RefreshControl
//                                 refreshing={refreshing}
//                                 onRefresh={onRefresh}
//                                 colors={['#4a90e2']}
//                                 tintColor="#4a90e2"
//                             />
//                         }
//                         showsVerticalScrollIndicator={false}
//                     />
//                 )}
//             </View>
//         </>
//     );
// };

// const styles = StyleSheet.create({
//     container: {
//         flex: 1,
//         backgroundColor: '#ffffff',
//     },
//     header: {
//         flexDirection: 'row',
//         justifyContent: 'center',
//         alignItems: 'center',
//         marginBottom: 15,
//         paddingTop: 50,
//     },
//     title: {
//         fontSize: 24,
//         fontWeight: 'bold',
//         color: '#2d3436',
//         marginLeft: 10,
//     },
//     loadingContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     loadingText: {
//         color: '#2d3436',
//         marginTop: 15,
//         fontSize: 16,
//         fontWeight: '500'
//     },
//     emptyContainer: {
//         flex: 1,
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     emptyText: {
//         fontSize: 16,
//         color: '#777',
//         marginTop: 10,
//     },
//     listContent: {
//         paddingHorizontal: 15,
//         paddingBottom: 20,
//     },
//     card: {
//         marginBottom: 15,
//         borderRadius: 10,
//         overflow: 'hidden',
//     },
//     cardGradient: {
//         padding: 16,
//         borderRadius: 10,
//     },
//     userHeader: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     userImage: {
//         width: 60,
//         height: 60,
//         borderRadius: 100,
//         marginRight: 14,
//         borderWidth: 2,
//         borderColor: '#fff',
//     },
//     defaultImage: {
//         backgroundColor: 'purple',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     userInfoContainer: {
//         flex: 1,
//     },
//     username: {
//         fontSize: 18,
//         fontWeight: 'bold',
//         color: '#2d3436',
//     },
//     fullname: {
//         fontSize: 14,
//         color: 'gray',
//         marginBottom: 4,
//         fontStyle: 'italic',
//     },
//     infoRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 4,
//     },
//     email: {
//         fontSize: 14,
//         color: 'gray',
//         marginLeft: 8,
//         flex: 1,
//     },
//     detailText: {
//         fontSize: 14,
//         color: 'gray',
//         marginLeft: 5,
//     },
//     orderStatsContainer: {
//         alignItems: 'flex-end',
//         justifyContent: 'space-between',
//         height: 60,
//     },
//     statBadge: {
//         backgroundColor: 'purple',
//         paddingHorizontal: 10,
//         paddingVertical: 4,
//         borderRadius: 14,
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     badgeText: {
//         color: '#fff',
//         fontWeight: 'bold',
//         marginLeft: 4,
//         fontSize: 14,
//     },
//     totalAmount: {
//         alignItems: 'flex-end',
//         marginTop: 8,
//     },
//     totalLabel: {
//         fontSize: 12,
//         color: '#777',
//     },
//     totalValue: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: 'darkgreen',
//     },
//     expandIconContainer: {
//         position: 'absolute',
//         right: 16,
//         top: 16,
//     },
//     expandedContent: {
//         marginTop: 15,
//         paddingTop: 15,
//         borderTopWidth: 1,
//         borderTopColor: '#eee',
//     },
//     productsHeaderRow: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginBottom: 12,
//     },
//     productsHeader: {
//         fontSize: 16,
//         fontWeight: '600',
//         color: 'purple',
//         marginLeft: 6,
//     },
//     productItem: {
//         flexDirection: 'row',
//         padding: 12,
//         marginBottom: 10,
//         backgroundColor: '#fff',
//         borderRadius: 10,
//         alignItems: 'center',
//         borderWidth: 1,
//         borderColor: '#ececec',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 1 },
//         shadowOpacity: 0.1,
//         shadowRadius: 2,
//         elevation: 3,
//     },
//     productImage: {
//         width: 60,
//         height: 60,
//         borderRadius: 10,
//         marginRight: 12,
//     },
//     noProductImage: {
//         backgroundColor: '#f1f1f1',
//         justifyContent: 'center',
//         alignItems: 'center',
//     },
//     productDetails: {
//         flex: 1,
//     },
//     productName: {
//         fontSize: 16,
//         fontWeight: 'bold',
//         color: '#2d3436',
//     },
//     productDescription: {
//         fontSize: 13,
//         color: 'gray',
//         marginTop: 2,
//         marginBottom: 6,
//     },
//     priceQuantityRow: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//         marginTop: 4,
//     },
//     priceContainer: {
//         flexDirection: 'column',
//     },
//     productPrice: {
//         fontSize: 15,
//         color: 'darkgreen',
//         fontWeight: 'bold',
//         marginLeft: 4,
//     },
//     priceWithDiscountContainer: {
//         flexDirection: 'column',
//     },
//     originalPriceContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     originalPrice: {
//         fontSize: 13,
//         color: '#777',
//         textDecorationLine: 'line-through',
//         marginLeft: 3,
//     },
//     discountedPriceContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         marginTop: 2,
//     },
//     discountedPrice: {
//         fontSize: 15,
//         color: 'darkgreen',
//         fontWeight: 'bold',
//         marginLeft: 4,
//     },
//     discountPercentBadge: {
//         backgroundColor: '#ff6b6b',
//         borderRadius: 4,
//         paddingHorizontal: 4,
//         paddingVertical: 1,
//         marginLeft: 6,
//     },
//     discountPercentText: {
//         color: 'white',
//         fontSize: 10,
//         fontWeight: 'bold',
//     },
//     regularPriceContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     quantityContainer: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     quantityText: {
//         fontSize: 14,
//         color: 'darkred',
//         marginLeft: 4,
//         fontWeight: '500',
//     },
//     subtotalRow: {
//         flexDirection: 'row',
//         justifyContent: 'flex-end',
//         alignItems: 'center',
//         marginTop: 8,
//         paddingTop: 4,
//         borderTopWidth: 1,
//         borderTopColor: '#ececec',
//     },
//     subtotalLabel: {
//         fontSize: 12,
//         color: '#777',
//         marginRight: 6,
//     },
//     subtotalValue: {
//         fontSize: 15,
//         fontWeight: 'bold',
//         color: '#2d3436',
//     },
//     searchContainer: {
//         paddingHorizontal: 15,
//         marginBottom: 10,
//     },
//     searchInputContainer: {
//         flexDirection: 'row',
//         backgroundColor: '#fff',
//         borderRadius: 8,
//         alignItems: 'center',
//         paddingHorizontal: 10,
//         borderWidth: 1,
//         borderColor: '#ddd',
//         height: 46,
//     },
//     searchIcon: {
//         marginRight: 8,
//     },
//     searchInput: {
//         flex: 1,
//         height: '100%',
//         fontSize: 16,
//         color: '#333',
//         textAlign: Platform.OS === 'android' ? 'left' : 'auto',
//     },
//     clearButton: {
//         padding: 4,
//     },
//     filterContainer: {
//         paddingHorizontal: 15,
//         marginBottom: 10,
//     },
//     filterLabel: {
//         fontSize: 14,
//         color: '#555',
//         marginBottom: 6,
//         fontWeight: '500',
//     },
//     filterButtons: {
//         flexDirection: 'row',
//         justifyContent: 'space-between',
//     },
//     filterButton: {
//         flexDirection: 'row',
//         alignItems: 'center',
//         backgroundColor: '#f0f8ff',
//         paddingVertical: 10,
//         paddingHorizontal: 16,
//         borderRadius: 20,
//         justifyContent: 'center',
//         width: '48%',
//         borderWidth: 1,
//         borderColor: '#add8e6',
//         shadowColor: '#000',
//         shadowOffset: { width: 0, height: 3 },
//         shadowOpacity: 0.3,
//         shadowRadius: 4,
//         elevation: 6,
//     },
//     activeFilterButton: {
//         backgroundColor: 'purple',
//         borderColor: '#9370db',
//         shadowColor: 'purple',
//         shadowOffset: { width: 0, height: 3 },
//         shadowOpacity: 0.6,
//         shadowRadius: 6,
//         elevation: 8,
//     },
//     filterButtonText: {
//         color: '#333',
//         marginLeft: 6,
//         fontWeight: '500',
//         fontSize: 14,
//     },
//     activeFilterText: {
//         color: '#fff',
//     },
//     resultsContainer: {
//         paddingHorizontal: 15,
//         marginBottom: 10,
//         alignItems: 'flex-end',
//     },
//     resultsText: {
//         fontSize: 12,
//         color: '#666',
//         fontStyle: 'italic',
//     },
//     discountText: {
//         color: '#e91e63',
//         fontWeight: '500',
//     },
//     discountBadge: {
//         fontSize: 12,
//         color: '#e91e63',
//         fontStyle: 'italic',
//     },
//     subtotalValues: {
//         flexDirection: 'row',
//         alignItems: 'center',
//     },
//     originalSubtotal: {
//         fontSize: 13,
//         color: '#999',
//         textDecorationLine: 'line-through',
//         marginRight: 5,
//     },
// });

// export default OrdersScreen;