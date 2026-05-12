# 合同生命周期管理 实施计划

> **For Hermes:** Use subagent-driven-development skill to implement this plan task-by-task.

**Goal:** 为合同管理模块添加可自定义的生命周期管理子功能，支持模板创建、阶段编辑、合同绑定与流转追踪。

**Architecture:** 后端新增 4 张表 (LifecycleTemplate / LifecycleStage / ContractLifecycle / ContractStageLog)，前端新增生命周期管理页面 + 合同详情页集成，侧边栏新增子菜单入口。

**Tech Stack:** FastAPI + SQLAlchemy async + PostgreSQL (后端), Next.js 14 + Zustand + shadcn/ui (前端)

---

## 侦察摘要

- 合同模型：`backend/app/models/contract.py` (Contract 含 status 字段: draft/signed/in_progress/completed/terminated)
- 合同 API：`backend/app/api/work/contracts.py` (路由前缀 `/contracts`，挂载于 `/work`)
- 合同 Service：`backend/app/services/contract_service.py`
- 路由注册：`backend/app/api/router.py` (contracts_router → prefix="/work")
- 前端合同模块：`frontend/src/plugins/builtin/work/contracts/` (11 个文件)
- 前端页面路由：`frontend/src/app/[locale]/work/contracts/` (7 个 page.tsx)
- 侧边栏配置：`frontend/src/components/layout/sidebar-config.tsx` (合同管理 children: 总体情况/合同详情/供应商管理)
- Store：`frontend/src/plugins/builtin/work/contracts/store.ts` (Zustand)
- API client：`frontend/src/lib/api/client.ts`

---

## Task 1: 创建生命周期模型

**Objective:** 在 contract.py 中新增 LifecycleTemplate / LifecycleStage 模型

**Files:**
- Modify: `backend/app/models/contract.py`

**Code:**

在 Milestone 类之后追加：
```python
class LifecycleTemplate(TimestampMixin, Base):
    """生命周期模板 — 用户自定义的合同阶段流程"""

    __tablename__ = "lifecycle_templates"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[UUID] = mapped_column(SAUUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)

    stages: Mapped[list["LifecycleStage"]] = relationship(
        "LifecycleStage", back_populates="template",
        lazy="selectin", cascade="all, delete-orphan",
        order_by="LifecycleStage.sort_order"
    )

    def __repr__(self) -> str:
        return f"<LifecycleTemplate(id={self.id}, name={self.name!r})>"


class LifecycleStage(TimestampMixin, Base):
    """生命周期阶段"""

    __tablename__ = "lifecycle_stages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    template_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("lifecycle_templates.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(128), nullable=False)
    stage_type: Mapped[str] = mapped_column(
        String(32), nullable=False, default="custom"
    )  # drafting|review|signing|execution|renewal|termination|archived|custom
    sort_order: Mapped[int] = mapped_column(Integer, nullable=False, default=0)
    description: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    color: Mapped[Optional[str]] = mapped_column(String(16), nullable=True)  # 显示颜色
    is_required: Mapped[bool] = mapped_column(Boolean, nullable=False, default=True)
    auto_transition_days: Mapped[int] = mapped_column(Integer, nullable=False, default=0)  # 0=手动

    template: Mapped["LifecycleTemplate"] = relationship(
        "LifecycleTemplate", back_populates="stages"
    )

    def __repr__(self) -> str:
        return f"<LifecycleStage(id={self.id}, name={self.name!r}, order={self.sort_order})>"
```

在 Contract 类中追加两个字段（在 `milestones` relationship 后面）：
```python
    lifecycle_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lifecycle_templates.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    lifecycle_stage_id: Mapped[Optional[int]] = mapped_column(
        Integer, ForeignKey("lifecycle_stages.id", ondelete="SET NULL"),
        nullable=True, index=True
    )
    lifecycle: Mapped[Optional["LifecycleTemplate"]] = relationship("LifecycleTemplate", foreign_keys=[lifecycle_id])
    lifecycle_stage: Mapped[Optional["LifecycleStage"]] = relationship("LifecycleStage", foreign_keys=[lifecycle_stage_id])
    stage_logs: Mapped[list["ContractStageLog"]] = relationship(
        "ContractStageLog", back_populates="contract",
        lazy="selectin", cascade="all, delete-orphan",
        order_by="ContractStageLog.created_at.desc()"
    )
```

在文件末尾追加 ContractStageLog：
```python
class ContractStageLog(TimestampMixin, Base):
    """合同阶段流转日志"""

    __tablename__ = "contract_stage_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    contract_id: Mapped[int] = mapped_column(
        Integer, ForeignKey("contracts.id", ondelete="CASCADE"),
        nullable=False, index=True
    )
    lifecycle_id: Mapped[int] = mapped_column(Integer, nullable=False)
    from_stage_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    to_stage_id: Mapped[int] = mapped_column(Integer, nullable=False)
    from_stage_name: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)
    to_stage_name: Mapped[str] = mapped_column(String(128), nullable=False)
    triggered_by: Mapped[str] = mapped_column(
        String(16), nullable=False, default="manual"
    )  # manual|auto
    operator_id: Mapped[Optional[UUID]] = mapped_column(SAUUID(as_uuid=True), nullable=True)
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    contract: Mapped["Contract"] = relationship("Contract", back_populates="stage_logs")

    def __repr__(self) -> str:
        return f"<ContractStageLog(id={self.id}, contract={self.contract_id}, {self.from_stage_name}→{self.to_stage_name})>"
```

