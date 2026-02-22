# 摄影测量精度测试方案设计

**版本**: v1.0  
**日期**: 2026-02-22  
**目标**: 验证纯摄影测量方案在室内场景下能否达到3-10cm精度

---

## 1. 测试环境准备

### 1.1 场景设置

**测试场景**: 标准办公室/会议室

**场景要求**:
- 尺寸: 4m × 6m × 3m（长×宽×高）
- 光照: 均匀室内照明（避免强烈阴影）
- 纹理: 中等到丰富（墙面有装饰、家具、物品）
- 避免: 大面积玻璃、镜面、纯白墙

**场景布置**:
```
┌─────────────────────────────┐
│  窗户                        │
│  ┌──┐                       │
│  │桌│    ●标记点1           │
│  └──┘                       │
│         ●标记点2   [标尺]   │
│  ●标记点3                   │
│         [立方体]            │
│  ●标记点4    ●标记点5       │
│                    ┌──┐     │
│                    │椅│     │
│                    └──┘     │
└─────────────────────────────┘
```

### 1.2 设备清单

**必需设备**:
- [ ] 移动手机（测试设备）
  - 推荐: iPhone 13+, Samsung S21+, 或同等配置
  - 相机: ≥12MP, 光学防抖
- [ ] 棋盘标定板（30cm × 40cm, 8×6格）
- [ ] 1米金属卷尺（精度±1mm）
- [ ] 2米金属卷尺（精度±1mm）
- [ ] 标准立方体（20cm × 20cm × 20cm）
- [ ] 圆形标记点 × 10（直径5cm，高对比度）
- [ ] 激光测距仪（精度±2mm，量程0.05-40m）
- [ ] 三脚架（可选，用于稳定拍摄）

**软件工具**:
- [ ] COLMAP（v3.8+）
- [ ] OpenCV（用于标定）
- [ ] CloudCompare（点云分析）
- [ ] Python 3.8+（数据分析）

### 1.3 标记点布置

**标记点规格**:
- 材质: 哑光黑色圆形贴纸
- 直径: 5cm
- 中心: 白色十字标记（便于精确定位）

**布置位置**（10个标记点）:
| 编号 | 位置 | 高度 | 用途 |
|------|------|------|------|
| P1 | 墙角A | 1.5m | 控制点 |
| P2 | 墙角B | 1.5m | 控制点 |
| P3 | 墙角C | 1.5m | 控制点 |
| P4 | 墙角D | 1.5m | 控制点 |
| P5 | 中央区域 | 1.0m | 验证点 |
| P6 | 中央区域 | 1.0m | 验证点 |
| P7 | 中央区域 | 1.8m | 验证点 |
| P8 | 中央区域 | 1.8m | 验证点 |
| P9 | 地面 | 0.1m | 验证点 |
| P10 | 天花板 | 2.8m | 验证点 |

---

## 2. 数据采集流程

### 2.1 相机标定（第1天）

**步骤**:
1. 打印棋盘标定板（确保平整，无变形）
2. 固定标定板在平面上
3. 拍摄20-30张不同角度的标定图像：
   - 覆盖图像的不同区域
   - 包含不同距离（0.5m - 2m）
   - 包含不同倾斜角度（0°, ±15°, ±30°, ±45°）
4. 使用OpenCV或COLMAP进行标定
5. 验证标定质量：
   - 重投影误差 < 0.5像素 ✅
   - 重投影误差 0.5-1.0像素 ⚠️
   - 重投影误差 > 1.0像素 ❌ 重新标定

**标定命令**（COLMAP）:
```bash
colmap feature_extractor \
  --database_path database.db \
  --image_path calibration_images/

colmap exhaustive_matcher \
  --database_path database.db

colmap mapper \
  --database_path database.db \
  --image_path calibration_images/ \
  --output_path calibration_output/
```

**输出**:
- 内参矩阵 K
- 畸变系数 (k1, k2, p1, p2, k3)
- 重投影误差报告

### 2.2 Ground Truth测量（第1天）

**测量内容**:

