import { View } from 'react-native';

import { EditScreenInfo } from './EditScreenInfo';

type ScreenContentProps = {
  title: string;
  path: string;
  children?: React.ReactNode;
};

export const ScreenContent = ({ title, path, children }: ScreenContentProps) => {
  return (
    <View className="flex-1 items-center justify-center">
      <EditScreenInfo path={path} />
      <View className="my-8 h-px w-4/5 bg-gray-300" />
      {children}
    </View>
  );
};