需要 import Boolean：在 datetime 导入后加 `from sqlalchemy import ..., Boolean`

**Verification:** 重启后端，检查 `/docs` 中 Schema 是否出现新模型

---

## Task 2: 数据库迁移

**Objective:** 创建新表并执行迁移

**Files:**
- Create: `backend/alembic/versions/xxxx_add_lifecycle_tables.py`

**Step 1:** 手动编写迁移 SQL（Alembic autogenerate 可能不会正确检测）

```bash
docker exec xone-postgres psql -U xone -d xone -c "
CREATE TABLE IF NOT EXISTS lifecycle_templates (
    id SERIAL PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id),
    name VARCHAR(128) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);"

docker exec xone-postgres psql -U xone -d xone -c "
CREATE TABLE IF NOT EXISTS lifecycle_stages (
    id SERIAL PRIMARY KEY,
    template_id INTEGER NOT NULL REFERENCES lifecycle_templates(id) ON DELETE CASCADE,
    name VARCHAR(128) NOT NULL,
    stage_type VARCHAR(32) NOT NULL DEFAULT 'custom',
    sort_order INTEGER NOT NULL DEFAULT 0,
    description TEXT,
    color VARCHAR(16),
    is_required BOOLEAN NOT NULL DEFAULT true,
    auto_transition_days INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);"

docker exec xone-postgres psql -U xone -d xone -c "
CREATE TABLE IF NOT EXISTS contract_stage_logs (
    id SERIAL PRIMARY KEY,
    contract_id INTEGER NOT NULL REFERENCES contracts(id) ON DELETE CASCADE,
    lifecycle_id INTEGER NOT NULL,
    from_stage_id INTEGER,
    to_stage_id INTEGER NOT NULL,
    from_stage_name VARCHAR(128),
    to_stage_name VARCHAR(128) NOT NULL,
    triggered_by VARCHAR(16) NOT NULL DEFAULT 'manual',
    operator_id UUID,
    notes TEXT,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);"

docker exec xone-postgres psql -U xone -d xone -c "
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS lifecycle_id INTEGER REFERENCES lifecycle_templates(id) ON DELETE SET NULL;
ALTER TABLE contracts ADD COLUMN IF NOT EXISTS lifecycle_stage_id INTEGER REFERENCES lifecycle_stages(id) ON DELETE SET NULL;
CREATE INDEX IF NOT EXISTS ix_contracts_lifecycle_id ON contracts(lifecycle_id);
CREATE INDEX IF NOT EXISTS ix_contracts_lifecycle_stage_id ON contracts(lifecycle_stage_id);"

docker exec xone-postgres psql -U xone -d xone -c "
CREATE INDEX IF NOT EXISTS ix_contract_stage_logs_contract_id ON contract_stage_logs(contract_id);
CREATE INDEX IF NOT EXISTS ix_lifecycle_stages_template_id ON lifecycle_stages(template_id);"
```

**Step 2:** 创建种子数据 — 2 套默认模板

```bash
# 需要先生成 admin user UUID
ADMIN_ID=$(docker exec xone-postgres psql -U xone -d xone -tAc "SELECT id FROM users WHERE username='admin' LIMIT 1;")

# 模板1: 标准合同流程
docker exec xone-postgres psql -U xone -d xone -c "
INSERT INTO lifecycle_templates (user_id, name, description, is_active)
VALUES ('$ADMIN_ID', '标准合同流程', '合同拟定→法务审核→合同签署→合同履约→合同归档', true);"
T1_ID=$(docker exec xone-postgres psql -U xone -d xone -tAc "SELECT id FROM lifecycle_templates WHERE name='标准合同流程' LIMIT 1;")

docker exec xone-postgres psql -U xone -d xone -c "
INSERT INTO lifecycle_stages (template_id, name, stage_type, sort_order, description, color, is_required) VALUES
($T1_ID, '合同拟定', 'drafting', 1, '起草合同文本，明确各方权利义务', '#3b82f6', true),
($T1_ID, '法务审核', 'review', 2, '法务部门审核合同条款合规性', '#f59e0b', true),
($T1_ID, '合同签署', 'signing', 3, '双方签字盖章，合同生效', '#10b981', true),
($T1_ID, '合同履约', 'execution', 4, '按合同约定执行各项条款', '#8b5cf6', true),
($T1_ID, '合同归档', 'archived', 5, '合同履行完毕后归档保存', '#6b7280', false);"

# 模板2: 含续约流程
docker exec xone-postgres psql -U xone -d xone -c "
INSERT INTO lifecycle_templates (user_id, name, description, is_active)
VALUES ('$ADMIN_ID', '含续约流程', '合同拟定→合同签署→合同履约→合同续约→合同停止', true);"
T2_ID=$(docker exec xone-postgres psql -U xone -d xone -tAc "SELECT id FROM lifecycle_templates WHERE name='含续约流程' LIMIT 1;")

docker exec xone-postgres psql -U xone -d xone -c "
INSERT INTO lifecycle_stages (template_id, name, stage_type, sort_order, description, color, is_required) VALUES
($T2_ID, '合同拟定', 'drafting', 1, '起草合同文本', '#3b82f6', true),
($T2_ID, '合同签署', 'signing', 2, '双方签署生效', '#10b981', true),
($T2_ID, '合同履约', 'execution', 3, '执行合同条款', '#8b5cf6', true),
($T2_ID, '合同续约', 'renewal', 4, '合同到期前评估并续约', '#ec4899', false),
($T2_ID, '合同停止', 'termination', 5, '合同终止不再执行', '#ef4444', false);"
```

