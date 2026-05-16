"""add contract payments and payment attachments

Revision ID: b8c2d4e6f8a0
Revises: a7f1c3e9d2b4
Create Date: 2026-05-15 15:10:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b8c2d4e6f8a0'
down_revision: Union[str, None] = 'a7f1c3e9d2b4'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table(
        'contract_payments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('contract_id', sa.Integer(), nullable=False, comment='所属合同ID'),
        sa.Column('name', sa.String(length=128), nullable=False, comment='期次名称'),
        sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=True, comment='付款金额'),
        sa.Column('currency', sa.String(length=8), nullable=False, server_default='CNY', comment='币种'),
        sa.Column('planned_payment_date', sa.Date(), nullable=True, comment='预计付款日期'),
        sa.Column('actual_payment_date', sa.Date(), nullable=True, comment='实际付款日期'),
        sa.Column('status', sa.String(length=32), nullable=False, server_default='pending', comment='状态: pending/paid/cancelled'),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default='0', comment='排序'),
        sa.Column('notes', sa.Text(), nullable=True, comment='备注'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contract_payments_contract_id'), 'contract_payments', ['contract_id'], unique=False)
    op.create_index('ix_contract_payments_contract_status', 'contract_payments', ['contract_id', 'status'], unique=False)
    op.create_index('ix_contract_payments_contract_order', 'contract_payments', ['contract_id', 'sort_order'], unique=False)

    op.create_table(
        'contract_payment_attachments',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('payment_id', sa.Integer(), nullable=False, comment='付款期次ID'),
        sa.Column('original_name', sa.String(length=255), nullable=False, comment='原始文件名'),
        sa.Column('stored_name', sa.String(length=255), nullable=False, comment='存储文件名'),
        sa.Column('file_path', sa.String(length=1024), nullable=False, comment='本地文件路径'),
        sa.Column('file_size', sa.BigInteger(), nullable=False, comment='文件大小(bytes)'),
        sa.Column('content_type', sa.String(length=128), nullable=False, server_default='application/pdf', comment='MIME类型'),
        sa.Column('file_ext', sa.String(length=16), nullable=False, server_default='pdf', comment='扩展名'),
        sa.Column('uploaded_by', postgresql.UUID(as_uuid=True), nullable=True, comment='上传人'),
        sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['payment_id'], ['contract_payments.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['uploaded_by'], ['users.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_contract_payment_attachments_payment_id'), 'contract_payment_attachments', ['payment_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_contract_payment_attachments_payment_id'), table_name='contract_payment_attachments')
    op.drop_table('contract_payment_attachments')
    op.drop_index('ix_contract_payments_contract_order', table_name='contract_payments')
    op.drop_index('ix_contract_payments_contract_status', table_name='contract_payments')
    op.drop_index(op.f('ix_contract_payments_contract_id'), table_name='contract_payments')
    op.drop_table('contract_payments')
