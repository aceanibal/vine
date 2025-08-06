# Authentication System Documentation

## Overview

The authentication system for Vine Wallet implements a secure, user-friendly flow that combines traditional account authentication with crypto wallet management. Users must create an account before managing their wallet keys, ensuring proper address registration and verification.

## Current Implementation

### Existing Screens

#### `_layout.tsx`
- **Purpose**: Layout wrapper for all authentication screens
- **Features**: 
  - Stack navigation with hidden headers
  - Routes: `create-wallet`, `import-wallet`
- **Status**: ✅ Implemented

#### `create-wallet.tsx`
- **Purpose**: Create a new crypto wallet with recovery phrase
- **Features**:
  - Generates random 12-word mnemonic using ethers.js
  - Displays recovery phrase in numbered format
  - Requires user confirmation before wallet creation
  - Saves wallet to secure storage via `WalletStorage`
  - Validates user has written down recovery phrase
- **UI Components**:
  - Warning section about recovery phrase importance
  - Mnemonic display with numbered words
  - Confirmation checkbox
  - Create wallet button
- **Status**: ✅ Implemented

#### `import-wallet.tsx`
- **Purpose**: Import existing wallet using recovery phrase
- **Features**:
  - Text input for 12-word recovery phrase
  - Real-time mnemonic validation
  - Word count indicator
  - Secure wallet import to storage
  - Error handling for invalid phrases
- **UI Components**:
  - Text input with validation
  - Word count display
  - Import button with loading state
  - Back navigation
- **Status**: ✅ Implemented

## Planned Authentication Flow

### New Screens to Implement

#### `login.tsx`
- **Purpose**: User login with multiple credential options
- **Fields**:
  - Username/Email/Phone input
  - Password input
  - "Forgot Password" link
  - "Sign Up" link
- **Features**:
  - Support for username, email, or phone login
  - Password validation
  - Error handling
  - Navigation to signup/forgot-password

#### `signup.tsx`
- **Purpose**: Create new user account with wallet setup
- **Fields**:
  - Username (Vine username, 3-20 chars, alphanumeric + underscore)
  - Email (required, unique)
  - Phone Number (required, unique)
  - Password (min 8 chars, uppercase, lowercase, number)
  - Confirm Password
  - Terms & Conditions checkbox
- **Features**:
  - Real-time field validation
  - Username availability check
  - Email/phone format validation
  - Password strength indicator
  - Automatic wallet creation after signup

#### `forgot-password.tsx`
- **Purpose**: Password recovery with multiple options
- **Features**:
  - Choose recovery method (email, phone, or wallet signature)
  - Email recovery: Send reset link
  - Phone recovery: Send SMS code
  - Wallet signature recovery: Sign message with private key
  - Verification process

#### `reset-password.tsx`
- **Purpose**: Reset password using recovery token or signature
- **Fields**:
  - New password
  - Confirm new password
  - Token validation (for email/phone recovery)
  - Signature verification (for wallet recovery)
- **Features**:
  - Password strength validation
  - Token expiration handling
  - Cryptographic signature verification

#### `wallet-setup.tsx`
- **Purpose**: Check wallet status after login
- **Logic**:
  - Check if user has registered addresses
  - Verify stored keys match registered addresses
  - Handle multiple key scenarios
  - Navigate to appropriate wallet action

#### `key-selection.tsx`
- **Purpose**: Choose from multiple wallet keys
- **Features**:
  - Display all stored keys
  - Show associated addresses
  - Key selection interface
  - Add new key option

#### `signature-recovery.tsx`
- **Purpose**: Recover account using wallet signature
- **Features**:
  - Import wallet using recovery phrase
  - Sign recovery message with private key
  - Verify signature matches registered address
  - Reset password after verification

### Data Models

#### User Account
```typescript
interface UserAccount {
  id: string;
  username: string;        // Vine username (unique)
  email: string;
  phoneNumber: string;
  passwordHash: string;
  createdAt: Date;
  isEmailVerified: boolean;
  isPhoneVerified: boolean;
}
```