**Verification:**
```bash
docker exec xone-postgres psql -U xone -d xone -c "SELECT t.name, s.name, s.sort_order FROM lifecycle_templates t JOIN lifecycle_stages s ON s.template_id=t.id ORDER BY t.id, s.sort_order;"
# 预期 10 行，2 模板各 5 阶段
```

---

## Task 3: 生命周期 Service 层

**Objective:** 实现模板和阶段的 CRUD 业务逻辑

**Files:**
- Modify: `backend/app/services/contract_service.py`

**Code:** 在文件末尾追加（Milestone CRUD 之后，Supplier CRUD 之前）：

```python
# ══════════════════════════════════════════════════════════════════════
#  生命周期模板 (LifecycleTemplate) CRUD
# ══════════════════════════════════════════════════════════════════════

from app.models.contract import LifecycleTemplate, LifecycleStage


async def list_lifecycle_templates(
    db: AsyncSession, user_id: UUID
) -> list[LifecycleTemplate]:
    """获取用户的所有生命周期模板（含阶段列表）"""
    stmt = (
        select(LifecycleTemplate)
        .where(LifecycleTemplate.user_id == user_id)
        .options(selectinload(LifecycleTemplate.stages))
        .order_by(LifecycleTemplate.updated_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


async def get_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID
) -> Optional[LifecycleTemplate]:
    """获取单个模板详情"""
    stmt = (
        select(LifecycleTemplate)
        .where(LifecycleTemplate.id == template_id, LifecycleTemplate.user_id == user_id)
        .options(selectinload(LifecycleTemplate.stages))
    )
    result = await db.execute(stmt)
    return result.scalar_one_or_none()


async def create_lifecycle_template(
    db: AsyncSession, user_id: UUID, data: dict
) -> LifecycleTemplate:
    """创建生命周期模板"""
    template = LifecycleTemplate(
        user_id=user_id,
        name=data["name"],
        description=data.get("description"),
        is_active=data.get("is_active", True),
    )
    db.add(template)
    await db.flush()
    await db.refresh(template)
    return template


async def update_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleTemplate]:
    """更新模板"""
    stmt = (
        select(LifecycleTemplate)
        .where(LifecycleTemplate.id == template_id, LifecycleTemplate.user_id == user_id)
        .options(selectinload(LifecycleTemplate.stages))
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return None

    for field in ("name", "description", "is_active"):
        if field in data:
            setattr(template, field, data[field])

    await db.flush()
    await db.refresh(template)
    return template


async def delete_lifecycle_template(
    db: AsyncSession, template_id: int, user_id: UUID
) -> bool:
    """删除模板（级联删除阶段）"""
    stmt = select(LifecycleTemplate).where(
        LifecycleTemplate.id == template_id, LifecycleTemplate.user_id == user_id
    )
    result = await db.execute(stmt)
    template = result.scalar_one_or_none()
    if not template:
        return False

    await db.delete(template)
    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  生命周期阶段 (LifecycleStage) CRUD
# ══════════════════════════════════════════════════════════════════════


async def add_lifecycle_stage(
    db: AsyncSession, template_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleStage]:
    """向模板添加一个阶段"""
    # 验证模板属于该用户
    tmpl = await get_lifecycle_template(db, template_id, user_id)
    if not tmpl:
        return None

    stage = LifecycleStage(
        template_id=template_id,
        name=data["name"],
        stage_type=data.get("stage_type", "custom"),
        sort_order=data.get("sort_order", 0),
        description=data.get("description"),
        color=data.get("color"),
        is_required=data.get("is_required", True),
        auto_transition_days=data.get("auto_transition_days", 0),
    )
    db.add(stage)
    await db.flush()
    await db.refresh(stage)
    return stage


async def update_lifecycle_stage(
    db: AsyncSession, stage_id: int, user_id: UUID, data: dict
) -> Optional[LifecycleStage]:
    """更新阶段"""
    stmt = (
        select(LifecycleStage)
        .where(LifecycleStage.id == stage_id)
        .options(selectinload(LifecycleStage.template))
    )
    result = await db.execute(stmt)
    stage = result.scalar_one_or_none()
    if not stage or stage.template.user_id != user_id:
        return None

    for field in (
        "name", "stage_type", "sort_order", "description",
        "color", "is_required", "auto_transition_days",
    ):
        if field in data:
            setattr(stage, field, data[field])

    await db.flush()
    await db.refresh(stage)
    return stage


async def delete_lifecycle_stage(
    db: AsyncSession, stage_id: int, user_id: UUID
) -> bool:
    """删除阶段"""
    stmt = (
        select(LifecycleStage)
        .where(LifecycleStage.id == stage_id)
        .options(selectinload(LifecycleStage.template))
    )
    result = await db.execute(stmt)
    stage = result.scalar_one_or_none()
    if not stage or stage.template.user_id != user_id:
        return False

    await db.delete(stage)
    await db.flush()
    return True


async def reorder_lifecycle_stages(
    db: AsyncSession, template_id: int, user_id: UUID, stage_ids: list[int]
) -> bool:
    """重排阶段顺序"""
    tmpl = await get_lifecycle_template(db, template_id, user_id)
    if not tmpl:
        return False

    for idx, stage_id in enumerate(stage_ids):
        stmt = select(LifecycleStage).where(
            LifecycleStage.id == stage_id,
            LifecycleStage.template_id == template_id,
        )
        result = await db.execute(stmt)
        stage = result.scalar_one_or_none()
        if stage:
            stage.sort_order = idx + 1

    await db.flush()
    return True


# ══════════════════════════════════════════════════════════════════════
#  合同生命周期流转
# ══════════════════════════════════════════════════════════════════════


async def get_contract_lifecycle(
    db: AsyncSession, contract_id: int, user_id: UUID
) -> Optional[dict]:
    """获取合同的当前生命周期状态"""
    contract = await get_contract(db, contract_id, user_id)
    if not contract:
        return None
    if not contract.lifecycle_id:
        return {"contract_id": contract_id, "has_lifecycle": False}

    # 获取模板
    tmpl = await get_lifecycle_template(db, contract.lifecycle_id, user_id)
    return {
        "contract_id": contract_id,
        "has_lifecycle": True,
        "template": _lifecycle_template_to_dict(tmpl) if tmpl else None,
        "current_stage": _lifecycle_stage_to_dict(contract.lifecycle_stage) if contract.lifecycle_stage else None,
        "current_stage_id": contract.lifecycle_stage_id,
    }


async def advance_contract_stage(
    db: AsyncSession, contract_id: int, user_id: UUID, operator_id: UUID, notes: Optional[str] = None
) -> Optional[dict]:
    """推进合同到生命周期下一阶段"""
    # 获取合同
    stmt = (
        select(Contract)
        .where(Contract.id == contract_id, Contract.user_id == user_id)
        .options(
            selectinload(Contract.lifecycle),
            selectinload(Contract.lifecycle_stage),
        )
    )
    result = await db.execute(stmt)
    contract = result.scalar_one_or_none()
    if not contract or not contract.lifecycle_id:
        return None

    # 获取模板的所有阶段
    tmpl = await get_lifecycle_template(db, contract.lifecycle_id, user_id)
    if not tmpl or not tmpl.stages:
        return None

    # 找到当前阶段的下一个阶段
    stages = sorted(tmpl.stages, key=lambda s: s.sort_order)
    current_idx = next(
        (i for i, s in enumerate(stages) if s.id == contract.lifecycle_stage_id),
        -1,
    )

    if current_idx == -1:
        # 尚未设置当前阶段 → 从第一阶段开始
        next_stage = stages[0]
    elif current_idx + 1 >= len(stages):
        # 已是最后阶段
        return {"error": "already_at_final_stage", "message": "已到达最后一个阶段，无法继续推进"}
    else:
        next_stage = stages[current_idx + 1]

    # 记录日志
    log = ContractStageLog(
        contract_id=contract_id,
        lifecycle_id=contract.lifecycle_id,
        from_stage_id=contract.lifecycle_stage_id,
        to_stage_id=next_stage.id,
        from_stage_name=contract.lifecycle_stage.name if contract.lifecycle_stage else None,
        to_stage_name=next_stage.name,
        triggered_by="manual",
        operator_id=operator_id,
        notes=notes,
    )
    db.add(log)

    # 更新合同当前阶段
    old_stage_id = contract.lifecycle_stage_id
    contract.lifecycle_stage_id = next_stage.id

    # 同步更新合同 status 字段（保持兼容）
    stage_to_status = {
        "drafting": "draft",
        "review": "draft",
        "signing": "signed",
        "execution": "in_progress",
        "renewal": "in_progress",
        "termination": "terminated",
        "archived": "completed",
    }
    new_status = stage_to_status.get(next_stage.stage_type)
    if new_status:
        contract.status = new_status

    await db.flush()
    await db.refresh(contract, ["lifecycle_stage"])

    return {
        "from_stage_id": old_stage_id,
        "to_stage_id": next_stage.id,
        "to_stage_name": next_stage.name,
        "current_stage": _lifecycle_stage_to_dict(contract.lifecycle_stage) if contract.lifecycle_stage else None,
        "log": _stage_log_to_dict(log),
    }


async def get_contract_stage_history(
    db: AsyncSession, contract_id: int, user_id: UUID
) -> list[ContractStageLog]:
    """获取合同阶段流转历史"""
    # 验证权限
    contract = await get_contract(db, contract_id, user_id)
    if not contract:
        return []

    stmt = (
        select(ContractStageLog)
        .where(ContractStageLog.contract_id == contract_id)
        .order_by(ContractStageLog.created_at.desc())
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())


# ── 序列化辅助 ──

def _lifecycle_template_to_dict(t) -> dict:
    return {
        "id": t.id,
        "user_id": str(t.user_id),
        "name": t.name,
        "description": t.description,
        "is_active": t.is_active,
        "stages": [_lifecycle_stage_to_dict(s) for s in (t.stages or [])],
        "created_at": t.created_at.isoformat() if t.created_at else None,
        "updated_at": t.updated_at.isoformat() if t.updated_at else None,
    }


def _lifecycle_stage_to_dict(s) -> dict:
    return {
        "id": s.id,
        "template_id": s.template_id,
        "name": s.name,
        "stage_type": s.stage_type,
        "sort_order": s.sort_order,
        "description": s.description,
        "color": s.color,
        "is_required": s.is_required,
        "auto_transition_days": s.auto_transition_days,
        "created_at": s.created_at.isoformat() if s.created_at else None,
        "updated_at": s.updated_at.isoformat() if s.updated_at else None,
    }


def _stage_log_to_dict(log) -> dict:
    return {
        "id": log.id,
        "contract_id": log.contract_id,
        "lifecycle_id": log.lifecycle_id,
        "from_stage_id": log.from_stage_id,
        "to_stage_id": log.to_stage_id,
        "from_stage_name": log.from_stage_name,
        "to_stage_name": log.to_stage_name,
        "triggered_by": log.triggered_by,
        "operator_id": str(log.operator_id) if log.operator_id else None,
        "notes": log.notes,
        "created_at": log.created_at.isoformat() if log.created_at else None,
    }
```

