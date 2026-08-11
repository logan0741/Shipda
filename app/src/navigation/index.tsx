import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import React from 'react';

import { Icon, type IconName } from '../components/Icon';
import { colors } from '../theme';

import AdminScreen from '../screens/AdminScreen';
import BoxCaptureScreen from '../screens/BoxCaptureScreen';
import CbmManualScreen from '../screens/CbmManualScreen';
import CbmResultScreen from '../screens/CbmResultScreen';
import ConsolidationScreen from '../screens/ConsolidationScreen';
import CornerAdjustScreen from '../screens/CornerAdjustScreen';
import DetailScreen from '../screens/DetailScreen';
import HistoryScreen from '../screens/HistoryScreen';
import HomeScreen from '../screens/HomeScreen';
import HsCodeResultScreen from '../screens/HsCodeResultScreen';
import IngredientManualScreen from '../screens/IngredientManualScreen';
import IngredientResultScreen from '../screens/IngredientResultScreen';
import LabelCaptureScreen from '../screens/LabelCaptureScreen';
import PickupScreen from '../screens/PickupScreen';
import PreReviewGuideScreen from '../screens/PreReviewGuideScreen';
import ProductInfoScreen from '../screens/ProductInfoScreen';
import SettingsScreen from '../screens/SettingsScreen';
import ShipmentScreen from '../screens/ShipmentScreen';
import SummaryScreen from '../screens/SummaryScreen';
import WaybillScreen from '../screens/WaybillScreen';

import type { RootStackParamList, TabParamList } from './types';

const Tab = createBottomTabNavigator<TabParamList>();
const Stack = createNativeStackNavigator<RootStackParamList>();

const TAB_ICONS: Record<keyof TabParamList, IconName> = {
  HomeTab: 'home',
  HistoryTab: 'clock',
  SettingsTab: 'user',
};

function Tabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarShowLabel: false,
        tabBarActiveTintColor: colors.navy,
        tabBarInactiveTintColor: colors.textMuted,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          height: 62,
          paddingTop: 6,
        },
        tabBarIcon: ({ color, focused }) => (
          <Icon
            name={TAB_ICONS[route.name]}
            size={24}
            color={color}
            strokeWidth={focused ? 2.4 : 1.8}
          />
        ),
      })}
    >
      <Tab.Screen name="HomeTab" component={HomeScreen} options={{ title: '홈' }} />
      <Tab.Screen name="HistoryTab" component={HistoryScreen} options={{ title: '이력' }} />
      <Tab.Screen name="SettingsTab" component={SettingsScreen} options={{ title: '설정' }} />
    </Tab.Navigator>
  );
}

export function RootNavigator() {
  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, contentStyle: { backgroundColor: colors.bg } }}>
        <Stack.Screen name="Tabs" component={Tabs} />

        {/* 등록 플로우 */}
        <Stack.Screen name="ProductInfo" component={ProductInfoScreen} />
        <Stack.Screen name="Waybill" component={WaybillScreen} />
        <Stack.Screen name="BoxCapture" component={BoxCaptureScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="CbmResult" component={CbmResultScreen} />
        <Stack.Screen name="CbmManual" component={CbmManualScreen} />
        <Stack.Screen name="CornerAdjust" component={CornerAdjustScreen} />
        <Stack.Screen name="LabelCapture" component={LabelCaptureScreen} options={{ animation: 'fade' }} />
        <Stack.Screen name="IngredientResult" component={IngredientResultScreen} />
        <Stack.Screen name="IngredientManual" component={IngredientManualScreen} />
        <Stack.Screen name="HsCodeResult" component={HsCodeResultScreen} />
        <Stack.Screen
          name="PreReviewGuide"
          component={PreReviewGuideScreen}
          options={{ presentation: 'modal' }}
        />
        <Stack.Screen name="Summary" component={SummaryScreen} />
        <Stack.Screen name="Pickup" component={PickupScreen} />
        <Stack.Screen name="Consolidation" component={ConsolidationScreen} />
        <Stack.Screen name="Shipment" component={ShipmentScreen} />

        {/* 조회 / 부가 */}
        <Stack.Screen name="Detail" component={DetailScreen} />
        <Stack.Screen name="Admin" component={AdminScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}
