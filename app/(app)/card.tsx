// app/cards/index.tsx
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  SafeAreaView,
  TouchableOpacity,
  Image,
  Dimensions,
  Vibration,
  StatusBar,
  ScrollView,
  TextInput,
  Modal,
  Animated,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from 'expo-router';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");

// ─────────────────────────────────────────────────────────────────────────────
export default function CardsPage() {
  // State Management
  const [hasCard, setHasCard] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [cardBalance, setCardBalance] = useState(4570.80);
  const [selectedTab, setSelectedTab] = useState('all');
  const [isAddingFunds, setIsAddingFunds] = useState(false);
  const [addAmount, setAddAmount] = useState('');
  const [showCVV, setShowCVV] = useState(false);
  
  // Animations
  const cardScale = useRef(new Animated.Value(1)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(30)).current;
  const watermarkPulse = useRef(new Animated.Value(1)).current;
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;
  const cardShimmerAnim = useRef(new Animated.Value(0)).current;

  // Vibration feedback
  const vibrate = () => Vibration.vibrate([0, 10]);

  // Watermark Animation
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(watermarkPulse, {
          toValue: 1.06,
          duration: 3000,
          useNativeDriver: true,
        }),
        Animated.timing(watermarkPulse, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        }),
      ]),
    ).start();
  }, []);

  // Card shimmer animation
  useEffect(() => {
    if (hasCard) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(cardShimmerAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(cardShimmerAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    }
  }, [hasCard]);

  // Skeleton Animation
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(skeletonOpacity, {
            toValue: 0.3,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(skeletonOpacity, {
            toValue: 0.7,
            duration: 1000,
            useNativeDriver: true,
          }),
        ]),
      ).start();
    } else {
      skeletonOpacity.setValue(1);
    }
  }, [isLoading]);

  // Toggle CVV visibility
  const toggleCVV = () => {
    vibrate();
    setShowCVV(!showCVV);
  };

  // Generate Virtual Card
  const handleGenerateCard = () => {
    vibrate();
    setIsLoading(true);
    setProgress(0);

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(() => {
            setHasCard(true);
            setIsLoading(false);
            // Animation when card appears
            Animated.sequence([
              Animated.spring(cardScale, {
                toValue: 1.05,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }),
              Animated.spring(cardScale, {
                toValue: 1,
                tension: 50,
                friction: 7,
                useNativeDriver: true,
              }),
            ]).start();
          }, 300);
          return 100;
        }
        return prev + 2;
      });
    }, 36);
  };

  // Add funds to card
  const handleAddFunds = () => {
    if (!addAmount || parseFloat(addAmount) <= 0) return;
    
    vibrate();
    setIsAddingFunds(true);
    
    // Simulate API call
    setTimeout(() => {
      setCardBalance(prev => prev + parseFloat(addAmount));
      setIsAddingFunds(false);
      setAddAmount('');
      router.push({
        pathname: '/(app)/success',
        params: {
          type: 'card_funding',
          amount: addAmount,
          message: 'Funds added to your virtual card successfully'
        }
      });
    }, 1500);
  };

  // Format currency
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  // Format card number
  const formatCardNumber = () => {
    const cardNum = "5294 2436 4780 2468";
    return `•••• •••• •••• ${cardNum.slice(-4)}`;
  };

  // Card data
  const cardData = {
    number: "5294 2436 4780 2468",
    expiry: "12/24",
    cvv: "123",
    holder: "ISABELLA AVA",
    type: "Mastercard"
  };

  // Recent transactions
  const transactions = [
    { 
      id: "1", 
      name: "Spotify Subscription", 
      time: "Today, 9:00 AM", 
      amount: -40.00,
      icon: "musical-notes",
      category: "entertainment"
    },
    { 
      id: "2", 
      name: "Amazon Purchase", 
      time: "Yesterday, 2:30 PM", 
      amount: -89.99,
      icon: "cart",
      category: "shopping"
    },
    { 
      id: "3", 
      name: "Freelance Payment", 
      time: "Mar 6, 2025", 
      amount: 1200.00,
      icon: "cash",
      category: "income"
    },
    { 
      id: "4", 
      name: "Netflix", 
      time: "Mar 5, 2025", 
      amount: -15.99,
      icon: "tv",
      category: "entertainment"
    },
  ];

  // Filter transactions based on selected tab
  const filteredTransactions = selectedTab === 'all' 
    ? transactions 
    : transactions.filter(tx => 
        selectedTab === 'income' ? tx.amount > 0 : tx.amount < 0
      );

  // Onboarding animation
  useEffect(() => {
    if (!hasCard) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [hasCard]);

  // Skeleton Components
  const SkeletonText = ({ width = '100%', height = 20 }) => (
    <Animated.View style={[styles.skeleton, { width, height, opacity: skeletonOpacity }]} />
  );

  const SkeletonButton = ({ width = 80 }) => (
    <Animated.View style={[styles.skeleton, styles.skeletonButton, { width, opacity: skeletonOpacity }]} />
  );

  // Show skeleton UI while loading
  if (isLoading) {
    return (
      <View style={styles.container}>
        {/* Watermark Background */}
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
            resizeMode="contain"
          />
        </Animated.View>

        <View style={styles.content}>
          <View style={styles.header}>
            <SkeletonText width={120} height={14} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Card Skeleton */}
            <View style={styles.skeletonCard}>
              <View style={styles.skeletonCardHeader}>
                <SkeletonText width={80} height={14} />
                <SkeletonText width={40} height={14} />
              </View>
              <SkeletonText width={180} height={40} />
              <SkeletonText width={220} height={24} />
              <View style={styles.skeletonCardFooter}>
                <SkeletonText width={100} height={16} />
                <SkeletonText width={60} height={16} />
              </View>
            </View>

            {/* Action Buttons Skeleton */}
            <View style={styles.cardActions}>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.cardAction}>
                  <View style={styles.skeletonActionIcon} />
                  <SkeletonText width={60} height={12} />
                </View>
              ))}
            </View>

            {/* Stats Skeleton */}
            <View style={styles.statsContainer}>
              {[1, 2, 3].map((_, index) => (
                <View key={index} style={styles.statItem}>
                  <View style={styles.skeletonStatIcon} />
                  <SkeletonText width={80} height={18} />
                  <SkeletonText width={40} height={12} />
                </View>
              ))}
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // ── ONBOARDING (No Card) ─────────────────────────────────────────────
  if (!hasCard) {
    return (
      <>
        <StatusBar barStyle="light-content" backgroundColor="#000" />
        <SafeAreaView style={styles.onboardingContainer}>
          {/* Watermark Background */}
          <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
            <Animated.Image
              source={require('@/assets/icons/home.png')}
              style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
              resizeMode="contain"
            />
          </Animated.View>

          <Animated.View 
            style={[
              styles.onboardingContent,
              {
                opacity: fadeAnim,
                transform: [{ translateY: slideAnim }]
              }
            ]}
          >
            {/* App Logo Only */}
            <View style={styles.logoContainer}>
              <Image 
                source={require("@/assets/icons/nu.png")} 
                style={styles.appLogo} 
                resizeMode="contain" 
              />
            </View>

            {/* Main Title */}
            <Text style={styles.onboardingTitle}>
              Seamless Global Payments
            </Text>
            
            {/* Subtitle */}
            <Text style={styles.onboardingSubtitle}>
              Get your virtual card instantly. Shop anywhere, pay securely.
            </Text>

            {/* Card Design Preview */}
            <View style={styles.cardPreview}>
              <View style={styles.previewCard}>
                {/* Glass Morphism Effect */}
                <View style={styles.cardGlassEffect}>
                  {/* Subtle Gold Gradient */}
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.08)', 'rgba(255, 215, 0, 0.03)', 'transparent']}
                    style={styles.previewCardGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  />
                  
                  {/* Minimalist Background */}
                  <View style={styles.previewCardBackground}>
                    {/* Subtle Grid Lines */}
                    <View style={styles.subtleGrid}>
                      {Array.from({ length: 3 }).map((_, i) => (
                        <View key={i} style={[styles.gridLine, { top: `${(i + 1) * 25}%` }]} />
                      ))}
                    </View>
                    
                    {/* Metallic Chip */}
                    <View style={styles.cardChipPreview}>
                      <LinearGradient
                        colors={['rgba(184, 134, 11, 0.8)', 'rgba(255, 215, 0, 0.6)']}
                        style={styles.chipGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.chipLines}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <View key={i} style={styles.chipLine} />
                          ))}
                        </View>
                      </LinearGradient>
                    </View>
                    
                    {/* Card Number Preview */}
                    <View style={styles.cardNumberPreview}>
                      <Text style={styles.cardNumberPlaceholder}>•••• •••• •••• ••••</Text>
                    </View>
                    
                    {/* Card Footer Preview */}
                    <View style={styles.cardFooterPreview}>
                      <Text style={styles.cardHolderPlaceholder}>YOUR NAME</Text>
                      <View style={styles.cvvPreviewContainer}>
                        <Text style={styles.cvvPreviewLabel}>CVV</Text>
                        <Text style={styles.cvvPreviewValue}>•••</Text>
                      </View>
                    </View>
                  </View>
                </View>
              </View>
            </View>

            {/* Features List */}
            <View style={styles.featuresList}>
              <View style={styles.featureItem}>
                <Ionicons name="shield-checkmark" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Bank-level Security</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="globe" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Global Acceptance</Text>
              </View>
              <View style={styles.featureItem}>
                <Ionicons name="flash" size={24} color="#FFD700" />
                <Text style={styles.featureText}>Instant Activation</Text>
              </View>
            </View>

            {/* Generate Card Button */}
            <TouchableOpacity
              style={[styles.generateButton, isLoading && styles.generateButtonDisabled]}
              onPress={handleGenerateCard}
              disabled={isLoading}
              activeOpacity={0.9}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.15)', 'rgba(184, 134, 11, 0.1)']}
                style={styles.buttonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.generateButtonText}>
                  {isLoading ? (
                    <>
                      <ActivityIndicator size="small" color="#FFD700" />
                      <Text style={{ color: '#FFD700' }}>  Generating...</Text>
                    </>
                  ) : (
                    'Get Virtual Card'
                  )}
                </Text>
              </LinearGradient>
            </TouchableOpacity>

            {/* Progress Bar */}
            {isLoading && (
              <View style={styles.loadingContainer}>
                <View style={styles.progressBar}>
                  <View style={[styles.progressFill, { width: `${progress}%` }]} />
                </View>
                <Text style={styles.progressText}>{progress}%</Text>
                <Text style={styles.progressLabel}>Setting up your card...</Text>
              </View>
            )}

            {/* Terms */}
            <Text style={styles.termsText}>
              By continuing, you agree to our Terms and Privacy Policy
            </Text>
          </Animated.View>
        </SafeAreaView>
      </>
    );
  }

  // ── DASHBOARD (Has Card) ─────────────────────────────────────────────
  return (
    <>
      <StatusBar barStyle="light-content" backgroundColor="#000" />
      <View style={styles.container}>
        {/* Watermark Background */}
        <Animated.View pointerEvents="none" style={styles.watermarkWrapper}>
          <Animated.Image
            source={require('@/assets/icons/home.png')}
            style={[styles.watermark, { transform: [{ scale: watermarkPulse }] }]}
            resizeMode="contain"
          />
        </Animated.View>

        <SafeAreaView style={styles.content}>
          {/* Header - Clean and Professional */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Image source={require("@/assets/icons/home.png")} style={styles.avatar} />
              <View>
                <Text style={styles.greeting}>Welcome back!</Text>
                <Text style={styles.userName}>Isabella Ava</Text>
              </View>
            </View>
            <View style={styles.headerRight}>
              <TouchableOpacity style={styles.iconButton} onPress={vibrate}>
                <Ionicons name="notifications-outline" size={24} color="#FFD700" />
                <View style={styles.notificationBadge} />
              </TouchableOpacity>
              <TouchableOpacity style={styles.iconButton} onPress={() => router.push('/(app)/settings')}>
                <Ionicons name="settings-outline" size={24} color="#FFD700" />
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
          >
            {/* Virtual Card with CVV */}
            <Animated.View style={[styles.cardWrapper, { transform: [{ scale: cardScale }] }]}>
              {/* Card Container */}
              <View style={styles.virtualCardContainer}>
                {/* Shimmer Effect */}
                <Animated.View 
                  style={[
                    styles.cardShimmer,
                    {
                      opacity: cardShimmerAnim.interpolate({
                        inputRange: [0, 1],
                        outputRange: [0, 0.3]
                      }),
                      transform: [
                        {
                          translateX: cardShimmerAnim.interpolate({
                            inputRange: [0, 1],
                            outputRange: [-SCREEN_WIDTH, SCREEN_WIDTH]
                          })
                        }
                      ]
                    }
                  ]}
                />
                
                {/* Main Card */}
                <View style={styles.virtualCard}>
                  {/* Glass Morphism Background */}
                  <View style={styles.cardGlassBackground}>
                    {/* Subtle Pattern */}
                    <View style={styles.cardPattern}>
                      {Array.from({ length: 5 }).map((_, i) => (
                        <View key={i} style={[styles.patternLine, { top: `${(i + 1) * 20}%` }]} />
                      ))}
                    </View>
                    
                    {/* Subtle Gold Gradient */}
                    <LinearGradient
                      colors={['rgba(255, 215, 0, 0.05)', 'rgba(184, 134, 11, 0.02)', 'transparent']}
                      style={styles.cardGradientOverlay}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    />
                  </View>
                  
                  {/* Card Content */}
                  <View style={styles.cardContent}>
                    {/* Card Header */}
                    <View style={styles.cardHeader}>
                      <View>
                        <Text style={styles.cardLabel}>Virtual Card</Text>
                        <Text style={styles.cardType}>Mastercard</Text>
                      </View>
                      {/* CVV Toggle Button */}
                      <TouchableOpacity 
                        style={styles.cvvToggleButton}
                        onPress={toggleCVV}
                      >
                        <Ionicons 
                          name={showCVV ? "eye-off-outline" : "eye-outline"} 
                          size={20} 
                          color="#FFD700" 
                        />
                        <Text style={styles.cvvToggleText}>
                          {showCVV ? 'Hide CVV' : 'Show CVV'}
                        </Text>
                      </TouchableOpacity>
                    </View>

                    {/* Metallic Chip */}
                    <View style={styles.cardChip}>
                      <LinearGradient
                        colors={['rgba(218, 165, 32, 0.9)', 'rgba(184, 134, 11, 0.8)']}
                        style={styles.chipGradient}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                      >
                        <View style={styles.chipLines}>
                          {Array.from({ length: 4 }).map((_, i) => (
                            <View key={i} style={styles.chipLine} />
                          ))}
                        </View>
                      </LinearGradient>
                    </View>

                    {/* Card Balance */}
                    <Text style={styles.cardBalance}>{formatCurrency(cardBalance)}</Text>

                    {/* Card Number */}
                    <View style={styles.cardNumberRow}>
                      <Text style={styles.cardNumberText}>
                        {formatCardNumber()}
                      </Text>
                    </View>

                    {/* Card Details Row */}
                    <View style={styles.cardDetailsRow}>
                      {/* Cardholder Name */}
                      <View style={styles.cardholderSection}>
                        <Text style={styles.cardholderLabel}>Cardholder Name</Text>
                        <Text style={styles.cardholderName}>{cardData.holder}</Text>
                      </View>
                      
                      {/* Expiry Date */}
                      <View style={styles.expirySection}>
                        <Text style={styles.expiryLabel}>Valid Thru</Text>
                        <Text style={styles.expiryDate}>{cardData.expiry}</Text>
                      </View>
                      
                      {/* CVV Section */}
                      <View style={styles.cvvSection}>
                        <Text style={styles.cvvLabel}>CVV</Text>
                        <TouchableOpacity 
                          style={styles.cvvDisplay}
                          onPress={toggleCVV}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.cvvValue}>
                            {showCVV ? cardData.cvv : '•••'}
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    {/* Contactless Icon */}
                    <View style={styles.contactlessIcon}>
                      <Ionicons name="wifi" size={20} color="rgba(255, 215, 0, 0.7)" />
                    </View>

                    {/* Mastercard Logo */}
                    <View style={styles.mastercardLogo}>
                      <View style={styles.mastercardCircleRed} />
                      <View style={styles.mastercardCircleYellow} />
                    </View>
                  </View>
                </View>
              </View>

              {/* Card Actions */}
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.cardAction} onPress={() => setIsAddingFunds(true)}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="add-circle" size={28} color="#FFD700" />
                  </View>
                  <Text style={styles.actionText}>Add Funds</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.cardAction} onPress={() => router.push('/(app)/transactions')}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="swap-horizontal" size={28} color="#FFD700" />
                  </View>
                  <Text style={styles.actionText}>Transactions</Text>
                </TouchableOpacity>
                
                <TouchableOpacity style={styles.cardAction} onPress={() => router.push('/(app)/cards/manage')}>
                  <View style={styles.actionIconContainer}>
                    <Ionicons name="card" size={28} color="#FFD700" />
                  </View>
                  <Text style={styles.actionText}>Manage</Text>
                </TouchableOpacity>
              </View>
            </Animated.View>

            {/* Security Notice */}
            <View style={styles.securityNotice}>
              <Ionicons name="shield-checkmark" size={16} color="#FFD700" />
              <Text style={styles.securityText}>
                Your CVV is securely stored and only visible when you choose to show it
              </Text>
            </View>

            {/* Financial Overview */}
            <View style={styles.financialOverview}>
              <Text style={styles.overviewTitle}>Financial Overview</Text>
              <View style={styles.statsContainer}>
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="arrow-down" size={20} color="#00FF7F" />
                  </View>
                  <Text style={styles.statAmount}>{formatCurrency(4302.00)}</Text>
                  <Text style={styles.statLabel}>Income</Text>
                </View>
                
                <View style={styles.statCard}>
                  <View style={styles.statIconContainer}>
                    <Ionicons name="arrow-up" size={20} color="#FF4444" />
                  </View>
                  <Text style={styles.statAmount}>{formatCurrency(4302.00)}</Text>
                  <Text style={styles.statLabel}>Expenses</Text>
                </View>
              </View>
            </View>

            {/* Recent Transactions */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Text style={styles.sectionTitle}>Recent Transactions</Text>
                <TouchableOpacity onPress={() => router.push('/(app)/transactions')}>
                  <Text style={styles.seeAll}>View All</Text>
                </TouchableOpacity>
              </View>
              
              {/* Transaction Tabs */}
              <View style={styles.transactionTabs}>
                <TouchableOpacity 
                  style={[styles.tab, selectedTab === 'all' && styles.tabActive]}
                  onPress={() => setSelectedTab('all')}
                >
                  <Text style={[styles.tabText, selectedTab === 'all' && styles.tabTextActive]}>
                    All
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, selectedTab === 'income' && styles.tabActive]}
                  onPress={() => setSelectedTab('income')}
                >
                  <Text style={[styles.tabText, selectedTab === 'income' && styles.tabTextActive]}>
                    Income
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[styles.tab, selectedTab === 'expense' && styles.tabActive]}
                  onPress={() => setSelectedTab('expense')}
                >
                  <Text style={[styles.tabText, selectedTab === 'expense' && styles.tabTextActive]}>
                    Expenses
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Transactions List */}
              {filteredTransactions.map((tx) => (
                <TouchableOpacity key={tx.id} style={styles.transactionItem} onPress={vibrate}>
                  <View style={styles.transactionLeft}>
                    <View style={[
                      styles.transactionIcon,
                      { backgroundColor: tx.amount > 0 ? 'rgba(0, 255, 127, 0.1)' : 'rgba(255, 68, 68, 0.1)' }
                    ]}>
                      <Ionicons 
                        name={tx.icon as any} 
                        size={20} 
                        color={tx.amount > 0 ? '#00FF7F' : '#FF4444'} 
                      />
                    </View>
                    <View>
                      <Text style={styles.transactionName}>{tx.name}</Text>
                      <Text style={styles.transactionTime}>{tx.time}</Text>
                    </View>
                  </View>
                  <Text style={[
                    styles.transactionAmount,
                    { color: tx.amount > 0 ? '#00FF7F' : '#FF4444' }
                  ]}>
                    {tx.amount > 0 ? '+' : ''}{formatCurrency(tx.amount)}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </SafeAreaView>

        {/* Add Funds Modal */}
        <Modal
          visible={isAddingFunds}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setIsAddingFunds(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Funds</Text>
                <TouchableOpacity onPress={() => setIsAddingFunds(false)}>
                  <Ionicons name="close" size={24} color="#FFD700" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>$</Text>
                <TextInput
                  style={styles.amountInput}
                  placeholder="0.00"
                  placeholderTextColor="#666"
                  value={addAmount}
                  onChangeText={setAddAmount}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
              
              <Text style={styles.modalSubtitle}>Available balance: {formatCurrency(cardBalance)}</Text>
              
              <View style={styles.quickAmounts}>
                {[50, 100, 200, 500].map((amount) => (
                  <TouchableOpacity
                    key={amount}
                    style={styles.quickAmountButton}
                    onPress={() => setAddAmount(amount.toString())}
                  >
                    <Text style={styles.quickAmountText}>${amount}</Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <TouchableOpacity
                style={[styles.confirmButton, !addAmount && styles.confirmButtonDisabled]}
                onPress={handleAddFunds}
                disabled={!addAmount || isAddingFunds}
              >
                {isAddingFunds ? (
                  <ActivityIndicator color="#FFD700" />
                ) : (
                  <Text style={styles.confirmButtonText}>Add Funds</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </View>
    </>
  );
}

/* ─────────────────────────────── STYLES ─────────────────────────────── */
const styles = StyleSheet.create({
  // ── COMMON ──
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  content: {
    flex: 1,
    zIndex: 2,
  },
  skeleton: {
    backgroundColor: '#333',
    borderRadius: 4,
  },
  skeletonButton: {
    height: 34,
    borderRadius: 8,
  },
  watermarkWrapper: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1,
  },
  watermark: {
    width: 300,
    height: 300,
    opacity: 0.1,
  },
  scrollContent: {
    paddingHorizontal: 20,
    paddingBottom: 100,
  },

  // ── ONBOARDING ──
  onboardingContainer: {
    flex: 1,
    backgroundColor: '#000',
  },
  onboardingContent: {
    flex: 1,
    paddingHorizontal: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  appLogo: {
    width: 80,
    height: 80,
  },
  onboardingTitle: {
    color: '#fff',
    fontSize: 28,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  onboardingSubtitle: {
    color: '#aaa',
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 40,
    paddingHorizontal: 20,
  },
  cardPreview: {
    marginBottom: 40,
    alignItems: 'center',
  },
  previewCard: {
    width: SCREEN_WIDTH * 0.85,
    height: 200,
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardGlassEffect: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.9)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    overflow: 'hidden',
  },
  previewCardGradient: {
    ...StyleSheet.absoluteFillObject,
  },
  previewCardBackground: {
    flex: 1,
    padding: 20,
    position: 'relative',
  },
  subtleGrid: {
    ...StyleSheet.absoluteFillObject,
  },
  gridLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  cardChipPreview: {
    width: 45,
    height: 32,
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  chipGradient: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  chipLines: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '70%',
  },
  chipLine: {
    width: 4,
    height: 10,
    backgroundColor: '#000',
    borderRadius: 1,
  },
  cardNumberPreview: {
    marginBottom: 20,
  },
  cardNumberPlaceholder: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: 18,
    fontWeight: '500',
    letterSpacing: 2,
  },
  cardFooterPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  cardHolderPlaceholder: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '500',
    letterSpacing: 1,
  },
  cvvPreviewContainer: {
    alignItems: 'flex-end',
  },
  cvvPreviewLabel: {
    color: 'rgba(255, 215, 0, 0.6)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 2,
  },
  cvvPreviewValue: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: 14,
    fontWeight: '600',
  },
  featuresList: {
    width: '100%',
    marginBottom: 40,
    gap: 16,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  featureText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '500',
  },
  generateButton: {
    width: '100%',
    marginBottom: 24,
    borderRadius: 30,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  buttonGradient: {
    paddingVertical: 18,
    alignItems: 'center',
  },
  generateButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  loadingContainer: {
    width: '100%',
    alignItems: 'center',
    marginBottom: 24,
  },
  progressBar: {
    height: 8,
    width: '100%',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 12,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 4,
  },
  progressText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  progressLabel: {
    color: '#aaa',
    fontSize: 14,
  },
  termsText: {
    color: '#666',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 20,
  },

  // ── SKELETON ──
  skeletonCard: {
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  skeletonCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  skeletonCardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 20,
  },
  skeletonActionIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#333',
    marginBottom: 8,
  },
  skeletonStatIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#333',
    marginBottom: 12,
  },

  // ── DASHBOARD ──
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 16,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  greeting: {
    color: '#aaa',
    fontSize: 14,
  },
  userName: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '700',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  iconButton: {
    padding: 8,
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFD700',
  },
  cardWrapper: {
    marginTop: 20,
  },
  virtualCardContainer: {
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  cardShimmer: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 100,
    backgroundColor: '#FFD700',
    zIndex: 2,
  },
  virtualCard: {
    flex: 1,
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderRadius: 16,
    overflow: 'hidden',
    position: 'relative',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  cardGlassBackground: {
    ...StyleSheet.absoluteFillObject,
  },
  cardPattern: {
    ...StyleSheet.absoluteFillObject,
  },
  patternLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.03)',
  },
  cardGradientOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  cardContent: {
    flex: 1,
    padding: 24,
    paddingBottom: 28,
    position: 'relative',
    zIndex: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardLabel: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: 13,
    fontWeight: '500',
    letterSpacing: 0.5,
  },
  cardType: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
    marginTop: 2,
  },
  cvvToggleButton: {
    alignItems: 'center',
    padding: 4,
  },
  cvvToggleText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  cardChip: {
    width: 48,
    height: 36,
    borderRadius: 6,
    marginBottom: 20,
    overflow: 'hidden',
  },
  cardBalance: {
    color: '#FFD700',
    fontSize: 36,
    fontWeight: '700',
    marginBottom: 20,
    letterSpacing: 0.5,
  },
  cardNumberRow: {
    marginBottom: 24,
  },
  cardNumberText: {
    color: '#fff',
    fontSize: 19,
    fontWeight: '500',
    letterSpacing: 2,
  },
  cardDetailsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 20,
  },
  cardholderSection: {
    flex: 1,
  },
  cardholderLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  cardholderName: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    letterSpacing: 0.5,
  },
  expirySection: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  expiryLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  expiryDate: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  cvvSection: {
    alignItems: 'flex-end',
  },
  cvvLabel: {
    color: 'rgba(255, 255, 255, 0.4)',
    fontSize: 10,
    fontWeight: '500',
    marginBottom: 4,
  },
  cvvDisplay: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    minWidth: 60,
    alignItems: 'center',
  },
  cvvValue: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '700',
    letterSpacing: 2,
  },
  contactlessIcon: {
    position: 'absolute',
    top: 24,
    right: 24,
  },
  mastercardLogo: {
    position: 'absolute',
    bottom: 24,
    right: 24,
    flexDirection: 'row',
    alignItems: 'center',
  },
  mastercardCircleRed: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#EB001B',
    marginRight: -4,
    zIndex: 1,
  },
  mastercardCircleYellow: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#F79E1B',
  },
  securityNotice: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 10,
    padding: 12,
    marginTop: 20,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  securityText: {
    flex: 1,
    color: '#FFD700',
    fontSize: 12,
    lineHeight: 16,
  },
  cardActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 24,
    gap: 12,
  },
  cardAction: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  actionIconContainer: {
    marginBottom: 8,
  },
  actionText: {
    color: '#FFD700',
    fontSize: 13,
    fontWeight: '600',
  },
  financialOverview: {
    marginTop: 8,
    marginBottom: 32,
  },
  overviewTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 16,
  },
  statsContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  statCard: {
    flex: 1,
    padding: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  statIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  statAmount: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
    marginBottom: 4,
  },
  statLabel: {
    color: '#aaa',
    fontSize: 12,
    fontWeight: '500',
  },
  section: {
    marginTop: 8,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '700',
  },
  seeAll: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
  },
  transactionTabs: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 4,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  tab: {
    flex: 1,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
  },
  tabActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  tabText: {
    color: '#aaa',
    fontSize: 14,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#FFD700',
  },
  transactionItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  transactionIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
  },
  transactionName: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  transactionTime: {
    color: '#aaa',
    fontSize: 12,
    marginTop: 2,
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: 'rgba(20, 20, 20, 0.95)',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 24,
    paddingBottom: 40,
    borderTopWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 24,
  },
  modalTitle: {
    color: '#FFD700',
    fontSize: 22,
    fontWeight: '700',
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.1)',
  },
  currencySymbol: {
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '300',
    marginRight: 12,
  },
  amountInput: {
    flex: 1,
    color: '#FFD700',
    fontSize: 28,
    fontWeight: '700',
    paddingVertical: 12,
  },
  modalSubtitle: {
    color: '#aaa',
    fontSize: 14,
    marginBottom: 24,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 32,
  },
  quickAmountButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  quickAmountText: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: '600',
  },
});