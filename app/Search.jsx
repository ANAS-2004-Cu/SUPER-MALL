import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  StatusBar,
  Dimensions,
  FlatList,
  Image,
} from "react-native";
import Icon from "react-native-vector-icons/Feather";
import { MaterialIcons } from "@expo/vector-icons";
import Gender from "../components/Gender";
import Sort from "../components/Sort";
import Price from "../components/Price";
import { useRouter } from "expo-router";
import { db, auth } from "../Firebase/Firebase";
import Icon_1 from 'react-native-vector-icons/MaterialIcons';
const { width } = Dimensions.get("window");
const cardWidth = width / 2 - 30;
import { collection, onSnapshot, setDoc, doc, getDoc, updateDoc, increment } from "firebase/firestore";
import MiniAlert from "../components/MiniAlert";

const SearchFilterScreen = () => {
  const [searchText, setSearchText] = useState("");
  const [sortModalVisible, setSortModalVisible] = useState(false);
  const [priceModalVisible, setPriceModalVisible] = useState(false);
  const [genderModalVisible, setGenderModalVisible] = useState(false);
  const currentUser = auth.currentUser;
  const [data, setData] = useState([]);
  const [filteredData, setFilteredData] = useState([]);

  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(1000000);
  const [sortOption, setSortOption] = useState("Newest");
  const [selectedGender, setSelectedGender] = useState(null);
  const [alertMsg, setAlertMsg] = useState(null);
  const [alertType, setAlertType] = useState('success');
  const [load, setLoad] = useState(false);

  const showAlert = (message, type = 'success') => {
    setLoad(true);
    setAlertMsg(message);
    setAlertType(type);
    setTimeout(() => {
      setAlertMsg(null);
      setLoad(false);
    }, 3000);
  };

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, "products"), (snapshot) => {
      const productsData = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));
      setData(productsData);
      setFilteredData(productsData);
    });

    return () => unsubscribe();
  }, []);

  const router = useRouter();

  const handleBack = () => {
    router.back();
  };

  const handleSearch = (text) => {
    setSearchText(text);

    const filtered = data.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(text.toLowerCase());
      const matchPrice =
        Number(item.price) >= minPrice && Number(item.price) <= maxPrice;
      const matchGender = selectedGender ? item.gender === selectedGender : true;

      return matchSearch && matchPrice && matchGender;
    });

    setFilteredData(filtered);
  };

  const applyPriceFilter = (min, max) => {
    setMinPrice(min);
    setMaxPrice(max);

    const filtered = data.filter((item) => {
      const matchSearch = item.name
        .toLowerCase()
        .includes(searchText.toLowerCase());
      const matchPrice =
        Number(item.price) >= min && Number(item.price) <= max;
      const matchGender = selectedGender ? item.gender === selectedGender : true;

      return matchSearch && matchPrice && matchGender;
    });

    setFilteredData(filtered);
    setPriceModalVisible(false);
  };

  const handleSort = (option) => {
    setSortOption(option);
    const sortedData = [...filteredData];

    if (option === "Newest") {
      sortedData.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    } else if (option === "Lowest - Highest Price") {
      sortedData.sort((a, b) => a.price - b.price);
    } else if (option === "Highest - Lowest Price") {
      sortedData.sort((a, b) => b.price - a.price);
    }

    setFilteredData(sortedData);
    setSortModalVisible(false);
  };

  const handleGenderSelect = (gender) => {
    setSelectedGender(gender);

    const filtered = data.filter((item) => {
      const matchSearch = item.name.toLowerCase().includes(searchText.toLowerCase());
      const matchPrice =
        Number(item.price) >= minPrice && Number(item.price) <= maxPrice;
      const matchGender = gender ? item.category === gender : true;

      return matchSearch && matchPrice && matchGender;
    });

    setFilteredData(filtered);
    setGenderModalVisible(false);
  };
  const applyDiscount = (price, discountPercentage) => {
    return Math.floor(price - (price * discountPercentage) / 100);
  };
  const handleAddToCart = async (item) => {
    if (!currentUser) {
      showAlert('Please sign in to add products to your shopping cart', 'error');
      setTimeout(() => {
        router.push("/Login");
      }, 3000);
      return;
    }

    try {
      const cartDocRef = doc(db, 'Users', currentUser.uid, 'cart', item.docId);
      const cartDocSnap = await getDoc(cartDocRef);

      if (cartDocSnap.exists()) {
        await updateDoc(cartDocRef, {
          quantity: increment(1),
          updatedAt: new Date(),
        });
      } else {
        await setDoc(cartDocRef, {
          productId: item.docId,
          name: item.name,
          price: item.price,
          image: item.image,
          discount: item.discount || 0,
          quantity: 1,
          createdAt: new Date(),
        });
      }
      showAlert(`${String(item.name).split(' ').slice(0, 2).join(' ')} Added to your shopping cart`, 'success');

    } catch (error) {
      console.error("Error adding to cart:", error);
      showAlert('Failed to add product to cart. Please try again.', 'error');
    }
  };
  const renderItem = ({ item }) => (
    <TouchableOpacity
      onPress={() => router.push({ pathname: "/singlepage", params: { id: item.docId } })}
      disabled={load}
    >
      <View style={styles.productCard}>
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <Text style={styles.productTitle} numberOfLines={3}>{item.name}</Text>
        <Text style={styles.productPrice}>EGP {applyDiscount(item.price, item.discount)}</Text>
        <TouchableOpacity
          style={styles.addToCartButton}
          onPress={() => handleAddToCart(item)}
          disabled={load}
        >
          <Icon name="shopping-cart" size={20} color="#fff" />
          <Text style={{ color: '#fff', marginLeft: 5 }}>Add to Cart</Text>
        </TouchableOpacity>
      </View>
    </TouchableOpacity>
  );

  Return = () => {
    setSearchText("");
    setFilteredData(data);
    setMinPrice(0);
    setMaxPrice(1000000);
    setSortOption("");
    setSelectedGender(null);
  };
  return (
    <>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <StatusBar backgroundColor={"#f5e1d2"} barStyle="dark-content" />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={handleBack}>
            <MaterialIcons name="arrow-back" size={24} color="black" />
          </TouchableOpacity>
          <View style={styles.searchBar}>
            <Icon name="search" size={20} color="#888" />
            <TextInput
              style={styles.input}
              placeholder="Search..."
              value={searchText}
              onChangeText={handleSearch}
            />
          </View>
        </View>

        <View style={styles.filterContainer}>
          <TouchableOpacity style={styles.filterButton} onPress={() =>

            Return()
          }>
            <Icon_1 name="clear" size={22} color="#000" />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setPriceModalVisible(true)}
          >
            <Text style={styles.text}>Price ▼</Text>
            <Price
              modalVisible_2={priceModalVisible}
              setModalVisible_2={setPriceModalVisible}
              onApply={applyPriceFilter}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setSortModalVisible(true)}
          >
            <Sort
              modalVisible={sortModalVisible}
              setModalVisible={setSortModalVisible}
              onSort={handleSort}
            />
            <Text style={styles.text}>Sort by ▼</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.button}
            onPress={() => setGenderModalVisible(true)}
          >
            <Gender
              modalVisible_1={genderModalVisible}
              setModalVisible_1={setGenderModalVisible}
              onSelect={handleGenderSelect}
            />
            <Text style={styles.text}>Gender ▼</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.found}>
          <Text style={styles.foundText}>{filteredData.length} Results Found</Text>
        </View>

        {searchText.trim() !== "" && filteredData.length === 0 && (
          <View style={styles.noResults}>
            <Icon name="search" size={100} color="black" />
            <Text style={styles.noResultsText}>
              Sorry, We Couldn't find any matching result for your Search.
            </Text>
          </View>
        )}

        <FlatList
          data={filteredData}
          keyExtractor={(item) => item.docId}
          renderItem={renderItem}
          contentContainerStyle={styles.productList}
          numColumns={2}
          showsVerticalScrollIndicator={false}
        />
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: "#f5f5f5",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 15,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "white",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 25,
  },
  input: {
    flex: 1,
    marginLeft: 10,
  },
  filterContainer: {
    flexDirection: "row",
    justifyContent: "space-around",
    marginTop: 15,
    flexWrap: "wrap",
  },
  button: {
    backgroundColor: "#f5e1d2",
    paddingHorizontal: 8,
    paddingVertical: 8,
    borderRadius: 20,
    margin: 5,
  },
  text: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#000",
  },
  found: {
    padding: 8,
    borderRadius: 20,
    marginTop: 15,
  },
  foundText: {
    color: "black",
    fontSize: 16,
    fontWeight: "bold",
  },
  productList: {
    paddingHorizontal: 5,
    paddingBottom: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  productCard: {
    width: cardWidth,
    backgroundColor: "#fff",
    borderRadius: 12,
    padding: 12,
    margin: 8,
    elevation: 6,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    alignItems: "center",
    height: 280,
  },
  productImage: {
    width: "100%",
    height: 120,
    resizeMode: "contain",
    borderRadius: 10,
  },
  productTitle: {
    fontSize: 16,
    fontWeight: "600",
    marginTop: 8,
    textAlign: "center",
    color: "#333",
  },
  productPrice: {
    fontSize: 14,
    color: "#757575",
    marginTop: "auto",
    marginBottom: 5,
  },
  filterButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#f5e1d2",
    padding: 8,
    borderRadius: 20,
  },
  noResults: {
    marginTop: 80,
    padding: 10,
    alignItems: "center",
  },
  noResultsText: {
    color: "black",
    fontSize: 26,
    fontWeight: "bold",
    textAlign: "center",
  },

  addToCartButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.75)',
    paddingVertical: 8,
    borderRadius: 20,
    marginTop: 10,
    width: "100%",
  },
});

export default SearchFilterScreen;