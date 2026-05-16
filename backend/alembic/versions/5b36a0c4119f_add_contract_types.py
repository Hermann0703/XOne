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
    """创建 contract_types 表"""
    op.create_table(
        'contract_types',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=64), nullable=False, comment='类型名称'),
        sa.Column('code', sa.String(length=32), nullable=False, comment='类型编码（英文标识）'),
        sa.Column('description', sa.Text(), nullable=True, comment='描述'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0', comment='排序'),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default='true', comment='是否启用'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('user_id', 'code', name='uq_contract_types_user_code'),
    )
    op.create_index(op.f('ix_contract_types_id'), 'contract_types', ['id'], unique=False)
    op.create_index(op.f('ix_contract_types_user_id'), 'contract_types', ['user_id'], unique=False)


def downgrade() -> None:
    """删除 contract_types 表"""
    op.drop_table('contract_types')
