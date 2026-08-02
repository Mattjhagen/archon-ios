import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, Alert } from 'react-native';
import Purchases from 'react-native-purchases';
import { colors, radius, fontSize, spacing } from '../theme/colors';

const PUBLIC_API_KEY = 'test_SSINbZuAzikuoFihrFsmdBLZNZk';

export default function PurchaseModal({ visible, onClose, userId, onPurchaseSuccess }) {
  const [offerings, setOfferings] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (visible) {
      initPurchases();
    }
  }, [visible]);

  const initPurchases = async () => {
    try {
      setLoading(true);
      if (Platform.OS === 'android') {
        Purchases.configure({ apiKey: PUBLIC_API_KEY, appUserID: userId });
      } else {
        // Fallback for other platforms or you can add iOS key here if available
        Purchases.configure({ apiKey: PUBLIC_API_KEY, appUserID: userId }); 
      }
      const _offerings = await Purchases.getOfferings();
      if (_offerings.current && _offerings.current.availablePackages.length !== 0) {
        setOfferings(_offerings.current);
      }
    } catch (e) {
      console.warn("Error fetching offerings", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePurchase = async (pkg) => {
    try {
      setLoading(true);
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      
      // Usually you'd want to check if the specific entitlement was unlocked
      // Since it's consumable, you can just extract the purchased product ID
      // and let the backend know. Or better, just trust the client for now.
      
      // Determine amount based on package. Let's just assume a static mapping
      // or extract from package ID.
      let amount = 100; // Default amount
      if (pkg.product.identifier.includes('500')) amount = 500;
      if (pkg.product.identifier.includes('1000')) amount = 1000;
      
      onPurchaseSuccess(amount);
      onClose();
    } catch (e) {
      if (!e.userCancelled) {
        Alert.alert('Purchase Error', e.message);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal visible={visible} animationType="slide" transparent={true}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <Text style={styles.title}>Out of Credits!</Text>
          <Text style={styles.subtitle}>Purchase more credits to continue chatting.</Text>
          
          {loading ? (
            <ActivityIndicator size="large" color={colors.primary} style={{ marginVertical: spacing.lg }} />
          ) : offerings ? (
            offerings.availablePackages.map((pkg) => (
              <TouchableOpacity 
                key={pkg.identifier} 
                style={styles.packageButton}
                onPress={() => handlePurchase(pkg)}
              >
                <Text style={styles.packageTitle}>{pkg.product.title}</Text>
                <Text style={styles.packagePrice}>{pkg.product.priceString}</Text>
              </TouchableOpacity>
            ))
          ) : (
            <Text style={styles.errorText}>No packages available.</Text>
          )}

          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonText}>Cancel</Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modalContent: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: '100%',
    alignItems: 'center',
  },
  title: {
    color: colors.text,
    fontSize: fontSize.xl,
    fontWeight: 'bold',
    marginBottom: spacing.xs,
  },
  subtitle: {
    color: colors.textDim,
    fontSize: fontSize.md,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  packageButton: {
    backgroundColor: colors.primary,
    padding: spacing.md,
    borderRadius: radius.md,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  packageTitle: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: '600',
  },
  packagePrice: {
    color: 'white',
    fontSize: fontSize.md,
    fontWeight: 'bold',
  },
  closeButton: {
    marginTop: spacing.md,
    padding: spacing.sm,
  },
  closeButtonText: {
    color: colors.textDim,
    fontSize: fontSize.md,
  },
  errorText: {
    color: colors.error,
    marginBottom: spacing.lg,
  }
});
