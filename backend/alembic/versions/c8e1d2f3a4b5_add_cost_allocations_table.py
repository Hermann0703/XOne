"""add cost_allocations table

Revision ID: c8e1d2f3a4b5
Revises: a7f1c3e9d2b4
Create Date: 2026-05-16 20:11:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c8e1d2f3a4b5'
down_revision: Union[str, None] = '08a753c4bd91'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('cost_allocations',
    sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
    sa.Column('contract_id', sa.Integer(), nullable=False, comment='所属合同ID'),
    sa.Column('department_id', sa.String(length=16), nullable=False, comment='部门ID'),
    sa.Column('amount', sa.Numeric(precision=18, scale=2), nullable=True, comment='分摊金额'),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
    sa.ForeignKeyConstraint(['department_id'], ['departments.id'], ondelete='RESTRICT'),
    sa.PrimaryKeyConstraint('id'),
    sa.UniqueConstraint('contract_id', 'department_id', name='uq_contract_dept')
    )
    op.create_index(op.f('ix_cost_allocations_contract_id'), 'cost_allocations', ['contract_id'], unique=False)
    op.create_index(op.f('ix_cost_allocations_department_id'), 'cost_allocations', ['department_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_cost_allocations_department_id'), table_name='cost_allocations')
    op.drop_index(op.f('ix_cost_allocations_contract_id'), table_name='cost_allocations')
    op.drop_table('cost_allocations')
