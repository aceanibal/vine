import AsyncStorage from '@react-native-async-storage/async-storage';

export interface UserProfile {
  // Basic Info
  fullName?: string;
  email?: string;
  phone?: string;
  
  // Buy Transaction Info
  country?: string;
  mobileMoneyNumber?: string;
  
  // Sell Transaction Info
  bankName?: string;
  branchName?: string;
  swiftCode?: string;
  accountNumber?: string;
  
  // Metadata
  createdAt?: Date;
  updatedAt?: Date;
}

class ProfileStorage {
  private static PROFILE_KEY = 'user_profile';

  static async saveProfile(profile: Partial<UserProfile>): Promise<void> {
    try {
      const existingProfile = await this.getProfile();
      const updatedProfile = {
        ...existingProfile,
        ...profile,
        updatedAt: new Date(),
      };
      
      await AsyncStorage.setItem(this.PROFILE_KEY, JSON.stringify(updatedProfile));
    } catch (error) {
      console.error('Failed to save profile:', error);
      throw error;
    }
  }

  static async getProfile(): Promise<UserProfile | null> {
    try {
      const profileData = await AsyncStorage.getItem(this.PROFILE_KEY);
      if (!profileData) return null;
      
      const profile = JSON.parse(profileData);
      return {
        ...profile,
        createdAt: profile.createdAt ? new Date(profile.createdAt) : undefined,
        updatedAt: profile.updatedAt ? new Date(profile.updatedAt) : undefined,
      };
    } catch (error) {
      console.error('Failed to get profile:', error);
      return null;
    }
  }

  static async hasRequiredBuyInfo(): Promise<boolean> {
    const profile = await this.getProfile();
    return !!(profile?.country && profile?.mobileMoneyNumber);
  }

  static async hasRequiredSellInfo(): Promise<boolean> {
    const profile = await this.getProfile();
    return !!(
      profile?.country && 
      profile?.bankName && 
      profile?.branchName && 
      profile?.swiftCode && 
      profile?.accountNumber
    );
  }

  static async clearProfile(): Promise<void> {
    try {
      await AsyncStorage.removeItem(this.PROFILE_KEY);
    } catch (error) {
      console.error('Failed to clear profile:', error);
      throw error;
    }
  }
}

export { ProfileStorage }; 