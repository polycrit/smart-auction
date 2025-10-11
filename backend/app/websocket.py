"""
Socket.IO setup and event handlers for real-time auction communication.
"""
import json
import logging
from decimal import Decimal
from uuid import UUID
from urllib.parse import parse_qs
from typing import Any, Dict

import socketio

from app.custom_json import CustomJSONEncoder
from app.db import SessionLocal
from app.services.auctions import (
    get_auction_by_slug,
    get_participant_by_token,
    auction_state_payload,
)
from app.services.bids import place_bid
from app.exceptions import BidTooLowError, LotNotLiveError

logger = logging.getLogger("auction.websocket")

# Socket.IO server configuration
sio = socketio.AsyncServer(
    async_mode="asgi",
    cors_allowed_origins="*",
    json=json,
    json_dumps_options={"cls": CustomJSONEncoder},
)

AUCTION_NS = "/auction"
ADMIN_NS = "/admin"


# ============================================================================
# AUCTION NAMESPACE - For bidders and viewers
# ============================================================================


@sio.event(namespace=AUCTION_NS)
async def connect(sid: str, environ: Dict[str, Any], auth: Dict[str, Any]):
    """Handle client connection to auction namespace."""
    qs = parse_qs(environ.get("QUERY_STRING", ""))
    slug = (auth or {}).get("slug") or (qs.get("slug") or [None])[0]
    token = (auth or {}).get("t") or (qs.get("t") or [None])[0]

    if not slug:
        logger.warning(f"Connection rejected: No slug provided (sid={sid})")
        return False

    async with SessionLocal() as db:
        auction = await get_auction_by_slug(db, slug)
        if not auction:
            logger.warning(f"Connection rejected: Auction '{slug}' not found (sid={sid})")
            return False

        participant = None
        if token:
            participant = await get_participant_by_token(db, token)
            if (
                not participant
                or participant.auction_id != auction.id
                or participant.blocked
            ):
                logger.warning(
                    f"Connection rejected: Invalid/blocked participant token (sid={sid})"
                )
                return False

        await sio.save_session(
            sid,
            {
                "slug": slug,
                "participant_id": str(participant.id) if participant else None,
            },
            namespace=AUCTION_NS,
        )
        await sio.enter_room(sid, slug, namespace=AUCTION_NS)

        logger.info(
            f"Client connected: sid={sid}, slug={slug}, "
            f"participant={participant.id if participant else 'viewer'}"
        )

        # Send current auction state
        payload = await auction_state_payload(db, auction)
        await sio.emit("state", payload, to=sid, namespace=AUCTION_NS)


@sio.event(namespace=AUCTION_NS)
async def disconnect(sid: str):
    """Handle client disconnection from auction namespace."""
    sess = await sio.get_session(sid, namespace=AUCTION_NS)
    if sess:
        logger.info(f"Client disconnected: sid={sid}, slug={sess.get('slug')}")


@sio.on("place_bid", namespace=AUCTION_NS)
async def place_bid_evt(sid: str, data: Dict[str, Any]):
    """Handle bid placement event."""
    sess = await sio.get_session(sid, namespace=AUCTION_NS)
    if not sess or not sess.get("participant_id"):
        logger.warning(f"Unauthorized bid attempt: sid={sid}")
        await sio.emit(
            "error",
            {"detail": "Auth required to place bids"},
            to=sid,
            namespace=AUCTION_NS,
        )
        return

    slug = sess["slug"]
    participant_id = UUID(sess["participant_id"])
    lot_id = UUID(data.get("lot_id"))
    amount = Decimal(str(data.get("amount")))

    logger.info(
        f"Bid attempt: lot={lot_id}, amount={amount}, participant={participant_id}"
    )

    async with SessionLocal() as db:
        try:
            payload = await place_bid(
                db, lot_id=lot_id, participant_id=participant_id, amount=amount
            )
            # Broadcast to all clients in the auction room
            await sio.emit("bid_accepted", payload, room=slug, namespace=AUCTION_NS)
        except BidTooLowError as e:
            await sio.emit(
                "bid_rejected", {"reason": str(e)}, to=sid, namespace=AUCTION_NS
            )
        except LotNotLiveError:
            await sio.emit(
                "bid_rejected", {"reason": "Lot not live"}, to=sid, namespace=AUCTION_NS
            )
        except Exception as e:
            logger.error(f"Error processing bid: {e}", exc_info=True)
            await sio.emit(
                "error", {"detail": "Internal error"}, to=sid, namespace=AUCTION_NS
            )


# ============================================================================
# ADMIN NAMESPACE - For auction administrators
# ============================================================================


@sio.event(namespace=ADMIN_NS)
async def connect(sid: str, environ: Dict[str, Any], auth: Dict[str, Any]):
    """Handle admin connection."""
    # TODO: Add admin authentication
    logger.info(f"Admin connected: sid={sid}")
    return True


@sio.event(namespace=ADMIN_NS)
async def disconnect(sid: str):
    """Handle admin disconnection."""
    logger.info(f"Admin disconnected: sid={sid}")
