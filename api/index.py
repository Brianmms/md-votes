import os
import json
import traceback
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# --- CONFIGURATION AND INITIALIZATION ---

# Locate the project root to find the .env and key.json files
project_root_directory = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root_directory, ".env"))

app = FastAPI(title="Mundo Donghua Voting API", description="Backend service for managing sponsorship votes via Google Sheets")

# Enable CORS for frontend communication
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# Spreadsheet Configuration Constants
SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "").strip()
GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("MD_SVC")

# Sheet Names (Pestañas del Excel)
SHEET_MASTER_LIST = "ListaDeDonghuas"
SHEET_VOTING_LOG = "Votaciones"
SHEET_CONFIG_SETTINGS = "Configuracion"
SHEET_VOTE_SUMMARY = "Resumen"

def get_authorized_google_client():
    """
    Handles authentication with Google API using Service Account credentials from Environment Variables.
    """
    if not SPREADSHEET_ID:
        raise HTTPException(status_code=500, detail="SPREADSHEET_ID is missing.")
    
    if not GOOGLE_SERVICE_ACCOUNT_JSON:
        raise HTTPException(status_code=500, detail="MD_SVC credentials are missing.")

    authorization_scopes = [
        "https://spreadsheets.google.com/feeds",
        "https://www.googleapis.com/auth/drive"
    ]
    
    try:
        # Clean string format (handle single/double quotes from .env)
        cleaned_json_data = GOOGLE_SERVICE_ACCOUNT_JSON.strip("'").strip('"')
        credentials_dictionary = json.loads(cleaned_json_data)
        authorized_creds = ServiceAccountCredentials.from_json_keyfile_dict(credentials_dictionary, authorization_scopes)
        google_sheets_client = gspread.authorize(authorized_creds)
        return google_sheets_client.open_by_key(SPREADSHEET_ID)
    except Exception as error:
        print(f"CRITICAL: Authentication error: {error}")
        raise Exception(f"Could not establish a connection with Google Sheets API: {error}")

def get_target_voting_month(spreadsheet_document):
    """
    Reads the 'Mes Activo' variable from the Configuration sheet.
    Falls back to current system month if not configured.
    """
    try:
        settings_sheet = spreadsheet_document.worksheet(SHEET_CONFIG_SETTINGS)
        all_settings = settings_sheet.get_all_records()
        for setting in all_settings:
            if setting.get("Variable") == "Mes Activo":
                return str(setting.get("Valor"))
    except Exception:
        pass
    return datetime.now().strftime("%Y-%m")

class VoteSubmissionSchema(BaseModel):
    """Validation schema for incoming vote data."""
    email: str
    nick: str
    tier: str
    votes: dict # Key: Series Name, Value: Points assigned
    overwrite: bool = False

# --- API ENDPOINTS ---

@app.get("/api/donghuas")
@app.get("/donghuas")
async def fetch_donghua_catalog():
    """Retrieves the current list of series from the master sheet."""
    try:
        spreadsheet = get_authorized_google_client()
        catalog_sheet = spreadsheet.worksheet(SHEET_MASTER_LIST)
        sheet_rows = catalog_sheet.get_all_values()
        
        if len(sheet_rows) <= 1:
            return []

        # Skip header row and map columns: [ID, Name, ImageURL]
        return [
            {
                "id": row[0] or f"auto-{index}",
                "name": row[1],
                "img": row[2] if len(row) > 2 else ""
            } for index, row in enumerate(sheet_rows[1:])
        ]
    except Exception as error:
        print(f"ERROR fetching donghuas: {error}")
        return []

