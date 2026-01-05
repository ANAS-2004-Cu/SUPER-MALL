// import FontAwesome6 from '@expo/vector-icons/FontAwesome6';
// import MaterialCommunityIcons from '@expo/vector-icons/MaterialCommunityIcons';
// import MaterialIcons from '@expo/vector-icons/MaterialIcons';
// import * as NavigationBar from 'expo-navigation-bar';
// import { Tabs } from "expo-router";
// import React, { useEffect } from 'react';
// import { Platform } from 'react-native';

// export default function TabLayout() {
//   useEffect(() => {
//     async function hideNavigationBar() {
//       if (Platform.OS === 'android') {
//         await NavigationBar.setVisibilityAsync('hidden');
//         await NavigationBar.setButtonStyleAsync("light");
//       }
//     }
//     hideNavigationBar();
//   }, []);

//   return (
//     <Tabs
//       screenOptions={{
//         headerShown: false,
//         tabBarActiveTintColor: '#007AFF',
//         tabBarInactiveTintColor: '#8e8e93',
//         tabBarStyle: {
//           backgroundColor: '#ffffff',
//           borderTopLeftRadius: 20,
//           borderTopRightRadius: 20,
//           shadowColor: '#000',
//           shadowOffset: { width: 0, height: -3 },
//           shadowOpacity: 0.1,
//           shadowRadius: 5,
//           elevation: 10,
//           height: 53,
//           display: Platform.OS === 'android' ? 'none' : 'flex',
//         },
//         tabBarLabelStyle: {
//           fontSize: 12,
//           fontWeight: '600',
//         },
//       }}
//     >
//       <Tabs.Screen name='Admin' options={{
//         title: 'Admin',
//         tabBarIcon: ({ color }) => (
//           <MaterialIcons name="admin-panel-settings" size={24} color={color} />
//         ),
//       }} />
//       <Tabs.Screen name='Users' options={{
//         title: 'Users',
//         tabBarIcon: ({ color }) => (
//           <FontAwesome6 name="users-gear" size={24} color={color} />
//         ),
//       }} />
//       <Tabs.Screen name='Order' options={{
//         title: 'Order',
//         tabBarIcon: ({ color }) => (
//           <MaterialCommunityIcons name="order-bool-descending-variant" size={24} color={color} />
//         ),
//       }} />
//       <Tabs.Screen name='AddProduct' options={{
//         title: 'Add',
//         tabBarIcon: ({ color }) => (
//           <MaterialIcons name="add-to-photos" size={24} color={color} />
//         ),
//       }} />
//       <Tabs.Screen name='Preview' options={{
//         title: 'Preview',
//         tabBarIcon: ({ color }) => (
//           <MaterialIcons name="preview" size={24} color={color} />
//         ),
//       }} />
//     </Tabs>
//   );
// }