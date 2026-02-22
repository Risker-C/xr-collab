#!/usr/bin/env python3
"""
摄影测量精度评估脚本
用于评估COLMAP重建结果与ground truth的精度差异
"""

import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import json
import sys
from pathlib import Path

class AccuracyEvaluator:
    def __init__(self, reconstructed_points_file, ground_truth_file):
        """
        Args:
            reconstructed_points_file: COLMAP导出的3D点坐标JSON文件
            ground_truth_file: Ground truth测量数据CSV文件
        """
        self.recon_points = self.load_reconstructed_points(reconstructed_points_file)
        self.ground_truth = self.load_ground_truth(ground_truth_file)
        
    def load_reconstructed_points(self, filepath):
        """加载重建的3D点坐标"""
        with open(filepath, 'r') as f:
            data = json.load(f)
        return {k: np.array(v) for k, v in data.items()}
    
    def load_ground_truth(self, filepath):
        """加载ground truth测量数据"""
        return pd.read_csv(filepath)
    
    def apply_scale(self, point_a_id, point_b_id, known_distance):
        """使用已知距离计算并应用尺度因子"""
        pa = self.recon_points[point_a_id]
        pb = self.recon_points[point_b_id]
        
        dist_recon = np.linalg.norm(pb - pa)
        scale_factor = known_distance / dist_recon
        
        # 应用尺度到所有点
        for key in self.recon_points:
            self.recon_points[key] *= scale_factor
        
        print(f"尺度因子: {scale_factor:.4f}")
        return scale_factor
    
    def evaluate(self):
        """评估精度"""
        errors = []
        
        for _, row in self.ground_truth.iterrows():
            pa_id = row['point_a']
            pb_id = row['point_b']
            dist_true = row['distance_m']
            
            if pa_id not in self.recon_points or pb_id not in self.recon_points:
                print(f"警告: 点 {pa_id} 或 {pb_id} 未在重建中找到")
                continue
            
            pa = self.recon_points[pa_id]
            pb = self.recon_points[pb_id]
            dist_recon = np.linalg.norm(pb - pa)
            
            error = abs(dist_recon - dist_true)
            rel_error = (error / dist_true) * 100
            
            errors.append({
                'pair': f'{pa_id}-{pb_id}',
                'true_dist_m': dist_true,
                'recon_dist_m': dist_recon,
                'abs_error_m': error,
                'abs_error_cm': error * 100,
                'rel_error_pct': rel_error
            })
        
        df = pd.DataFrame(errors)
        
        results = {
            'mean_abs_error_cm': df['abs_error_cm'].mean(),
            'median_abs_error_cm': df['abs_error_cm'].median(),
            'std_abs_error_cm': df['abs_error_cm'].std(),
            'max_abs_error_cm': df['abs_error_cm'].max(),
            'rmse_cm': np.sqrt((df['abs_error_cm']**2).mean()),
            'mean_rel_error_pct': df['rel_error_pct'].mean(),
            'num_measurements': len(df),
            'errors_df': df
        }
        
        return results
    
    def print_summary(self, results):
        """打印评估摘要"""
        print("\n" + "="*60)
        print("精度评估结果")
        print("="*60)
        print(f"测量数量: {results['num_measurements']}")
        print(f"平均绝对误差: {results['mean_abs_error_cm']:.2f} cm")
        print(f"中位数误差: {results['median_abs_error_cm']:.2f} cm")
        print(f"标准差: {results['std_abs_error_cm']:.2f} cm")
        print(f"RMSE: {results['rmse_cm']:.2f} cm")
        print(f"最大误差: {results['max_abs_error_cm']:.2f} cm")
        print(f"平均相对误差: {results['mean_rel_error_pct']:.2f}%")
        print("="*60)
        
        # 判断是否达标
        if results['mean_abs_error_cm'] <= 10 and results['rmse_cm'] <= 15:
            print("✅ 精度达标！(平均误差≤10cm, RMSE≤15cm)")
        else:
            print("❌ 精度未达标")
            if results['mean_abs_error_cm'] > 10:
                print(f"   - 平均误差超标: {results['mean_abs_error_cm']:.2f} cm > 10 cm")
            if results['rmse_cm'] > 15:
                print(f"   - RMSE超标: {results['rmse_cm']:.2f} cm > 15 cm")
        print("="*60 + "\n")
    
    def generate_report(self, results, output_dir='output'):
        """生成可视化报告"""
        Path(output_dir).mkdir(exist_ok=True)
        
        df = results['errors_df']
        
        fig, axes = plt.subplots(2, 2, figsize=(14, 10))
        
        # 1. 误差分布直方图
        axes[0, 0].hist(df['abs_error_cm'], bins=20, edgecolor='black', alpha=0.7)
        axes[0, 0].axvline(10, color='r', linestyle='--', linewidth=2, label='目标阈值 (10cm)')
        axes[0, 0].axvline(results['mean_abs_error_cm'], color='g', linestyle='-', 
                          linewidth=2, label=f'平均值 ({results["mean_abs_error_cm"]:.1f}cm)')
        axes[0, 0].set_xlabel('绝对误差 (cm)', fontsize=12)
        axes[0, 0].set_ylabel('频数', fontsize=12)
        axes[0, 0].set_title('误差分布直方图', fontsize=14, fontweight='bold')
        axes[0, 0].legend()
        axes[0, 0].grid(True, alpha=0.3)
        
        # 2. 误差vs距离散点图
        axes[0, 1].scatter(df['true_dist_m'], df['abs_error_cm'], alpha=0.6, s=50)
        axes[0, 1].axhline(10, color='r', linestyle='--', linewidth=2, label='目标阈值')
        axes[0, 1].set_xlabel('真实距离 (m)', fontsize=12)
        axes[0, 1].set_ylabel('绝对误差 (cm)', fontsize=12)
        axes[0, 1].set_title('误差与距离关系', fontsize=14, fontweight='bold')
        axes[0, 1].legend()
        axes[0, 1].grid(True, alpha=0.3)
        
        # 3. 相对误差分布
        axes[1, 0].hist(df['rel_error_pct'], bins=20, edgecolor='black', alpha=0.7, color='orange')
        axes[1, 0].axvline(results['mean_rel_error_pct'], color='g', linestyle='-', 
                          linewidth=2, label=f'平均值 ({results["mean_rel_error_pct"]:.1f}%)')
        axes[1, 0].set_xlabel('相对误差 (%)', fontsize=12)
        axes[1, 0].set_ylabel('频数', fontsize=12)
        axes[1, 0].set_title('相对误差分布', fontsize=14, fontweight='bold')
        axes[1, 0].legend()
        axes[1, 0].grid(True, alpha=0.3)
        
        # 4. Top 10最大误差
        df_sorted = df.nlargest(10, 'abs_error_cm')
        axes[1, 1].barh(range(len(df_sorted)), df_sorted['abs_error_cm'], color='coral')
        axes[1, 1].set_yticks(range(len(df_sorted)))
        axes[1, 1].set_yticklabels(df_sorted['pair'], fontsize=9)
        axes[1, 1].set_xlabel('绝对误差 (cm)', fontsize=12)
        axes[1, 1].set_title('Top 10 最大误差', fontsize=14, fontweight='bold')
        axes[1, 1].grid(True, alpha=0.3, axis='x')
        axes[1, 1].invert_yaxis()
        
        plt.tight_layout()
        report_path = Path(output_dir) / 'accuracy_report.png'
        plt.savefig(report_path, dpi=300, bbox_inches='tight')
        print(f"可视化报告已保存: {report_path}")
        
        # 保存详细数据
        csv_path = Path(output_dir) / 'detailed_errors.csv'
        df.to_csv(csv_path, index=False)
        print(f"详细误差数据已保存: {csv_path}")
        
        # 保存摘要JSON
        summary = {k: v for k, v in results.items() if k != 'errors_df'}
        json_path = Path(output_dir) / 'summary.json'
        with open(json_path, 'w') as f:
            json.dump(summary, f, indent=2)
        print(f"摘要数据已保存: {json_path}")

def main():
    if len(sys.argv) < 3:
        print("用法: python accuracy_evaluation.py <reconstructed_points.json> <ground_truth.csv>")
        print("\n可选参数:")
        print("  --scale-ref <point_a> <point_b> <distance_m>  使用已知距离进行尺度校正")
        print("  --output <dir>  指定输出目录 (默认: output)")
        sys.exit(1)
    
    recon_file = sys.argv[1]
    gt_file = sys.argv[2]
    
    evaluator = AccuracyEvaluator(recon_file, gt_file)
    
    # 处理尺度校正参数
    if '--scale-ref' in sys.argv:
        idx = sys.argv.index('--scale-ref')
        point_a = sys.argv[idx + 1]
        point_b = sys.argv[idx + 2]
        distance = float(sys.argv[idx + 3])
        evaluator.apply_scale(point_a, point_b, distance)
    
    # 评估精度
    results = evaluator.evaluate()
    evaluator.print_summary(results)
    
    # 输出目录
    output_dir = 'output'
    if '--output' in sys.argv:
        idx = sys.argv.index('--output')
        output_dir = sys.argv[idx + 1]
    
    # 生成报告
    evaluator.generate_report(results, output_dir)

if __name__ == '__main__':
    main()