#### Registered Addresses
```typescript
interface RegisteredAddress {
  userId: string;
  address: string;
  registeredAt: Date;
  isActive: boolean;
}
```

#### Stored Wallet Keys
```typescript
interface StoredWalletKey {
  id: string;
  address: string;
  encryptedPrivateKey: string;
  mnemonic?: string;
  createdAt: Date;
}
```

#### Recovery Tokens
```typescript
interface RecoveryToken {
  userId: string;
  token: string;
  type: 'email' | 'sms' | 'signature';
  expiresAt: Date;
  used: boolean;
  walletAddress?: string; // For signature-based recovery
}
```

#### Security Levels & MFA
```typescript
interface SecurityLevel {
  level: 1 | 2 | 3 | 4;
  name: string;
  requirements: string[];
  sessionDuration: number; // hours
  mfaRequired: MFAType[];
}

interface MFAType {
  type: 'email' | 'sms' | 'wallet_signature' | 'biometric' | 'hardware_wallet';
  securityLevel: number;
  expiration: number; // minutes
  retryLimit: number;
}

interface TransactionTier {
  tier: 1 | 2 | 3 | 4;
  name: string;
  amountRange: { min: number; max: number };
  securityLevel: number;
  mfaRequired: MFAType[];
  rateLimit: { transactions: number; period: number }; // per hour
  coolingPeriod: number; // minutes
}

interface UserSecurityProfile {
  userId: string;
  currentSecurityLevel: number;
  mfaEnabled: MFAType[];
  lastMfaVerification: Record<string, Date>;
  sessionExpiry: Date;
  failedAttempts: number;
  lockedUntil?: Date;
}
```

## Authentication Flow Logic

### 1. New User Journey
```
Welcome Screen → Signup → Create Wallet → Register Address → Dashboard
```

### 2. Existing User Journey
```
Welcome Screen → Login → Check Wallet Status → Wallet Management → Dashboard
```

### 3. Account Recovery Journey
```
Forgot Password → Choose Recovery Method → Verify → Reset Password → Login
```

### 4. Signature-Based Recovery Process
```
Forgot Password → Choose "Recover with Wallet" → Import Wallet → Sign Message → Verify Signature → Reset Password → Login
```

**Signature Recovery Steps:**
1. User selects "Recover with Wallet" option
2. User enters recovery phrase to import wallet
3. System generates unique recovery message: `"Vine Wallet Recovery: {timestamp}:{userId}"`
4. User signs message with private key
5. System verifies signature matches registered address
6. If verified, user can reset password
7. User sets new password and logs in

### 5. Wallet Status Check Logic
```typescript
async function checkWalletStatus(userId: string) {
  // 1. Get user's registered addresses
  const registeredAddresses = await getUserAddresses(userId);
  
  // 2. Get all stored wallet keys
  const storedKeys = await WalletStorage.getAllKeys();
  
  // 3. Find matching addresses
  const matchingKeys = storedKeys.filter(key => 
    registeredAddresses.some(addr => addr.address === key.address)
  );
  
  if (matchingKeys.length > 0) {
    // User has matching keys - proceed to dashboard
    return { status: 'has_matching_keys', keys: matchingKeys };
  } else if (registeredAddresses.length > 0) {
    // User has registered addresses but no matching keys
    return { status: 'needs_key_import', addresses: registeredAddresses };
  } else {
    // User has no registered addresses
    return { status: 'needs_wallet_creation' };
  }
}

### 6. Signature Verification Logic
```typescript
async function verifyWalletSignature(
  walletAddress: string,
  signature: string,
  message: string,
  userId: string
) {
  try {
    // 1. Check if address is registered to this user
    const registeredAddresses = await getUserAddresses(userId);
    const isAddressRegistered = registeredAddresses.some(
      addr => addr.address.toLowerCase() === walletAddress.toLowerCase()
    );
    
    if (!isAddressRegistered) {
      return { valid: false, error: 'Address not registered to this account' };
    }
    
    // 2. Recover signer address from signature
    const recoveredAddress = ethers.verifyMessage(message, signature);
    
    // 3. Verify recovered address matches wallet address
    if (recoveredAddress.toLowerCase() !== walletAddress.toLowerCase()) {
      return { valid: false, error: 'Invalid signature' };
    }
    
    // 4. Verify message format and timestamp
    const messageParts = message.split(':');
    if (messageParts.length !== 3 || !messageParts[0].includes('Vine Wallet Recovery')) {
      return { valid: false, error: 'Invalid recovery message format' };
    }
    
    const timestamp = parseInt(messageParts[1]);
    const messageUserId = messageParts[2];
    
    // Check if message is not too old (24 hours)
    if (Date.now() - timestamp > 24 * 60 * 60 * 1000) {
      return { valid: false, error: 'Recovery message expired' };
    }
    
    // Check if message is for correct user
    if (messageUserId !== userId) {
      return { valid: false, error: 'Invalid recovery message' };
    }
    
    return { valid: true };
  } catch (error) {
    return { valid: false, error: 'Signature verification failed' };
  }
}

