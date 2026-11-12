"""Custom exception classes and HTTP error helpers."""
from fastapi import HTTPException


def not_ready(detail: str) -> HTTPException:
    return HTTPException(status_code=400, detail=detail)


def server_error(detail: str) -> HTTPException:
    return HTTPException(status_code=500, detail=detail)
