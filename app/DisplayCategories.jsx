import React, { useState, useEffect, useMemo } from "react";
import { View, Text, FlatList, Image, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { Stack, useRouter, useLocalSearchParams } from "expo-router";
import { db } from '../Firebase/Firebase';
import { collection, onSnapshot, orderBy, query } from "firebase/firestore";
import { Ionicons } from "@expo/vector-icons";

const applyDiscount = (price, discountPercentage) => {
  return Math.floor(price - (price * discountPercentage) / 100);
};

const formatNumber = (number) => {
  return new Intl.NumberFormat().format(number);
};

const DisplayCategories = () => {
  const router = useRouter();
  const { title, filter } = useLocalSearchParams();
  const categoryName = typeof title === "string" ? title : "";
  const categoryNameLower = categoryName.toLowerCase();
  const filterType = typeof filter === "string" ? filter : "";

  const [products, setProducts] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [pageTitle, setPageTitle] = useState(categoryName);

  useEffect(() => {
    setIsLoading(true);
    
    if (filterType === "top-selling") {
      setPageTitle("Top Selling");
    } else if (filterType === "new-arrivals") {
      setPageTitle("New Arrivals");
    } else if (filterType === "recommended") {
      setPageTitle("Recommended For You");
    } else {
      setPageTitle(categoryName);
    }

    const productsQuery = query(collection(db, "products"));

    const unsubscribe = onSnapshot(productsQuery, (snapshot) => {
      const allProducts = snapshot.docs.map((doc) => ({
        docId: doc.id,
        ...doc.data(),
      }));

      let filteredProducts = allProducts;

      if (filterType === "top-selling") {
        filteredProducts = [...allProducts].sort((a, b) => (b.sold || 0) - (a.sold || 0));
      } else if (filterType === "new-arrivals") {
        filteredProducts = [...allProducts].sort((a, b) => {
          const dateA = a.createdAt?.toDate?.() || new Date(0);
          const dateB = b.createdAt?.toDate?.() || new Date(0);
          return dateB - dateA;
        });
      } else if (filterType === "recommended") {
        filteredProducts = [...allProducts].sort(() => Math.random() - 0.5);
      } else if (categoryName) {
        filteredProducts = allProducts.filter(product => {
          if (typeof product.category === 'string') {
            return product.category.toLowerCase() === categoryNameLower;
          }
          return false;
        });
      }

      setProducts(filteredProducts);
      setIsLoading(false);
    }, (error) => {
      console.error("Error fetching products:", error);
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, [categoryNameLower, filterType]);

  const ProductItem = ({ item }) => {
    const discount = item.discount || Math.floor(Math.random() * 41) + 10;

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => router.push({ pathname: "/singlepage", params: { id: item.docId } })}
      >
        <Image source={{ uri: item.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
          <View style={styles.priceContainer}>
            <Text style={styles.oldPrice}>{formatNumber(item.price)} EGP</Text>
            <Text style={styles.newPrice}>{formatNumber(applyDiscount(item.price, discount))} EGP</Text>
          </View>
          <View style={styles.discountTag}>
            <Text style={styles.discountText}>{discount}% OFF</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#E91E63" />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen
        options={{
          title: pageTitle,
          headerStyle: { backgroundColor: '#f9f9f9' },
          headerTintColor: '#333',
          headerTitleStyle: { fontWeight: 'bold' },
        }}
      />
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
            <Ionicons name="arrow-back" size={24} color="#333" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{pageTitle}</Text>
          <View style={{ width: 24 }} />
        </View>

        <View style={styles.countContainer}>
          <Text style={styles.countText}>
            {products.length} {products.length === 1 ? 'product' : 'products'} found
          </Text>
        </View>

        {products.length > 0 ? (
          <FlatList
            data={products}
            keyExtractor={(item) => item.docId}
            renderItem={({ item }) => <ProductItem item={item} />}
            numColumns={2}
            contentContainerStyle={styles.productsList}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No products found</Text>
          </View>
        )}
      </View>
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    padding: 10,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: "#fff",
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 15,
    paddingHorizontal: 10,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'capitalize',
  },
  countContainer: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    marginBottom: 10,
    borderRadius: 8,
  },
  countText: {
    color: '#333',
    fontWeight: '500',
    fontSize: 16,
  },
  productsList: {
    paddingBottom: 20,
  },
  productCard: {
    flex: 1,
    margin: 8,
    backgroundColor: '#fff',
    borderRadius: 10,
    overflow: 'hidden',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    maxWidth: '47%',
  },
  productImage: {
    width: '100%',
    height: 150,
    resizeMode: 'cover',
  },
  productInfo: {
    padding: 10,
  },
  productName: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 5,
  },
  priceContainer: {
    flexDirection: 'column',
    marginTop: 5,
  },
  oldPrice: {
    textDecorationLine: 'line-through',
    color: '#888',
    fontSize: 13,
  },
  newPrice: {
    color: '#E91E63',
    fontWeight: 'bold',
    fontSize: 16,
  },
  discountTag: {
    position: 'absolute',
    top: -150,
    right: 0,
    backgroundColor: '#E91E63',
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderTopLeftRadius: 8,
    borderBottomLeftRadius: 8,
  },
  discountText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});

export default DisplayCategories;