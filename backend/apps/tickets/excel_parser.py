import csv
from decimal import Decimal
from io import BytesIO

import openpyxl


def _norm_key(s):
    if s is None:
        return ""
    return (
        str(s)
        .strip()
        .lower()
        .replace("ı", "i")
        .replace("ğ", "g")
        .replace("ü", "u")
        .replace("ş", "s")
        .replace("ö", "o")
        .replace("ç", "c")
    )


def _find_col(headers, *candidates):
    hmap = {_norm_key(h): i for i, h in enumerate(headers)}
    for c in candidates:
        k = _norm_key(c)
        if k in hmap:
            return hmap[k]
    for k, idx in hmap.items():
        for c in candidates:
            if _norm_key(c) in k or k in _norm_key(c):
                return idx
    return None


def _parse_transport_type(val):
    if val is None:
        return None
    s = str(val).strip().lower()
    mapping = {
        "uçak": "plane",
        "ucak": "plane",
        "plane": "plane",
        "otobüs": "bus",
        "otobus": "bus",
        "bus": "bus",
        "tren": "train",
        "train": "train",
        "diğer": "other",
        "diger": "other",
        "other": "other",
        "yok": "none",
        "talep yok": "none",
        "none": "none",
    }
    return mapping.get(s, "other")


def _parse_bool_supported(val):
    if val is None or val == "":
        return None
    s = str(val).strip().lower()
    if s in ("1", "true", "evet", "yes", "e", "var"):
        return True
    if s in ("0", "false", "hayır", "hayir", "no", "h", "yok"):
        return False
    return None


def parse_spreadsheet(file_obj) -> list[dict]:
    """xlsx veya csv — satır listesi döner."""
    name = getattr(file_obj, "name", "") or ""
    raw = file_obj.read()
    file_obj.seek(0)
    rows = []
    if name.lower().endswith(".csv"):
        try:
            text = raw.decode("utf-8-sig")
        except UnicodeDecodeError:
            text = raw.decode("latin-1")
        reader = csv.reader(text.splitlines())
        for row in reader:
            rows.append(row)
    else:
        wb = openpyxl.load_workbook(BytesIO(raw), read_only=True, data_only=True)
        ws = wb.active
        for row in ws.iter_rows(values_only=True):
            rows.append(list(row))
        wb.close()
    if not rows:
        return []
    headers = [str(c).strip() if c is not None else "" for c in rows[0]]
    idx_tc = _find_col(headers, "tc", "tc_kimlik", "tckn", "kimlik", "tc kimlik")
    idx_name = _find_col(headers, "ad", "ad_soyad", "isim", "ad soyad", "full_name", "name")
    idx_transport = _find_col(
        headers, "ulasim", "ulaşım", "transport", "transport_type", "tip"
    )
    idx_support = _find_col(
        headers, "destek", "kapsam", "is_supported", "destekleniyor", "supported"
    )
    out = []
    for row in rows[1:]:
        if not row or all(v is None or str(v).strip() == "" for v in row):
            continue
        def get(i):
            if i is None or i >= len(row):
                return None
            return row[i]

        tc = get(idx_tc)
        if tc is not None:
            tc = str(tc).replace(" ", "").strip()
            if "." in tc and tc.replace(".", "").isdigit():
                tc = tc.split(".")[0]
        name_val = get(idx_name)
        transport = _parse_transport_type(get(idx_transport))
        sup = _parse_bool_supported(get(idx_support))
        if not tc and not name_val:
            continue
        out.append(
            {
                "tc_id": tc or "",
                "full_name": (str(name_val).strip() if name_val else ""),
                "transport_type": transport,
                "is_supported": sup,
            }
        )
    return out
