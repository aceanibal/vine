# Refactor Global Store and Add Dynamic Configuration (No Hydration)

## Problem Analysis

The global store currently has:

1. **Unused state**: `activeChains` and `isActiveChainsLoaded` (lines 311-313) are declared but never used
2. **Hardcoded configurations** that should be API-driven:

   - `defaultChainIdNumeric: 137`
   - `predefinedToken` object with token address, symbol, name, decimals, price, logo
   - `orchestratorConfig` with delegation address, provider URL, relayer endpoint, retry settings

3. **Hydration logic conflicts with dynamic config**: The `onRehydrateStorage` hook hardcodes token configuration, which prevents true dynamic configuration
4. **Only `backendURL` should remain hardcoded** as it's needed to fetch the config

## Implementation Plan

### 1. Clean Up Unused Code

Remove from `lib/stores/useGlobalStore.ts`:

- Lines 311-313: `activeChains` and `isActiveChainsLoaded` state declarations

### 2. Add Configuration State and Actions

In `lib/stores/useGlobalStore.ts`, add to the `GlobalState` interface:

```typescript
// Configuration loading state
isConfigLoaded: boolean;
configLastFetched: Date | null;
```

Add actions to the interface:

```typescript
fetchAppConfig: () => Promise<void>;
updateAppConfig: (config: any) => void;
```

### 3. Create Configuration Service

Create new file `lib/services/app-config.ts`:

- Function `fetchConfigFromBackend(backendURL: string)` that calls `GET {backendURL}/info`
- Expected API response format:
```typescript
{
  defaultChainIdNumeric: number;
  predefinedToken: {
    address: string;
    symbol: string;
    name: string;
    decimals: number;
    price: number;
    logo?: string;
  };
  orchestratorConfig: {
    delegationAddress: string;
    providerUrl: string;
    relayerEndpoint: string;
    maxRetries: number;
    retryDelayMs: number;
    supportedChains: number[];
  };
}
```

- Handle errors gracefully, return null on failure

### 4. Update Store Initialization

In `lib/stores/useGlobalStore.ts`:

- Keep hardcoded **default values** for all configs (current values as fallbacks)
- Add `isConfigLoaded: false` and `configLastFetched: null` to initial state
- Implement `fetchAppConfig` action that:
  - Calls the config service
  - Updates `predefinedToken`, `orchestratorConfig`, `defaultChainIdNumeric` if successful
  - Updates `isConfigLoaded: true` and `configLastFetched: new Date()`
  - Handles errors silently (use defaults on failure)
- Implement `updateAppConfig` action to directly update config values

### 5. Update Persistence

In `lib/stores/useGlobalStore.ts` `partialize`:

- Add `isConfigLoaded` and `configLastFetched` to persisted state
- Keep persisting `predefinedToken`, `orchestratorConfig`, `defaultChainIdNumeric`

### 6. Remove Hydration Logic and Add Config Loading

**Remove the entire `onRehydrateStorage` hook** and replace with:

- Simple config loading on app start that calls `fetchAppConfig()`
- No hardcoded token configuration in hydration
- Let the API determine the configuration dynamically

### 7. Keep Migration Logic (Minimal)

Keep the existing migration logic in `migrate` function for backward compatibility, but simplify it to only handle essential data structure changes, not hardcoded token values.

### 8. Add App-Level Config Loading

Add config loading to the main app entry point (`app/_layout.tsx` or similar) to ensure config is fetched on every app start.

## Files to Modify

- `lib/stores/useGlobalStore.ts` - Main refactoring
- `lib/services/app-config.ts` - New file for config service
- `app/_layout.tsx` - Add config loading on app start

## Validation

After implementation:

- App should work offline with cached config
- App should fetch fresh config on every launch (no hydration conflicts)
- App should fall back to defaults if API call fails
- No hardcoded token configuration in hydration
- Configuration is truly dynamic and API-driven

### To-dos

- [ ] Remove unused activeChains and isActiveChainsLoaded state from global store
- [ ] Create app-config.ts service with fetchConfigFromBackend function
- [ ] Add isConfigLoaded and configLastFetched state fields to GlobalState interface
- [ ] Implement fetchAppConfig and updateAppConfig actions in the store
- [ ] Update partialize to persist config state and configLastFetched
- [ ] Remove onRehydrateStorage hook entirely
- [ ] Add config loading to app entry point
- [ ] Simplify migration logic to remove hardcoded token values
- [ ] Verify config loads from API on every app start and falls back to defaults on error
