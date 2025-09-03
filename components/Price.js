import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
  TextInput,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";

const Price = ({ modalVisible_2, setModalVisible_2, onApply }) => {
  const [min, setMin] = useState("");
  const [max, setMax] = useState("");

  const handleApply = () => {
    const minValue = min ? parseFloat(min) : 0;
    const maxValue = max ? parseFloat(max) : 1000000;
    onApply(minValue, maxValue);
    setMin("");
    setMax("");
  };

  return (
    <Modal
      transparent={true}
      visible={modalVisible_2}
      animationType="slide"
      onRequestClose={() => setModalVisible_2(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.header}>
            {/* <TouchableOpacity onPress={() => { setMin(""); setMax(""); }}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity> */}
            <Text style={styles.title}>Price</Text>
            <TouchableOpacity onPress={() => setModalVisible_2(false)}>
              <Icon name="close" size={20} color="black" />
            </TouchableOpacity>
          </View>

          <TextInput
            style={styles.option}
            placeholder="Min"
            keyboardType="numeric"
            value={min}
            onChangeText={setMin}
          />
          <TextInput
            style={styles.option}
            placeholder="Max"
            keyboardType="numeric"
            value={max}
            onChangeText={setMax}
          />

          <TouchableOpacity style={styles.applyButton} onPress={handleApply}>
            <Text style={styles.applyButtonText}>Apply</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    justifyContent: "flex-end",
    backgroundColor: "rgba(0, 0, 0, 0.5)",
  },
  modalContainer: {
    backgroundColor: "#fff",
    padding: 20,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 20,
  },
  clearText: {
    fontSize: 14,
    color: "gray",
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
  },
  option: {
    padding: 15,
    borderRadius: 10,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  applyButton: {
    backgroundColor: "#f5e1d2",
    padding: 15,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 10,
  },
  applyButtonText: {
    fontWeight: "bold",
    color: "#000",
  },
});

export default Price;