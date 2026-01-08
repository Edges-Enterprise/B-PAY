import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  StyleSheet,
  Alert,
  RefreshControl,
  ActivityIndicator,
  Dimensions,
  Animated,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { supabase } from '@/config/supabase';
import { useAuth } from '@/stores/auth-store';

const { width, height } = Dimensions.get('window');

// -----------------------------------------------------------------------------
// Task Types
// -----------------------------------------------------------------------------
const TASK_TYPES = {
  WATCH_VIDEO: {
    id: 1,
    name: 'Watch Video',
    icon: 'play-circle',
    color: '#FF6B6B',
    points: 10,
  },
  SURVEY: {
    id: 2,
    name: 'Complete Survey',
    icon: 'clipboard',
    color: '#4ECDC4',
    points: 25,
  },
  APP_INSTALL: {
    id: 3,
    name: 'Install App',
    icon: 'download',
    color: '#45B7D1',
    points: 50,
  },
  SOCIAL_MEDIA: {
    id: 4,
    name: 'Social Media',
    icon: 'share-social',
    color: '#96CEB4',
    points: 15,
  },
  QUIZ: {
    id: 5,
    name: 'Daily Quiz',
    icon: 'help-circle',
    color: '#FFEAA7',
    points: 20,
  },
};

// -----------------------------------------------------------------------------
// Task Status
// -----------------------------------------------------------------------------
const TASK_STATUS = {
  AVAILABLE: 'available',
  COMPLETED: 'completed',
  PENDING: 'pending',
  LOCKED: 'locked',
};

// -----------------------------------------------------------------------------
// Sample Tasks Data (5 tasks per day)
// -----------------------------------------------------------------------------
const DAILY_TASKS = [
  {
    id: 1,
    type: TASK_TYPES.WATCH_VIDEO,
    title: 'Watch a 30-second video ad',
    description: 'Watch this short video to earn points',
    points: 10,
    status: TASK_STATUS.AVAILABLE,
    duration: '30s',
    completedCount: 0,
    dailyLimit: 3,
  },
  {
    id: 2,
    type: TASK_TYPES.SURVEY,
    title: 'Complete consumer survey',
    description: 'Share your opinion about products',
    points: 25,
    status: TASK_STATUS.AVAILABLE,
    duration: '3-5 min',
    completedCount: 0,
    dailyLimit: 1,
  },
  {
    id: 3,
    type: TASK_TYPES.APP_INSTALL,
    title: 'Install & open new app',
    description: 'Try this trending app from our partner',
    points: 50,
    status: TASK_STATUS.AVAILABLE,
    duration: '2 min',
    completedCount: 0,
    dailyLimit: 1,
  },
  {
    id: 4,
    type: TASK_TYPES.SOCIAL_MEDIA,
    title: 'Follow on Instagram',
    description: 'Follow our official Instagram page',
    points: 15,
    status: TASK_STATUS.AVAILABLE,
    duration: '1 min',
    completedCount: 0,
    dailyLimit: 1,
  },
  {
    id: 5,
    type: TASK_TYPES.QUIZ,
    title: 'Daily trivia quiz',
    description: 'Answer 5 questions correctly',
    points: 20,
    status: TASK_STATUS.AVAILABLE,
    duration: '2 min',
    completedCount: 0,
    dailyLimit: 1,
  },
];

// -----------------------------------------------------------------------------
// Points to Currency Conversion
// -----------------------------------------------------------------------------
const POINTS_TO_CURRENCY = 100; // 100 points = ₦1
const MIN_REDEEM_POINTS = 1000; // Minimum points needed to redeem