**A. 标记点间距离**（45组，C(10,2)选择关键组合）:
```
测量表格：
┌──────┬──────┬──────────┬──────────┬────────┐
│ 点A  │ 点B  │ 测量值(m)│ 重复测量 │ 平均值 │
├──────┼──────┼──────────┼──────────┼────────┤
│ P1   │ P2   │          │          │        │
│ P1   │ P3   │          │          │        │
│ P1   │ P5   │          │          │        │
│ ...  │ ...  │          │          │        │
└──────┴──────┴──────────┴──────────┴────────┘
```

**B. 参考物体尺寸**:
- 立方体三边长度（各测量3次取平均）
- 标尺长度验证

**C. 场景关键尺寸**:
- 房间长、宽、高
- 主要家具位置和尺寸

**测量要求**:
- 每个距离测量3次，取平均值
- 记录测量不确定度
- 使用激光测距仪（精度±2mm）

### 2.3 图像采集（第2天）

**采集方案A: 标准采集**（推荐）

**参数设置**:
- 分辨率: 最高（如4000×3000）
- 对焦: 固定对焦（锁定在2米）
- 曝光: 手动曝光（避免自动调整）
- HDR: 关闭
- 闪光灯: 关闭

**拍摄路径**:
```
第1圈（高度1.2m，30张）:
- 沿房间周边环绕
- 每隔15度拍摄一张
- 相机朝向场景中心

第2圈（高度1.5m，30张）:
- 同样路径
- 增加倾斜角度（±15°）

第3圈（高度1.8m，20张）:
- 重点区域补充
- 俯视角度

细节补充（20张）:
- 标记点特写
- 参考物体多角度
- 纹理丰富区域
```

**质量检查**（每10张检查一次）:
- [ ] 图像清晰（无运动模糊）
- [ ] 重叠度充足（相邻图像重叠>70%）
- [ ] 标记点可见
- [ ] 曝光适当

**采集方案B: 快速采集**（对比测试）

- 图像数量: 30张
- 单圈拍摄（高度1.5m）
- 用于测试最小图像数量要求

**采集方案C: 高密度采集**（对比测试）

- 图像数量: 150张
- 多圈多角度
- 用于测试精度上限

### 2.4 数据组织

**目录结构**:
```
test_data/
├── calibration/
│   ├── images/           # 标定图像
│   ├── results/          # 标定结果
│   └── report.txt        # 标定报告
├── ground_truth/
│   ├── measurements.csv  # 测量数据
│   ├── scene_layout.png  # 场景布局图
│   └── photos/           # 参考照片
├── dataset_A_standard/
│   ├── images/           # 100张图像
│   └── metadata.json     # 采集参数
├── dataset_B_quick/
│   └── images/           # 30张图像
├── dataset_C_dense/
│   └── images/           # 150张图像
└── README.md             # 数据说明
```

---

## 3. 重建与评估流程

### 3.1 COLMAP重建

**步骤1: 特征提取**
```bash
colmap feature_extractor \
  --database_path database.db \
  --image_path images/ \
  --ImageReader.camera_model PINHOLE \
  --ImageReader.single_camera 1 \
  --SiftExtraction.max_num_features 8192
```

**步骤2: 特征匹配**
```bash
colmap exhaustive_matcher \
  --database_path database.db \
  --SiftMatching.guided_matching 1
```

**步骤3: 稀疏重建**
```bash
colmap mapper \
  --database_path database.db \
  --image_path images/ \
  --output_path sparse/ \
  --Mapper.ba_refine_focal_length 0 \
  --Mapper.ba_refine_principal_point 0 \
  --Mapper.ba_refine_extra_params 0
```

**步骤4: 稠密重建**（可选）
```bash
colmap image_undistorter \
  --image_path images/ \
  --input_path sparse/0 \
  --output_path dense/

colmap patch_match_stereo \
  --workspace_path dense/

colmap stereo_fusion \
  --workspace_path dense/ \
  --output_path dense/fused.ply
```

### 3.2 尺度恢复

**方法1: 已知距离约束**

使用标记点P1-P2的已知距离进行尺度恢复：

