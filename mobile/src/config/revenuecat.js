import { Platform } from 'react-native'

export const REVENUECAT_CONFIG = {
  // Replace these with your actual RevenueCat public API keys
  appleApiKey: '',
  googleApiKey: '',
  
  // The name of the entitlement you created in the RevenueCat dashboard
  entitlementId: 'Pro',
}

export const getRevenueCatApiKey = () => {
  if (Platform.OS === 'ios') return REVENUECAT_CONFIG.appleApiKey
  if (Platform.OS === 'android') return REVENUECAT_CONFIG.googleApiKey
  return ''
}
