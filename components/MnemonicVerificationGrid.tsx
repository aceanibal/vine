import "react-native-get-random-values";
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { useMemo, useRef } from 'react';
import { View, TextInput } from 'react-native';

import { Text } from '~/components/nativewindui/Text';
import { MaterialIcons } from '@expo/vector-icons';

type MnemonicVerificationGridProps = {
  words: string[];
  onChangeWords: (nextWords: string[]) => void;
  originalMnemonic: string;
  onValidityChange?: (isValid: boolean, allCorrect: boolean) => void;
};

export function MnemonicVerificationGrid({ 
  words, 
  onChangeWords, 
  originalMnemonic,
  onValidityChange 
}: MnemonicVerificationGridProps) {
  // Lapis-lazuli theme colors
  const colors = {
    primary: '#225D7C',
    success: '#7FAFA1', // cambridge-blue
    destructive: '#FC7E7E',
    grey2: '#9CA3AF',
  };

  const originalWords = useMemo(() => originalMnemonic.split(' '), [originalMnemonic]);
  const inputRefs = useRef<Array<TextInput | null>>(Array(12).fill(null));

  const englishWordlist = useMemo(() => {
    try {
      const wl: any = (ethers as any).wordlists?.en;
      if (!wl) return new Set<string>();
      const list: string[] = [];
      for (let i = 0; i < 2048; i++) {
        const w = wl.getWord(i);
        if (w) list.push(w);
      }
      return new Set(list);
    } catch {
      return new Set<string>();
    }
  }, []);

  const isValidBIP39Word = (word: string) => {
    return englishWordlist.has(word.trim().toLowerCase());
  };

  const isCorrectWord = (index: number, word: string) => {
    return word.trim().toLowerCase() === originalWords[index]?.toLowerCase();
  };

  const checkValidity = (currentWords: string[]) => {
    if (onValidityChange) {
      const filledCount = currentWords.filter((w) => w.length > 0).length;
      const allCorrect = currentWords.every((word, index) => 
        word.trim().toLowerCase() === originalWords[index]?.toLowerCase()
      );
      const isValid = filledCount === 12 && allCorrect;
      onValidityChange(isValid, allCorrect);
    }
  };

  const handleWordChange = (index: number, text: string) => {
    const normalized = text.replace(/\s+/g, ' ').toLowerCase().trim();
    const nextWords = [...words];
    nextWords[index] = normalized;
    onChangeWords(nextWords);
    checkValidity(nextWords);
  };

  const handleWordSubmitEditing = (index: number) => {
    if (index < 11) inputRefs.current[index + 1]?.focus();
  };

  const wordCount = words.filter((w) => w.length > 0).length;

  return (
    <View className="gap-4">
      {/* Warning Box */}
      <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6">
        <View className="items-center gap-2">
          <MaterialIcons name="verified-user" size={28} color="#7FAFA1" />
          <Text 
            className="text-lapis-lazuli"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: 20 }}
          >
            Verify Each Word
          </Text>
        </View>
        <Text className="text-xs text-center text-lapis-lazuli">
          Enter each word exactly as shown. Cambridge-blue checkmark means the word is correct.
        </Text>
      </View>

      <View className="-mx-1 flex-row flex-wrap">
        {Array.from({ length: 12 }).map((_, i) => {
          const value = words[i] || '';
          const isValid = value.length > 0 && isValidBIP39Word(value);
          const isCorrect = value.length > 0 && isCorrectWord(i, value);
          
          return (
            <View key={i} className="w-1/2 px-1 py-1">
              <View className="flex-row items-center gap-2">
                <Text 
                  className="text-sm font-semibold text-blue-green w-6"
                  numberOfLines={1}
                  adjustsFontSizeToFit
                >
                  {i + 1}.
                </Text>
                <View className="flex-1 relative">
                  <TextInput
                    ref={(el) => {
                      inputRefs.current[i] = el;
                    }}
                    className="h-10 rounded-lg border pr-8 pl-3 text-body"
                    style={{
                      borderColor: value.length > 0 
                        ? (isCorrect ? colors.success : colors.destructive)
                        : '#E5E7EB',
                      backgroundColor: value.length > 0
                        ? (isCorrect ? 'rgba(127, 175, 161, 0.1)' : '#FEF2F2')
                        : '#FFFFFF'
                    }}
                    placeholder={`Word ${i + 1}`}
                    placeholderTextColor={colors.grey2}
                    value={value}
                    onChangeText={(t) => handleWordChange(i, t)}
                    autoCapitalize="none"
                    autoCorrect={false}
                    onSubmitEditing={() => handleWordSubmitEditing(i)}
                    returnKeyType={i === 11 ? 'done' : 'next'}
                  />
                  {value.length > 0 && (
                    <View className="absolute right-2 top-3">
                      <MaterialIcons
                        name={isCorrect ? 'check-circle' : 'error'}
                        size={16}
                        color={isCorrect ? colors.success : colors.destructive}
                      />
                    </View>
                  )}
                </View>
              </View>
            </View>
          );
        })}
      </View>
      <View className="flex-row items-center justify-between">
        <Text 
          className="text-xs text-blue-green"
          numberOfLines={1}
          adjustsFontSizeToFit
        >
          {wordCount}/12 words
        </Text>
      </View>
    </View>
  );
}

