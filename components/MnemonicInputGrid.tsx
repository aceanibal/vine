import "react-native-get-random-values";
import "@ethersproject/shims";

import { ethers } from 'ethers';
import { useMemo, useRef } from 'react';
import { View, TextInput, TouchableOpacity } from 'react-native';

import { Text } from '~/components/nativewindui/Text';
import { useColorScheme } from '~/lib/useColorScheme';
import { MaterialIcons } from '@expo/vector-icons';

type MnemonicInputGridProps = {
  words: string[];
  onChangeWords: (nextWords: string[]) => void;
  onValidityChange?: (isValid: boolean, phrase: string) => void;
};

export function MnemonicInputGrid({ words, onChangeWords, onValidityChange }: MnemonicInputGridProps) {
  const { colors } = useColorScheme();

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
      <Text className="text-center">Recovery Phrase</Text>
      <View className="-mx-1 flex-row flex-wrap">
        {Array.from({ length: 12 }).map((_, i) => {
          const value = words[i] || '';
          const valid = value.length > 0 && isValidWord(value);
          const suggestions = value && !valid ? getSuggestions(value) : [];
          return (
            <View key={i} className="w-1/2 px-1 py-1">
              <View className="gap-1">
                <View className="flex-row items-center justify-between">
                  <Text className="text-xs text-muted-foreground">{i + 1}</Text>
                  {value.length > 0 && (
                    <MaterialIcons
                      name={valid ? 'check-circle' : 'error'}
                      size={14}
                      color={valid ? colors.primary : colors.destructive}
                    />
                  )}
                </View>
                <TextInput
                  ref={(el) => {
                    inputRefs.current[i] = el;
                  }}
                  className="h-10 rounded-lg border border-border bg-card px-3 text-body"
                  placeholder={`Word ${i + 1}`}
                  placeholderTextColor={colors.grey2}
                  value={value}
                  onChangeText={(t) => handleWordChange(i, t)}
                  autoCapitalize="none"
                  autoCorrect={false}
                  onSubmitEditing={() => handleWordSubmitEditing(i)}
                  returnKeyType={i === 11 ? 'done' : 'next'}
                />
                {suggestions.length > 0 && (
                  <View className="flex-row flex-wrap gap-1">
                    {suggestions.map((s) => (
                      <TouchableOpacity
                        key={s}
                        onPress={() => handleSelectSuggestion(i, s)}
                        className="rounded-full border border-border bg-muted px-2 py-1"
                      >
                        <Text className="text-[10px]">{s}</Text>
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
        <Text className="text-xs text-muted-foreground">{wordCount}/12 words</Text>
      </View>
      <Text className="text-xs text-center text-muted-foreground">
        Type each word. Suggestions are from the BIP-39 list; words are case-insensitive.
      </Text>
    </View>
  );
}


