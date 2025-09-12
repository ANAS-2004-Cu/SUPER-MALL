import React, { useEffect, useState } from 'react';
import {
    Dimensions,
    Modal,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    TouchableWithoutFeedback,
    View
} from 'react-native';
import Icon from 'react-native-vector-icons/Feather';
import { darkModalTheme, lightModalTheme } from '../Theme/Modal/FilterModalTheme';

const { height } = Dimensions.get('window');

const FilterModal = ({
    visible,
    onClose,
    categories = [],
    selectedCategory,
    setSelectedCategory,
    sortBy,
    setSortBy,
    onApply,
    maxPrice = 10000,
    darkMode = false
}) => {
    const [localCategory, setLocalCategory] = useState(selectedCategory);
    const [localSortBy, setLocalSortBy] = useState(sortBy);
    const [minPrice, setMinPrice] = useState('0');
    const [maxPriceValue, setMaxPriceValue] = useState(maxPrice.toString());

    // استخدام ملف الثيم الجديد
    const theme = darkMode ? darkModalTheme : lightModalTheme;

    // Predefined price ranges
    const priceRanges = [
        { label: 'All Prices', min: '0', max: maxPrice.toString() },
        { label: 'Under 500', min: '0', max: '500' },
        { label: '500 - 1000', min: '500', max: '1000' },
        { label: '1000 - 2000', min: '1000', max: '2000' },
        { label: '2000 - 5000', min: '2000', max: '5000' },
        { label: 'Over 5000', min: '5000', max: maxPrice.toString() }
    ];

    useEffect(() => {
        if (visible) {
            // Reset local states when modal opens
            setLocalCategory(selectedCategory);
            setLocalSortBy(sortBy);
            setMinPrice('0');
            setMaxPriceValue(maxPrice.toString());
        }
    }, [visible, selectedCategory, sortBy, maxPrice]);

    const handleApply = () => {
        // Convert string inputs to numbers
        const minPriceNum = parseInt(minPrice) || 0;
        const maxPriceNum = parseInt(maxPriceValue) || maxPrice;

        // Pass back the selected filters
        onApply({
            category: localCategory,
            sortBy: localSortBy,
            priceRange: [minPriceNum, maxPriceNum]
        });
        onClose();
    };

    const handleReset = () => {
        setLocalCategory('All');
        setLocalSortBy('name');
        setMinPrice('0');
        setMaxPriceValue(maxPrice.toString());
    };

    const setPriceRange = (min, max) => {
        setMinPrice(min);
        setMaxPriceValue(max);
    };

    return (
        <Modal
            animationType="slide"
            transparent={true}
            visible={visible}
            onRequestClose={onClose}
        >
            <TouchableWithoutFeedback onPress={onClose}>
                <View style={[styles.overlay, { backgroundColor: theme.overlayBackground }]}>
                    <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
                        <View style={[styles.modalContent, { backgroundColor: theme.backgroundColor }]}>
                            <View style={[styles.header, { borderBottomColor: theme.borderColor }]}>
                                <Text style={[styles.title, { color: theme.titleColor }]}>Filter & Sort</Text>
                                <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                                    <Icon name="x" size={24} color={theme.closeIconColor} />
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.scrollContent}>
                                {/* Categories Section */}
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Categories</Text>
                                    <View style={styles.categoriesContainer}>
                                        {categories.map(category => (
                                            <TouchableOpacity
                                                key={category}
                                                style={[
                                                    styles.categoryChip,
                                                    { 
                                                        backgroundColor: localCategory === category 
                                                            ? theme.selectedChipBackground 
                                                            : theme.chipBackground,
                                                        borderColor: localCategory === category 
                                                            ? theme.selectedChipBorderColor 
                                                            : theme.chipBorderColor 
                                                    }
                                                ]}
                                                onPress={() => setLocalCategory(category)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryChipText,
                                                        { 
                                                            color: localCategory === category 
                                                                ? theme.selectedChipTextColor 
                                                                : theme.chipTextColor 
                                                        }
                                                    ]}
                                                >
                                                    {category}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>
                                </View>

                                {/* Price Range Section */}
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Price Range</Text>

                                    {/* Predefined price ranges */}
                                    <View style={styles.priceRangesContainer}>
                                        {priceRanges.map((range, index) => (
                                            <TouchableOpacity
                                                key={index}
                                                style={[
                                                    styles.priceRangeButton,
                                                    { 
                                                        backgroundColor: minPrice === range.min && maxPriceValue === range.max
                                                            ? theme.selectedChipBackground
                                                            : theme.chipBackground,
                                                        borderColor: minPrice === range.min && maxPriceValue === range.max
                                                            ? theme.selectedChipBorderColor
                                                            : theme.chipBorderColor
                                                    }
                                                ]}
                                                onPress={() => setPriceRange(range.min, range.max)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.priceRangeText,
                                                        { 
                                                            color: minPrice === range.min && maxPriceValue === range.max
                                                                ? theme.selectedChipTextColor
                                                                : theme.chipTextColor 
                                                        }
                                                    ]}
                                                >
                                                    {range.label}
                                                </Text>
                                            </TouchableOpacity>
                                        ))}
                                    </View>

                                    {/* Custom price range input */}
                                    <Text style={[styles.customRangeLabel, { color: theme.labelColor }]}>Custom Price Range (EGP)</Text>
                                    <View style={styles.customPriceInputContainer}>
                                        <View style={styles.priceInputWrapper}>
                                            <Text style={[styles.priceInputLabel, { color: theme.labelColor }]}>Min</Text>
                                            <TextInput
                                                style={[styles.priceInput, { 
                                                    backgroundColor: theme.inputBackground,
                                                    borderColor: theme.inputBorderColor,
                                                    color: theme.textColor
                                                }]}
                                                value={minPrice}
                                                onChangeText={setMinPrice}
                                                keyboardType="numeric"
                                                placeholder="Min"
                                                placeholderTextColor={theme.chipTextColor}
                                            />
                                        </View>
                                        <Text style={[styles.priceSeparator, { color: theme.textColor }]}>-</Text>
                                        <View style={styles.priceInputWrapper}>
                                            <Text style={[styles.priceInputLabel, { color: theme.labelColor }]}>Max</Text>
                                            <TextInput
                                                style={[styles.priceInput, { 
                                                    backgroundColor: theme.inputBackground,
                                                    borderColor: theme.inputBorderColor,
                                                    color: theme.textColor
                                                }]}
                                                value={maxPriceValue}
                                                onChangeText={setMaxPriceValue}
                                                keyboardType="numeric"
                                                placeholder="Max"
                                                placeholderTextColor={theme.chipTextColor}
                                            />
                                        </View>
                                    </View>
                                </View>

                                {/* Sort By Section */}
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Sort By</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption, 
                                            localSortBy === 'name' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSortBy('name')}
                                    >
                                        <Icon
                                            name={localSortBy === 'name' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSortBy === 'name' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Alphabetical (A-Z)</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption, 
                                            localSortBy === 'priceLow' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSortBy('priceLow')}
                                    >
                                        <Icon
                                            name={localSortBy === 'priceLow' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSortBy === 'priceLow' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Price: Low to High</Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption, 
                                            localSortBy === 'priceHigh' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSortBy('priceHigh')}
                                    >
                                        <Icon
                                            name={localSortBy === 'priceHigh' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSortBy === 'priceHigh' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Price: High to Low</Text>
                                    </TouchableOpacity>
                                </View>
                            </ScrollView>

                            <View style={[styles.footer, { borderTopColor: theme.borderColor }]}>
                                <TouchableOpacity
                                    style={[styles.resetButton, { borderColor: theme.buttonTextColor }]}
                                    onPress={handleReset}
                                >
                                    <Text style={[styles.resetButtonText, { color: theme.buttonTextColor }]}>Reset</Text>
                                </TouchableOpacity>

                                <TouchableOpacity
                                    style={[styles.applyButton, { backgroundColor: theme.applyButtonBackground }]}
                                    onPress={handleApply}
                                >
                                    <Text style={[styles.applyButtonText, { color: theme.applyButtonTextColor }]}>Apply</Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </TouchableWithoutFeedback>
                </View>
            </TouchableWithoutFeedback>
        </Modal>
    );
};

