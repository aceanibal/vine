import { View } from 'react-native';

import { Text } from '~/components/nativewindui/Text';

export default function EditScreenInfo({ path }: { path: string }) {
  const title = 'Open up the code for this screen:';
  const description =
    'Change any of the text, save the file, and your app will automatically update.';

  return (
    <View className="items-center mx-12">
      <Text className="text-center">
        {title}
      </Text>
      <View className="rounded px-1 my-2">
        <Text>{path}</Text>
      </View>
      <Text className="text-center">
        {description}
      </Text>
    </View>
  );
}