在 Contract 导入中追加：`from app.models.contract import ..., LifecycleTemplate, LifecycleStage, ContractStageLog`

---

## Task 4: 生命周期 API 端点

**Objective:** 在 contracts.py 中新增生命周期相关路由

**Files:**
- Modify: `backend/app/api/work/contracts.py`

**Code:** 在文件末尾（`# ── 供应商 (Supplier) 端点` 之前或 `# ── 仪表盘` 之后）追加：

```python
# ═══════════════════════════════════════════════════════════════════════
#  生命周期 Pydantic Schemas
# ═══════════════════════════════════════════════════════════════════════

class LifecycleTemplateCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    description: Optional[str] = Field(default=None)
    is_active: bool = Field(default=True)


class LifecycleTemplateUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    description: Optional[str] = Field(default=None)
    is_active: Optional[bool] = Field(default=None)


class LifecycleStageCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=128)
    stage_type: str = Field(
        default="custom",
        pattern="^(drafting|review|signing|execution|renewal|termination|archived|custom)$"
    )
    sort_order: int = Field(default=0, ge=0)
    description: Optional[str] = Field(default=None)
    color: Optional[str] = Field(default=None, max_length=16)
    is_required: bool = Field(default=True)
    auto_transition_days: int = Field(default=0, ge=0)


class LifecycleStageUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=128)
    stage_type: Optional[str] = Field(
        default=None,
        pattern="^(drafting|review|signing|execution|renewal|termination|archived|custom)$"
    )
    sort_order: Optional[int] = Field(default=None, ge=0)
    description: Optional[str] = Field(default=None)
    color: Optional[str] = Field(default=None, max_length=16)
    is_required: Optional[bool] = Field(default=None)
    auto_transition_days: Optional[int] = Field(default=None, ge=0)


class StageReorderRequest(BaseModel):
    stage_ids: list[int] = Field(..., min_length=1)


class AdvanceStageRequest(BaseModel):
    notes: Optional[str] = Field(default=None)


# ═══════════════════════════════════════════════════════════════════════
#  生命周期模板端点
# ═══════════════════════════════════════════════════════════════════════

@router.get("/lifecycle/templates", summary="获取生命周期模板列表")
async def get_lifecycle_templates(
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取当前用户的所有生命周期模板"""
    items = await contract_service.list_lifecycle_templates(db, user.id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [contract_service._lifecycle_template_to_dict(t) for t in items],
    }


@router.post("/lifecycle/templates", summary="创建生命周期模板")
async def create_lifecycle_template_endpoint(
    body: LifecycleTemplateCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """创建新的生命周期模板"""
    template = await contract_service.create_lifecycle_template(db, user.id, body.model_dump())
    return {
        "code": 0,
        "message": "模板创建成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.get("/lifecycle/templates/{template_id}", summary="获取模板详情")
async def get_lifecycle_template_endpoint(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """获取单个模板详情（含阶段列表）"""
    template = await contract_service.get_lifecycle_template(db, template_id, user.id)
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0,
        "message": "查询成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.patch("/lifecycle/templates/{template_id}", summary="更新模板")
async def update_lifecycle_template_endpoint(
    template_id: int,
    body: LifecycleTemplateUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    template = await contract_service.update_lifecycle_template(
        db, template_id, user.id, body.model_dump(exclude_none=True)
    )
    if not template:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0,
        "message": "模板更新成功",
        "data": contract_service._lifecycle_template_to_dict(template),
    }


@router.delete("/lifecycle/templates/{template_id}", summary="删除模板")
async def delete_lifecycle_template_endpoint(
    template_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await contract_service.delete_lifecycle_template(db, template_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"code": 0, "message": "模板删除成功", "data": None}


# ═══════════════════════════════════════════════════════════════════════
#  生命周期阶段端点
# ═══════════════════════════════════════════════════════════════════════

@router.post("/lifecycle/templates/{template_id}/stages", summary="添加阶段")
async def add_lifecycle_stage_endpoint(
    template_id: int,
    body: LifecycleStageCreate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stage = await contract_service.add_lifecycle_stage(
        db, template_id, user.id, body.model_dump()
    )
    if not stage:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {
        "code": 0,
        "message": "阶段添加成功",
        "data": contract_service._lifecycle_stage_to_dict(stage),
    }


@router.patch("/lifecycle/templates/{template_id}/stages/{stage_id}", summary="更新阶段")
async def update_lifecycle_stage_endpoint(
    template_id: int,
    stage_id: int,
    body: LifecycleStageUpdate,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    stage = await contract_service.update_lifecycle_stage(
        db, stage_id, user.id, body.model_dump(exclude_none=True)
    )
    if not stage:
        raise HTTPException(status_code=404, detail="阶段不存在")
    return {
        "code": 0,
        "message": "阶段更新成功",
        "data": contract_service._lifecycle_stage_to_dict(stage),
    }


@router.delete("/lifecycle/templates/{template_id}/stages/{stage_id}", summary="删除阶段")
async def delete_lifecycle_stage_endpoint(
    template_id: int,
    stage_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await contract_service.delete_lifecycle_stage(db, stage_id, user.id)
    if not success:
        raise HTTPException(status_code=404, detail="阶段不存在")
    return {"code": 0, "message": "阶段删除成功", "data": None}


@router.put("/lifecycle/templates/{template_id}/stages/reorder", summary="重排阶段")
async def reorder_lifecycle_stages_endpoint(
    template_id: int,
    body: StageReorderRequest,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    success = await contract_service.reorder_lifecycle_stages(
        db, template_id, user.id, body.stage_ids
    )
    if not success:
        raise HTTPException(status_code=404, detail="模板不存在")
    return {"code": 0, "message": "排序更新成功", "data": None}


# ═══════════════════════════════════════════════════════════════════════
#  合同生命周期流转端点
# ═══════════════════════════════════════════════════════════════════════

@router.get("/{contract_id}/lifecycle", summary="查看合同生命周期")
async def get_contract_lifecycle_endpoint(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """查看合同的当前生命周期状态"""
    data = await contract_service.get_contract_lifecycle(db, contract_id, user.id)
    if data is None:
        raise HTTPException(status_code=404, detail="合同不存在")
    return {"code": 0, "message": "查询成功", "data": data}


@router.post("/{contract_id}/lifecycle/advance", summary="推进阶段")
async def advance_contract_stage_endpoint(
    contract_id: int,
    body: Optional[AdvanceStageRequest] = None,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    """推进合同到下一生命周期阶段"""
    result = await contract_service.advance_contract_stage(
        db, contract_id, user.id, user.id,
        notes=body.notes if body else None,
    )
    if result is None:
        raise HTTPException(status_code=404, detail="合同不存在或未绑定生命周期")
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["message"])
    return {"code": 0, "message": "阶段推进成功", "data": result}


@router.get("/{contract_id}/lifecycle/history", summary="流转历史")
async def get_contract_stage_history_endpoint(
    contract_id: int,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    logs = await contract_service.get_contract_stage_history(db, contract_id, user.id)
    return {
        "code": 0,
        "message": "查询成功",
        "data": [contract_service._stage_log_to_dict(l) for l in logs],
    }
```

