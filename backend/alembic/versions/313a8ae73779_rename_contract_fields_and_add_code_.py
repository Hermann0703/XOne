"""rename contract fields and add code fields

Revision ID: 313a8ae73779
Revises: 3c3f78f2c683
Create Date: 2026-05-11 13:58:41.492892

变更内容:
  - 列重命名: title→contract_name, party_a→buyer, party_b→supplier
  - 新增列: requirement_no, subject_no, procurement_no, subject_name
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '313a8ae73779'
down_revision: Union[str, None] = '3c3f78f2c683'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ---- 列重命名（保留数据） ----
    # title → contract_name（合同标题 → 合同名称）
    op.alter_column(
        'contracts', 'title',
        new_column_name='contract_name',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.contract_name IS '合同名称'")

    # party_a → buyer（甲方 → 采购方）
    op.alter_column(
        'contracts', 'party_a',
        new_column_name='buyer',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.buyer IS '采购方'")

    # party_b → supplier（乙方 → 供应商）
    op.alter_column(
        'contracts', 'party_b',
        new_column_name='supplier',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.supplier IS '供应商'")

    # ---- 新增列 ----
    op.add_column(
        'contracts',
        sa.Column('requirement_no', sa.String(length=32), nullable=True, comment='需求编号')
    )
    op.add_column(
        'contracts',
        sa.Column('subject_no', sa.String(length=32), nullable=True, comment='标的编号')
    )
    op.add_column(
        'contracts',
        sa.Column('procurement_no', sa.String(length=32), nullable=True, comment='采购记录编号')
    )
    op.add_column(
        'contracts',
        sa.Column('subject_name', sa.String(length=256), nullable=True, comment='标的名称')
    )


def downgrade() -> None:
    # ---- 删除新增列 ----
    op.drop_column('contracts', 'subject_name')
    op.drop_column('contracts', 'procurement_no')
    op.drop_column('contracts', 'subject_no')
    op.drop_column('contracts', 'requirement_no')

    # ---- 列重命名（反向） ----
    # contract_name → title
    op.alter_column(
        'contracts', 'contract_name',
        new_column_name='title',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.title IS '合同标题'")

    # buyer → party_a
    op.alter_column(
        'contracts', 'buyer',
        new_column_name='party_a',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.party_a IS '甲方'")

    # supplier → party_b
    op.alter_column(
        'contracts', 'supplier',
        new_column_name='party_b',
        existing_type=sa.String(256),
        existing_nullable=False,
    )
    op.execute("COMMENT ON COLUMN contracts.party_b IS '乙方'")
