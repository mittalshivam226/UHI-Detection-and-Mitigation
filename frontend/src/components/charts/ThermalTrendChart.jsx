import React from 'react';
import ReactECharts from 'echarts-for-react';

export default function ThermalTrendChart({ data }) {
  const options = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'axis',
      backgroundColor: 'rgba(0,0,0,0.8)',
      borderColor: '#00F2FF',
      textStyle: { color: '#fff', fontFamily: 'JetBrains Mono' }
    },
    grid: { left: '3%', right: '4%', bottom: '5%', top: '10%', containLabel: true },
    xAxis: {
      type: 'category',
      boundaryGap: false,
      data: data ? data.map(d => d.time) : ['00:00', '04:00', '08:00', '12:00', '16:00', '20:00', '24:00'],
      axisLabel: { color: '#adaaaa', fontFamily: 'JetBrains Mono', fontSize: 10 },
      axisLine: { lineStyle: { color: 'rgba(255,255,255,0.1)' } }
    },
    yAxis: {
      type: 'value',
      axisLabel: { color: '#adaaaa', fontFamily: 'JetBrains Mono', fontSize: 10 },
      splitLine: { lineStyle: { color: 'rgba(255,255,255,0.05)', type: 'dashed' } }
    },
    series: [
      {
        name: 'Surface Temp',
        type: 'line',
        smooth: true,
        symbol: 'none',
        lineStyle: { width: 3, color: '#FF00E5' },
        areaStyle: {
          color: {
            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
            colorStops: [
              { offset: 0, color: 'rgba(255,0,229,0.5)' },
              { offset: 1, color: 'rgba(255,0,229,0.01)' }
            ]
          }
        },
        data: data ? data.map(d => d.temp) : [22, 21, 28, 35, 38, 33, 25]
      }
    ]
  };

  return <ReactECharts option={options} style={{ height: '180px', width: '100%' }} />;
}
