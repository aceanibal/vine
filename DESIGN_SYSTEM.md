# Design System

This document outlines the design system and style guide for the XRB Gold mobile app.

## Quick Reference

### Complete Welcome Screen Example
See `app/index.tsx` for a complete implementation of these patterns:
- Hero title with `fontSize: 48`
- Features with `fontSize: 20` titles and `fontSize: 15` descriptions
- Primary and secondary buttons with `fontSize: 18`
- Full-height layout with `justify-between`
- Proper spacing with `gap-10`, `gap-8`, `gap-4`
- All text with `adjustsFontSizeToFit` and `numberOfLines`

## Colors

### Primary Palette
- **lapis-lazuli** (`#225D7C`) - Primary main color for backgrounds, buttons, important elements
- **lapis-lazuli/80** - Titles, secondary text, labels, headers
- **lapis-lazuli/50** - Disabled button states
- **lapis-lazuli/10** - Subtle background highlights (e.g., recovery phrase cards)

### Accent Colors
- **cambridge-blue** (`#7FAFA1`) - Success states, icons, text for highlights
- **cambridge-blue/10** - Background highlights for info/success sections
- **blue-green** (`#3499BC`) - Small highlighted text when you need extra pop of color (refresh buttons, small UI elements)
- **boston-red** (`#FC7E7E`) - Errors, destructive actions, warning states
- **boston-red/10** - Error state backgrounds, destructive button backgrounds

### Usage Guidelines
- **Backgrounds**: White for cards/modals, lapis-lazuli for SafeAreaView, cambridge-blue/10 or boston-red/10 for info boxes
- **Text Hierarchy**: lapis-lazuli/80 for titles/labels, lapis-lazuli for content, blue-green for emphasis
- **State Colors**: cambridge-blue for success, boston-red for errors/warnings

## Layout

### Container Structure

**Welcome/Index Screens** (Clean, minimal):
```tsx
<SafeAreaView className="flex-1">
  <View className="flex-1 px-8 py-10">
    <View className="flex-1 justify-between">
      {/* Content distributed vertically */}
    </View>
  </View>
</SafeAreaView>
```

**Auth/Tab Screens** (With rounded container):
```tsx
<SafeAreaView className="flex-1 bg-lapis-lazuli" edges={['top']}>
  <ScrollView className="flex-1 mt-6" contentContainerStyle={{ flexGrow: 1 }}>
    <View className="flex-1 rounded-t-3xl bg-white p-6">
      {/* Content */}
    </View>
  </ScrollView>
</SafeAreaView>
```

### Layout Rules
- **Welcome screens**: Use default background (no explicit color) for clean, minimal look
- **Auth/Tab screens**: Use `bg-lapis-lazuli` with white rounded containers
- **Main Container**: `flex-1 rounded-t-3xl bg-white p-6` for auth/tabs
- **No max-width constraints**: Use full width with proper padding
- **Rounded top**: Content containers use `rounded-t-3xl` when needed

## Typography

### Font Size Hierarchy
Use explicit `fontSize` values in the `style` prop for precise, consistent sizing:

- **Hero Title**: `fontSize: 48` - Large, bold headlines (e.g., "Aura")
- **Page Title**: `fontSize: 24` - Secondary titles (e.g., "Welcome to")
- **Section Headers**: `fontSize: 20` - Feature titles, section headers
- **Button Text**: `fontSize: 18` - Call-to-action buttons
- **Body Text**: `fontSize: 15` - Descriptions, supporting text

### Text Styling Patterns

**Hero Title:**
```tsx
<Text
  className="text-center text-lapis-lazuli font-bold"
  numberOfLines={1}
  adjustsFontSizeToFit
  style={{ fontSize: 48, minHeight: 56 }}
>
  Aura
</Text>
```

**Page Title:**
```tsx
<Text 
  className="text-center text-lapis-lazuli"
  numberOfLines={1}
  adjustsFontSizeToFit
  style={{ fontSize: 24, minHeight: 32 }}
>
  Welcome to
</Text>
```

**Section Headers:**
```tsx
<Text 
  className="text-lapis-lazuli mb-2"
  numberOfLines={1}
  adjustsFontSizeToFit
  style={{ fontSize: 20, minHeight: 26 }}
>
  Feature Title
</Text>
```

**Body Text:**
```tsx
<Text 
  className="text-blue-green"
  numberOfLines={3}
  adjustsFontSizeToFit
  style={{ fontSize: 15, lineHeight: 22, minHeight: 66 }}
>
  Description text that explains features in detail.
</Text>
```

### Critical Text Rules
**All text must prevent overflow:**
- Always add `numberOfLines` prop (1 for titles, 2-3 for descriptions)
- Always add `adjustsFontSizeToFit` to scale text dynamically
- Always use explicit `fontSize` in `style` prop for consistency
- Add `minHeight` to ensure consistent spacing
- Use `lineHeight` for multi-line text readability
- This ensures text displays correctly regardless of device size or user font settings

## Components

### Buttons
**Standard**: Use `react-native-paper` Button component

