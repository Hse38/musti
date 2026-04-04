import re

import pandas as pd


def _norm_col(c) -> str:
    if c is None or (isinstance(c, float) and pd.isna(c)):
        return ""
    return str(c).strip().replace("\ufeff", "")


def _load_dataframe(file_path: str) -> pd.DataFrame:
    is_csv = file_path.lower().endswith(".csv")
    if is_csv:
        raw = pd.read_csv(file_path, header=None, dtype=str, encoding_errors="replace")
    else:
        raw = pd.read_excel(file_path, header=None, dtype=str, engine="openpyxl")

    header_row = 0
    for i in range(min(40, len(raw))):
        row = raw.iloc[i].fillna("").astype(str)
        joined = " ".join(_norm_col(x) for x in row.tolist())
        if "TakımÜyesiTC" in joined or "TakimUyeID" in joined:
            header_row = i
            break

    if is_csv:
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding_errors="replace")
    else:
        df = pd.read_excel(
            file_path, header=header_row, dtype=str, engine="openpyxl"
        )
    df.columns = [_norm_col(c) for c in df.columns]
    return df


def _load_payment_dataframe(file_path: str) -> pd.DataFrame:
    is_csv = file_path.lower().endswith(".csv")
    if is_csv:
        raw = pd.read_csv(file_path, header=None, dtype=str, encoding_errors="replace")
    else:
        raw = pd.read_excel(file_path, header=None, dtype=str, engine="openpyxl")

    header_row = 0
    for i in range(min(40, len(raw))):
        row = raw.iloc[i].fillna("").astype(str)
        joined = " ".join(_norm_col(x) for x in row.tolist())
        if "T.C. Kimlik" in joined or "Kimlik Numarası" in joined or "YARIŞMA" in joined:
            header_row = i
            break

    if is_csv:
        df = pd.read_csv(file_path, header=header_row, dtype=str, encoding_errors="replace")
    else:
        df = pd.read_excel(
            file_path, header=header_row, dtype=str, engine="openpyxl"
        )
    df.columns = [_norm_col(c) for c in df.columns]
    return df


def _clean_tc(val) -> str:
    s = str(val or "").strip()
    if s.lower() in ("nan", "none", ""):
        return ""
    if "." in s and s.replace(".", "").isdigit():
        s = s.split(".")[0]
    return re.sub(r"\D", "", s)[:11]


def _clean_phone(val) -> str:
    s = str(val or "").strip()
    if s.lower() in ("nan", "none", ""):
        return ""
    if "." in s and s.replace(".", "").replace("-", "").isdigit():
        s = s.split(".")[0]
    return re.sub(r"\D", "", s)[:20]


class SupportRequestParser:
    """Destek Talep Raporu (KYS çıktısı) parser'ı"""

    TRANSPORT_MAP = {
        "uçak": "plane",
        "ucak": "plane",
        "tren": "train",
        "otobüs": "bus",
        "otobus": "bus",
        "kendi imkanımla": "none",
        "kendi imkanimla": "none",
        "kendi i̇mkanımla": "none",
    }

    def parse(self, file_path: str) -> list[dict]:
        df = _load_dataframe(file_path)
        participants = []
        for _, row in df.iterrows():
            tc_raw = row.get("TakımÜyesiTC", row.get("TakimUyeTC"))
            tc = _clean_tc(tc_raw)
            if not tc:
                continue

            transport_raw = str(row.get("SeyahatTipi", "") or "").strip().lower()
            transport_type = self.TRANSPORT_MAP.get(transport_raw, "none")

            talep = str(row.get("UlaşımveKonaklamaDestekTalebi", "") or "").lower()
            talep = talep.replace("ı", "i")
            kendi = str(row.get("kendi_karsilayacak", "") or "").strip().upper()
            is_supported = (
                ("ulaşım" in talep or "ulasim" in talep) and kendi != "TRUE"
            )

            ad = str(row.get("Ad", "") or "").strip()
            soyad = str(row.get("Soyad", "") or "").strip()
            participants.append(
                {
                    "full_name": f"{ad} {soyad}".strip(),
                    "email": str(row.get("Email", "") or "").strip(),
                    "tc_id": tc,
                    "phone": _clean_phone(row.get("İletişimNo", row.get("IletisimNo", ""))),
                    "transport_type": transport_type,
                    "is_supported": is_supported,
                    "team_name": str(row.get("takim_adi", "") or "").strip(),
                    "competition_name": str(row.get("program_adi", "") or "").strip(),
                    "city_from": str(row.get("KatılacağıŞehir", "") or "").strip(),
                    "city_to": str(row.get("DöneceğiŞehir", "") or "").strip(),
                    "kys_member_id": _clean_tc(row.get("TakimUyeID", "")),
                }
            )
        return participants


