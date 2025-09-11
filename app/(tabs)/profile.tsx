import AsyncStorage from "@react-native-async-storage/async-storage";
import { router } from "expo-router";
import React, { useEffect, useState } from "react";
import { Image, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import MiniAlert from "../../components/MiniAlert";

const Profile = () => {
  const [userData, setUserData] = useState<any>(null);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [alertMsg, setAlertMsg] = useState<string | null>(null);
  const [alertType, setAlertType] = useState<'success' | 'error'>('error');

  useEffect(() => {
    const fetchUserData = async () => {
      const userDataString = await AsyncStorage.getItem("UserObject");
      if (userDataString) {
        const data = JSON.parse(userDataString);
        setUserData(data);
        setIsLoggedIn(data !== "undefined");
      }
    };
    fetchUserData();
  }, []);

  const showAlert = (message: string, type: 'success' | 'error' = 'error') => {
    setAlertMsg(message);
    setAlertType(type);
  };

  const handleAuthenticatedAction = (action: () => void) => {
    if (!isLoggedIn) {
      showAlert("Please login to access this feature", 'error');
      return;
    }
    action();
  };

  return (
    <View style={styles.container}>
      {alertMsg && (
        <MiniAlert
          message={alertMsg}
          type={alertType}
          onHide={() => setAlertMsg(null)}
        />
      )}
      <Image
        source={
          userData?.image
            ? { uri: userData?.image }
            : { uri: "https://randomuser.me/api/portraits/men/1.jpg" }
        }
        style={styles.logo}
      />

      <View style={styles.infobox}>
        <View style={styles.info}>
          <Text style={styles.name}>
            {String(userData?.username).toUpperCase() == "UNDEFINED"
              ? "Please Login..."
              : userData?.username}
          </Text>
          <Text style={styles.mail}>
            {String(userData?.email).toLowerCase() == "undefined"
              ? "Please Login..."
              : String(userData?.email).toLowerCase()}
          </Text>
          <Text style={styles.mail}>{userData?.phone}</Text>
        </View>
        <TouchableOpacity
          style={styles.edit}
          onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/editprofile"))}
          activeOpacity={0.4}
        >
          <Text style={styles.edittext}>Edit</Text>
        </TouchableOpacity>
      </View>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/orders"))}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>Orders</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/address"))}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>Address</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={() => handleAuthenticatedAction(() => router.push("../(ProfileTabs)/Wishlist"))}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>Wishlist</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={() => router.push("../(ProfileTabs)/help")}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>Help & Support</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={() => router.push("../(ProfileTabs)/About")}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>About</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.profiletabs}
        onPress={()  => router.push("../(ProfileTabs)/Settings")}
        activeOpacity={0.6}
      >
        <Text style={styles.textb}>Settings</Text>
        <View style={styles.arrow}></View>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    backgroundColor: "white",
    paddingTop: 80,
  },
  profiletabs: {
    backgroundColor: "white",
    width: "90%",
    height: 53,
    borderRadius: 10,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 8,
    marginBottom: 12,
    paddingLeft: 20,
    justifyContent: "center",
  },
  textb: {
    fontSize: 17,
    fontWeight: "bold",
  },
  logo: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  infobox: {
    width: "90%",
    backgroundColor: "white",
    height: 80,
    borderRadius: 10,
    marginVertical: 20,
    flexDirection: "row",
    elevation: 1,
    padding: 4,
  },
  info: {
    flex: 1,
  },
  edit: {
    justifyContent: "center",
    paddingRight: 15,
  },
  edittext: {
    color: "purple",
    fontSize: 15,
    fontWeight: "bold",
    textAlign: "center",
    borderColor: "purple",
    borderWidth: 2,
    borderRadius: 10,
    borderStyle: "dashed",
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: "bold",
    color: "black",
    marginBottom: 2,
    marginLeft: 15,
  },
  mail: {
    fontSize: 15,
    fontWeight: "bold",
    color: "gray",
    marginLeft: 15,
  },
  arrow: {
    position: "absolute",
    right: 15,
    width: 10,
    height: 10,
    borderLeftWidth: 3,
    borderBottomWidth: 3,
    borderColor: "#111",
    transform: [{ rotate: "-45deg" }],
  },
});

export default Profile;
