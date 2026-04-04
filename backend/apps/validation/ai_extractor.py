import base64
import json
import os
import re

from django.conf import settings


class InvoiceExtractor:
    def __init__(self):
        self._client = None

    @property
    def client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY or None)
        return self._client

    def extract(self, file_path: str) -> dict:
        model = os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514")
        with open(file_path, "rb") as f:
            raw = f.read()
        pdf_b64 = base64.standard_b64encode(raw).decode("utf-8")

        if not settings.ANTHROPIC_API_KEY:
            return {
                "error": "ANTHROPIC_API_KEY tanımlı değil",
                "confidence": 0.0,
                "amount": None,
                "date": None,
                "owner_name": "",
                "transport_type": "",
            }

        msg = self.client.messages.create(
            model=model,
            max_tokens=1024,
            messages=[
                {
                    "role": "user",
                    "content": [
                        {
                            "type": "document",
                            "source": {
                                "type": "base64",
                                "media_type": "application/pdf",
                                "data": pdf_b64,
                            },
                        },
                        {
                            "type": "text",
                            "text": """Bu bir ulaşım faturası veya biletidir. Şu bilgileri JSON olarak çıkar:
{
  "amount": <TL cinsinden sayısal tutar>,
  "date": "<YYYY-MM-DD>",
  "owner_name": "<fatura sahibi tam adı>",
  "transport_type": "<otobüs|tren|uçak|diğer>",
  "tc_id": "<varsa TC kimlik 11 hane, yoksa boş string>",
  "origin": "<kalkış>",
  "destination": "<varış>",
  "confidence": <0.0-1.0>
}
Sadece JSON döndür.""",
                        },
                    ],
                }
            ],
        )

        text = ""
        for block in msg.content:
            if hasattr(block, "text"):
                text += block.text
        text = text.strip()
        try:
            m = re.search(r"\{[\s\S]*\}", text)
            if m:
                return json.loads(m.group())
            return json.loads(text)
        except Exception:
            return {"error": "Fatura okunamadı", "confidence": 0.0}
