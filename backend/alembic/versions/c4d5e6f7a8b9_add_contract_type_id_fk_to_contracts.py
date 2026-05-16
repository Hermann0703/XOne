"""add contract_type_id FK to contracts

Revision ID: c4d5e6f7a8b9
Revises: 5b36a0c4119f
Create Date: 2026-05-13 14:00:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c4d5e6f7a8b9'
down_revision: Union[str, None] = '5b36a0c4119f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = "5b36a0c4119f"


def upgrade() -> None:
    # 1. 添加 contract_type_id 列 (先 nullable，数据迁移后再改为 NOT NULL)
    op.add_column('contracts', sa.Column(
        'contract_type_id', sa.Integer(), nullable=True,
        comment='合同类型ID (FK → contract_types.id)'
    ))
    # 2. 创建 FK 约束
    op.create_foreign_key(
        'fk_contracts_contract_type_id',
        'contracts', 'contract_types',
        ['contract_type_id'], ['id'],
        ondelete='SET NULL'
    )
    # 3. 根据已有的 contract_type 字符串，回填 contract_type_id
    #    (匹配 contract_types 表的 code 字段)
    op.execute("""
        UPDATE contracts c
        SET contract_type_id = ct.id
        FROM contract_types ct
        WHERE c.contract_type = ct.code
    """)
    # 4. 创建索引
    op.create_index('ix_contracts_contract_type_id', 'contracts', ['contract_type_id'])


def downgrade() -> None:
    op.drop_index('ix_contracts_contract_type_id', table_name='contracts')
    op.drop_constraint('fk_contracts_contract_type_id', 'contracts', type_='foreignkey')
    op.drop_column('contracts', 'contract_type_id')