const styles = StyleSheet.create({
    overlay: {
        flex: 1,
        justifyContent: 'flex-end',
    },
    modalContent: {
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        height: height * 0.8,
        paddingBottom: 20,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
    },
    title: {
        fontSize: 18,
        fontWeight: 'bold',
    },
    closeButton: {
        padding: 4,
    },
    scrollContent: {
        flex: 1,
    },
    section: {
        padding: 16,
        borderBottomWidth: 1,
    },
    sectionTitle: {
        fontSize: 16,
        fontWeight: 'bold',
        marginBottom: 12,
    },
    categoriesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
    },
    categoryChip: {
        paddingHorizontal: 16,
        paddingVertical: 8,
        borderRadius: 20,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    categoryChipText: {
        fontWeight: '500',
    },
    priceRangesContainer: {
        flexDirection: 'row',
        flexWrap: 'wrap',
        marginBottom: 16,
    },
    priceRangeButton: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        marginRight: 8,
        marginBottom: 8,
        borderWidth: 1,
    },
    priceRangeText: {
        fontSize: 12,
        fontWeight: '500',
    },
    customRangeLabel: {
        fontSize: 14,
        marginBottom: 8,
    },
    customPriceInputContainer: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'space-between',
    },
    priceInputWrapper: {
        flex: 1,
    },
    priceInputLabel: {
        fontSize: 12,
        marginBottom: 4,
    },
    priceInput: {
        borderWidth: 1,
        borderRadius: 8,
        paddingVertical: 8,
        paddingHorizontal: 12,
    },
    priceSeparator: {
        paddingHorizontal: 10,
        fontSize: 16,
    },
    sortOption: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 12,
    },
    sortOptionText: {
        fontSize: 15,
        marginLeft: 12,
    },
    footer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
        borderTopWidth: 1,
    },
    resetButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        borderWidth: 1,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 1,
        marginRight: 8,
    },
    resetButtonText: {
        fontWeight: '600',
    },
    applyButton: {
        paddingVertical: 12,
        paddingHorizontal: 20,
        borderRadius: 8,
        justifyContent: 'center',
        alignItems: 'center',
        flex: 2,
    },
    applyButtonText: {
        fontWeight: '600',
    },
});

export default FilterModal;
