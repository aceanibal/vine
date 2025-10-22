import { MaterialIcons } from '@expo/vector-icons';
import { View, Pressable } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';

interface NumberPadProps {
  onKeyPress: (key: string) => void;
}

export function NumberPad({ onKeyPress }: NumberPadProps) {
  const { colors } = useColorScheme();

  const keys = [
    ['1', '2', '3'],
    ['4', '5', '6'],
    ['7', '8', '9'],
    ['.', '0', 'backspace'],
  ];

  const handleKeyPress = (key: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onKeyPress(key);
  };

  return (
    <View className="gap-3">
      {keys.map((row, rowIndex) => (
        <View key={rowIndex} className="flex-row gap-3">
          {row.map((key) => (
            <Pressable key={key} onPress={() => handleKeyPress(key)} className="flex-1">
              {({ pressed }) => (
                <View
                  className="h-16 items-center justify-center rounded-xl border border-breeze-blue/10 shadow-lg shadow-lapis-lazuli"
                  style={{
                    shadowColor: '#225D7C',
                    shadowOffset: { width: 0, height: 2 },
                    shadowOpacity: 0.25,
                    shadowRadius: 3.84,
                    elevation: 5,
                    backgroundColor: pressed ? '#225D7C' : 'rgba(52, 153, 188, 0.05)',
                    borderColor: pressed ? '#225D7C' : 'rgba(52, 153, 188, 0.05)',
                  }}
                >
                  {key === 'backspace' ? (
                    <MaterialIcons
                      name="backspace"
                      size={24}
                      color={pressed ? '#FFFFFF' : '#225D7C'}
                    />
                  ) : key === '.' ? (
                    <Text
                      className="text-3xl font-bold"
                      style={{ color: pressed ? '#FFFFFF' : '#225D7C' }}
                    >
                      •
                    </Text>
                  ) : (
                    <Text
                      className="text-2xl font-semibold"
                      style={{ color: pressed ? '#FFFFFF' : '#225D7C' }}
                    >
                      {key}
                    </Text>
                  )}
                </View>
              )}
            </Pressable>
          ))}
        </View>
      ))}
    </View>
  );
}

