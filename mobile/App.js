import React, { useEffect, useState } from 'react'
import { View, StatusBar, SafeAreaView, Platform } from 'react-native'
import AsyncStorage from '@react-native-async-storage/async-storage'
import * as Notifications from 'expo-notifications'
import * as Device from 'expo-device'
import * as Linking from 'expo-linking'
import { colors } from './src/theme/colors'
import TabBar from './src/components/TabBar'
import HomeScreen from './src/screens/HomeScreen'
import ChatScreen from './src/screens/ChatScreen'
import ExploreScreen from './src/screens/ExploreScreen'
import ToolsScreen from './src/screens/ToolsScreen'
import SettingsScreen from './src/screens/SettingsScreen'
import * as api from './src/api/shaggoth'

Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: false,
  }),
})

export default function App() {
  const [tab, setTab] = useState('home')
  const [subScreen, setSubScreen] = useState(null)
  const [connected, setConnected] = useState(false)
  const [assistMode, setAssistMode] = useState(false)

  useEffect(() => {
    api.initStorage()
    api.health().then(() => setConnected(true)).catch(() => {})

    const handleDeepLink = (event) => {
      if (event.url && event.url.includes('assistMode')) {
        setAssistMode(true)
        setSubScreen({ screen: 'chat', params: {} })
      }
    }

    Linking.getInitialURL().then((url) => {
      if (url) handleDeepLink({ url })
    })

    const linkingSubscription = Linking.addEventListener('url', handleDeepLink)

    async function setupPush() {
      try {
        if (!Device.isDevice) return
        const { status: existing } = await Notifications.getPermissionsAsync()
        let final = existing
        if (existing !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync()
          final = status
        }
        if (final !== 'granted') return
        const tokenData = await Notifications.getExpoPushTokenAsync({
          projectId: '128b027f-68c3-432d-b1c9-0605d68816a1'
        })
        api.registerPushToken(tokenData.data, Platform.OS).catch(() => {})
      } catch (err) {
        console.log('Push notifications failed to initialize', err)
      }
    }
    setupPush()
    
    return () => linkingSubscription.remove()
  }, [])

  const navigate = (screen, params) => {
    if (screen === 'settings') {
      setSubScreen(null)
      setTab('settings')
      return
    }
    if (['chat', 'casual_chat', 'knowledge', 'learn'].includes(screen)) {
      setSubScreen({ screen, params })
    }
  }

  const goBack = () => {
    setSubScreen(null)
    setAssistMode(false)
  }

  const renderContent = () => {
    if (subScreen) {
      switch (subScreen.screen) {
        case 'chat':
          return <ChatScreen onBack={goBack} assistMode={assistMode} chatMode="no_drift" research={false} />
        case 'casual_chat':
          return <ChatScreen onBack={goBack} assistMode={assistMode} chatMode="drift" research={true} />
        case 'knowledge':
          return <ExploreScreen onNavigate={navigate} onBack={goBack} />
        case 'learn':
          return <ToolsScreen onBack={goBack} />
      }
    }

    switch (tab) {
      case 'home':
        return <HomeScreen onNavigate={navigate} connected={connected} />
      case 'explore':
        return <ExploreScreen onNavigate={navigate} />
      case 'tools':
        return <ToolsScreen />
      case 'settings':
        return <SettingsScreen connected={connected} />
      default:
        return <HomeScreen onNavigate={navigate} connected={connected} />
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background, paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 }}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      <View style={{ flex: 1 }}>
        {renderContent()}
      </View>
      {!subScreen && (
        <TabBar tab={tab} onTab={(t) => { setSubScreen(null); setTab(t) }} />
      )}
    </SafeAreaView>
  )
}
