import React from 'react';
import { GlassPanel } from '../vision-pro/GlassPanel';
import { MLSharpAnalyzeResponse } from '../../services/ml-sharp.service';

interface EnvironmentAnalysisProps {
  analysis: MLSharpAnalyzeResponse | null;
  isLoading: boolean;
}

export const EnvironmentAnalysis: React.FC<EnvironmentAnalysisProps> = ({ analysis, isLoading }) => {
  if (isLoading) {
    return (
      <GlassPanel className="p-6 w-80 animate-pulse">
        <div className="h-6 bg-white/20 rounded w-3/4 mb-4"></div>
        <div className="space-y-3">
          <div className="h-4 bg-white/10 rounded"></div>
          <div className="h-4 bg-white/10 rounded w-5/6"></div>
        </div>
      </GlassPanel>
    );
  }

  if (!analysis) return null;

  return (
    <GlassPanel className="p-6 w-80 text-white">
      <h3 className="text-xl font-semibold mb-4 bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
        环境分析结果
      </h3>
      
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <span className="text-white/60">房间类型</span>
          <span className="font-medium">{analysis.roomType}</span>
        </div>
        
        <div className="flex justify-between items-center">
          <span className="text-white/60">置信度</span>
          <span className="font-medium">{(analysis.confidence * 100).toFixed(1)}%</span>
        </div>

        <div className="border-t border-white/10 pt-4">
          <div className="text-sm text-white/60 mb-2">拍摄建议</div>
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="bg-white/5 p-2 rounded">
              <div className="text-blue-400 font-bold">{analysis.capturePoints.length}</div>
              <div className="text-xs text-white/40">推荐点位</div>
            </div>
            <div className="bg-white/5 p-2 rounded">
              <div className="text-purple-400 font-bold">{analysis.estimatedPhotos}</div>
              <div className="text-xs text-white/40">预计照片</div>
            </div>
          </div>
        </div>

        <div className="text-xs text-white/40 italic mt-4">
          * 基于 Vision Pro 空间计算模型生成
        </div>
      </div>
    </GlassPanel>
  );
};