**Primary Button:**
```tsx
import { Button } from 'react-native-paper';

<Button 
  mode="contained"
  buttonColor={isDisabled ? 'rgba(34, 93, 124, 0.1)' : '#225D7C'}
  onPress={() => {
    if (isDisabled) return;
    handleAction();
  }}
  style={{ width: '100%' }}
  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
>
  <Text 
    className="font-semibold" 
    numberOfLines={1} 
    adjustsFontSizeToFit
    style={{ fontSize: 18, color: '#FFFFFF' }}
  >
    Button Text
  </Text>
</Button>
```

**Secondary Button:**
```tsx
<Button 
  mode="contained"
  buttonColor={isDisabled ? 'rgba(127, 175, 161, 0.1)' : '#7FAFA1'}
  onPress={() => {
    if (isDisabled) return;
    handleAction();
  }}
  style={{ width: '100%' }}
  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
>
  <Text 
    className="font-semibold" 
    numberOfLines={1} 
    adjustsFontSizeToFit
    style={{ fontSize: 18, color: '#FFFFFF' }}
  >
    Button Text
  </Text>
</Button>
```

**Destructive Button:**
```tsx
<Button 
  mode="contained"
  buttonColor="rgba(252, 126, 126, 0.1)"
  onPress={handleDestructiveAction}
  style={{ width: '100%' }}
  contentStyle={{ flexDirection: 'row-reverse', paddingVertical: 12 }}
>
  <Text 
    className="text-boston-red font-semibold" 
    numberOfLines={1} 
    adjustsFontSizeToFit
    style={{ fontSize: 18 }}
  >
    Delete
  </Text>
</Button>
```

**Button Guidelines:**
- Primary: `buttonColor="#225D7C"` with white text
- Secondary: `buttonColor="#7FAFA1"` with white text
- Destructive: `buttonColor="rgba(252, 126, 126, 0.1)"` with boston-red text
- Disabled: Use `lapis-lazuli/50` or `rgba(34, 93, 124, 0.5)` with white text
- Cancel: `buttonColor="rgba(34, 93, 124, 0.1)"` with lapis-lazuli text
- Always include `numberOfLines={1}` and `adjustsFontSizeToFit`
- Text fontSize: 18 for primary actions, 16 for secondary/modal buttons
- Full width: `style={{ width: '100%' }}`
- Touch target: `paddingVertical: 12` (or 8 for compact buttons)


### Input Fields
- Border: `border-border`
- Background: `bg-card`
- Rounded: `rounded-lg`
- Placeholder color: Use muted colors

### Mnemonic Components

**Import/Entry** (`MnemonicInputGrid`):
- For importing wallets
- Provides autocomplete suggestions from BIP-39 wordlist
- Validates words are in BIP-39 list
- Shows suggestions for partial matches
- Info box uses cambridge-blue/10 background with cambridge-blue icon
- Layout: Number label positioned next to input field
- Icon positioned inside input on the right
- Suggestion chips: `bg-lapis-lazuli/20` with `border-lapis-lazuli` and `text-lapis-lazuli`
- Valid word background: `rgba(34, 93, 124, 0.1)` (lapis-lazuli/10)

