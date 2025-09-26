import * as SecureStore from 'expo-secure-store';

// Use only allowed characters: alphanumeric, '.', '-', '_'
const sanitizeAddress = (address: string) => address.replace(/[^a-zA-Z0-9]/g, '_');
// New preferred keys (strict, underscore-only separators)
const PRIVATE_KEY_KEY = (address: string) => `wallet_privateKey_${sanitizeAddress(address)}`;
const MNEMONIC_KEY = (address: string) => `wallet_mnemonic_${sanitizeAddress(address)}`;
// Previous allowed-dot format (for read-migration only)
const DOT_PRIVATE_KEY_KEY = (address: string) => `wallet.privateKey.${sanitizeAddress(address)}`;
const DOT_MNEMONIC_KEY = (address: string) => `wallet.mnemonic.${sanitizeAddress(address)}`;


export async function saveWalletSecrets(params: { address: string; privateKey: string; mnemonic?: string; }): Promise<void> {
  const { address, privateKey, mnemonic } = params;
  if (!address) throw new Error('saveWalletSecrets: address is required');
  const pkKey = PRIVATE_KEY_KEY(address);
  const mnKey = MNEMONIC_KEY(address);
  const available = await SecureStore.isAvailableAsync();
  if (available) {
    await SecureStore.setItemAsync(pkKey, privateKey, {
      keychainService: 'wallet-private-keys',
    });
    if (mnemonic) {
      await SecureStore.setItemAsync(mnKey, mnemonic, {
        keychainService: 'wallet-mnemonics',
      });
    }
  } else {
    throw new Error('SecureStore is not available on this platform');
  }
}

export async function loadWalletSecrets(address: string): Promise<{ privateKey: string | null; mnemonic: string | null; }> {
  if (!address) throw new Error('loadWalletSecrets: address is required');
  const pkKey = PRIVATE_KEY_KEY(address);
  const mnKey = MNEMONIC_KEY(address);
  const dotPkKey = DOT_PRIVATE_KEY_KEY(address);
  const dotMnKey = DOT_MNEMONIC_KEY(address);
  const available = await SecureStore.isAvailableAsync();
  let pk: string | null = null;
  let mn: string | null = null;
  if (available) {
    [pk, mn] = await Promise.all([
      SecureStore.getItemAsync(pkKey, { keychainService: 'wallet-private-keys' }),
      SecureStore.getItemAsync(mnKey, { keychainService: 'wallet-mnemonics' }),
    ]);
  }
  // Migrate from dot-format if found
  if (!pk) {
    const dotPk = await SecureStore.getItemAsync(dotPkKey);
    if (dotPk) {
      await SecureStore.setItemAsync(pkKey, dotPk, { keychainService: 'wallet-private-keys' });
      await SecureStore.deleteItemAsync(dotPkKey);
      pk = dotPk;
    }
  }
  if (!mn) {
    const dotMn = await SecureStore.getItemAsync(dotMnKey);
    if (dotMn) {
      await SecureStore.setItemAsync(mnKey, dotMn, { keychainService: 'wallet-mnemonics' });
      await SecureStore.deleteItemAsync(dotMnKey);
      mn = dotMn;
    }
  }
  return { privateKey: pk ?? null, mnemonic: mn ?? null };
}

export async function removeWalletSecrets(address: string): Promise<void> {
  await Promise.all([
    SecureStore.deleteItemAsync(PRIVATE_KEY_KEY(address)),
    SecureStore.deleteItemAsync(MNEMONIC_KEY(address)),
    SecureStore.deleteItemAsync(DOT_PRIVATE_KEY_KEY(address)),
    SecureStore.deleteItemAsync(DOT_MNEMONIC_KEY(address)),
  ]);
}

export async function requirePrivateKey(address: string): Promise<string> {
  // Retry a few times to tolerate immediate read-after-write
  let attempts = 0;
  while (attempts < 3) {
    const { privateKey: key } = await loadWalletSecrets(address);
    if (key) return key;
    await new Promise((r) => setTimeout(r, 100));
    attempts++;
  }
  throw new Error('Private key not found in SecureStore');
}


