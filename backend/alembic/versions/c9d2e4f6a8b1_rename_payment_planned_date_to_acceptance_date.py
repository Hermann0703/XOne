"""rename payment planned date to acceptance date

Revision ID: c9d2e4f6a8b1
Revises: b8c2d4e6f8a0
Create Date: 2026-05-15 21:05:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c9d2e4f6a8b1'
down_revision: Union[str, None] = 'b8c2d4e6f8a0'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.alter_column(
        'contract_payments',
        'planned_payment_date',
        new_column_name='acceptance_date',
        existing_type=sa.Date(),
        existing_nullable=True,
        comment='验收日期',
        existing_comment='预计付款日期',
    )


def downgrade() -> None:
    op.alter_column(
        'contract_payments',
        'acceptance_date',
        new_column_name='planned_payment_date',
        existing_type=sa.Date(),
        existing_nullable=True,
        comment='预计付款日期',
        existing_comment='验收日期',
    )