```python
# scale_recovery.py
import numpy as np

# 从COLMAP读取重建的3D点坐标
P1_reconstructed = np.array([x1, y1, z1])
P2_reconstructed = np.array([x2, y2, z2])

# 计算重建距离
dist_reconstructed = np.linalg.norm(P2_reconstructed - P1_reconstructed)

# 已知真实距离（从ground truth）
dist_ground_truth = 4.523  # 米

# 计算尺度因子
scale_factor = dist_ground_truth / dist_reconstructed

# 应用尺度到所有点
points_scaled = points_reconstructed * scale_factor
```

**方法2: 多距离约束**（更鲁棒）

使用多组已知距离，通过最小二乘法求解最优尺度：

```python
# 多组距离约束
known_distances = [
    (P1, P2, 4.523),
    (P1, P3, 6.128),
    (P2, P4, 5.891),
    # ...
]

# 最小二乘求解
scales = []
for (pa, pb, dist_true) in known_distances:
    dist_recon = np.linalg.norm(pb - pa)
    scales.append(dist_true / dist_recon)

scale_factor = np.median(scales)  # 使用中位数更鲁棒
```

### 3.3 精度评估

**评估脚本**（Python）:

```python
# accuracy_evaluation.py
import numpy as np
import pandas as pd

def evaluate_accuracy(reconstructed_points, ground_truth_measurements):
    """
    评估重建精度
    
    Args:
        reconstructed_points: dict, {point_id: np.array([x,y,z])}
        ground_truth_measurements: list of (point_a, point_b, distance)
    
    Returns:
        results: dict with accuracy metrics
    """
    errors = []
    
    for (pa_id, pb_id, dist_true) in ground_truth_measurements:
        pa = reconstructed_points[pa_id]
        pb = reconstructed_points[pb_id]
        
        dist_recon = np.linalg.norm(pb - pa)
        error = abs(dist_recon - dist_true)
        relative_error = error / dist_true * 100
        
        errors.append({
            'pair': f'{pa_id}-{pb_id}',
            'true_dist': dist_true,
            'recon_dist': dist_recon,
            'abs_error': error,
            'rel_error': relative_error
        })
    
    df = pd.DataFrame(errors)
    
    results = {
        'mean_abs_error': df['abs_error'].mean(),
        'median_abs_error': df['abs_error'].median(),
        'std_abs_error': df['abs_error'].std(),
        'max_abs_error': df['abs_error'].max(),
        'rmse': np.sqrt((df['abs_error']**2).mean()),
        'mean_rel_error': df['rel_error'].mean(),
        'errors_df': df
    }
    
    return results

# 使用示例
results = evaluate_accuracy(reconstructed_points, ground_truth)

print(f"平均绝对误差: {results['mean_abs_error']*100:.2f} cm")
print(f"RMSE: {results['rmse']*100:.2f} cm")
print(f"最大误差: {results['max_abs_error']*100:.2f} cm")
print(f"平均相对误差: {results['mean_rel_error']:.2f}%")

# 判断是否达标
if results['mean_abs_error'] <= 0.10:  # 10cm
    print("✅ 精度达标！")
else:
    print("❌ 精度未达标")
```

### 3.4 可视化分析

**生成报告**:

```python
# visualization.py
import matplotlib.pyplot as plt
import seaborn as sns

def generate_report(results):
    fig, axes = plt.subplots(2, 2, figsize=(12, 10))
    
    # 1. 误差分布直方图
    axes[0, 0].hist(results['errors_df']['abs_error']*100, bins=20)
    axes[0, 0].set_xlabel('绝对误差 (cm)')
    axes[0, 0].set_ylabel('频数')
    axes[0, 0].set_title('误差分布')
    axes[0, 0].axvline(10, color='r', linestyle='--', label='目标阈值')
    axes[0, 0].legend()
    
    # 2. 误差vs距离
    axes[0, 1].scatter(results['errors_df']['true_dist'], 
                       results['errors_df']['abs_error']*100)
    axes[0, 1].set_xlabel('真实距离 (m)')
    axes[0, 1].set_ylabel('绝对误差 (cm)')
    axes[0, 1].set_title('误差与距离关系')
    
    # 3. 相对误差分布
    axes[1, 0].hist(results['errors_df']['rel_error'], bins=20)
    axes[1, 0].set_xlabel('相对误差 (%)')
    axes[1, 0].set_ylabel('频数')
    axes[1, 0].set_title('相对误差分布')
    
    # 4. 误差排序
    df_sorted = results['errors_df'].sort_values('abs_error', ascending=False)
    axes[1, 1].barh(range(len(df_sorted)), df_sorted['abs_error']*100)
    axes[1, 1].set_xlabel('绝对误差 (cm)')
    axes[1, 1].set_title('各测量对误差排序')
    
    plt.tight_layout()
    plt.savefig('accuracy_report.png', dpi=300)
    print("报告已保存: accuracy_report.png")
```