注意：这些新路由的 `/{contract_id}/lifecycle` 路径**必须放在**已有的 `/{contract_id}` 通用路由**之前**，否则会被参数化路由截获返回 422。

**路由顺序调整：** 查看 contracts.py 的已有路由顺序，确保 `/{contract_id}/lifecycle`、`/{contract_id}/lifecycle/advance`、`/{contract_id}/lifecycle/history` 在 `@router.get("/{contract_id}")` 之前。

---

## Task 5: 更新 ContractCreate/ContractUpdate Schema 支持 lifecycle 绑定

**Objective:** 合同创建/更新时可选择生命周期模板

**Files:**
- Modify: `backend/app/api/work/contracts.py`

在 ContractCreate 中添加：
```python
    lifecycle_id: Optional[int] = Field(default=None, gt=0, description="生命周期模板ID")
```

在 ContractUpdate 中添加：
```python
    lifecycle_id: Optional[int] = Field(default=None, gt=0, description="生命周期模板ID")
```

在 `create_contract` service 中添加 lifecycle 初始化逻辑 — 如果提供了 lifecycle_id，自动绑定模板并将当前阶段设为第一阶段。

在 `backend/app/services/contract_service.py` 的 `create_contract` 函数中，`db.refresh` 之后追加：
```python
    # 如果指定了生命周期模板，自动绑定
    if data.get("lifecycle_id"):
        tmpl = await get_lifecycle_template(db, data["lifecycle_id"], user_id)
        if tmpl and tmpl.stages:
            first_stage = sorted(tmpl.stages, key=lambda s: s.sort_order)[0]
            contract.lifecycle_id = tmpl.id
            contract.lifecycle_stage_id = first_stage.id
            await db.flush()
            await db.refresh(contract, ["lifecycle", "lifecycle_stage"])
```

