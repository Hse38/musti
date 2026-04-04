import base64
import json
import os
import re
from decimal import Decimal

from django.conf import settings


class ClaudeAIClient:
    def __init__(self):
        self._client = None
        self.model = getattr(
            settings,
            "ANTHROPIC_MODEL",
            os.environ.get("ANTHROPIC_MODEL", "claude-sonnet-4-20250514"),
        )

    @property
    def client(self):
        if self._client is None:
            import anthropic

            self._client = anthropic.Anthropic(api_key=settings.ANTHROPIC_API_KEY or None)
        return self._client

    def extract_invoice(
        self, file_path: str, participant_name: str, competition
    ) -> dict:
        if not settings.ANTHROPIC_API_KEY:
            return {
                "amount": None,
                "date": None,
                "owner_name": "",
                "transport_type": "",
                "origin": "",
                "destination": "",
                "confidence": 0.0,
                "error": "ANTHROPIC_API_KEY yok",
            }
        with open(file_path, "rb") as f:
            pdf_b64 = base64.standard_b64encode(f.read()).decode("utf-8")
        comp_ctx = getattr(competition, "name", "") if competition else ""
        msg = self.client.messages.create(
            model=self.model,
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
                            "text": (
                                f"Katılımcı: {participant_name}. Yarışma: {comp_ctx}. "
                                "Fatura/bilet bilgilerini JSON ver:\n"
                                '{"amount": number, "date": "YYYY-MM-DD", '
                                '"owner_name": str, "transport_type": "otobüs|tren|uçak|diğer", '
                                '"origin": str, "destination": str, "confidence": 0.0-1.0}\n'
                                "Sadece JSON."
                            ),
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
            raw = json.loads(m.group() if m else text)
            conf = float(raw.get("confidence") or 0)
            return {
                "amount": raw.get("amount"),
                "date": raw.get("date"),
                "owner_name": raw.get("owner_name") or "",
                "transport_type": raw.get("transport_type") or "",
                "origin": raw.get("origin") or "",
                "destination": raw.get("destination") or "",
                "confidence": conf,
            }
        except Exception:
            return {
                "amount": None,
                "date": None,
                "owner_name": "",
                "transport_type": "",
                "origin": "",
                "destination": "",
                "confidence": 0.0,
                "error": "parse_error",
            }

    def answer_faq(self, question: str, faq_content: str, language: str = "tr") -> dict:
        if not settings.ANTHROPIC_API_KEY:
            return {"answer": "", "confidence": 0.0, "can_answer": False}
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Dil: {language}. Aşağıdaki SSS metninden soruyu yanıtla. "
                        "Cevaplayamazsan can_answer false dön.\n"
                        f"SSS:\n{faq_content[:12000]}\n\nSoru: {question}\n"
                        'JSON: {{"answer": str, "confidence": 0-1, "can_answer": bool}}'
                    ),
                }
            ],
        )
        text = msg.content[0].text if msg.content else ""
        try:
            m = re.search(r"\{[\s\S]*\}", text)
            data = json.loads(m.group() if m else text)
            return {
                "answer": data.get("answer", ""),
                "confidence": float(data.get("confidence") or 0),
                "can_answer": bool(data.get("can_answer")),
            }
        except Exception:
            return {"answer": "", "confidence": 0.0, "can_answer": False}

    def translate_keys(self, keys: dict, target_language: str) -> dict:
        if not settings.ANTHROPIC_API_KEY:
            return {}
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=4096,
            messages=[
                {
                    "role": "user",
                    "content": (
                        f"Çevir hedef dil: {target_language}. "
                        f"Türkçe JSON anahtar-değerleri çevir, aynı anahtarları koru.\n"
                        f"{json.dumps(keys, ensure_ascii=False)[:15000]}"
                    ),
                }
            ],
        )
        text = msg.content[0].text if msg.content else ""
        try:
            m = re.search(r"\{[\s\S]*\}", text)
            return json.loads(m.group() if m else text)
        except Exception:
            return {}

    def assist_upload(self, user_message: str, context: dict) -> str:
        if not settings.ANTHROPIC_API_KEY:
            return "AI şu an yapılandırılmadı."
        msg = self.client.messages.create(
            model=self.model,
            max_tokens=512,
            messages=[
                {
                    "role": "user",
                    "content": (
                        "Katılımcı ulaşım/fatura yükleme yardımı. Kısa ve net Türkçe yanıt ver.\n"
                        f"Bağlam: {json.dumps(context, ensure_ascii=False)[:4000]}\n"
                        f"Mesaj: {user_message}"
                    ),
                }
            ],
        )
        return (msg.content[0].text if msg.content else "").strip()
