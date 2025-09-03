import React, { useState } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Modal,
  StyleSheet,
} from "react-native";
import Icon from "react-native-vector-icons/FontAwesome";

const Gengder = ({ modalVisible_1, setModalVisible_1 , onSelect}) => {
  const [selectedOption, setSelectedOption] = useState("");

  const options = [
    "Men",
    "Women",
    "Kids",
  ];

  return (
    <Modal transparent={true} visible={modalVisible_1} animationType="slide" onRequestClose={() => setModalVisible_1(false)}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>

          <View style={styles.header}>
            {/* <TouchableOpacity onPress={() => setSelectedOption("Men")}>
              <Text style={styles.clearText}>Clear</Text>
            </TouchableOpacity> */}
            <Text style={styles.title}>Gender</Text>
            <TouchableOpacity onPress={() => setModalVisible_1(false)}>
              <Icon name="close" size={20} color="black" />
            </TouchableOpacity>
          </View>


          {options.map((option, index) => (
            <TouchableOpacity
              key={index}
              style={[
                styles.option,
                selectedOption === option && styles.selectedOption,
              ]}
              onPress={() => {
                setSelectedOption(option);
                onSelect(option); 
                setModalVisible_1(false);
              }}
            >
              <Text style={styles.optionText}>{option}</Text>
              {selectedOption === option && <Icon name="check" size={16} color="black" />}
            </TouchableOpacity>
          ))}
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
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    padding: 15,
    borderRadius: 20,
    backgroundColor: "#f5f5f5",
    marginBottom: 10,
  },
  selectedOption: {
    backgroundColor: "#f5e1d2",
  },
  optionText: {
    fontSize: 16,
  },
});

export default Gengder;