同样在 `update_contract` 的 updatable 元组中添加 `"lifecycle_id"`：
```python
    updatable = (
        ...
        "requirement_no", "subject_no", "procurement_no", "subject_name",
        "lifecycle_id",  # 新增
    )
```

---

## Task 6: 更新序列化函数

**Objective:** _contract_to_dict 包含生命周期信息

**Files:**
- Modify: `backend/app/api/work/contracts.py`

在 `_contract_to_dict` 的返回字典中追加：
```python
        "lifecycle_id": ct.lifecycle_id,
        "lifecycle_stage_id": ct.lifecycle_stage_id,
        "lifecycle_stage_name": ct.lifecycle_stage.name if ct.lifecycle_stage else None,
```

---

## Task 7: 重启后端 + 创建表 + 种子数据

**Objective:** 执行 Task 2 的迁移 SQL 并重启后端验证 API

```bash
cd '/Users/hesse/AI Coding/Hermes/Project/XOne/backend'
lsof -ti:8000 | xargs kill -9 2>/dev/null
sleep 1
# 然后执行 Task 2 的所有 docker exec SQL
# 启动后端
./.venv/bin/uvicorn app.main:app --port 8000 --reload &
sleep 3
# 验证
curl -s http://localhost:8000/health
# 获取 token
TOKEN=$(curl -s -X POST http://localhost:8000/api/v1/auth/login \
  -H 'Content-Type: application/json' \
  -d '{"username":"admin","password":"admin"}' | python3 -c "import sys,json; print(json.load(sys.stdin)['access_token'])")
# 测试生命周期 API
curl -s http://localhost:8000/api/v1/work/contracts/lifecycle/templates \
  -H "Authorization: Bearer $TOKEN" | python3 -m json.tool | head -30
```

