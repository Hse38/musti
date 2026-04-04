import openpyxl


class ParticipantXLSXParser:
    """Finalist katılımcı xlsx — sütunlar: yarışma_adı | takım_adı | takım_id | ad | soyad | email | kaptan_mi"""

    def parse(self, file_path: str) -> dict:
        wb = openpyxl.load_workbook(file_path, read_only=True, data_only=True)
        ws = wb.active
        rows = list(ws.iter_rows(values_only=True))
        wb.close()
        if not rows:
            return {"competition_name": "", "teams": []}

        headers = [str(h or "").strip().lower() for h in rows[0]]
        idx = {h.replace(" ", "_"): i for i, h in enumerate(headers)}

        def col(*names):
            for n in names:
                for key, i in idx.items():
                    if n in key:
                        return i
            return None

        ci = col("yarışma", "yarisma")
        tni = col("takım", "takim", "team")
        tid = col("takım_id", "takim_id", "team_id")
        ai = col("ad", "isim")
        si = col("soyad")
        ei = col("email", "e-mail", "posta")
        ki = col("kaptan")

        competition_name = ""
        teams_map: dict[str, dict] = {}

        for row in rows[1:]:
            if not row or all(v is None or str(v).strip() == "" for v in row):
                continue

            def get(i):
                if i is None or i >= len(row):
                    return ""
                v = row[i]
                return str(v).strip() if v is not None else ""

            if ci is not None and get(ci):
                competition_name = get(ci)
            team_name = get(tni) if tni is not None else ""
            team_key = get(tid) if tid is not None else team_name
            if not team_key:
                continue
            ad = get(ai) if ai is not None else ""
            soyad = get(si) if si is not None else ""
            full_name = f"{ad} {soyad}".strip()
            email = get(ei) if ei is not None else ""
            kap_raw = get(ki).lower() if ki is not None else ""
            is_captain = kap_raw in ("1", "true", "evet", "yes", "e", "kaptan")

            if team_key not in teams_map:
                teams_map[team_key] = {
                    "team_name": team_name or team_key,
                    "team_id": get(tid) if tid is not None else team_key,
                    "participants": [],
                }
            teams_map[team_key]["participants"].append(
                {"full_name": full_name, "email": email, "is_captain": is_captain}
            )

        return {
            "competition_name": competition_name,
            "teams": list(teams_map.values()),
        }
