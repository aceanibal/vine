import { View, Text as RNText } from 'react-native';
import { CartesianChart, Line, useChartPressState } from 'victory-native';
import { Circle, useFont } from '@shopify/react-native-skia';
import { useColorScheme } from '~/lib/useColorScheme';
import { useEffect, useState } from 'react';

interface PriceDataPoint {
  timestamp?: number;
  date?: string;
  price: number;
}

interface PriceChartProps {
  data: PriceDataPoint[] | null;
  currentPrice?: number;
  height?: number;
}

export function PriceChart({ data, currentPrice, height = 100 }: PriceChartProps) {
  const { colors } = useColorScheme();
  const { state, isActive } = useChartPressState({ x: 0, y: { price: 0 } });
  
  // Manual state for tooltip
  const [tooltipData, setTooltipData] = useState<{ price: number; timestamp: number } | null>(null);

  // Handle tooltip updates without accessing shared values during render
  useEffect(() => {
    if (isActive && state.x && state.y.price) {
      // Use a timeout to avoid accessing shared values during render
      const timeoutId = setTimeout(() => {
        try {
          // Access the values in a non-render context
          const priceValue = (state.y.price as any)?.value;
          const timestampValue = (state.x as any)?.value;
          
          if (typeof priceValue === 'number' && typeof timestampValue === 'number') {
            setTooltipData({ price: priceValue, timestamp: timestampValue });
            console.log('Updated tooltip data:', { price: priceValue, timestamp: timestampValue });
          }
        } catch (error) {
          console.log('Error accessing shared values:', error);
        }
      }, 0);
      
      return () => clearTimeout(timeoutId);
    } else {
      setTooltipData(null);
    }
  }, [isActive, state.x, state.y.price]);

  // Handle empty or null data
  if (!data || data.length === 0) {
    console.log('PriceChart: No data provided', { data, currentPrice });
    return (
      <View style={{ 
        height, 
        width: '100%', 
        borderRadius: 12,
        overflow: 'hidden'
      }} 
      className="rounded-xl bg-blue-green/2 items-center justify-center">
      </View>
    );
  }

  // Combine historical data with current price (both already in USD per gram)
  let chartDataPoints = data;
  if (currentPrice !== undefined) {
    const today = new Date().toISOString().split('T')[0];
    const hasToday = data.some(point => point.date?.startsWith(today));
    
    if (hasToday) {
      // Replace today's price with current price if today exists
      chartDataPoints = data.map(point => 
        point.date?.startsWith(today) 
          ? { ...point, price: currentPrice }
          : point
      );
    } else {
      // Add today's current price as latest data point
      chartDataPoints = [
        ...data,
        { date: today, price: currentPrice }
      ];
    }
  }

  // Convert data to the format needed for the chart
  const chartData = chartDataPoints.map((point) => ({
    timestamp: point.timestamp !== undefined ? point.timestamp : new Date(point.date || new Date()).getTime(),
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
      {/* Tooltip Display */}
      {tooltipData && (
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          paddingHorizontal: 16,
          paddingVertical: 16,
          zIndex: 10,
        }}>
          <RNText style={{
            color: '#D9A848',
            fontSize: 14,
            fontWeight: '600',
          }}>
            {tooltipData ? `$${tooltipData.price.toFixed(2)}` : '$0.00'}
          </RNText>
          <RNText style={{
            color: '#225D7C',
            fontSize: 12,
            marginTop: 2,
            opacity: 0.9,
          }}>
            {tooltipData ? new Date(tooltipData.timestamp).toLocaleDateString() : 'N/A'}
          </RNText>
        </View>
      )}
      
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

