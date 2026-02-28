import React from 'react';
import { GlassPanel } from '../vision-pro/GlassPanel';
import { MLSharpAnalyzeResponse } from '../../services/ml-sharp.service';

interface CapturePathVisualizationProps {
  analysis: MLSharpAnalyzeResponse | null;
}

export const CapturePathVisualization: React.FC<CapturePathVisualizationProps> = ({ analysis }) => {
  if (!analysis) return null;

  return (
    <GlassPanel className="p-6 w-96 text-white">
      <h3 className="text-xl font-semibold mb-6 flex items-center gap-2 text-blue-400">
        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
        拍摄路径建议
      </h3>

      <div className="relative h-48 w-full bg-white/5 rounded-xl border border-white/10 mb-6 flex items-center justify-center overflow-hidden">
        {/* Mock representation of 3D capture path */}
        <div className="absolute inset-0 opacity-20 bg-[radial-gradient(circle_at_50%_50%,#3b82f6_0%,transparent_70%)]"></div>
        
        {/* Points visualization */}
        <div className="relative w-32 h-32 border-2 border-dashed border-white/20 rounded-full animate-[spin_20s_linear_infinite]">
          {analysis.capturePoints.map((point, i) => {
            const angle = (i / analysis.capturePoints.length) * Math.PI * 2;
            const x = Math.cos(angle) * 60 + 64;
            const y = Math.sin(angle) * 60 + 64;
            return (
              <div 
                key={i}
                className="absolute w-3 h-3 bg-blue-500 rounded-full shadow-[0_0_8px_#3b82f6]"
                style={{ left: `${x}px`, top: `${y}px` }}
              />
            );
          })}
        </div>
        
        <div className="absolute w-4 h-4 bg-purple-500 rounded-full"></div>
      </div>

      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="text-xs text-white/40 uppercase">建议半径</div>
            <div className="text-lg font-medium">1.5m - 2.0m</div>
          </div>
          <div className="bg-white/5 p-3 rounded-lg border border-white/5">
            <div className="text-xs text-white/40 uppercase">推荐角度</div>
            <div className="text-lg font-medium">{analysis.suggestedAngles[0] || 0}° - {analysis.suggestedAngles[1] || 45}°</div>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 bg-blue-500/10 rounded-lg border border-blue-500/20 text-blue-300 text-sm">
          <svg className="shrink-0" xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
          建议沿着顺时针方向进行环绕拍摄，保持手机高度在 1.2m 左右。
        </div>
      </div>
    </GlassPanel>
  );
};
