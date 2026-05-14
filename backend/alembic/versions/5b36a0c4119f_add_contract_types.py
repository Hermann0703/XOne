"""add_contract_types

Revision ID: 5b36a0c4119f
Revises: 2b2c3f72615e
Create Date: 2026-05-12 21:23:15.246596

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = '5b36a0c4119f'
down_revision: Union[str, None] = '2b2c3f72615e'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """contract_types 表已由 sync_all_models 迁移创建，此处为标记迁移"""
    pass


def downgrade() -> None:
    """无操作 — 表由 sync_all_models 管理"""
    pass
