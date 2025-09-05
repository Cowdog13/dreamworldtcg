import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { useAuth } from '../contexts/AuthContext';
import LoginScreen from '../screens/LoginScreen';
import RegisterScreen from '../screens/RegisterScreen';
import HomeScreen from '../screens/HomeScreen';
import GameScreen from '../screens/GameScreen';
import CardsScreen from '../screens/CardsScreen';
import DecksScreen from '../screens/DecksScreen';
import HistoryScreen from '../screens/HistoryScreen';
import { Text, View } from 'react-native';

const Stack = createStackNavigator();
const Tab = createBottomTabNavigator();

const TabNavigator = () => {
  return (
    <Tab.Navigator>
      <Tab.Screen 
        name="Home" 
        component={HomeScreen} 
        options={{ 
          tabBarIcon: () => <Text>🏠</Text>,
          headerTitle: 'Dreamworld TCG'
        }} 
      />
      <Tab.Screen 
        name="Cards" 
        component={CardsScreen} 
        options={{ 
          tabBarIcon: () => <Text>🃏</Text>,
          headerTitle: 'Card Database'
        }} 
      />
      <Tab.Screen 
        name="Decks" 
        component={DecksScreen} 
        options={{ 
          tabBarIcon: () => <Text>📚</Text>,
          headerTitle: 'My Decks'
        }} 
      />
      <Tab.Screen 
        name="History" 
        component={HistoryScreen} 
        options={{ 
          tabBarIcon: () => <Text>📊</Text>,
          headerTitle: 'Match History'
        }} 
      />
    </Tab.Navigator>
  );
};

const AppNavigator = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <Text>Loading...</Text>
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {user ? (
          <>
            <Stack.Screen name="MainTabs" component={TabNavigator} />
            <Stack.Screen 
              name="Game" 
              component={GameScreen}
              options={{ 
                headerShown: true, 
                headerTitle: 'Game Tracker',
                headerBackTitle: 'Home'
              }}
            />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
            <Stack.Screen name="Register" component={RegisterScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;