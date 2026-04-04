class KYSClient:
    """
    T3 Vakfı KYS Django API istemcisi.
    KYS REST endpoint'lerinden katılımcı ve takım verisi çeker.
    """

    def get_team_participants(self, team_code: str) -> list:
        return []

    def get_supported_count(self, team_code: str, competition: str) -> int:
        return 0

    def push_approval_status(self, tc_id: str, status: str):
        pass
