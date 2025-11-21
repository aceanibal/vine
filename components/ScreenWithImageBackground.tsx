import { View, Image, ScrollView, RefreshControl, type ViewStyle } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ReactNode } from 'react';

interface ScreenWithImageBackgroundProps {
  children: ReactNode;
  refreshControl?: ReactNode;
  contentContainerStyle?: ViewStyle;
  scrollViewClassName?: string;
  imageHeight?: number;
  showScrollView?: boolean;
}

export function ScreenWithImageBackground({
  children,
  refreshControl,
  contentContainerStyle,
  scrollViewClassName = 'flex-1 mt-3',
  imageHeight = 300,
  showScrollView = true,
}: ScreenWithImageBackgroundProps) {
  return (
    <View style={{ flex: 1 }}>
      {/* Fixed image at the top - doesn't scroll */}
      <View style={{ position: 'absolute', top: 0, left: 0, right: 0, height: imageHeight, overflow: 'hidden' }}>
        <Image 
          source={require('~/assets/auralogo.png')}
          style={{ width: '100%', height: '100%' }}
          resizeMode="cover"
        />
      </View>
      <SafeAreaView className="flex-1" edges={['top']}>
        {showScrollView ? (
          <ScrollView 
            className={scrollViewClassName}
            contentContainerStyle={contentContainerStyle || { flexGrow: 1 }}
            refreshControl={refreshControl as any}
          >
            {children}
          </ScrollView>
        ) : (
          children
        )}
      </SafeAreaView>
    </View>
  );
}