@app.get("/api/results")
@app.get("/results")
async def get_live_dashboard_results():
    """Calculates real-time totals filtered by month and updates the Summary sheet."""
    try:
        spreadsheet = get_authorized_google_client()
        active_month_filter = get_target_voting_month(spreadsheet)
        
        voting_log_sheet = spreadsheet.worksheet(SHEET_VOTING_LOG)
        all_voting_records = voting_log_sheet.get_all_records()
        header_names = voting_log_sheet.row_values(1)
        donghua_columns = header_names[4:] # Extract names starting from column E

        # Read existing summary to maintain manual 'Votos Patreon' values
        manual_patreon_voters_memory = {}
        try:
            summary_sheet = spreadsheet.worksheet(SHEET_NAME_SUMMARY)
            existing_rows = summary_sheet.get_all_records()
            for row in existing_rows:
                name = row.get("Donghua")
                value = row.get("Votos Patreon")
                if name and str(value).isdigit():
                    manual_patreon_voters_memory[name] = int(value)
        except Exception:
            pass

        frontend_response_list = []
        excel_formatted_rows = [["Donghua", "Patrocinio", "x2", "Votos Patreon", "Total votos"]]

        for index, donghua_name in enumerate(donghua_columns):
            # Map Excel column letters: E (69), F, G...
            col_letter = chr(69 + index) if index <= 21 else "A" + chr(65 + (index - 22))
            
            # Calculate sum of points assigned in the app for the current month
            points_app_total = 0
            for record in all_voting_records:
                if str(record.get("Fecha", "")).startswith(active_month_filter):
                    points_app_total += int(record.get(donghua_name) or 0)
            
            # Use manual value from Excel if present, otherwise 0
            current_patreon_manual = manual_patreon_voters_memory.get(donghua_name, 0)
            
            # Logic: Total = (Patrocinio points * 2) + manual Patreon points
            final_score = (points_app_total * 2) + current_patreon_manual

            # Build Excel formulas for live updates in Google Sheets
            row_pointer = len(frontend_response_list) + 2
            excel_formula_patrocinio = f'=SUM(Votaciones!{col_letter}:{col_letter})'
            excel_formula_x2 = f'=B{row_pointer} * 2'
            excel_formula_total = f'=C{row_pointer} + D{row_pointer}'

            frontend_response_list.append({
                "Donghua": donghua_name,
                "Patrocinio": points_app_total,
                "x2": points_app_total * 2,
                "VotosPatreon": current_patreon_manual,
                "Total": final_score
            })
            
            excel_formatted_rows.append([
                donghua_name, 
                excel_formula_patrocinio, 
                excel_formula_x2, 
                current_patreon_manual, 
                excel_formula_total
            ])
        
        # Calculate Grand Totals footer
        total_data_rows = len(excel_formatted_rows)
        excel_formatted_rows.append([
            "Votos totales", 
            f"=SUM(B2:B{total_data_rows})", 
            f"=SUM(C2:C{total_data_rows})", 
            f"=SUM(D2:D{total_data_rows})", 
            f"=SUM(E2:E{total_data_rows})"
        ])

        # Write data back to Spreadsheet for admin visibility
        try:
            summary_sheet = spreadsheet.worksheet(SHEET_NAME_SUMMARY)
            summary_sheet.clear()
            summary_sheet.update(range_name='A1', values=excel_formatted_rows, value_input_option='USER_ENTERED')
        except Exception:
            pass
        
        return {"active_month": active_month_filter, "data": frontend_response_list}
    except Exception as error:
        print(f"ERROR calculating results: {error}")
        return {"active_month": "", "data": []}

@app.post("/api/submit")
@app.post("/submit")
async def process_patreon_vote(submission: VoteSubmissionSchema):
    """Stores or replaces a vote in the Spreadsheet log."""
    try:
        spreadsheet = get_authorized_google_client()
        active_target_month = get_target_voting_month(spreadsheet)
        normalized_email = submission.email.strip().lower()
        
        # Ensure the log sheet exists
        try:
            voting_log_sheet = spreadsheet.worksheet(SHEET_VOTING_LOG)
        except Exception:
            voting_log_sheet = spreadsheet.add_worksheet(title=SHEET_VOTING_LOG, rows="1000", cols="100")
            voting_log_sheet.append_row(["Fecha", "Email", "Nick", "Tier"])

        # Prevent double voting in the same month
        existing_logs = voting_log_sheet.get_all_records()
        found_duplicate_at_row = -1
        for index, entry in enumerate(existing_logs):
            if str(entry.get("Email")).strip().lower() == normalized_email and str(entry.get("Fecha")).startswith(active_target_month):
                found_duplicate_at_row = index + 2
                break

        if found_duplicate_at_row != -1:
            if not submission.overwrite:
                return {"status": "needs_confirmation"}
            else:
                voting_log_sheet.delete_rows(found_duplicate_at_row)

        # Synchronize headers with the master donghua list
        catalog_sheet = spreadsheet.worksheet(SHEET_MASTER_LIST)
        master_series_list = [row[1] for row in catalog_sheet.get_all_values()[1:] if len(row) > 1]
        
        current_sheet_headers = voting_log_sheet.row_values(1)
        sync_headers_list = list(current_sheet_headers)
        headers_were_modified = False
        
        for series_name in master_series_list:
            if series_name not in sync_headers_list:
                sync_headers_list.append(series_name)
                headers_were_modified = True
        
        if headers_were_modified:
            voting_log_sheet.update(range_name='A1', values=[sync_headers_list])
            current_sheet_headers = sync_headers_list

        # Prepare the data row for insertion
        new_vote_row = [None] * len(current_sheet_headers)
        new_vote_row[0:4] = [
            datetime.now().strftime("%Y-%m-%d %H:%M:%S"), 
            normalized_email, 
            submission.nick.strip(), 
            submission.tier
        ]
        
        for series_name, point_amount in submission.votes.items():
            if point_amount > 0 and series_name in current_sheet_headers:
                header_index = current_sheet_headers.index(series_name)
                new_vote_row[header_index] = point_amount
        
        voting_log_sheet.append_row(new_vote_row)
        return {"status": "success"}
    except Exception as error:
        print(f"CRITICAL SYSTEM ERROR during submission: {traceback.format_exc()}")
        return {"status": "error", "message": "Fallo técnico al procesar el voto."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
