# XOne P5-1: user_id UUID/int 不一致问题记录

## 问题描述

P4-21 认证系统使用 UUID 主键的 User 模型，与 P1-P2 个人/工作数据模型中 `user_id: Mapped[int]` 不一致。

## 影响范围

| 模块 | user_id 类型 | 状态 |
|------|-------------|------|
| `app/models/user.py` | UUID | P4-21 新建 |
| `app/models/archive.py` | int | P2 已有 |
| `app/models/contract.py` | int | P2 已有 |
| `app/models/health.py` | int | P1 已有 |
| `app/models/assets.py` | int | P1 已有 |
| `app/models/reading.py` | int | P1 已有 |
| `app/models/media.py` | int | P1 已有 |
| `app/models/shopping.py` | int | P1 已有 |
| `app/models/dispatch.py` | str("default") | P3 已有 |
| `app/models/knowledge.py` | str | P3 已有 |

## 修复方案（待实施）

### 方案 A: User 模型迁移为 Integer 主键（推荐）

1. 修改 `app/models/user.py` 的 `id` 从 UUID → Integer autoincrement
2. 修改 `app/core/security.py` 的 `get_current_user_id` 返回 int
3. 修改 JWT token payload 中 `sub` 字段为 int
4. 修改 `app/services/auth_service.py` 适配 int ID
5. 更新所有 API 端点的 `user_id` 参数从 Query(…) → Depends(get_current_user_id)

优点：最小改动，与现有数据模型一致
缺点：失去 UUID 的去中心化优势

### 方案 B: 所有数据模型迁移为 UUID

1. 所有模型 `user_id: Mapped[int]` → `Mapped[UUID]`
2. 数据库迁移脚本：添加 UUID 列 + 数据回填 + 切换外键
3. 所有 API 从 Depends(get_current_user) 获取 user.id

优点：架构一致，UUID 优势保留
缺点：迁移成本大，需要停机窗口

### 方案 C: 双 ID 方案

1. User 模型同时保留 UUID (外部) 和 int_id (内部)
2. get_current_user_id 返回 int_id
3. 数据模型不变，仅 API 鉴权升级

优点：零迁移成本
缺点：User 表冗余一列

## 当前缓解措施

- 前端已移除所有 `?user_id=` 查询参数（P5-1 完成部分）
- 后端 notifications.py 已部分迁移为 `Depends(get_current_user_id)`
- 其余 API 保留 `user_id: int = Query(…)` 作为兼容过渡

选择方案后统一实施。