---

## Task 8: 前端 Store 扩展 (lifecycle store)

**Objective:** 为生命周期管理添加 Zustand store

**Files:**
- Create: `frontend/src/plugins/builtin/work/contracts/lifecycleStore.ts`

```typescript
// 生命周期管理 Store
import { create } from 'zustand'
import { apiGet, apiPost, apiPatch, apiDelete, apiPut } from '@/lib/api'

export interface LifecycleStage {
  id: number
  template_id: number
  name: string
  stage_type: string
  sort_order: number
  description?: string
  color?: string
  is_required: boolean
  auto_transition_days: number
  created_at?: string
  updated_at?: string
}

export interface LifecycleTemplate {
  id: number
  user_id: string
  name: string
  description?: string
  is_active: boolean
  stages: LifecycleStage[]
  created_at?: string
  updated_at?: string
}

export interface StageLog {
  id: number
  contract_id: number
  lifecycle_id: number
  from_stage_id?: number
  to_stage_id: number
  from_stage_name?: string
  to_stage_name: string
  triggered_by: string
  operator_id?: string
  notes?: string
  created_at?: string
}

interface LifecycleState {
  templates: LifecycleTemplate[]
  loading: boolean
  error: string | null

  fetchTemplates: () => Promise<void>
  createTemplate: (data: { name: string; description?: string }) => Promise<LifecycleTemplate | null>
  updateTemplate: (id: number, data: Partial<LifecycleTemplate>) => Promise<LifecycleTemplate | null>
  deleteTemplate: (id: number) => Promise<boolean>

  addStage: (templateId: number, data: Partial<LifecycleStage>) => Promise<LifecycleStage | null>
  updateStage: (templateId: number, stageId: number, data: Partial<LifecycleStage>) => Promise<LifecycleStage | null>
  deleteStage: (templateId: number, stageId: number) => Promise<boolean>
  reorderStages: (templateId: number, stageIds: number[]) => Promise<boolean>
}

export const useLifecycleStore = create<LifecycleState>((set, get) => ({
  templates: [],
  loading: false,
  error: null,

  fetchTemplates: async () => {
    set({ loading: true, error: null })
    try {
      const res = await apiGet<LifecycleTemplate[]>('/work/contracts/lifecycle/templates')
      set({ templates: res.data })
    } catch (e: any) {
      console.error('获取生命周期模板失败:', e)
      set({ error: e?.message || '获取失败' })
    } finally {
      set({ loading: false })
    }
  },

  createTemplate: async (data) => {
    try {
      const res = await apiPost<LifecycleTemplate>('/work/contracts/lifecycle/templates', data)
      const { templates } = get()
      set({ templates: [res.data, ...templates] })
      return res.data
    } catch (e: any) {
      console.error('创建模板失败:', e)
      return null
    }
  },

  updateTemplate: async (id, data) => {
    try {
      const res = await apiPatch<LifecycleTemplate>(`/work/contracts/lifecycle/templates/${id}`, data)
      const { templates } = get()
      set({ templates: templates.map(t => t.id === id ? res.data : t) })
      return res.data
    } catch (e: any) {
      console.error('更新模板失败:', e)
      return null
    }
  },

  deleteTemplate: async (id) => {
    try {
      await apiDelete(`/work/contracts/lifecycle/templates/${id}`)
      const { templates } = get()
      set({ templates: templates.filter(t => t.id !== id) })
      return true
    } catch (e: any) {
      console.error('删除模板失败:', e)
      return false
    }
  },

  addStage: async (templateId, data) => {
    try {
      const res = await apiPost<LifecycleStage>(
        `/work/contracts/lifecycle/templates/${templateId}/stages`,
        data
      )
      const { templates } = get()
      set({
        templates: templates.map(t =>
          t.id === templateId
            ? { ...t, stages: [...t.stages, res.data] }
            : t
        ),
      })
      return res.data
    } catch (e: any) {
      console.error('添加阶段失败:', e)
      return null
    }
  },

  updateStage: async (templateId, stageId, data) => {
    try {
      const res = await apiPatch<LifecycleStage>(
        `/work/contracts/lifecycle/templates/${templateId}/stages/${stageId}`,
        data
      )
      const { templates } = get()
      set({
        templates: templates.map(t =>
          t.id === templateId
            ? {
                ...t,
                stages: t.stages.map(s => (s.id === stageId ? res.data : s)),
              }
            : t
        ),
      })
      return res.data
    } catch (e: any) {
      console.error('更新阶段失败:', e)
      return null
    }
  },

  deleteStage: async (templateId, stageId) => {
    try {
      await apiDelete(`/work/contracts/lifecycle/templates/${templateId}/stages/${stageId}`)
      const { templates } = get()
      set({
        templates: templates.map(t =>
          t.id === templateId
            ? { ...t, stages: t.stages.filter(s => s.id !== stageId) }
            : t
        ),
      })
      return true
    } catch (e: any) {
      console.error('删除阶段失败:', e)
      return false
    }
  },

  reorderStages: async (templateId, stageIds) => {
    try {
      await apiPut(
        `/work/contracts/lifecycle/templates/${templateId}/stages/reorder`,
        { stage_ids: stageIds }
      )
      // 重新获取确保顺序正确
      const res = await apiGet<LifecycleTemplate>(
        `/work/contracts/lifecycle/templates/${templateId}`
      )
      const { templates } = get()
      set({
        templates: templates.map(t => (t.id === templateId ? res.data : t)),
      })
      return true
    } catch (e: any) {
      console.error('排序阶段失败:', e)
      return false
    }
  },
}))
```

