# Sanity check for OPENAI_API_KEY and embeddings access (safe to run)
from dotenv import load_dotenv
import os, re

load_dotenv()
key = os.getenv("OPENAI_API_KEY")
print("`OPENAI_API_KEY` set:", bool(key))

if not key:
    print("No key found. Add OPENAI_API_KEY to your .env or environment and restart the kernel.")
else:
    masked = key[:4] + "*" * max(0, len(key) - 8) + key[-4:]
    print("Masked key:", masked)

    try:
        # Try a minimal embeddings call using the OpenAI client
        from openai import OpenAI
        client = OpenAI(api_key=key)
        resp = client.embeddings.create(input=["sanity check"], model="text-embedding-3-small")
        if getattr(resp, "data", None):
            print("Embeddings API call succeeded.")
        else:
            print("Embeddings API call returned an unexpected response.")
    except Exception as e:
        msg = str(e)
        # Redact any visible key-like substrings before printing
        msg = re.sub(r"(?:sk-|k-proj-)[A-Za-z0-9\._\-=*]+", "<REDACTED_KEY>", msg)
        if "Incorrect API key" in msg or "invalid_api_key" in msg or "AuthenticationError" in msg:
            print("Authentication failed: incorrect or revoked API key.")
        else:
            print("Embeddings call failed:", msg[:300])