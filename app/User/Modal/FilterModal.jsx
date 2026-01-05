import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useState } from 'react';
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
import { darkModalTheme, lightModalTheme } from '../../../Theme/Modal/FilterModalTheme';

const { height } = Dimensions.get('window');

const FilterModal = ({
    visible,
    onClose,
    selectedCategory,
    onApply,
    darkMode = false
}) => {
    const [localCategory, setLocalCategory] = useState(
        selectedCategory && selectedCategory !== 'All' ? selectedCategory : null
    );
    const [selectedType, setSelectedType] = useState(null);
    const [localSort, setLocalSort] = useState(null);
    const [minPrice, setMinPrice] = useState(null);
    const [maxPrice, setMaxPrice] = useState(null);
    const [availableCategoryNames, setAvailableCategoryNames] = useState([]);

    const theme = darkMode ? darkModalTheme : lightModalTheme;

    useEffect(() => {
        if (visible) {
            setLocalCategory(selectedCategory && selectedCategory !== 'All' ? selectedCategory : null);
            setSelectedType(null);
            setLocalSort(null);
            setMinPrice(null);
            setMaxPrice(null);
        }
    }, [visible, selectedCategory]);

    useEffect(() => {
        const loadCategoriesFromStorage = async () => {
            try {
                const stored = await AsyncStorage.getItem('unUpadtingManageDocs');
                if (!stored) {
                    setAvailableCategoryNames(['All']);
                    return;
                }

                const parsed = JSON.parse(stored);
                const rawCategories = parsed?.AvilableCategory || [];
                const names = rawCategories.map((item, index) => {
                    if (typeof item === 'string' && item.includes(',')) {
                        const [name] = item.split(',');
                        return name.trim();
                    }
                    if (item && typeof item === 'object' && item.name) {
                        return String(item.name).trim();
                    }
                    // fallback: keep string as-is
                    return typeof item === 'string' ? item.trim() : `Category-${index}`;
                });

                const uniqueNames = Array.from(new Set(['All', ...names.filter(Boolean)]));
                setAvailableCategoryNames(uniqueNames);
            } catch (error) {
                console.error('Error loading categories from storage:', error);
                setAvailableCategoryNames(['All']);
            }
        };

        loadCategoriesFromStorage();
    }, []);

    const handleApply = () => {
        onApply({
            type: selectedType,
            category: localCategory,
            sort: localSort,
            priceRange: {
                min: minPrice,
                max: maxPrice,
            },
        });
        onClose();
    };

    const handleReset = () => {
        setLocalCategory(null);
        setSelectedType(null);
        setLocalSort(null);
        setMinPrice(null);
        setMaxPrice(null);
    };

    const handleTypeSelect = (type) => {
        setSelectedType(prev => (prev === type ? null : type));
    };

    const handleCategoryPress = (category) => {
        if (category === 'All') {
            setLocalCategory(null);
            return;
        }
        setLocalCategory(category);
    };

    const renderedCategories = availableCategoryNames.length ? availableCategoryNames : ['All'];
    const activeCategory = localCategory || 'All';

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

                            <View style={[styles.topTogglesContainer]}>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleButton,
                                        selectedType === 'TopSelling'
                                            ? { backgroundColor: theme.selectedChipBackground, borderColor: theme.selectedChipBorderColor }
                                            : { borderColor: theme.chipBorderColor, backgroundColor: theme.chipBackground }
                                    ]}
                                    onPress={() => handleTypeSelect('TopSelling')}
                                >
                                    <Icon
                                        name={selectedType === 'TopSelling' ? 'check-circle' : 'circle'}
                                        size={18}
                                        color={selectedType === 'TopSelling' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                    />
                                    <Text style={[styles.toggleText, { color: theme.textColor }]}>Top Selling</Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                    style={[
                                        styles.toggleButton,
                                        selectedType === 'NewArrival'
                                            ? { backgroundColor: theme.selectedChipBackground, borderColor: theme.selectedChipBorderColor }
                                            : { borderColor: theme.chipBorderColor, backgroundColor: theme.chipBackground }
                                    ]}
                                    onPress={() => handleTypeSelect('NewArrival')}
                                >
                                    <Icon
                                        name={selectedType === 'NewArrival' ? 'check-circle' : 'circle'}
                                        size={18}
                                        color={selectedType === 'NewArrival' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                    />
                                    <Text style={[styles.toggleText, { color: theme.textColor }]}>New Arrival</Text>
                                </TouchableOpacity>
                            </View>

                            <ScrollView style={styles.scrollContent}>
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Categories</Text>
                                    <View style={styles.categoriesContainer}>
                                        {renderedCategories.map(category => (
                                            <TouchableOpacity
                                                key={category}
                                                style={[
                                                    styles.categoryChip,
                                                    {
                                                        backgroundColor: activeCategory === category
                                                            ? theme.selectedChipBackground
                                                            : theme.chipBackground,
                                                        borderColor: activeCategory === category
                                                            ? theme.selectedChipBorderColor
                                                            : theme.chipBorderColor
                                                    }
                                                ]}
                                                onPress={() => handleCategoryPress(category)}
                                            >
                                                <Text
                                                    style={[
                                                        styles.categoryChipText,
                                                        {
                                                            color: activeCategory === category
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
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Price Range</Text>
                                    <View style={styles.customPriceInputContainer}>
                                        <View style={styles.priceInputWrapper}>
                                            <Text style={[styles.priceInputLabel, { color: theme.labelColor }]}>Min</Text>
                                            <TextInput
                                                style={[
                                                    styles.priceInput,
                                                    {
                                                        backgroundColor: theme.inputBackground,
                                                        borderColor: theme.inputBorderColor,
                                                        color: theme.textColor
                                                    }
                                                ]}
                                                value={minPrice === null ? '' : String(minPrice)}
                                                onChangeText={(text) => {
                                                    const cleaned = text.replace(/[^0-9]/g, '');
                                                    setMinPrice(cleaned === '' ? null : Number(cleaned));
                                                }}
                                                keyboardType="numeric"
                                                placeholder="Min"
                                                placeholderTextColor={theme.chipTextColor}
                                            />
                                        </View>
                                        <Text style={[styles.priceSeparator, { color: theme.textColor }]}>-</Text>
                                        <View style={styles.priceInputWrapper}>
                                            <Text style={[styles.priceInputLabel, { color: theme.labelColor }]}>Max</Text>
                                            <TextInput
                                                style={[
                                                    styles.priceInput,
                                                    {
                                                        backgroundColor: theme.inputBackground,
                                                        borderColor: theme.inputBorderColor,
                                                        color: theme.textColor
                                                    }
                                                ]}
                                                value={maxPrice === null ? '' : String(maxPrice)}
                                                onChangeText={(text) => {
                                                    const cleaned = text.replace(/[^0-9]/g, '');
                                                    setMaxPrice(cleaned === '' ? null : Number(cleaned));
                                                }}
                                                keyboardType="numeric"
                                                placeholder="Max"
                                                placeholderTextColor={theme.chipTextColor}
                                            />
                                        </View>
                                    </View>
                                </View>
                                <View style={[styles.section, { borderBottomColor: theme.borderColor }]}>
                                    <Text style={[styles.sectionTitle, { color: theme.sectionTitleColor }]}>Sort By</Text>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption,
                                            localSort === 'name_asc' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSort('name_asc')}
                                    >
                                        <Icon
                                            name={localSort === 'name_asc' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSort === 'name_asc' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Name (A - Z)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption,
                                            localSort === 'name_desc' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSort('name_desc')}
                                    >
                                        <Icon
                                            name={localSort === 'name_desc' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSort === 'name_desc' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Name (Z - A)</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption,
                                            localSort === 'price_asc' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSort('price_asc')}
                                    >
                                        <Icon
                                            name={localSort === 'price_asc' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSort === 'price_asc' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
                                        />
                                        <Text style={[styles.sortOptionText, { color: theme.textColor }]}>Price: Low to High</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity
                                        style={[
                                            styles.sortOption,
                                            localSort === 'price_desc' && { backgroundColor: theme.selectedOptionBackground }
                                        ]}
                                        onPress={() => setLocalSort('price_desc')}
                                    >
                                        <Icon
                                            name={localSort === 'price_desc' ? 'check-circle' : 'circle'}
                                            size={20}
                                            color={localSort === 'price_desc' ? theme.checkIconActiveColor : theme.checkIconInactiveColor}
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
    topTogglesContainer: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        padding: 16,
    },
    toggleButton: {
        flexDirection: 'row',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 16,
        borderWidth: 1,
        marginRight: 8,
    },
    toggleText: {
        marginLeft: 8,
        fontWeight: '600',
    },
    specialApplyContainer: {
        marginTop: 32,
        marginBottom: 10,
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
    },
    specialApplyButton: {
        width: '100%',
        paddingVertical: 18,
        borderRadius: 16,
        marginTop: 24,
        marginBottom: 8,
        backgroundColor: '#1976D2', // لون أزرق قوي، يمكنك تغييره حسب الثيم
        elevation: 6,
        shadowColor: '#1976D2',
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.3,
        shadowRadius: 12,
        alignItems: 'center',
        justifyContent: 'center',
    },
    specialApplyText: {
        color: '#fff',
        fontWeight: 'bold',
        fontSize: 20,
        textAlign: 'center',
        letterSpacing: 1,
    },
});

export default FilterModal;
