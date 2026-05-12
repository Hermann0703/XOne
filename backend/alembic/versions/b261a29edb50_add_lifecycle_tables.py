"""add lifecycle tables

Revision ID: b261a29edb50
Revises: a1b2c3d4e5f6
Create Date: 2026-05-11 21:53:08.843611

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = 'b261a29edb50'
down_revision: Union[str, None] = 'a1b2c3d4e5f6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── Add lifecycle columns to contracts (FKs created AFTER target tables exist) ──
    op.add_column('contracts', sa.Column('lifecycle_id', sa.Integer(), nullable=True))
    op.add_column('contracts', sa.Column('lifecycle_stage_id', sa.Integer(), nullable=True))

    # ── Create lifecycle_templates ──
    op.create_table('lifecycle_templates',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('user_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('is_active', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['user_id'], ['users.id'], ),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_lifecycle_templates_user_id', 'lifecycle_templates', ['user_id'], unique=False)

    # ── Create lifecycle_stages ──
    op.create_table('lifecycle_stages',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('template_id', sa.Integer(), nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('stage_type', sa.String(length=32), nullable=False, server_default=sa.text("'custom'")),
        sa.Column('sort_order', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('color', sa.String(length=16), nullable=True),
        sa.Column('is_required', sa.Boolean(), nullable=False, server_default=sa.text('true')),
        sa.Column('auto_transition_days', sa.Integer(), nullable=False, server_default=sa.text('0')),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['template_id'], ['lifecycle_templates.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_lifecycle_stages_template_id', 'lifecycle_stages', ['template_id'], unique=False)

    # ── Create contract_stage_logs ──
    op.create_table('contract_stage_logs',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('contract_id', sa.Integer(), nullable=False),
        sa.Column('lifecycle_id', sa.Integer(), nullable=False),
        sa.Column('from_stage_id', sa.Integer(), nullable=True),
        sa.Column('to_stage_id', sa.Integer(), nullable=False),
        sa.Column('from_stage_name', sa.String(length=128), nullable=True),
        sa.Column('to_stage_name', sa.String(length=128), nullable=False),
        sa.Column('triggered_by', sa.String(length=16), nullable=False, server_default=sa.text("'manual'")),
        sa.Column('operator_id', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('notes', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.Column('updated_at', sa.DateTime(timezone=True), server_default=sa.text('now()')),
        sa.ForeignKeyConstraint(['contract_id'], ['contracts.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )
    op.create_index('ix_contract_stage_logs_contract_id', 'contract_stage_logs', ['contract_id'], unique=False)

    # ── Add indexes and foreign keys for new contract columns ──
    op.create_index('ix_contracts_lifecycle_id', 'contracts', ['lifecycle_id'], unique=False)
    op.create_index('ix_contracts_lifecycle_stage_id', 'contracts', ['lifecycle_stage_id'], unique=False)
    op.create_foreign_key(None, 'contracts', 'lifecycle_templates', ['lifecycle_id'], ['id'], ondelete='SET NULL')
    op.create_foreign_key(None, 'contracts', 'lifecycle_stages', ['lifecycle_stage_id'], ['id'], ondelete='SET NULL')


def downgrade() -> None:
    # Drop lifecycle FKs and indexes on contracts
    op.drop_constraint(None, 'contracts', type_='foreignkey')  # lifecycle_stages FK
    op.drop_constraint(None, 'contracts', type_='foreignkey')  # lifecycle_templates FK
    op.drop_index('ix_contracts_lifecycle_stage_id', table_name='contracts')
    op.drop_index('ix_contracts_lifecycle_id', table_name='contracts')

    # Drop added columns
    op.drop_column('contracts', 'lifecycle_stage_id')
    op.drop_column('contracts', 'lifecycle_id')

    # Drop tables
    op.drop_table('contract_stage_logs')
    op.drop_table('lifecycle_stages')
    op.drop_table('lifecycle_templates')