class PaymentRequestParser:
    """Bilet Ödeme Talep Dosyası parser'ı"""

    TRANSPORT_MAP = {
        "otobüs": "bus",
        "otobus": "bus",
        "tren": "train",
        "uçak": "plane",
        "ucak": "plane",
    }

    DIGITAL_WALLETS = [
        "papara",
        "tosla",
        "paycell",
        "ininal",
        "hayat finans",
        "param",
    ]

    def _find_iban(self, row: pd.Series) -> str:
        for col in row.index:
            cl = str(col).lower()
            if "iban" in cl:
                v = str(row.get(col, "") or "").strip()
                if v and v.lower() != "nan":
                    return v
        return ""

    def _find_tutar(self, row: pd.Series) -> str:
        candidates = [
            "Geliş-dönüş biletlerinizin toplam tutarını yazınız. (Örn: 1000)",
            "Tutar",
        ]
        for c in candidates:
            if c in row.index:
                v = str(row.get(c, "") or "").strip()
                if v and v.lower() != "nan":
                    return v
        for col in row.index:
            if "tutar" in str(col).lower():
                v = str(row.get(col, "") or "").strip()
                if v and v.lower() != "nan":
                    return v
        return ""

    def parse(self, file_path: str) -> list[dict]:
        df = _load_payment_dataframe(file_path)
        submissions = []
        for _, row in df.iterrows():
            tc = _clean_tc(
                row.get("T.C. Kimlik Numarası", row.get("T.C Kimlik Numarası", ""))
            )
            if not tc:
                continue

            tutar_raw = self._find_tutar(row)
            try:
                amount = float(
                    tutar_raw.replace(",", ".").replace(" ", "").replace("₺", "")
                )
            except (ValueError, TypeError):
                amount = None

            fatura_col = None
            for col in row.index:
                cl = str(col).lower()
                if "fatura" in cl or "dosya" in cl or "yükle" in cl or "yukle" in cl:
                    fatura_col = col
                    break

            fatura_value = (
                str(row.get(fatura_col, "") or "").strip() if fatura_col else ""
            )
            is_drive_link = fatura_value.startswith("http") and (
                "drive.google" in fatura_value or "docs.google" in fatura_value
            )

            transport_raw = str(row.get("Ulaşım Aracı", "") or "").strip().lower()

            bank_name = str(row.get("Banka Adı", "") or "").strip()
            is_digital = any(w in bank_name.lower() for w in self.DIGITAL_WALLETS)

            iban = self._find_iban(row)

            submissions.append(
                {
                    "full_name": str(row.get("Ad-Soyad", "") or "").strip(),
                    "tc_id": tc,
                    "phone": str(row.get("Telefon Numarası", "") or "").strip(),
                    "email": str(row.get("E-Mail Adresi", "") or "").strip(),
                    "competition_name": str(row.get("YARIŞMA", "") or "").strip(),
                    "team_name": str(row.get("Takım Adı", "") or "").strip(),
                    "basvuru_id": _clean_tc(row.get("Başvuru ID", "")),
                    "transport_type_declared": self.TRANSPORT_MAP.get(
                        transport_raw, "other"
                    ),
                    "amount": amount,
                    "invoice_source": "drive_link" if is_drive_link else "file_upload",
                    "invoice_drive_link": fatura_value if is_drive_link else None,
                    "bank_name": bank_name,
                    "account_holder_name": str(
                        row.get("Hesap Sahibinin Adı-Soyadı", "") or ""
                    ).strip(),
                    "account_holder_tc": _clean_tc(
                        row.get("Hesap Sahibinin T.C. Kimlik Numarası", "")
                    ),
                    "iban": iban,
                    "is_digital_wallet": is_digital,
                    "existing_status": str(row.get("DURUM", "") or "").strip(),
                    "existing_reason": str(row.get("NEDEN", "") or "").strip(),
                }
            )
        return submissions