### 7. Security Validation Logic
```typescript
async function validateTransactionSecurity(
  userId: string,
  transactionAmount: number,
  transactionType: string
): Promise<SecurityValidationResult> {
  // 1. Determine transaction tier based on amount
  const tier = getTransactionTier(transactionAmount);
  
  // 2. Check user's current security level
  const userProfile = await getUserSecurityProfile(userId);
  const requiredLevel = tier.securityLevel;
  
  if (userProfile.currentSecurityLevel < requiredLevel) {
    return {
      allowed: false,
      reason: 'Insufficient security level',
      requiredLevel,
      currentLevel: userProfile.currentSecurityLevel
    };
  }
  
  // 3. Check rate limits
  const recentTransactions = await getRecentTransactions(userId, tier.rateLimit.period);
  if (recentTransactions.length >= tier.rateLimit.transactions) {
    return {
      allowed: false,
      reason: 'Rate limit exceeded',
      retryAfter: getNextAllowedTime(recentTransactions, tier.coolingPeriod)
    };
  }
  
  // 4. Check cooling period
  const lastTransaction = recentTransactions[0];
  if (lastTransaction && isWithinCoolingPeriod(lastTransaction, tier.coolingPeriod)) {
    return {
      allowed: false,
      reason: 'Cooling period active',
      retryAfter: getCoolingPeriodEnd(lastTransaction, tier.coolingPeriod)
    };
  }
  
  // 5. Return required MFA types
  return {
    allowed: true,
    requiredMFA: tier.mfaRequired,
    securityLevel: requiredLevel
  };
}

async function verifyMFA(
  userId: string,
  mfaType: MFAType,
  verificationData: any
): Promise<MFAVerificationResult> {
  const userProfile = await getUserSecurityProfile(userId);
  
  // Check if MFA is enabled for user
  if (!userProfile.mfaEnabled.some(mfa => mfa.type === mfaType.type)) {
    return { verified: false, reason: 'MFA not enabled' };
  }
  
  // Check retry limits
  const recentAttempts = await getRecentMFAAttempts(userId, mfaType.type);
  if (recentAttempts.length >= mfaType.retryLimit) {
    return { verified: false, reason: 'Too many attempts' };
  }
  
  // Verify based on MFA type
  switch (mfaType.type) {
    case 'email':
      return await verifyEmailCode(userId, verificationData.code);
    case 'sms':
      return await verifySMSCode(userId, verificationData.code);
    case 'wallet_signature':
      return await verifyWalletSignature(userId, verificationData.signature, verificationData.message);
    case 'biometric':
      return await verifyBiometric(userId, verificationData.biometricData);
    case 'hardware_wallet':
      return await verifyHardwareWallet(userId, verificationData.signature, verificationData.address);
    default:
      return { verified: false, reason: 'Unknown MFA type' };
  }
}
```

## Security Configuration

