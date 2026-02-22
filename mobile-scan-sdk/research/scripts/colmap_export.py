#!/usr/bin/env python3
"""
从COLMAP重建结果导出3D点坐标
"""

import numpy as np
import json
import sys
from pathlib import Path

def read_points3D_binary(path_to_model_file):
    """
    读取COLMAP的points3D.bin文件
    返回: dict {point_id: (x, y, z)}
    """
    import struct
    
    points3D = {}
    with open(path_to_model_file, "rb") as fid:
        num_points = struct.unpack("Q", fid.read(8))[0]
        for _ in range(num_points):
            binary_point_line_properties = struct.unpack("QdddBBBd", fid.read(43))
            point_id = binary_point_line_properties[0]
            xyz = np.array(binary_point_line_properties[1:4])
            points3D[str(point_id)] = xyz.tolist()
            
            track_length = struct.unpack("Q", fid.read(8))[0]
            fid.read(8 * track_length)  # 跳过track信息
    
    return points3D

def read_points3D_text(path_to_model_file):
    """
    读取COLMAP的points3D.txt文件
    """
    points3D = {}
    with open(path_to_model_file, "r") as fid:
        for line in fid:
            if line.startswith("#"):
                continue
            parts = line.strip().split()
            if len(parts) < 4:
                continue
            point_id = parts[0]
            xyz = [float(parts[1]), float(parts[2]), float(parts[3])]
            points3D[point_id] = xyz
    
    return points3D

def main():
    if len(sys.argv) < 2:
        print("用法: python colmap_export.py <sparse_model_dir> [output.json]")
        print("\n示例:")
        print("  python colmap_export.py sparse/0 reconstructed_points.json")
        sys.exit(1)
    
    model_dir = Path(sys.argv[1])
    output_file = sys.argv[2] if len(sys.argv) > 2 else "reconstructed_points.json"
    
    # 尝试读取binary格式
    points3d_bin = model_dir / "points3D.bin"
    points3d_txt = model_dir / "points3D.txt"
    
    if points3d_bin.exists():
        print(f"读取binary格式: {points3d_bin}")
        points = read_points3D_binary(points3d_bin)
    elif points3d_txt.exists():
        print(f"读取text格式: {points3d_txt}")
        points = read_points3D_text(points3d_txt)
    else:
        print(f"错误: 在 {model_dir} 中未找到 points3D.bin 或 points3D.txt")
        sys.exit(1)
    
    print(f"导出 {len(points)} 个3D点")
    
    with open(output_file, 'w') as f:
        json.dump(points, f, indent=2)
    
    print(f"已保存到: {output_file}")

if __name__ == '__main__':
    main()
