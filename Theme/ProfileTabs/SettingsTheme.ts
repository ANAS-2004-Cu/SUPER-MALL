import { StyleSheet } from 'react-native';

// Light theme colors
const lightColors = {
  gradient: ['white', '#FFE4C4'],
  background: {
    primary: 'white',
    iconBackground: '#FAE5D3',
  },
  text: {
    primary: '#4E342E',
    secondary: '#5D4037',
    tertiary: '#8D6E63',
  },
  switch: {
    track: {
      active: '#A5D6A7',
      inactive: '#D7CCC8',
    },
    thumb: {
      active: '#4CAF50',
      inactive: '#8D6E63',
    }
  },
  shadow: '#000',
  icon: '#5D4037',
};

// Dark theme colors
const darkColors = {
  gradient: ['#121212', '#2D1E10'],
  background: {
    primary: '#1E1E1E',
    iconBackground: '#3D2D20',
  },
  text: {
    primary: '#E0E0E0',
    secondary: '#D7CCC8',
    tertiary: '#BCAAA4',
  },
  switch: {
    track: {
      active: '#2E7D32',
      inactive: '#5D4037',
    },
    thumb: {
      active: '#4CAF50',
      inactive: '#A1887F',
    }
  },
  shadow: '#000',
  icon: '#D7CCC8',
};

// Generate styles for light theme
const createLightStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 15,
    top: 55,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: lightColors.text.primary,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: lightColors.text.secondary,
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: "row",
    backgroundColor: lightColors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: lightColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: lightColors.background.iconBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: lightColors.text.secondary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: lightColors.text.tertiary,
  },
});

// Generate styles for dark theme
const createDarkStyles = () => StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 60,
    paddingBottom: 15,
    paddingHorizontal: 20,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  backButton: {
    position: "absolute",
    left: 15,
    top: 55,
    zIndex: 10,
  },
  title: {
    fontSize: 24,
    fontWeight: "600",
    color: darkColors.text.primary,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 30,
  },
  sectionContainer: {
    marginHorizontal: 15,
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: darkColors.text.secondary,
    marginBottom: 12,
  },
  settingCard: {
    flexDirection: "row",
    backgroundColor: darkColors.background.primary,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    alignItems: "center",
    shadowColor: darkColors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  settingIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: darkColors.background.iconBackground,
    alignItems: "center",
    justifyContent: "center",
    marginRight: 15,
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: darkColors.text.secondary,
    marginBottom: 2,
  },
  settingSubtitle: {
    fontSize: 13,
    color: darkColors.text.tertiary,
  },
});

export const lightTheme = {
  colors: lightColors,
  styles: createLightStyles(),
};

export const darkTheme = {
  colors: darkColors,
  styles: createDarkStyles(),
};
