"""Initial migration: create all tables

Revision ID: b89c2e15c283
Revises:
Create Date: 2025-12-23 23:07:29.177816

"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

# revision identifiers, used by Alembic.
revision: str = 'b89c2e15c283'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Upgrade schema."""
    # Create vendors table
    op.create_table(
        'vendors',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('email', sa.Text(), nullable=False),
        sa.Column('comment', sa.Text(), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('email')
    )

    # Create auctions table
    op.create_table(
        'auctions',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('slug', sa.Text(), nullable=False),
        sa.Column('title', sa.Text(), nullable=False),
        sa.Column('description', sa.Text(), nullable=True),
        sa.Column('status', sa.Text(), nullable=False, server_default='draft'),
        sa.Column('start_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('created_by', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('slug')
    )

    # Create participants table
    op.create_table(
        'participants',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('auction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('vendor_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('invite_token', sa.Text(), nullable=False),
        sa.Column('blocked', sa.Boolean(), nullable=False, server_default='false'),
        sa.Column('created_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['auction_id'], ['auctions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['vendor_id'], ['vendors.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('invite_token')
    )

    # Create lots table
    op.create_table(
        'lots',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('auction_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lot_number', sa.Integer(), nullable=False),
        sa.Column('name', sa.Text(), nullable=False),
        sa.Column('base_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('min_increment', sa.Numeric(12, 2), nullable=False, server_default='1'),
        sa.Column('currency', sa.String(8), nullable=False, server_default='EUR'),
        sa.Column('current_price', sa.Numeric(12, 2), nullable=False, server_default='0'),
        sa.Column('current_leader', postgresql.UUID(as_uuid=True), nullable=True),
        sa.Column('end_time', sa.DateTime(timezone=True), nullable=True),
        sa.Column('extension_sec', sa.Integer(), nullable=False, server_default='0'),
        sa.ForeignKeyConstraint(['auction_id'], ['auctions.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['current_leader'], ['participants.id'], ondelete='SET NULL'),
        sa.PrimaryKeyConstraint('id')
    )

    # Create bids table
    op.create_table(
        'bids',
        sa.Column('id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('lot_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('participant_id', postgresql.UUID(as_uuid=True), nullable=False),
        sa.Column('amount', sa.Numeric(12, 2), nullable=False),
        sa.Column('placed_at', sa.DateTime(timezone=True), server_default=sa.text('now()'), nullable=False),
        sa.ForeignKeyConstraint(['lot_id'], ['lots.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['participant_id'], ['participants.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id')
    )


def downgrade() -> None:
    """Downgrade schema."""
    op.drop_table('bids')
    op.drop_table('lots')
    op.drop_table('participants')
    op.drop_table('auctions')
    op.drop_table('vendors')
