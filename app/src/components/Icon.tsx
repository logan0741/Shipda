import React from 'react';
import Svg, { Circle, Line, Path, Polyline, Rect } from 'react-native-svg';

import { colors } from '../theme';

export type IconName =
  | 'home'
  | 'clock'
  | 'user'
  | 'chevron-left'
  | 'chevron-right'
  | 'camera'
  | 'check'
  | 'check-circle'
  | 'alert-triangle'
  | 'alert-circle'
  | 'printer'
  | 'refresh'
  | 'file-text'
  | 'package'
  | 'truck'
  | 'anchor'
  | 'map-pin'
  | 'edit'
  | 'plus'
  | 'x'
  | 'search'
  | 'layers'
  | 'info'
  | 'trending-down'
  | 'bell'
  | 'globe'
  | 'headphones'
  | 'briefcase'
  | 'sliders';

type Props = {
  name: IconName;
  size?: number;
  color?: string;
  strokeWidth?: number;
};

export function Icon({ name, size = 22, color = colors.text, strokeWidth = 1.9 }: Props) {
  const common = {
    stroke: color,
    strokeWidth,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    fill: 'none' as const,
  };

  return (
    <Svg width={size} height={size} viewBox="0 0 24 24">
      {renderShape(name, common)}
    </Svg>
  );
}

type Common = {
  stroke: string;
  strokeWidth: number;
  strokeLinecap: 'round';
  strokeLinejoin: 'round';
  fill: 'none';
};

