import { View } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import { useColorScheme } from '~/lib/useColorScheme';

interface PriceDataPoint {
  timestamp: number;
  price: number;
}

interface PriceChartProps {
  data: PriceDataPoint[];
  height?: number;
}

export function PriceChart({ data, height = 100 }: PriceChartProps) {
  const { colors } = useColorScheme();
  const { state, isActive } = useChartPressState({ x: 0, y: { price: 0 } });

  // Ensure data is in the correct format
  const chartData = data.map((point) => ({
    timestamp: point.timestamp,
    price: point.price,
  }));

  // Calculate min/max prices and add 10% padding
  const prices = chartData.map(d => d.price);
  const minPrice = Math.min(...prices);
  const maxPrice = Math.max(...prices);
  const priceRange = maxPrice - minPrice;
  const padding = priceRange * 0.1;
  const yMin = minPrice - padding;
  const yMax = maxPrice + padding;

  return (
    <View style={{ 
      height, 
      width: '100%', 
      borderRadius: 12,
      overflow: 'hidden'
    }} 
    className="rounded-xl bg-blue-green/2">
      <CartesianChart
        data={chartData}
        xKey="timestamp"
        yKeys={["price"]}
        domain={{ y: [yMin, yMax] }}
        axisOptions={{
          font: undefined,
          tickCount: 0,
          labelColor: colors.grey3,
          lineColor: '#A8CFB7',
          formatXLabel: () => '',
          formatYLabel: () => '',
        }}
        chartPressState={state}
      >
        {({ points }) => (
          <>
            <Line
              points={points.price}
              color="#D9A848"
              strokeWidth={2}
              curveType="natural"
            />
            {isActive && (
              <Circle
                cx={state.x.position}
                cy={state.y.price.position}
                r={4}
                color="#D9A848"
              />
            )}
          </>
        )}
      </CartesianChart>
    </View>
  );
}