---

## Task 9: 前端侧边栏 — 添加"生命周期管理"子菜单

**Objective:** 侧边栏"合同管理"折叠项下新增入口

**Files:**
- Modify: `frontend/src/components/layout/sidebar-config.tsx`

在 `work.contracts` children 中追加（在 `work.contracts.suppliers` 之后）：
```typescript
          {
            id: 'work.contracts.lifecycle',
            icon: GitBranch,  // 需要在顶部导入
            label: '生命周期管理',
            path: '/work/contracts/lifecycle',
          },
```

同时在顶部 import 中添加：
```typescript
  GitBranch,
``` (from 'lucide-react')

---

## Task 10: 前端页面 — 生命周期模板管理页

**Objective:** 创建 `/work/contracts/lifecycle` 页面

**Files:**
- Create: `frontend/src/app/[locale]/work/contracts/lifecycle/page.tsx`

参照现有 contracts/suppliers/page.tsx 的模式，创建页面使用 ContractLifecycleManager 组件。

---

## Task 11: 前端组件 — ContractLifecycleManager

**Objective:** 生命周期模板列表 + 阶段编辑器

**Files:**
- Create: `frontend/src/plugins/builtin/work/contracts/ContractLifecycleManager.tsx`

组件内容：
- 模板列表（卡片式，显示名称/描述/阶段数）
- 新建模板按钮 + 对话框
- 点击模板展开阶段列表（可拖拽排序）
- 每个阶段显示名称/类型标签/颜色标记
- 添加/编辑/删除阶段按钮
- 阶段编辑器对话框（名称/类型/颜色/是否必经/自动流转天数）

状态管理：使用 lifecycleStore

---

## Task 12: 前端 — 合同表单增加生命周期模板选择

**Objective:** ContractForm 中添加 lifecycle_id 下拉框

**Files:**
- Modify: `frontend/src/plugins/builtin/work/contracts/ContractForm.tsx`

在表单中添加生命周期模板下拉选择（可选）：
- 加载 lifecycleStore 的 templates 列表
- Select 组件绑定 lifecycle_id
- onChange 时更新表单数据

---

## Task 13: 前端 — 合同详情页集成生命周期

**Objective:** ContractDetail 中显示当前生命周期阶段 + 推进按钮

**Files:**
- Modify: `frontend/src/plugins/builtin/work/contracts/ContractDetail.tsx`
- Create: `frontend/src/plugins/builtin/work/contracts/LifecyclePanel.tsx`

LifecyclePanel 组件：
- 显示当前生命周期模板名称 + 阶段进度条（所有阶段横向排列，当前阶段高亮）
- "推进到下一阶段"按钮（确认对话框）
- 流转历史时间线

---

## Task 14: 验证 — 端到端测试

**Objective:** 浏览器验证全流程

1. 访问 `/work/contracts/lifecycle` → 应看到 2 套默认模板
2. 创建自定义模板 + 添加阶段 → 保存成功
3. 编辑阶段 → 拖拽排序 → 验证
4. 创建合同时选择生命周期模板
5. 合同详情页 → 查看生命周期面板
6. 点击推进 → 阶段变更 + 历史记录

---

## 执行顺序

Tasks 1-2 可并行（模型 + SQL 独立）
Task 3 依赖 Task 1（模型存在才能 import）
Task 4 依赖 Task 3（service 函数存在才能调用）
Task 5-6 依赖 Task 1-4
Task 7 是执行验证
Tasks 8-11 可并行（前端独立于后端）
Tasks 12-13 依赖 Task 8（前端 store 存在）
Task 14 是最终验证

**推荐执行策略：**
- 第一批（后端）：Task 1+2 → Task 3 → Task 4+5+6 → Task 7 验证
- 第二批（前端）：Task 8+9+10+11 → Task 12+13 → Task 14 验证
