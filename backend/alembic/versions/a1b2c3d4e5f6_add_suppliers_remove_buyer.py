"""add suppliers table, replace buyer/supplier varchar with supplier_id FK

Revision ID: a1b2c3d4e5f6
Revises: 313a8ae73779
Create Date: 2026-05-11 15:41:00.000000

变更内容:
  - 创建 suppliers 表（供应商主数据）
  - contracts: 新增 supplier_id 列（UUID FK → suppliers.id）
  - contracts: 删除 buyer 列（原 party_a → buyer，已废弃）
  - contracts: 删除 supplier 列（原 party_b → supplier，移至 suppliers 表）
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'a1b2c3d4e5f6'
down_revision: Union[str, None] = '313a8ae73779'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── 1. 创建 suppliers 表 ──
    op.create_table(
        'suppliers',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=256), nullable=False, comment='供应商名称'),
        sa.Column('contact_person', sa.String(length=128), nullable=True, comment='联系人'),
        sa.Column('contact_phone', sa.String(length=32), nullable=True, comment='联系电话'),
        sa.Column('address', sa.String(length=512), nullable=True, comment='地址'),
        sa.Column('business_license', sa.String(length=128), nullable=True, comment='营业执照号'),
        sa.Column('tax_id', sa.String(length=64), nullable=True, comment='税号'),
        sa.Column('bank_name', sa.String(length=256), nullable=True, comment='开户行'),
        sa.Column('bank_account', sa.String(length=64), nullable=True, comment='银行账号'),
        sa.Column('rating', sa.String(length=32), nullable=True, comment='评级'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='active', comment='状态'),
        sa.Column('notes', sa.Text(), nullable=True, comment='备注'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_suppliers_user_id'), 'suppliers', ['user_id'], unique=False)

    # ── 2. contracts: 新增 supplier_id 列 ──
    op.add_column(
        'contracts',
        sa.Column('supplier_id', postgresql.UUID(as_uuid=True), nullable=True, comment='供应商ID'),
    )
    op.create_foreign_key(
        'fk_contracts_supplier_id',
        'contracts', 'suppliers',
        ['supplier_id'], ['id'],
        ondelete='SET NULL',
    )
    op.create_index(op.f('ix_contracts_supplier_id'), 'contracts', ['supplier_id'], unique=False)

    # ── 3. contracts: 删除 buyer 列 ──
    op.drop_column('contracts', 'buyer')

    # ── 4. contracts: 删除 supplier 列 ──
    op.drop_column('contracts', 'supplier')


def downgrade() -> None:
    # ── 1. 恢复 supplier (varchar) 列 ──
    op.add_column(
        'contracts',
        sa.Column('supplier', sa.String(length=256), nullable=True, comment='供应商'),
    )

    # ── 2. 恢复 buyer (varchar) 列 ──
    op.add_column(
        'contracts',
        sa.Column('buyer', sa.String(length=256), nullable=True, comment='采购方'),
    )

    # ── 3. 删除 supplier_id 外键和列 ──
    op.drop_index(op.f('ix_contracts_supplier_id'), table_name='contracts')
    op.drop_constraint('fk_contracts_supplier_id', 'contracts', type_='foreignkey')
    op.drop_column('contracts', 'supplier_id')

    # ── 4. 删除 suppliers 表 ──
    op.drop_index(op.f('ix_suppliers_user_id'), table_name='suppliers')
    op.drop_table('suppliers')