### Security Level Definitions
```typescript
const SECURITY_LEVELS: SecurityLevel[] = [
  {
    level: 1,
    name: 'Basic Authentication',
    requirements: ['username_email_password', 'biometric_verification'],
    sessionDuration: 24,
    mfaRequired: [{ type: 'biometric', securityLevel: 1, expiration: 5, retryLimit: 3 }]
  },
  {
    level: 2,
    name: 'Standard Security',
    requirements: ['level_1', 'email_phone_verification'],
    sessionDuration: 12,
    mfaRequired: [
      { type: 'biometric', securityLevel: 1, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ]
  },
  {
    level: 3,
    name: 'Enhanced Security',
    requirements: ['level_2', 'wallet_signature'],
    sessionDuration: 6,
    mfaRequired: [
      { type: 'biometric', securityLevel: 1, expiration: 5, retryLimit: 3 },
      { type: 'wallet_signature', securityLevel: 3, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ]
  },
  {
    level: 4,
    name: 'Maximum Security',
    requirements: ['level_3', 'hardware_wallet'],
    sessionDuration: 2,
    mfaRequired: [
      { type: 'biometric', securityLevel: 1, expiration: 5, retryLimit: 3 },
      { type: 'hardware_wallet', securityLevel: 4, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ]
  }
];

const TRANSACTION_TIERS: TransactionTier[] = [
  {
    tier: 1,
    name: 'Low-Risk',
    amountRange: { min: 0, max: 100 },
    securityLevel: 2,
    mfaRequired: [{ type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }],
    rateLimit: { transactions: 10, period: 3600 },
    coolingPeriod: 0
  },
  {
    tier: 2,
    name: 'Medium-Risk',
    amountRange: { min: 100, max: 1000 },
    securityLevel: 3,
    mfaRequired: [
      { type: 'wallet_signature', securityLevel: 3, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ],
    rateLimit: { transactions: 5, period: 3600 },
    coolingPeriod: 300 // 5 minutes
  },
  {
    tier: 3,
    name: 'High-Risk',
    amountRange: { min: 1000, max: 10000 },
    securityLevel: 4,
    mfaRequired: [
      { type: 'hardware_wallet', securityLevel: 4, expiration: 5, retryLimit: 3 },
      { type: 'biometric', securityLevel: 4, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ],
    rateLimit: { transactions: 2, period: 3600 },
    coolingPeriod: 900 // 15 minutes
  },
  {
    tier: 4,
    name: 'Critical',
    amountRange: { min: 10000, max: Infinity },
    securityLevel: 4,
    mfaRequired: [
      { type: 'hardware_wallet', securityLevel: 4, expiration: 5, retryLimit: 3 },
      { type: 'biometric', securityLevel: 4, expiration: 5, retryLimit: 3 },
      { type: 'email', securityLevel: 2, expiration: 10, retryLimit: 3 }
    ],
    rateLimit: { transactions: 1, period: 86400 }, // 24 hours
    coolingPeriod: 3600 // 1 hour
  }
];
```

## Validation Rules

### Username
- **Length**: 3-20 characters
- **Characters**: Letters (a-z, A-Z), numbers (0-9), underscores (_)
- **No spaces**: Cannot contain spaces
- **Unique**: Must be unique across all users
- **Not reserved**: Cannot use reserved words

### Email
- **Format**: Valid email format
- **Unique**: Must be unique across all users
- **Required**: Cannot be empty

### Phone Number
- **Format**: International format (+1234567890)
- **Unique**: Must be unique across all users
- **Required**: Cannot be empty

### Password
- **Length**: Minimum 8 characters
- **Complexity**: At least one uppercase, lowercase, and number
- **No common**: Cannot be common passwords

## Security Model & Transaction Tiers

### Security Levels

#### Level 1: Basic Authentication
- **Requirements**: Username/Email + Password + Biometric verification
- **Use Cases**: Login, view wallet, check balances
- **Session Duration**: 24 hours
- **MFA**: Biometric verification (fingerprint/face ID)

#### Level 2: Standard Security
- **Requirements**: Level 1 + Email/Phone verification
- **Use Cases**: Send transactions up to $100, view wallet, check balances
- **Session Duration**: 12 hours
- **MFA**: Biometric + Email or SMS verification