**Verification** (`MnemonicVerificationGrid`):
- For confirming recovery phrases during wallet creation
- Compares each word against original mnemonic
- NO autocomplete or suggestions
- Layout: Number label positioned next to input field (not on top)
- Warning box at top using standard warning style
- Visual feedback:
  - Cambridge-blue checkmark + border for correct words
  - Red X + red border for incorrect words
  - Cambridge-blue background tint (rgba(127, 175, 161, 0.1)) for correct
  - Red background tint (#FEF2F2) for incorrect
  - Icon positioned inside input on the right
- Success color: `#7FAFA1` (cambridge-blue)
- Error color: `#FC7E7E` (boston-red)

### Icons
- Use `@expo/vector-icons` MaterialIcons
- **Info box icons**: `size={48}` - Large centered icons for info/warning boxes
- **Feature icons**: `size={32}` - Large icons for feature lists
- **Navigation/header icons**: `size={24}` - Standard navigation
- **Button icons**: `size={20}` - Small icons within buttons
- **Colors**: cambridge-blue for success, boston-red for errors/warnings, lapis-lazuli for neutral

### Info/Warning Boxes
Standard pattern for displaying information, warnings, or status:

```tsx
<View className="gap-3 rounded-xl bg-cambridge-blue/10 p-6">
  <View className="items-center gap-2">
    <MaterialIcons name="check-circle" size={48} color="#7FAFA1" />
    <Text 
      className="text-lapis-lazuli"
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontSize: 20 }}
    >
      Title
    </Text>
  </View>
  <Text className="text-xs text-center text-lapis-lazuli">
    Description text
  </Text>
  {/* Optional button */}
</View>
```

**Variants:**
- Success/Info: `bg-cambridge-blue/10`, icon color `#7FAFA1`
- Error/Warning: `bg-boston-red/10`, icon color `#FC7E7E`
- Neutral: `bg-lapis-lazuli/10`, icon color `#225D7C`
- Dynamic: Change background based on state (e.g., authorized vs not authorized)

### TouchableOpacity Cards
For elegant, tappable actions:

```tsx
<TouchableOpacity 
  onPress={handleAction}
  className="rounded-xl bg-lapis-lazuli/10 p-6"
  activeOpacity={0.7}
>
  <View className="items-center gap-3">
    <MaterialIcons name="visibility" size={48} color="#225D7C" />
    <Text 
      className="text-lapis-lazuli/80 font-semibold text-center"
      numberOfLines={1}
      adjustsFontSizeToFit
      style={{ fontSize: 16 }}
    >
      Action Label
    </Text>
  </View>
</TouchableOpacity>
```

**Usage:** View recovery phrase, settings actions, card-style navigation

### Modals (CustomModal)
- Large centered icon (size 48)
- Title: `text-lapis-lazuli`, fontSize 20, centered
- Message: `text-lapis-lazuli`, fontSize 15, centered
- White background (`bg-white`)
- Buttons:
  - Confirm: Dynamic background (cambridge-blue/10 or boston-red/10) with matching text color
  - Cancel: lapis-lazuli/10 background with lapis-lazuli text
  - Both buttons use `flex-1` for equal width

## Spacing

### Container Spacing
- **Container padding**: `px-8 py-10` for welcome screens, `p-6` for content screens
- **Content margin**: `mt-6` for rounded top containers

### Vertical Spacing (Gap)
- **Between major sections**: `gap-10` - Large spacing for clear separation
- **Between features/items**: `gap-8` - Medium spacing for related items
- **Between form elements**: `gap-4` - Standard form spacing
- **Between buttons**: `gap-3` or `gap-4` - Button group spacing
- **Between title and subtitle**: `gap-2` - Tight spacing for related text
- **Below section headers**: `mb-2` - Spacing after headers

### Horizontal Spacing
- **Feature items**: `gap-5` - Icon to content spacing
- **Standard horizontal gaps**: `gap-4` - General content spacing

### Layout Patterns
**Full-height centered layout:**
```tsx
<SafeAreaView className="flex-1">
  <View className="flex-1 px-8 py-10">
    <View className="flex-1 justify-between">
      {/* Header at top */}
      <View>...</View>
      
      {/* Content in middle with py-4 */}
      <View className="gap-10 py-4">...</View>
      
      {/* Buttons at bottom */}
      <View className="gap-4">...</View>
    </View>
  </View>
</SafeAreaView>
```

## Dark Mode

- Use Tailwind's `dark:` prefix for dark mode variants
- Info/warning boxes include dark mode backgrounds
- Most text adapts automatically via color scheme

## Best Practices

### Typography
1. **Always use explicit fontSize**: Use `style={{ fontSize: XX }}` for all text
2. **Font size hierarchy**: 48 (hero) → 24 (page) → 20 (section) → 18 (button) → 15 (body)
3. **Text safety**: Always add `numberOfLines` and `adjustsFontSizeToFit`
4. **Min heights**: Include `minHeight` for consistent spacing
5. **Line height**: Use explicit `lineHeight` for multi-line text

### Layout
1. **Full-height layouts**: Use `flex-1 justify-between` for vertical distribution
2. **No scrolling**: Design screens to fit without ScrollView when possible
3. **Padding**: `px-8 py-10` for welcome screens, `p-6` for content screens
4. **Spacing scale**: `gap-10` → `gap-8` → `gap-4` → `gap-2`

### Components
1. **Buttons**: Always use react-native-paper Button with explicit fontSize
2. **Primary/Secondary**: Lapis-lazuli (#225D7C) / Cambridge-blue (#7FAFA1)
3. **Icons**: 32px for features, 24px for nav, 20px for buttons, 48px for loading
4. **Colors**: Always use explicit hex values (#225D7C) instead of theme references

### Accessibility
1. **Dynamic text**: All text must scale with `adjustsFontSizeToFit`
2. **Touch targets**: Buttons with `paddingVertical: 12` minimum
3. **Color contrast**: Ensure text is readable against backgrounds
4. **Consistent sizing**: Use the defined font size hierarchy

## Screen Patterns

### Settings Screen Example
Reference implementation: `app/(tabs)/settings.tsx`

**Section Structure:**
- Section titles: `text-lapis-lazuli/80`, fontSize 20-24, font-bold
- Content organized in info boxes with centered icons
- Dynamic backgrounds based on state

**Key Patterns:**
1. **Wallet Section**: 
   - Label: `text-lapis-lazuli/80`
   - Address: `text-lapis-lazuli font-bold font-mono`
   - Recovery phrase action: TouchableOpacity card with `bg-lapis-lazuli/10`

2. **Authorization Section**:
   - Refresh button: `text-blue-green` for extra pop
   - Status box with dynamic background: `cambridge-blue/10` (success) or `boston-red/10` (error)
   - Details in two-column layout: labels `text-lapis-lazuli/80`, values `text-lapis-lazuli`
   - Action button contained within info box

3. **Delete Wallet Section**:
   - Warning box with `bg-cambridge-blue/10`
   - Boston-red icon for destructive action
   - Description: `text-lapis-lazuli`
   - Destructive button with boston-red/10 background

