import { Feather, FontAwesome, Ionicons, MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Stack } from 'expo-router';
import { collection, deleteDoc, doc, getDocs, updateDoc } from 'firebase/firestore';
import React, { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    FlatList,
    Image,
    RefreshControl,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import MiniAlert from '../../components/MiniAlert';
import { auth, db } from '../../Firebase/Firebase';
import DeleteModal from '../../Modal/DeleteModal';

interface User {
    id: string;
    username?: string;
    email?: string;
    phone?: string;
    isAdmin?: boolean;
    image?: string;
}

const Users = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [currentUserId, setCurrentUserId] = useState('');
    const [searchQuery, setSearchQuery] = useState('');
    const [isSearchFocused, setIsSearchFocused] = useState(false);
    const [alertMessage, setAlertMessage] = useState<string | null>(null);
    const [alertType, setAlertType] = useState<'success' | 'error'>('success');
    const [modalVisible, setModalVisible] = useState(false);
    const [selectedUser, setSelectedUser] = useState<User | null>(null);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const fetchUsers = async () => {
        try {
            const querySnapshot = await getDocs(collection(db, "Users"));
            const usersList = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as User));

            usersList.sort((a, b) => Number(b.isAdmin) - Number(a.isAdmin));
            setUsers(usersList);
            setFilteredUsers(usersList);

            if (auth.currentUser) {
                setCurrentUserId(auth.currentUser.uid);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            setAlertMessage("Failed to load users");
            setAlertType("error");
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    const toggleAdmin = async (id: string, currentStatus: boolean) => {
        if (id === currentUserId) {
            setAlertMessage("You Cant Change Your Own Admin Status");
            setAlertType("error");
            return;
        }

        try {
            await updateDoc(doc(db, "Users", id), { isAdmin: !currentStatus });
            if (currentStatus) {
                setAlertMessage("Admin Removed Successfully ✍");
                setAlertType("success");
                setAlertType("error");
            }
            else {
                setAlertMessage("Admin Added Successfully 🛡");
                setAlertType("success");
            }
            fetchUsers();
        } catch (error) {
            console.error("Error updating user:", error);
            setAlertMessage("An Error Occurred While Assigning User");
            setAlertType("error");
        }
    };

    const confirmDeleteUser = (user: User) => {
        if (user.id === currentUserId) {
            setAlertMessage("You Cant Delete Yourself");
            setAlertType("error");
            return;
        }

        setSelectedUser(user);
        setModalVisible(true);
    };

    const deleteUser = async () => {
        if (!selectedUser) return;
        setDeleteLoading(true);
        try {
            await deleteUserFromServer(selectedUser.id);
            await deleteDoc(doc(db, "Users", selectedUser.id));
            setAlertMessage("User Deleted Successfully");
            setAlertType("success");
            fetchUsers();
        } catch (error) {
            setAlertMessage("An Error Occurred While Deleting User");
            setAlertType("error");
        } finally {
            setModalVisible(false);
            setSelectedUser(null);
            setDeleteLoading(false);
        }
    };

    const deleteUserFromServer = async (uid: string) => {
        try {
            await fetch(`https://my-node-yucq.onrender.com/delete-user`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ uid }),
            });
        } catch (error) {
            setAlertMessage("An Error Occurred While Deleting User On Render");
            setAlertType("error");
        }
    };

    const onRefresh = () => {
        setRefreshing(true);
        fetchUsers();
    };

    const handleSearch = (query: string) => {
        setSearchQuery(query);
        if (query === '') {
            setFilteredUsers(users);
        } else {
            const filtered = users.filter(user =>
                user.username?.toLowerCase().includes(query.toLowerCase()) ||
                user.email?.toLowerCase().includes(query.toLowerCase()) ||
                user.phone?.toLowerCase().includes(query.toLowerCase())
            );
            setFilteredUsers(filtered);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const renderItem = ({ item }: { item: User }) => (
        <View style={[styles.card, item.isAdmin && styles.adminCard]}>
            <LinearGradient
                colors={item.isAdmin == false ? ['#D1F4FF', '#ffffff'] : ['#f9f0ff', '#f9f0ff']}
                style={styles.cardGradient}
            >
                <View style={styles.userHeader}>
                    {item.image ? (
                        <Image
                            source={{ uri: item.image }}
                            style={styles.userImage}
                        />
                    ) : (
                        <View style={[styles.userImage, styles.defaultImage]}>
                            <FontAwesome name="user" size={20} color="#fff" />
                        </View>
                    )}
                    <View style={styles.userInfoContainer}>
                        <View style={styles.nameRow}>
                            <Text style={styles.username}>{item.username || 'No name'}</Text>
                            {item.isAdmin && (
                                <MaterialIcons
                                    name="verified"
                                    size={18}
                                    color="#4a90e2"
                                    style={styles.verifiedIcon}
                                />
                            )}
                        </View>

                        <View style={styles.infoRow}>
                            <MaterialIcons name="email" size={16} color="#777" />
                            <Text style={styles.email} numberOfLines={1}>{item.email}</Text>
                        </View>
                    </View>
                </View>

                <View style={styles.detailsRow}>
                    <View style={styles.detailItem}>
                        <MaterialIcons name="phone" size={16} color="#4a90e2" />
                        <Text style={styles.detailText}>{item.phone || 'No phone'}</Text>
                    </View>

                    <View style={styles.detailItem}>
                        <Ionicons
                            name={item.isAdmin ? 'shield-checkmark' : 'person'}
                            size={16}
                            color={item.isAdmin ? '#4a90e2' : '#777'}
                        />
                        <Text style={styles.detailText}>
                            {item.isAdmin ? 'Admin' : 'User'}
                        </Text>
                    </View>
                </View>

                <View style={styles.actions}>
                    <TouchableOpacity
                        style={[styles.button, styles.actionButton, item.isAdmin ? styles.removeAdmin : styles.makeAdmin, item.id === currentUserId && styles.disabledButton]}
                        onPress={() => toggleAdmin(item.id, item.isAdmin || false)}
                        disabled={item.id === currentUserId}
                    >
                        <Feather name={item.isAdmin ? 'user-minus' : 'user-plus'} size={16} color="#fff" />
                        <Text style={styles.buttonText}>
                            {item.isAdmin ? 'Remove Admin' : 'Make Admin'}
                        </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                        style={[styles.button, styles.actionButton, styles.deleteButton, item.id === currentUserId && styles.disabledButton]}
                        onPress={() => confirmDeleteUser(item)}
                        disabled={item.id === currentUserId}
                    >
                        <Feather name="trash-2" size={16} color="#fff" />
                        <Text style={styles.buttonText}>Delete</Text>
                    </TouchableOpacity>
                </View>
            </LinearGradient>
        </View>
    );

    return (
        <>
            <Stack.Screen name="Users" options={{ headerShown: false }} />
            <View style={styles.container}>
                {
                    alertMessage && (
                        <MiniAlert
                            message={alertMessage}
                            type={alertType}
                            onHide={() => setAlertMessage(null)}
                        />
                    )
                }
                <View style={styles.header}>
                    <Text style={styles.title}>
                        <MaterialIcons name="people-alt" size={24} color="#2d3436" />
                        <Text>  </Text>
                        Users List
                    </Text>
                </View>

                <View style={styles.searchContainer}>
                    <View style={[styles.searchWrapper, isSearchFocused && styles.searchWrapperFocused]}>
                        <Feather name="search" size={20} color="#999" style={styles.searchIcon} />
                        <TextInput
                            style={[styles.searchInput, isSearchFocused && styles.searchInputFocused]}
                            placeholder="Search by name, email, or phone"
                            placeholderTextColor="#999"
                            value={searchQuery}
                            onChangeText={handleSearch}
                            clearButtonMode="while-editing"
                            onFocus={() => setIsSearchFocused(true)}
                            onBlur={() => setIsSearchFocused(false)}
                        />
                    </View>
                </View>

                {loading && !refreshing ? (
                    <View style={styles.loadingContainer}>
                        <ActivityIndicator size="large" color="#6200ee" />
                        <Text style={styles.loadingText}>Loading users...</Text>
                    </View>
                ) : (
                    <FlatList
                        data={filteredUsers}
                        keyExtractor={(item) => item.id}
                        renderItem={renderItem}
                        contentContainerStyle={styles.listContent}
                        ListEmptyComponent={
                            <View style={styles.emptyContainer}>
                                <MaterialIcons name="people-outline" size={50} color="#777" />
                                <Text style={styles.emptyText}>No users found</Text>
                            </View>
                        }
                        showsVerticalScrollIndicator={false}
                        refreshControl={
                            <RefreshControl
                                refreshing={refreshing}
                                onRefresh={onRefresh}
                                colors={['#4a90e2']}
                                tintColor="#4a90e2"
                            />
                        }
                    />
                )}

                <DeleteModal
                    visible={modalVisible}
                    onClose={() => setModalVisible(false)}
                    onConfirm={deleteUser}
                    isLoading={deleteLoading}
                    title={`Delete ${selectedUser?.username || 'User'}`}
                    message="Are you sure you want to delete this user? This action cannot be undone."
                    warningMessage={selectedUser?.isAdmin ? "Carufully! This User Is Admin" : undefined}
                    confirmButtonText="Delete"
                    cancelButtonText="Cancel"
                />
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
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'white',
    },
    loadingText: {
        color: '#2d3436',
        marginTop: 15,
        fontSize: 16,
        fontWeight: '500'
    },
    header: {
        padding: 20,
        paddingTop: 50,
        alignItems: 'center',
        justifyContent: 'center',
    },
    title: {
        fontSize: 24,
        fontWeight: 'bold',
        color: '#2d3436',
        textAlign: 'center',
    },
    searchContainer: {
        paddingHorizontal: 15,
        marginBottom: 15,
        marginTop: 10,
    },
    searchWrapper: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#fff',
        borderRadius: 10,
        paddingHorizontal: 15,
        height: 50,
        shadowColor: '#000',
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.25,
        shadowRadius: 3.84,
        elevation: 5,
    },
    searchWrapperFocused: {
        borderWidth: 1,
        borderColor: 'purple',
    },
    searchIcon: {
        marginRight: 10,
    },
    searchInput: {
        flex: 1,
        height: '100%',
        fontSize: 16,
        color: '#333',
    },
    searchInputFocused: {
        borderWidth: 0,
    },
    listContent: {
        paddingHorizontal: 15,
        paddingBottom: 30,
    },
    card: {
        backgroundColor: '#fff',
        borderRadius: 10,
        marginBottom: 15,
        elevation: 8,
        shadowColor: '#000',
        shadowOpacity: 0.25,
        shadowOffset: { width: 0, height: 2 },
        shadowRadius: 3.84,
    },
    adminCard: {
        borderLeftWidth: 4,
        borderLeftColor: 'purple',
        backgroundColor: '#f9f0ff',
    },
    userHeader: {
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 12,
    },
    userImage: {
        width: 50,
        height: 50,
        borderRadius: 100,
        marginRight: 12,
    },
    defaultImage: {
        backgroundColor: 'purple',
        justifyContent: 'center',
        alignItems: 'center',
    },
    userInfoContainer: {
        flex: 1,
    },
    nameRow: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    username: {
        fontSize: 18,
        fontWeight: 'bold',
        color: '#2d3436',
    },
    verifiedIcon: {
        marginLeft: 5,
    },
    infoRow: {
        flexDirection: 'row',
        alignItems: 'center',
        marginTop: 4,
    },
    email: {
        fontSize: 14,
        color: 'gray',
        marginLeft: 8,
        flex: 1,
    },
    detailsRow: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        marginVertical: 10,
        paddingVertical: 10,
        borderTopWidth: 1,
        borderBottomWidth: 1,
        borderColor: '#eee',
    },
    detailItem: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    detailText: {
        fontSize: 14,
        color: 'gray',
        marginLeft: 5,
    },
    actions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: 10,
    },
    button: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: 10,
        paddingVertical: 10,
        paddingHorizontal: 15,
    },
    actionButton: {
        flex: 1,
        marginHorizontal: 5,
        elevation: 3,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.2,
        shadowRadius: 1.41,
    },
    makeAdmin: {
        backgroundColor: 'purple',
    },
    removeAdmin: {
        backgroundColor: '#f4b400',
    },
    deleteButton: {
        backgroundColor: 'darkred',
    },
    disabledButton: {
        backgroundColor: '#ccc',
    },
    buttonText: {
        color: '#fff',
        fontWeight: 'bold',
        marginLeft: 8,
        fontSize: 14,
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        padding: 40,
    },
    emptyText: {
        fontSize: 16,
        color: '#777',
        marginTop: 10,
    },
    cardGradient: {
        padding: 20,
        borderRadius: 10,
    },
});

export default Users;