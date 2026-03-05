import pytest
from fastapi.testclient import TestClient
from unittest.mock import MagicMock, patch
from api.index import app

client = TestClient(app)

# Mock data for testing Configuration
MOCK_CONFIG_ROWS = [
    ["Variable", "Valor"],
    ["Mes Activo", "2026-03"],
    ["Habilitar Encuesta", "si"],
    ["Mostrar Votaciones", "si"],
    ["Fecha Limite Edicion", "2026-12-31"]
]

# Mock data for Donghua catalog
MOCK_DONGHUA_ROWS = [
    ["ID", "Nombre", "ImagenURL"],
    ["1", "Renegade Immortal", "http://example.com/renegade.jpg"],
    ["2", "Perfect World", "http://example.com/perfect.jpg"]
]

@patch("api.index.get_spreadsheet")
def test_get_config_endpoint(mock_get_client):
    """Verifies that the /api/config route correctly parses Excel data."""
    mock_sheet = MagicMock()
    mock_sheet.get_all_values.return_value = MOCK_CONFIG_ROWS
    
    mock_spreadsheet = MagicMock()
    mock_spreadsheet.worksheet.return_value = mock_sheet
    mock_get_client.return_value = mock_spreadsheet

    response = client.get("/api/config")
    
    assert response.status_code == 200
    data = response.json()
    assert data["active_month"] == "2026-03"
    assert data["is_voting_enabled"] is True
    assert data["can_edit_votes"] is True
    assert data["edit_deadline"] == "2026-12-31"

@patch("api.index.get_spreadsheet")
def test_get_donghuas_endpoint(mock_get_client):
    """Verifies that the /api/donghuas route returns correctly mapped objects."""
    mock_sheet = MagicMock()
    mock_sheet.get_all_values.return_value = MOCK_DONGHUA_ROWS
    
    mock_spreadsheet = MagicMock()
    mock_spreadsheet.worksheet.return_value = mock_sheet
    mock_get_client.return_value = mock_spreadsheet

    response = client.get("/api/donghuas")
    
    assert response.status_code == 200
    data = response.json()
    assert len(data) == 2
    assert data[0]["name"] == "Renegade Immortal"
    assert data[1]["id"] == "2"

@patch("api.index.get_spreadsheet")
def test_get_results_endpoint_empty(mock_get_client):
    """Verifies results endpoint behavior when no votes exist."""
    mock_config_sheet = MagicMock()
    mock_config_sheet.get_all_values.return_value = MOCK_CONFIG_ROWS
    
    mock_vote_sheet = MagicMock()
    mock_vote_sheet.get_all_records.return_value = []
    mock_vote_sheet.row_values.return_value = ["Fecha", "Email", "Nick", "Tier"]
    
    mock_spreadsheet = MagicMock()
    def side_effect(name):
        if name == "Configuracion": return mock_config_sheet
        if name == "Votaciones": return mock_vote_sheet
        return MagicMock()
    
    mock_spreadsheet.worksheet.side_effect = side_effect
    mock_get_client.return_value = mock_spreadsheet

    response = client.get("/api/results")
    
    assert response.status_code == 200
    data = response.json()
    assert data["active_month"] == "2026-03"
    assert data["data"] == []

def test_api_invalid_route():
    """Confirms 404 for non-existent routes."""
    response = client.get("/api/invalid-route-test")
    assert response.status_code == 404
