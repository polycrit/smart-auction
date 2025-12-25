"""Add image_url to lots table

Revision ID: c1a2b3c4d5e6
Revises: b89c2e15c283
Create Date: 2025-12-24

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = 'c1a2b3c4d5e6'
down_revision: Union[str, Sequence[str], None] = 'b89c2e15c283'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Add image_url column to lots table."""
    op.add_column('lots', sa.Column('image_url', sa.Text(), nullable=True))


def downgrade() -> None:
    """Remove image_url column from lots table."""
    op.drop_column('lots', 'image_url')
