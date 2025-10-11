# Database Structure

## Overview

PostgreSQL database with 4 main tables supporting a real-time auction system with bidding, participant management, and auction lifecycle tracking.

## Tables

### `auctions`
Main auction entity containing configuration and status.

**Fields:**
- `id` (UUID, PK) - Primary identifier
- `slug` (TEXT, UNIQUE) - URL-friendly identifier for public access
- `title` (TEXT) - Auction display name
- `description` (TEXT, NULLABLE) - Optional description
- `status` (TEXT) - Auction state: `draft`, `live`, `paused`, `ended`
- `start_time` (TIMESTAMP, NULLABLE) - When auction goes live
- `end_time` (TIMESTAMP, NULLABLE) - When auction closes
- `created_by` (UUID, NULLABLE) - Admin/creator identifier
- `created_at` (TIMESTAMP) - Record creation time

**Relationships:**
- Has many `lots` (cascade delete)
- Has many `participants` (cascade delete)

---

### `participants`
Users authorized to bid in specific auctions.

**Fields:**
- `id` (UUID, PK) - Primary identifier
- `auction_id` (UUID, FK) - Reference to parent auction (cascade delete)
- `display_name` (TEXT) - Name shown during bidding
- `invite_token` (TEXT, UNIQUE) - Secret token for authentication
- `blocked` (BOOLEAN) - Whether participant is banned from bidding
- `created_at` (TIMESTAMP) - Registration time

**Relationships:**
- Belongs to one `auction`
- Can have many `bids` (via lots)

---

### `lots`
Individual items being auctioned within an auction.

**Fields:**
- `id` (UUID, PK) - Primary identifier
- `auction_id` (UUID, FK) - Parent auction (cascade delete)
- `lot_number` (INTEGER) - Display order/number
- `name` (TEXT) - Item name
- `base_price` (NUMERIC(12,2)) - Starting price
- `min_increment` (NUMERIC(12,2)) - Minimum bid increment
- `currency` (VARCHAR(8)) - Currency code (e.g., EUR, USD)
- `status` (TEXT) - Lot state: `ready`, `live`, `sold`, `withdrawn`
- `current_price` (NUMERIC(12,2)) - Current highest bid amount
- `current_leader` (UUID, FK, NULLABLE) - Participant ID of current winner
- `end_time` (TIMESTAMP, NULLABLE) - Lot closing time (for timed lots)
- `extension_sec` (INTEGER) - Auto-extend seconds if bid near closing

**Relationships:**
- Belongs to one `auction`
- Has many `bids` (cascade delete)
- References one `participant` as current leader

---

### `bids`
Historical record of all bid attempts on lots.

**Fields:**
- `id` (UUID, PK) - Primary identifier
- `lot_id` (UUID, FK) - Lot being bid on (cascade delete)
- `participant_id` (UUID, FK) - Who placed the bid (cascade delete)
- `amount` (NUMERIC(12,2)) - Bid amount
- `placed_at` (TIMESTAMP) - When bid was placed

**Relationships:**
- Belongs to one `lot`
- Belongs to one `participant`

---

## Key Relationships

```
auctions (1) ──┬──> (N) lots
               └──> (N) participants

lots (1) ────> (N) bids
participants (1) ──> (N) bids

lots (N) ───> (1) participants (current_leader)
```

## Database Features

- **UUID Primary Keys**: All tables use UUIDs for distributed system compatibility
- **Cascade Deletes**: Deleting an auction removes all lots, participants, and bids
- **Timestamps**: All records track creation time with timezone support
- **Unique Constraints**: `slug` and `invite_token` enforce uniqueness
- **Foreign Keys**: Maintain referential integrity across relationships

## Common Queries

- Get auction with all lots and participants: Join via `auction_id`
- Get current winner of a lot: `lots.current_leader` → `participants.id`
- Get bid history: Join `bids` → `lots` → `auctions`
- Check if user can bid: Verify `participant.blocked = false` and `auction.status = 'live'`
