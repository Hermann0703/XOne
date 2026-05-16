"""add departments table

Revision ID: a7f1c3e9d2b4
Revises: eb0a562d435f
Create Date: 2026-05-15 14:20:00.000000

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'a7f1c3e9d2b4'
down_revision: Union[str, None] = 'eb0a562d435f'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    op.create_table('departments',
    sa.Column('id', sa.String(length=16), nullable=False, comment='部门ID（纯数字字符串，允许首位为0）'),
    sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False, comment='用户ID'),
    sa.Column('name', sa.String(length=128), nullable=False, comment='部门名称'),
    sa.Column('leader', sa.String(length=64), nullable=True, comment='负责人'),
    sa.Column('business_contact', sa.String(length=64), nullable=True, comment='业务对接人'),
    sa.Column('it_contact', sa.String(length=64), nullable=True, comment='IT对接人'),
    sa.Column('remarks', sa.Text(), nullable=True, comment='备注'),
    sa.Column('created_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.Column('updated_at', sa.DateTime(), server_default=sa.text('now()'), nullable=False),
    sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index(op.f('ix_departments_user_id'), 'departments', ['user_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_departments_user_id'), table_name='departments')
    op.drop_table('departments')