#### Level 3: Enhanced Security
- **Requirements**: Level 2 + Wallet signature verification
- **Use Cases**: Send transactions $100-$1000, add new addresses, change account settings
- **Session Duration**: 6 hours
- **MFA**: Biometric + Wallet signature + Email/SMS

#### Level 4: Maximum Security
- **Requirements**: Level 3 + Hardware wallet
- **Use Cases**: Send transactions $1000+, change recovery settings
- **Session Duration**: 2 hours
- **MFA**: Biometric + Hardware wallet signature + Email/SMS

### Transaction Tiers

#### Tier 1: Low-Risk Transactions (≤ $100)
- **Examples**: Small transfers, gas fees, test transactions
- **Security Level**: Level 2
- **MFA Required**: Biometric + Email or SMS verification
- **Rate Limits**: 10 transactions per hour
- **Cooling Period**: None
- **Address Registration**: Not allowed

#### Tier 2: Medium-Risk Transactions ($100 - $1,000)
- **Examples**: Regular transfers, token swaps, NFT purchases
- **Security Level**: Level 3
- **MFA Required**: Biometric + Wallet signature + Email/SMS
- **Rate Limits**: 5 transactions per hour
- **Cooling Period**: 5 minutes between transactions
- **Address Registration**: Allowed (requires wallet signature verification)

#### Tier 3: High-Risk Transactions ($1,000 - $10,000)
- **Examples**: Large transfers, DeFi operations, staking
- **Security Level**: Level 4
- **MFA Required**: Biometric + Hardware wallet + Email/SMS
- **Rate Limits**: 2 transactions per hour
- **Cooling Period**: 15 minutes between transactions
- **Address Registration**: Allowed (requires enhanced verification)

#### Tier 4: Critical Transactions (> $10,000)
- **Examples**: Very large transfers, account recovery changes
- **Security Level**: Level 4 + Manual review
- **MFA Required**: Biometric + Hardware wallet + Email/SMS + Manual approval
- **Rate Limits**: 1 transaction per 24 hours
- **Cooling Period**: 1 hour between transactions
- **Address Registration**: Allowed (requires maximum verification)

### MFA Options & Requirements

#### Email Verification
- **Security Level**: Level 2
- **Use Cases**: Standard transactions, address registration
- **Implementation**: Send verification code to registered email
- **Expiration**: 10 minutes
- **Retry Limit**: 3 attempts

#### SMS Verification
- **Security Level**: Level 2
- **Use Cases**: Standard transactions, address registration
- **Implementation**: Send verification code to registered phone
- **Expiration**: 10 minutes
- **Retry Limit**: 3 attempts

#### Wallet Signature Verification
- **Security Level**: Level 3
- **Use Cases**: Medium-risk transactions, account settings
- **Implementation**: Sign unique transaction message with private key
- **Message Format**: `"Vine Transaction: {transactionId}:{amount}:{timestamp}"`
- **Expiration**: 5 minutes

#### Biometric Authentication
- **Security Level**: Level 1 (Base requirement for all levels)
- **Use Cases**: Login, all transactions, security verification
- **Implementation**: Fingerprint or Face ID verification using device's biometric API
- **Storage**: Biometric verification handled locally on device, no backend token storage
- **Fallback**: PIN code if biometric fails
- **Retry Limit**: 3 attempts
- **Platform**: Uses React Native's LocalAuthentication or Expo's LocalAuthentication

#### Hardware Wallet Integration
- **Security Level**: Level 4
- **Use Cases**: Critical transactions, maximum security
- **Implementation**: Connect hardware wallet (Ledger, Trezor)
- **Signature**: Hardware wallet signs transaction
- **Verification**: Verify signature matches hardware wallet address

### Security Features

#### Password Security
- Bcrypt hashing for password storage
- Salt rounds: 12
- Password strength validation
- Minimum 8 characters, uppercase, lowercase, number

#### Token Security
- JWT tokens for session management
- Secure random token generation
- Token expiration based on security level
- Rate limiting for login attempts

#### Wallet Security
- Encrypted private key storage
- Secure mnemonic handling
- Address verification through signing
- Signature-based account recovery
- Hardware wallet support

