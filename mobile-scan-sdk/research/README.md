# Week 1: 摄影测量算法验证 - 研究文档

本目录包含Week 1任务的所有研究成果和工具。

## 📁 目录结构

```
research/
├── README.md                              # 本文件
├── week1-photogrammetry-validation.md     # 技术调研报告
├── test-plan-design.md                    # 详细测试方案
├── scripts/                               # 评估脚本
│   ├── accuracy_evaluation.py             # 精度评估脚本
│   └── colmap_export.py                   # COLMAP数据导出
└── templates/                             # 模板文件
    └── ground_truth_template.csv          # Ground truth数据模板
```

## 📄 文档说明

### 1. 技术调研报告 (`week1-photogrammetry-validation.md`)

**内容**:
- 开源SfM库调研（COLMAP/OpenMVG/AliceVision）
- 库选型建议
- 测试方案概述
- 模拟测试数据分析
- 精度评估结论
- 风险识别与应对策略
- 推荐实施路径

**核心结论**:
- ✅ 推荐使用COLMAP
- ✅ 在良好条件下可达到3-10cm精度
- ⚠️ 需要尺度约束和高质量采集

### 2. 测试方案设计 (`test-plan-design.md`)

**内容**:
- 详细的测试环境准备清单
- 数据采集流程（标定、测量、拍摄）
- COLMAP重建步骤
- 精度评估方法
- 测试用例设计
- 评估标准和评分体系

**适用场景**: 实际执行测试时的操作手册

## 🛠️ 工具使用

### 精度评估脚本

**功能**: 评估COLMAP重建结果与ground truth的精度差异

**使用方法**:

```bash
# 1. 从COLMAP导出3D点坐标
python scripts/colmap_export.py sparse/0 reconstructed_points.json

# 2. 准备ground truth数据（参考templates/ground_truth_template.csv）
# 编辑ground_truth.csv，填入实际测量值

# 3. 运行精度评估
python scripts/accuracy_evaluation.py \
    reconstructed_points.json \
    ground_truth.csv \
    --scale-ref P1 P2 4.523 \
    --output results/

# 输出:
# - results/accuracy_report.png      # 可视化报告
# - results/detailed_errors.csv      # 详细误差数据
# - results/summary.json             # 摘要统计
```

**参数说明**:
- `--scale-ref <point_a> <point_b> <distance>`: 使用已知距离进行尺度校正
- `--output <dir>`: 指定输出目录

### COLMAP数据导出脚本

**功能**: 从COLMAP重建结果导出3D点坐标为JSON格式

**使用方法**:

```bash
python scripts/colmap_export.py sparse/0 reconstructed_points.json
```

支持binary和text两种COLMAP格式。

## 📊 评估指标

### 通过标准

| 指标 | 目标值 |
|------|--------|
| 平均绝对误差 | ≤ 10cm |
| RMSE | ≤ 15cm |
| 95%测量点误差 | ≤ 20cm |

### 评分体系

| 指标 | 优秀 | 良好 | 及格 | 不及格 |
|------|------|------|------|--------|
| 平均误差 | <3cm | 3-7cm | 7-10cm | >10cm |
| RMSE | <5cm | 5-10cm | 10-15cm | >15cm |

## 🚀 快速开始

### 环境要求

```bash
# Python依赖
pip install numpy pandas matplotlib

# COLMAP安装（Ubuntu）
sudo apt install colmap

# 或从源码编译
git clone https://github.com/colmap/colmap
cd colmap
mkdir build && cd build
cmake .. && make -j
sudo make install
```

### 执行测试（5天计划）

**Day 1**: 环境准备
```bash
# 1. 准备测试场景
# 2. 布置标记点
# 3. 相机标定
colmap feature_extractor --database_path calib.db --image_path calibration/
colmap exhaustive_matcher --database_path calib.db
colmap mapper --database_path calib.db --image_path calibration/ --output_path calib_output/

# 4. Ground truth测量（使用激光测距仪）
# 填写ground_truth.csv
```

**Day 2**: 数据采集
```bash
# 采集100张图像（按测试方案）
# 检查图像质量
```

**Day 3**: 重建处理
```bash
# COLMAP重建
colmap feature_extractor --database_path database.db --image_path images/
colmap exhaustive_matcher --database_path database.db
colmap mapper --database_path database.db --image_path images/ --output_path sparse/

# 导出点云
colmap model_converter --input_path sparse/0 --output_path sparse/0 --output_type TXT
```

**Day 4**: 精度评估
```bash
# 运行评估脚本
python scripts/colmap_export.py sparse/0 reconstructed_points.json
python scripts/accuracy_evaluation.py reconstructed_points.json ground_truth.csv \
    --scale-ref P1 P2 4.523 --output results/
```

**Day 5**: 报告总结
```bash
# 整理结果
# 编写总结报告
# 识别问题和改进方向
```

## 📈 预期结果

### 理想条件下
- 平均误差: 2-5cm
- RMSE: 3-7cm
- 达标概率: 95%

### 良好条件下
- 平均误差: 5-10cm
- RMSE: 7-15cm
- 达标概率: 80%

## ⚠️ 关键风险

1. **尺度漂移** (P0): 必须使用已知距离进行校正
2. **用户操作不当** (P0): 需要拍摄引导和质量检测
3. **低纹理区域** (P1): 考虑添加人工标记
4. **光照变化** (P1): 固定光照条件

## 📞 支持

如有问题，请参考：
- 技术调研报告中的详细分析
- 测试方案设计中的操作步骤
- COLMAP官方文档: https://colmap.github.io/

---

**版本**: v1.0  
**日期**: 2026-02-22  
**状态**: ✅ 就绪
