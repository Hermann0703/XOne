"""add auto_renewal fields to contracts

Revision ID: 2b2c3f72615e
Revises: b261a29edb50
Create Date: 2026-05-12 12:49:31.163976

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '2b2c3f72615e'
down_revision: Union[str, None] = 'b261a29edb50'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 先用 server_default 兼容已有行，再移除默认值
    op.add_column('contracts', sa.Column('auto_renewal', sa.Boolean(), nullable=False,
                  server_default=sa.text('false'), comment='是否启用自动续约'))
    op.add_column('contracts', sa.Column('renewal_remind_days', sa.Integer(), nullable=False,
                  server_default=sa.text('7'), comment='续约提醒天数(到期前N天触发)'))
    # 移除 server_default（后续由应用层控制）
    op.alter_column('contracts', 'auto_renewal', server_default=None)
    op.alter_column('contracts', 'renewal_remind_days', server_default=None)


def downgrade() -> None:
    op.drop_column('contracts', 'renewal_remind_days')
    op.drop_column('contracts', 'auto_renewal')