function renderShape(name: IconName, c: Common) {
  switch (name) {
    case 'home':
      return (
        <>
          <Path d="M3 9.5 12 2.5l9 7V20a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" {...c} />
          <Polyline points="9.5 22 9.5 13 14.5 13 14.5 22" {...c} />
        </>
      );
    case 'clock':
      return (
        <>
          <Circle cx={12} cy={12} r={9.2} {...c} />
          <Polyline points="12 6.6 12 12 15.8 14.2" {...c} />
        </>
      );
    case 'user':
      return (
        <>
          <Path d="M20 21v-1.8a5 5 0 0 0-5-5H9a5 5 0 0 0-5 5V21" {...c} />
          <Circle cx={12} cy={7.2} r={4} {...c} />
        </>
      );
    case 'chevron-left':
      return <Polyline points="15 18.5 8.5 12 15 5.5" {...c} />;
    case 'chevron-right':
      return <Polyline points="9 5.5 15.5 12 9 18.5" {...c} />;
    case 'camera':
      return (
        <>
          <Path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.8-2.6h6.4L17 7h3a2 2 0 0 1 2 2z" {...c} />
          <Circle cx={12} cy={13.2} r={3.8} {...c} />
        </>
      );
    case 'check':
      return <Polyline points="20 6.5 9.4 17.2 4 11.8" {...c} />;
    case 'check-circle':
      return (
        <>
          <Path d="M21.8 11.1V12a9.8 9.8 0 1 1-5.8-8.95" {...c} />
          <Polyline points="21.8 4.4 12 14.2 9.1 11.3" {...c} />
        </>
      );
    case 'alert-triangle':
      return (
        <>
          <Path d="M10.3 3.9 1.9 18a2 2 0 0 0 1.7 3h16.8a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" {...c} />
          <Line x1={12} y1={9.2} x2={12} y2={13.6} {...c} />
          <Line x1={12} y1={17} x2={12.01} y2={17} {...c} />
        </>
      );
    case 'alert-circle':
      return (
        <>
          <Circle cx={12} cy={12} r={9.2} {...c} />
          <Line x1={12} y1={7.6} x2={12} y2={12.6} {...c} />
          <Line x1={12} y1={16.2} x2={12.01} y2={16.2} {...c} />
        </>
      );
    case 'printer':
      return (
        <>
          <Polyline points="6.5 9 6.5 2.8 17.5 2.8 17.5 9" {...c} />
          <Path d="M6.5 18H4.4a2 2 0 0 1-2-2v-4.6a2 2 0 0 1 2-2h15.2a2 2 0 0 1 2 2V16a2 2 0 0 1-2 2h-2.1" {...c} />
          <Rect x={6.5} y={14} width={11} height={7.2} rx={1} {...c} />
        </>
      );
    case 'refresh':
      return (
        <>
          <Polyline points="21.5 4 21.5 9.6 15.9 9.6" {...c} />
          <Polyline points="2.5 20 2.5 14.4 8.1 14.4" {...c} />
          <Path d="M4.6 9.2A8.3 8.3 0 0 1 18.4 6l3.1 2.9" {...c} />
          <Path d="M2.5 15.1l3.1 2.9A8.3 8.3 0 0 0 19.4 14.8" {...c} />
        </>
      );
    case 'file-text':
      return (
        <>
          <Path d="M14 2.5H6.6a2 2 0 0 0-2 2v15a2 2 0 0 0 2 2h10.8a2 2 0 0 0 2-2V8z" {...c} />
          <Polyline points="14 2.5 14 8 19.4 8" {...c} />
          <Line x1={8.4} y1={12.6} x2={15.6} y2={12.6} {...c} />
          <Line x1={8.4} y1={16.4} x2={13.4} y2={16.4} {...c} />
        </>
      );
    case 'package':
      return (
        <>
          <Path d="M20.8 16.2V7.8a1.9 1.9 0 0 0-1-1.66l-7-3.9a1.9 1.9 0 0 0-1.9 0l-7 3.9a1.9 1.9 0 0 0-1 1.66v8.4a1.9 1.9 0 0 0 1 1.66l7 3.9a1.9 1.9 0 0 0 1.9 0l7-3.9a1.9 1.9 0 0 0 1-1.66z" {...c} />
          <Polyline points="3.4 7 12 11.9 20.6 7" {...c} />
          <Line x1={12} y1={21.8} x2={12} y2={11.9} {...c} />
        </>
      );
    case 'truck':
      return (
        <>
          <Path d="M1.6 4.4h13.2v11.8H1.6z" {...c} />
          <Path d="M14.8 8.6h4.1l2.9 2.9v4.7h-7z" {...c} />
          <Circle cx={6.2} cy={18.6} r={2.3} {...c} />
          <Circle cx={17.8} cy={18.6} r={2.3} {...c} />
        </>
      );
    case 'anchor':
      return (
        <>
          <Circle cx={12} cy={5} r={2.8} {...c} />
          <Line x1={12} y1={21.8} x2={12} y2={7.8} {...c} />
          <Path d="M5.2 12.4H2.4a9.6 9.6 0 0 0 19.2 0h-2.8" {...c} />
        </>
      );
    case 'map-pin':
      return (
        <>
          <Path d="M20.6 10.3c0 6.6-8.6 12.4-8.6 12.4S3.4 16.9 3.4 10.3a8.6 8.6 0 0 1 17.2 0z" {...c} />
          <Circle cx={12} cy={10.1} r={2.9} {...c} />
        </>
      );
    case 'edit':
      return (
        <>
          <Path d="M11.4 4.6H4.6a2 2 0 0 0-2 2v12.8a2 2 0 0 0 2 2h12.8a2 2 0 0 0 2-2v-6.8" {...c} />
          <Path d="M17.9 3.1a2.1 2.1 0 0 1 3 3L12 15l-4 1 1-4z" {...c} />
        </>
      );
    case 'plus':
      return (
        <>
          <Line x1={12} y1={5.4} x2={12} y2={18.6} {...c} />
          <Line x1={5.4} y1={12} x2={18.6} y2={12} {...c} />
        </>
      );
    case 'x':
      return (
        <>
          <Line x1={18} y1={6} x2={6} y2={18} {...c} />
          <Line x1={6} y1={6} x2={18} y2={18} {...c} />
        </>
      );
    case 'search':
      return (
        <>
          <Circle cx={11} cy={11} r={7.6} {...c} />
          <Line x1={21} y1={21} x2={16.4} y2={16.4} {...c} />
        </>
      );
    case 'layers':
      return (
        <>
          <Path d="M12 2.4 2.4 7.2 12 12l9.6-4.8z" {...c} />
          <Polyline points="2.4 16.8 12 21.6 21.6 16.8" {...c} />
          <Polyline points="2.4 12 12 16.8 21.6 12" {...c} />
        </>
      );
    case 'info':
      return (
        <>
          <Circle cx={12} cy={12} r={9.2} {...c} />
          <Line x1={12} y1={16.4} x2={12} y2={11.4} {...c} />
          <Line x1={12} y1={7.8} x2={12.01} y2={7.8} {...c} />
        </>
      );
    case 'trending-down':
      return (
        <>
          <Polyline points="21.6 17.4 13.8 9.6 9.6 13.8 2.4 6.6" {...c} />
          <Polyline points="15.6 17.4 21.6 17.4 21.6 11.4" {...c} />
        </>
      );
    case 'bell':
      return (
        <>
          <Path d="M18 8.4a6 6 0 1 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" {...c} />
          <Path d="M13.7 21a2 2 0 0 1-3.4 0" {...c} />
        </>
      );
    case 'globe':
      return (
        <>
          <Circle cx={12} cy={12} r={9.2} {...c} />
          <Line x1={2.8} y1={12} x2={21.2} y2={12} {...c} />
          <Path d="M12 2.8a14.1 14.1 0 0 1 0 18.4 14.1 14.1 0 0 1 0-18.4z" {...c} />
        </>
      );
    case 'headphones':
      return (
        <>
          <Path d="M3.2 17.4v-5.4a8.8 8.8 0 0 1 17.6 0v5.4" {...c} />
          <Path d="M20.8 18.4a2.4 2.4 0 0 1-2.4 2.4h-1.2v-6h1.2a2.4 2.4 0 0 1 2.4 2.4zM3.2 18.4a2.4 2.4 0 0 0 2.4 2.4h1.2v-6H5.6a2.4 2.4 0 0 0-2.4 2.4z" {...c} />
        </>
      );
    case 'briefcase':
      return (
        <>
          <Rect x={2.4} y={7.6} width={19.2} height={13} rx={2} {...c} />
          <Path d="M15.6 20.6V5.6a2 2 0 0 0-2-2h-3.2a2 2 0 0 0-2 2v15" {...c} />
        </>
      );
    case 'sliders':
      return (
        <>
          <Line x1={4} y1={21} x2={4} y2={14} {...c} />
          <Line x1={4} y1={10} x2={4} y2={3} {...c} />
          <Line x1={12} y1={21} x2={12} y2={12} {...c} />
          <Line x1={12} y1={8} x2={12} y2={3} {...c} />
          <Line x1={20} y1={21} x2={20} y2={16} {...c} />
          <Line x1={20} y1={12} x2={20} y2={3} {...c} />
          <Line x1={1} y1={14} x2={7} y2={14} {...c} />
          <Line x1={9} y1={8} x2={15} y2={8} {...c} />
          <Line x1={17} y1={16} x2={23} y2={16} {...c} />
        </>
      );
  }
}
