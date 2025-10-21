import "react-native-get-random-values";
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { useMemo, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';

import { Text } from '~/components/nativewindui/Text';
import { MaterialIcons } from '@expo/vector-icons';

type MnemonicInputGridProps = {
  words: string[];
  onChangeWords: (nextWords: string[]) => void;
  onValidityChange?: (isValid: boolean, phrase: string) => void;
};

export function MnemonicInputGrid({ words, onChangeWords, onValidityChange }: MnemonicInputGridProps) {
  // Lapis-lazuli theme colors
  const colors = {
    card: '#F3F4F6',
    background: '#FFFFFF',
    grey: '#6B7280',
    foreground: '#225D7C',
    primary: '#225D7C',
    destructive: '#FC7E7E',
    grey2: '#9CA3AF',
  };

  const englishWords: string[] = useMemo(() => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const wl: any = (ethers as any).wordlists?.en;
      if (!wl) return [];
      const list: string[] = [];
      for (let i = 0; i < 2048; i++) {
        const w = wl.getWord(i);
        if (w) list.push(w);
      }
      return list;
    } catch {
      return [];
    }
  }, []);

  const englishSet: Set<string> = useMemo(() => new Set(englishWords), [englishWords]);

  const inputRefs = useRef<Array<TextInput | null>>(Array(12).fill(null));

  const isValidWord = (w: string) => englishSet.has(w.trim().toLowerCase());

  const getSuggestions = (prefix: string, limit = 6): string[] => {
    const p = prefix.trim().toLowerCase();
    if (!p) return [];
    const results: string[] = [];
    for (let i = 0; i < englishWords.length && results.length < limit; i++) {
      const w = englishWords[i];
      if (w.startsWith(p)) results.push(w);
    }
    return results;
  };

  const recomputePhraseAndValidity = (currentWords: string[]) => {
    const phrase = currentWords.join(' ').trim().replace(/\s+/g, ' ');
    if (onValidityChange) {
      if (currentWords.filter((w) => w.length > 0).length !== 12) {
        onValidityChange(false, phrase);
        return;
      }
      try {
        const wallet = ethers.Wallet.fromPhrase(phrase);
        onValidityChange(!!wallet?.address, phrase);
      } catch {
        onValidityChange(false, phrase);
      }
    }
  };

  const handleWordChange = (index: number, text: string) => {
    const normalized = text.replace(/\s+/g, ' ').toLowerCase();
    const parts = normalized.split(' ');
    const nextWords = [...words];
    if (parts.length > 1) {
      let cursor = index;
      for (let i = 0; i < parts.length && cursor < 12; i++, cursor++) {
        nextWords[cursor] = parts[i];
      }
      onChangeWords(nextWords);
      recomputePhraseAndValidity(nextWords);
      const lastIndex = Math.min(index + parts.length - 1, 11);
      if (lastIndex < 12) inputRefs.current[lastIndex]?.focus();
      return;
    }
    nextWords[index] = parts[0];
    onChangeWords(nextWords);
    recomputePhraseAndValidity(nextWords);
  };

  const handleSelectSuggestion = (index: number, suggestion: string) => {
    const nextWords = [...words];
    nextWords[index] = suggestion;
    onChangeWords(nextWords);
    recomputePhraseAndValidity(nextWords);
    if (index < 11) inputRefs.current[index + 1]?.focus();
  };

  const handleWordSubmitEditing = (index: number) => {
    if (index < 11) inputRefs.current[index + 1]?.focus();
  };

  const wordCount = words.filter((w) => w.length > 0).length;

  return (
    <View className="gap-4">
      {/* Info Box */}
      <View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6">
        <View className="items-center gap-2">
          <MaterialIcons name="edit-note" size={28} color="#7FAFA1" />
          <Text 
            className="text-lapis-lazuli"
            numberOfLines={1}
            adjustsFontSizeToFit
            style={{ fontSize: 20 }}
          >
            Enter Recovery Phrase
          </Text>
        </View>
        <Text className="text-xs text-center text-lapis-lazuli">
          Type each word. Suggestions from BIP-39 list will appear as you type.
        </Text>
      </View>

      <View className="-mx-1 flex-row flex-wrap">
        {Array.from({ length: 12 }).map((_, i) => {
          const value = words[i] || '';
          const valid = value.length > 0 && isValidWord(value);
          const suggestions = value && !valid ? getSuggestions(value) : [];
          return (
            <View key={i} className="w-1/2 px-1 py-1">
              <View className="gap-1">
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
                          ? (valid ? colors.primary : colors.destructive)
                          : '#E5E7EB',
                        backgroundColor: value.length > 0
                          ? (valid ? 'rgba(34, 93, 124, 0.1)' : '#FEF2F2')
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
                          name={valid ? 'check-circle' : 'error'}
                          size={16}
                          color={valid ? colors.primary : colors.destructive}
                        />
                      </View>
                    )}
                  </View>
                </View>
                {suggestions.length > 0 && (
                  <View className="flex-row flex-wrap gap-1 ml-8">
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => handleSelectSuggestion(i, s)}
                        className="rounded-full bg-lapis-lazuli/10 px-2 py-1"
                      >
                        <Text 
                          className="text-[14px] text-black"
                          numberOfLines={1}
                          adjustsFontSizeToFit
                        >
                          {s}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
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


