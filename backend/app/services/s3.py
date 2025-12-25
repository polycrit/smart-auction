"""
S3 service for handling image uploads to AWS S3.
"""
import logging
from uuid import uuid4
from typing import Optional
import aioboto3
from botocore.exceptions import ClientError

from app.config import settings

logger = logging.getLogger("auction.services.s3")


async def upload_image(
    file_content: bytes,
    content_type: str,
    original_filename: str,
) -> Optional[str]:
    """
    Upload an image to S3 and return the public URL.

    Args:
        file_content: The binary content of the file
        content_type: MIME type (e.g., 'image/jpeg', 'image/png')
        original_filename: Original filename for extension extraction

    Returns:
        Public URL of the uploaded image, or None if upload failed
    """
    if not settings.s3_bucket_name:
        logger.error("S3_BUCKET_NAME not configured")
        return None

    # Generate unique filename
    ext = original_filename.rsplit(".", 1)[-1].lower() if "." in original_filename else "jpg"
    unique_filename = f"lots/{uuid4()}.{ext}"

    session = aioboto3.Session(
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )

    try:
        async with session.client("s3") as s3:
            await s3.put_object(
                Bucket=settings.s3_bucket_name,
                Key=unique_filename,
                Body=file_content,
                ContentType=content_type,
            )

        # Return public URL
        url = f"https://{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/{unique_filename}"
        logger.info(f"Image uploaded successfully: {url}")
        return url

    except ClientError as e:
        logger.error(f"S3 upload failed: {e}")
        return None


async def delete_image(image_url: str) -> bool:
    """
    Delete an image from S3 by its URL.

    Args:
        image_url: The full S3 URL of the image

    Returns:
        True if deletion was successful, False otherwise
    """
    if not settings.s3_bucket_name or not image_url:
        return False

    # Extract key from URL
    try:
        key = image_url.split(f"{settings.s3_bucket_name}.s3.{settings.aws_region}.amazonaws.com/")[1]
    except (IndexError, AttributeError):
        logger.error(f"Could not extract S3 key from URL: {image_url}")
        return False

    session = aioboto3.Session(
        aws_access_key_id=settings.aws_access_key_id,
        aws_secret_access_key=settings.aws_secret_access_key,
        region_name=settings.aws_region,
    )

    try:
        async with session.client("s3") as s3:
            await s3.delete_object(
                Bucket=settings.s3_bucket_name,
                Key=key,
            )
        logger.info(f"Image deleted successfully: {key}")
        return True

    except ClientError as e:
        logger.error(f"S3 delete failed: {e}")
        return False
