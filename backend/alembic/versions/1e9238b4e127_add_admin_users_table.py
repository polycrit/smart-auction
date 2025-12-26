"""add_admin_users_table

Revision ID: 1e9238b4e127
Revises: c1a2b3c4d5e6
Create Date: 2025-12-26 00:30:00.097491

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '1e9238b4e127'
down_revision: Union[str, Sequence[str], None] = 'c1a2b3c4d5e6'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    op.create_table('admin_users',
        sa.Column('id', sa.UUID(), nullable=False),
        sa.Column('username', sa.Text(), nullable=False),
        sa.Column('password_hash', sa.Text(), nullable=False),
        sa.Column('is_active', sa.Boolean(), nullable=False),
        sa.Column('is_superuser', sa.Boolean(), nullable=False),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.Column('last_login', sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('username')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('admin_users')