---

## 4. 测试用例

### 4.1 基准测试（Test Case 1）

**目标**: 验证理想条件下的精度上限

**条件**:
- 图像数量: 100张
- 采集质量: 优秀（三脚架，固定光照）
- 场景: 纹理丰富
- 标定: 高质量（重投影误差<0.3px）

**预期结果**:
- 平均误差: < 5cm
- RMSE: < 7cm
- 最大误差: < 15cm

### 4.2 最小图像数测试（Test Case 2）

**目标**: 确定最少图像数量要求

**条件**:
- 图像数量: 20, 30, 50, 100张（分组测试）
- 其他条件相同

**预期结果**:
- 绘制精度vs图像数量曲线
- 确定最小可用图像数

### 4.3 低纹理场景测试（Test Case 3）

**目标**: 测试困难场景下的表现

**条件**:
- 场景: 白墙为主，纹理稀少
- 添加人工标记点

**预期结果**:
- 识别精度下降程度
- 验证标记点的有效性

### 4.4 光照变化测试（Test Case 4）

**目标**: 测试光照鲁棒性

**条件**:
- 采集过程中改变光照（开关灯、窗帘）

**预期结果**:
- 评估光照对精度的影响
- 测试特征匹配鲁棒性

---

## 5. 评估标准

### 5.1 通过标准

**精度要求**:
- ✅ 平均绝对误差 ≤ 10cm
- ✅ RMSE ≤ 15cm
- ✅ 95%测量点误差 ≤ 20cm

**质量要求**:
- ✅ 重建成功率 > 90%
- ✅ 标记点识别率 > 95%
- ✅ 重投影误差 < 1.5px

### 5.2 评分体系

| 指标 | 优秀 | 良好 | 及格 | 不及格 |
|------|------|------|------|--------|
| 平均误差 | <3cm | 3-7cm | 7-10cm | >10cm |
| RMSE | <5cm | 5-10cm | 10-15cm | >15cm |
| 最大误差 | <10cm | 10-20cm | 20-30cm | >30cm |
| 相对误差 | <1% | 1-2% | 2-3% | >3% |

---

## 6. 交付清单

### 6.1 数据交付

- [ ] 标定数据包（图像+结果）
- [ ] Ground truth测量表（CSV）
- [ ] 测试图像数据集（3组）
- [ ] COLMAP重建结果
- [ ] 点云文件（PLY格式）

### 6.2 文档交付

- [ ] 测试执行记录
- [ ] 精度评估报告（PDF）
- [ ] 可视化图表
- [ ] 问题和改进建议

### 6.3 代码交付

- [ ] 尺度恢复脚本
- [ ] 精度评估脚本
- [ ] 可视化脚本
- [ ] 自动化测试脚本

---

## 7. 时间计划

| 阶段 | 任务 | 时间 | 负责人 |
|------|------|------|--------|
| Day 1 | 环境准备、标定、Ground truth测量 | 4h | 工程师 |
| Day 2 | 图像采集（3组数据集） | 3h | 工程师 |
| Day 3 | COLMAP重建和处理 | 4h | 工程师 |
| Day 4 | 精度评估和分析 | 3h | 工程师 |
| Day 5 | 报告编写和总结 | 2h | 工程师 |

**总计**: 5个工作日

---

**文档版本**: v1.0  
**最后更新**: 2026-02-22  
**状态**: ✅ 就绪