const DailyTasksScreen = () => {
  const { user, isAuthenticated, balance, updateBalance } = useAuth();
  const [tasks, setTasks] = useState([]);
  const [userPoints, setUserPoints] = useState(0);
  const [totalEarned, setTotalEarned] = useState(0);
  const [dailyGoal, setDailyGoal] = useState(200);
  const [progress, setProgress] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [processingTask, setProcessingTask] = useState(null);
  const [isTasksCollapsed, setIsTasksCollapsed] = useState(false);
  const [completedTasksCount, setCompletedTasksCount] = useState(0);
  
  // Animations
  const watermarkPulse = useRef(new Animated.Value(1)).current;
  const skeletonOpacity = useRef(new Animated.Value(0.5)).current;

  // -------------------------------------------------------------------------
  // Start Watermark Animation
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Skeleton Animation
  // -------------------------------------------------------------------------
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

  // -------------------------------------------------------------------------
  // Initialize User Data
  // -------------------------------------------------------------------------
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchUserData();
    } else {
      setIsLoading(false);
      router.replace('/(auth)/login');
    }
  }, [isAuthenticated, user]);

  const fetchUserData = async () => {
    try {
      setIsLoading(true);
      
      // Fetch user points from database
      const { data: userData, error } = await supabase
        .from('user_points')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user points:', error);
      }

      if (userData) {
        setUserPoints(userData.points || 0);
        setTotalEarned(userData.total_earned || 0);
      } else {
        // Create initial points record
        const { data: newRecord } = await supabase
          .from('user_points')
          .insert([
            {
              user_id: user.id,
              points: 0,
              total_earned: 0,
              last_updated: new Date().toISOString(),
            }
          ])
          .select()
          .single();

        if (newRecord) {
          setUserPoints(0);
          setTotalEarned(0);
        }
      }

      // Use sample tasks
      const tasksWithProgress = DAILY_TASKS.map(task => ({
        ...task,
        progress: task.completedCount / task.dailyLimit * 100,
      }));
      
      setTasks(tasksWithProgress);
      
      // Calculate completed tasks
      const completed = tasksWithProgress.filter(t => 
        t.status === TASK_STATUS.COMPLETED || t.completedCount >= t.dailyLimit
      ).length;
      setCompletedTasksCount(completed);
      
      // Auto-collapse if all tasks are completed
      if (completed === DAILY_TASKS.length) {
        setIsTasksCollapsed(true);
      } else {
        setIsTasksCollapsed(false);
      }
      
      // Calculate progress towards daily goal
      const todayPoints = 45;
      setProgress((todayPoints / dailyGoal) * 100);
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error in fetchUserData:', error);
      setIsLoading(false);
    }
  };

  // -------------------------------------------------------------------------
  // Handle Task Completion
  // -------------------------------------------------------------------------
  const handleTaskComplete = async (taskId) => {
    if (processingTask === taskId) return;
    
    const task = tasks.find(t => t.id === taskId);
    if (!task || task.status === TASK_STATUS.COMPLETED) {
      Alert.alert('Task Completed', 'This task has already been completed today.');
      return;
    }

    if (task.completedCount >= task.dailyLimit) {
      Alert.alert('Daily Limit Reached', `You can only complete this task ${task.dailyLimit} time(s) per day.`);
      return;
    }

    setProcessingTask(taskId);

    try {
      // Simulate task completion
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Update task locally
      const updatedTasks = tasks.map(t => {
        if (t.id === taskId) {
          const newCompletedCount = t.completedCount + 1;
          const isFullyCompleted = newCompletedCount >= t.dailyLimit;
          const newStatus = isFullyCompleted ? TASK_STATUS.COMPLETED : TASK_STATUS.AVAILABLE;
          
          return {
            ...t,
            completedCount: newCompletedCount,
            status: newStatus,
            progress: (newCompletedCount / t.dailyLimit) * 100,
          };
        }
        return t;
      });

      setTasks(updatedTasks);

      // Update completed tasks count
      const completed = updatedTasks.filter(t => 
        t.status === TASK_STATUS.COMPLETED || t.completedCount >= t.dailyLimit
      ).length;
      setCompletedTasksCount(completed);

      // Auto-collapse if all tasks are completed
      if (completed === DAILY_TASKS.length) {
        setIsTasksCollapsed(true);
      }

      // Update user points
      const newPoints = userPoints + task.points;
      const newTotalEarned = totalEarned + task.points;
      
      setUserPoints(newPoints);
      setTotalEarned(newTotalEarned);

      // Update in database
      await supabase
        .from('user_points')
        .update({
          points: newPoints,
          total_earned: newTotalEarned,
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      // Update today's progress
      const todayPoints = 45 + task.points;
      setProgress((todayPoints / dailyGoal) * 100);

      Alert.alert(
        'Task Completed!',
        `🎉 You earned ${task.points} points!`,
        [{ text: 'Continue' }]
      );

    } catch (error) {
      console.error('Error completing task:', error);
      Alert.alert('Error', 'Failed to complete task. Please try again.');
    } finally {
      setProcessingTask(null);
    }
  };

  // -------------------------------------------------------------------------
  // Handle Points Redemption
  // -------------------------------------------------------------------------
  const handleRedeemPoints = () => {
    if (userPoints < MIN_REDEEM_POINTS) {
      Alert.alert(
        'Not Enough Points',
        `You need at least ${MIN_REDEEM_POINTS} points to redeem.\nCurrent points: ${userPoints}`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Earn More', onPress: () => setIsTasksCollapsed(false) }
        ]
      );
      return;
    }

    const redeemableAmount = Math.floor(userPoints / POINTS_TO_CURRENCY);
    
    Alert.alert(
      'Redeem Points',
      `Convert ${userPoints} points to ₦${redeemableAmount}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Redeem',
          onPress: async () => {
            try {
              // Calculate new balance
              const newBalance = (balance || 0) + redeemableAmount;
              const newPoints = userPoints % POINTS_TO_CURRENCY;
              
              // Update in database
              await supabase
                .from('user_points')
                .update({
                  points: newPoints,
                  last_updated: new Date().toISOString(),
                })
                .eq('user_id', user.id);

              // Update auth store balance
              updateBalance(newBalance);

              // Update local state
              setUserPoints(newPoints);

              Alert.alert(
                'Success!',
                `🎉 ₦${redeemableAmount} has been added to your wallet!`,
                [{ text: 'Great!' }]
              );
            } catch (error) {
              console.error('Error redeeming points:', error);
              Alert.alert('Error', 'Failed to redeem points. Please try again.');
            }
          }
        }
      ]
    );
  };

  // -------------------------------------------------------------------------
  // Handle Refresh
  // -------------------------------------------------------------------------
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchUserData();
    setRefreshing(false);
  };

  // -------------------------------------------------------------------------
  // Toggle Tasks Collapse
  // -------------------------------------------------------------------------
  const toggleTasksCollapse = () => {
    setIsTasksCollapsed(!isTasksCollapsed);
  };

  // -------------------------------------------------------------------------
  // Render Task Item
  // -------------------------------------------------------------------------
  const renderTaskItem = (task) => {
    const isProcessing = processingTask === task.id;
    const isCompleted = task.status === TASK_STATUS.COMPLETED;
    const isAvailable = task.status === TASK_STATUS.AVAILABLE;
    const canComplete = isAvailable && task.completedCount < task.dailyLimit;

    return (
      <View key={task.id} style={styles.taskCard}>
        <View style={styles.taskHeader}>
          <View style={[styles.taskIconContainer, { backgroundColor: `${task.type.color}20` }]}>
            <Ionicons name={task.type.icon} size={20} color={task.type.color} />
          </View>
          
          <View style={styles.taskInfo}>
            <Text style={styles.taskTitle}>{task.title}</Text>
            <Text style={styles.taskDescription}>{task.description}</Text>
            
            <View style={styles.taskMeta}>
              <View style={styles.taskMetaItem}>
                <Ionicons name="time-outline" size={10} color="#999" />
                <Text style={styles.taskMetaText}>{task.duration}</Text>
              </View>
              
              <View style={styles.taskMetaItem}>
                <Ionicons name="repeat-outline" size={10} color="#999" />
                <Text style={styles.taskMetaText}>
                  {task.completedCount}/{task.dailyLimit} today
                </Text>
              </View>
            </View>
          </View>
          
          <View style={styles.taskPoints}>
            <Text style={styles.pointsText}>+{task.points}</Text>
            <Text style={styles.pointsLabel}>Points</Text>
          </View>
        </View>
        
        {/* Progress Bar */}
        {task.dailyLimit > 1 && (
          <View style={styles.progressContainer}>
            <View style={styles.progressBar}>
              <View 
                style={[
                  styles.progressFill,
                  { width: `${task.progress}%`, backgroundColor: task.type.color }
                ]} 
              />
            </View>
            <Text style={styles.progressText}>
              {Math.round(task.progress)}% complete
            </Text>
          </View>
        )}
        
        {/* Action Button */}
        <TouchableOpacity
          style={[
            styles.taskButton,
            canComplete && styles.taskButtonAvailable,
            isCompleted && styles.taskButtonCompleted,
            isProcessing && styles.taskButtonProcessing,
          ]}
          onPress={() => handleTaskComplete(task.id)}
          disabled={isCompleted || isProcessing || !canComplete}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#FFF" />
          ) : (
            <>
              <Ionicons 
                name={isCompleted ? "checkmark-circle" : "play-circle"} 
                size={14} 
                color={isCompleted ? "#4CAF50" : "#FFF"} 
              />
              <Text style={[
                styles.taskButtonText,
                isCompleted && styles.taskButtonTextCompleted
              ]}>
                {isCompleted ? 'Completed' : 'Start Task'}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  // -------------------------------------------------------------------------
  // Skeleton Components
  // -------------------------------------------------------------------------
  const SkeletonText = ({ width = '100%', height = 20 }) => (
    <Animated.View style={[styles.skeleton, { width, height, opacity: skeletonOpacity }]} />
  );

  const SkeletonCard = () => (
    <View style={styles.taskCard}>
      <View style={styles.taskHeader}>
        <Animated.View style={[styles.skeletonIcon, { opacity: skeletonOpacity }]} />
        
        <View style={styles.taskInfo}>
          <SkeletonText width="70%" height={14} />
          <SkeletonText width="90%" height={10} />
          <View style={styles.taskMeta}>
            <SkeletonText width={40} height={10} />
            <SkeletonText width={60} height={10} />
          </View>
        </View>
        
        <View style={styles.taskPoints}>
          <SkeletonText width={30} height={16} />
          <SkeletonText width={25} height={8} />
        </View>
      </View>
    </View>
  );

  // -------------------------------------------------------------------------
  // Loading State
  // -------------------------------------------------------------------------
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
          {/* Header Skeleton */}
          <View style={styles.header}>
            <View style={styles.balanceContainer}>
              <SkeletonText width={100} height={18} />
            </View>
            
            <View style={styles.redeemButton}>
              <SkeletonText width={60} height={14} />
            </View>
          </View>

          <ScrollView contentContainerStyle={styles.scrollContent}>
            {/* Stats Card Skeleton */}
            <View style={styles.statsCard}>
              <View style={styles.statItem}>
                <SkeletonText width={50} height={18} />
                <SkeletonText width={40} height={10} />
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <SkeletonText width={50} height={18} />
                <SkeletonText width={40} height={10} />
              </View>
              
              <View style={styles.statDivider} />
              
              <View style={styles.statItem}>
                <SkeletonText width={50} height={18} />
                <SkeletonText width={40} height={10} />
              </View>
            </View>

            {/* Goal Card Skeleton */}
            <View style={styles.goalCard}>
              <View style={styles.goalHeader}>
                <SkeletonText width={100} height={14} />
                <SkeletonText width={30} height={14} />
              </View>
              
              <View style={styles.goalProgressBar}>
                <SkeletonText width="60%" height={6} />
              </View>
              
              <SkeletonText width="100%" height={10} />
            </View>

            {/* Tasks Section Skeleton */}
            <View style={styles.tasksSection}>
              <View style={styles.tasksHeader}>
                <SkeletonText width={120} height={16} />
                <SkeletonText width={20} height={20} />
              </View>
              
              <View style={styles.tasksContent}>
                <View style={styles.taskCard}>
                  <SkeletonText width="100%" height={60} />
                </View>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>
    );
  }

  // -------------------------------------------------------------------------
  // Main Render
  // -------------------------------------------------------------------------
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
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.balanceContainer}>
            <Ionicons name="trophy-outline" size={20} color="#FFD700" />
            <Text style={styles.balanceText}>
              {userPoints.toLocaleString()} Points
            </Text>
          </View>
          
          <TouchableOpacity
            style={styles.redeemButton}
            onPress={handleRedeemPoints}
          >
            <Ionicons name="cash-outline" size={16} color="#FFD700" />
            <Text style={styles.redeemButtonText}>Redeem</Text>
          </TouchableOpacity>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              colors={['#FFD700']}
              tintColor="#FFD700"
            />
          }
        >
          {/* Stats Card - Transparent (like your reference) */}
          <View style={styles.statsCard}>
            <View style={styles.statItem}>
              <Text style={styles.statValue}>₦{Math.floor(userPoints / POINTS_TO_CURRENCY)}</Text>
              <Text style={styles.statLabel}>Redeemable</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{totalEarned.toLocaleString()}</Text>
              <Text style={styles.statLabel}>Total Earned</Text>
            </View>
            
            <View style={styles.statDivider} />
            
            <View style={styles.statItem}>
              <Text style={styles.statValue}>{dailyGoal}</Text>
              <Text style={styles.statLabel}>Daily Goal</Text>
            </View>
          </View>

          {/* Daily Goal Progress - Transparent */}
          <View style={styles.goalCard}>
            <View style={styles.goalHeader}>
              <Text style={styles.goalTitle}>Daily Goal Progress</Text>
              <Text style={styles.goalPercentage}>{Math.round(progress)}%</Text>
            </View>
            
            <View style={styles.goalProgressBar}>
              <View 
                style={[
                  styles.goalProgressFill,
                  { width: `${Math.min(progress, 100)}%` }
                ]} 
              />
            </View>
            
            <Text style={styles.goalSubtitle}>
              {completedTasksCount === DAILY_TASKS.length 
                ? '🎉 All daily tasks completed! Come back tomorrow.' 
                : 'Complete tasks to reach your daily goal!'}
            </Text>
          </View>

          {/* Tasks Section - Collapsible */}
          <View style={styles.tasksSection}>
            {/* Tasks Header with Collapse Icon */}
            <TouchableOpacity 
              style={styles.tasksHeader}
              onPress={toggleTasksCollapse}
              activeOpacity={0.7}
            >
              <View style={styles.tasksHeaderLeft}>
                <Ionicons name="list-outline" size={20} color="#FFD700" />
                <Text style={styles.sectionTitle}>Daily Tasks</Text>
                <View style={styles.taskCountBadge}>
                  <Text style={styles.taskCountText}>
                    {completedTasksCount}/{DAILY_TASKS.length}
                  </Text>
                </View>
              </View>
              
              <Ionicons 
                name={isTasksCollapsed ? "chevron-down" : "chevron-up"} 
                size={20} 
                color="#FFD700" 
              />
            </TouchableOpacity>
            
            {/* Tasks Content - Collapsible */}
            {!isTasksCollapsed && (
              <View style={styles.tasksContent}>
                {tasks.map(renderTaskItem)}
                
                {/* Completed Message */}
                {completedTasksCount === DAILY_TASKS.length && (
                  <View style={styles.allTasksComplete}>
                    <Ionicons name="trophy" size={40} color="#FFD700" />
                    <Text style={styles.allTasksCompleteText}>
                      🎉 All tasks completed for today!
                    </Text>
                    <Text style={styles.allTasksCompleteSubtext}>
                      Come back tomorrow for new tasks
                    </Text>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Info Card - Transparent */}
          <View style={styles.infoCard}>
            <Ionicons name="information-circle" size={20} color="#FFD700" />
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>How it works</Text>
              <Text style={styles.infoText}>
                1. Complete {DAILY_TASKS.length} daily tasks to earn points{'\n'}
                2. Points convert to cash (100 points = ₦1){'\n'}
                3. Redeem points anytime in your wallet{'\n'}
                4. Tasks reset daily at midnight
              </Text>
            </View>
          </View>
        </ScrollView>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000',
  },
  skeleton: {
    backgroundColor: '#333',
    borderRadius: 4,
  },
  skeletonIcon: {
    width: 36,
    height: 36,
    backgroundColor: '#333',
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
  content: {
    flex: 1,
    zIndex: 2,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 16,
    backgroundColor: '#000',
  },
  balanceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  balanceText: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
  },
  redeemButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  redeemButtonText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: '600',
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 30,
  },
  
  // Stats Card - TRANSPARENT like your reference
  statsCard: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statValue: {
    color: '#FFD700',
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  statLabel: {
    color: '#999',
    fontSize: 11,
  },
  statDivider: {
    width: 1,
    backgroundColor: '#333',
    marginHorizontal: 8,
  },
  
  // Goal Card - TRANSPARENT like your reference
  goalCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#333',
  },
  goalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  goalTitle: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  goalPercentage: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  goalProgressBar: {
    height: 6,
    backgroundColor: '#333',
    borderRadius: 3,
    marginBottom: 8,
    overflow: 'hidden',
  },
  goalProgressFill: {
    height: '100%',
    backgroundColor: '#FFD700',
    borderRadius: 3,
  },
  goalSubtitle: {
    color: '#999',
    fontSize: 11,
  },
  
  // Tasks Section
  tasksSection: {
    marginBottom: 20,
  },
  tasksHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  tasksHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  sectionTitle: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  taskCountBadge: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  taskCountText: {
    color: '#FFD700',
    fontSize: 12,
    fontWeight: 'bold',
  },
  tasksContent: {
    marginTop: 8,
  },
  
  // Task Card - TRANSPARENT like your reference
  taskCard: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#333',
  },
  taskHeader: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  taskIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
    marginBottom: 2,
  },
  taskDescription: {
    color: '#999',
    fontSize: 10,
    marginBottom: 6,
  },
  taskMeta: {
    flexDirection: 'row',
    gap: 10,
  },
  taskMetaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  taskMetaText: {
    color: '#999',
    fontSize: 9,
  },
  taskPoints: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  pointsText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
  },
  pointsLabel: {
    color: '#999',
    fontSize: 9,
  },
  
  // Progress Bar
  progressContainer: {
    marginBottom: 8,
  },
  progressBar: {
    height: 3,
    backgroundColor: '#333',
    borderRadius: 1.5,
    marginBottom: 2,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 1.5,
  },
  progressText: {
    color: '#999',
    fontSize: 8,
    textAlign: 'right',
  },
  
  // Task Button
  taskButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: '#333',
  },
  taskButtonAvailable: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  taskButtonCompleted: {
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.3)',
  },
  taskButtonProcessing: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
  },
  taskButtonText: {
    color: '#FFD700',
    fontSize: 10,
    fontWeight: '600',
  },
  taskButtonTextCompleted: {
    color: '#4CAF50',
  },
  
  // All Tasks Complete Message
  allTasksComplete: {
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    marginTop: 8,
  },
  allTasksCompleteText: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 10,
    textAlign: 'center',
  },
  allTasksCompleteSubtext: {
    color: '#999',
    fontSize: 11,
    marginTop: 4,
    textAlign: 'center',
  },
  
  // Info Card - TRANSPARENT like your reference
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: 'transparent',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#333',
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    color: '#FFD700',
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  infoText: {
    color: '#999',
    fontSize: 11,
    lineHeight: 16,
  },
});

export default DailyTasksScreen;