#### Session Management
- Automatic session expiration based on activity
- Force re-authentication for high-risk actions
- Concurrent session limits
- Device fingerprinting for suspicious activity detection

### Biometric Authentication Implementation

#### How It Works
Biometric authentication is handled **entirely on the device level** - no backend tokens are stored or transmitted.

#### Implementation Flow
```typescript
// 1. Check if biometric is available
const isBiometricAvailable = await LocalAuthentication.hasHardwareAsync() && 
                           await LocalAuthentication.isEnrolledAsync();

// 2. Request biometric authentication
const result = await LocalAuthentication.authenticateAsync({
  promptMessage: 'Verify your identity',
  fallbackLabel: 'Use PIN',
  cancelLabel: 'Cancel'
});

// 3. Handle result
if (result.success) {
  // Biometric verification successful
  // Proceed with transaction/action
  // No token sent to backend - verification is local
} else {
  // Biometric failed or cancelled
  // Show fallback options
}
```

#### Security Considerations
- **Local Only**: Biometric verification happens on device, not server
- **No Backend Token**: No biometric data or tokens stored on backend
- **Device Security**: Relies on device's built-in biometric security
- **Fallback**: PIN code available if biometric fails
- **Session**: Biometric verification grants temporary session access

#### Backend Integration
- **No Biometric Data**: Backend never receives biometric information
- **Verification Result**: Only receives boolean success/failure
- **Session Token**: Standard JWT session token after successful biometric verification
- **Audit Trail**: Logs biometric verification attempts (success/failure only)

#### Platform Support
- **iOS**: Touch ID, Face ID
- **Android**: Fingerprint, Face Recognition
- **Fallback**: PIN code on all platforms

## Error Handling

### Common Error Scenarios
1. **Invalid credentials**: Show specific error messages
2. **Network errors**: Retry mechanism with user feedback
3. **Validation errors**: Real-time field validation
4. **Wallet errors**: Clear error messages for wallet operations

### User Feedback
- No alerts - use smooth navigation and clear messaging
- Progress indicators for multi-step processes
- Clear explanations of what's happening
- Seamless transitions between states

## File Structure

```
app/(auth)/
├── README.md              # This documentation
├── _layout.tsx            # Auth layout wrapper
├── login.tsx              # User login (to implement)
├── signup.tsx             # User signup (to implement)
├── forgot-password.tsx    # Password recovery (to implement)
├── reset-password.tsx     # Password reset (to implement)
├── signature-recovery.tsx # Wallet signature recovery (to implement)
├── wallet-setup.tsx       # Post-login wallet check (to implement)
├── key-selection.tsx      # Multiple key management (to implement)
├── create-wallet.tsx      # Create new wallet ✅
└── import-wallet.tsx      # Import existing wallet ✅
```

## Integration Points

### With Main App
- Update `app/index.tsx` to redirect to auth first
- Modify `app/_layout.tsx` to handle auth state
- Update `app/(tabs)/` to require authentication

### With Wallet Storage
- Extend `lib/walletStorage.ts` for multiple key support
- Add address registration functionality
- Implement key-address matching logic

### With Backend (Future)
- User account management API
- Address registration API
- Password reset API
- Email/SMS verification API

## Testing Strategy

### Unit Tests
- Form validation logic
- Password strength validation
- Username validation
- Wallet key matching logic

### Integration Tests
- Complete signup flow
- Complete login flow
- Password reset flow
- Wallet creation/import flow

### User Acceptance Tests
- New user onboarding
- Existing user login
- Multiple wallet key scenarios
- Error handling scenarios

## Future Enhancements

### Phase 2 Features
- Email verification flow
- Phone verification flow
- Two-factor authentication
- Social login options
- Profile management
- Account deletion

### Phase 3 Features
- Multi-device sync
- Advanced security features
- Biometric authentication
- Hardware wallet integration

## Notes

- All authentication flows should be intuitive and user-friendly
- No alerts should be used - prefer smooth navigation and clear messaging
- Wallet operations should be secure and follow best practices
- The system should handle multiple wallet keys per user
- Address registration should be verified through cryptographic proof 