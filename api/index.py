import os
import json
import traceback
import unicodedata
import re
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# --- CONFIGURATION ---
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, ".env"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

SPREADSHEET_ID = os.getenv("SPREADSHEET_ID", "").strip().strip("'").strip('"')
GOOGLE_SERVICE_ACCOUNT_JSON = os.getenv("MD_SVC")

def normalize(text):
    if not text: return ""
    text = str(text).strip().lower()
    # Remove accents/tildes
    return "".join(c for c in unicodedata.normalize('NFD', text) if unicodedata.category(c) != 'Mn')

def get_spreadsheet():
    auth_scopes = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    try:
        json_content = GOOGLE_SERVICE_ACCOUNT_JSON.strip().strip("'").strip('"')
        creds = ServiceAccountCredentials.from_json_keyfile_dict(json.loads(json_content), auth_scopes)
        return gspread.authorize(creds).open_by_key(SPREADSHEET_ID)
    except Exception as e:
        raise Exception(f"Google Auth Error: {e}")

def fetch_app_config():
    config = {"active_month": datetime.now().strftime("%Y-%m"), "is_voting_enabled": True, "show_results": True, "can_edit_votes": True, "edit_deadline": ""}
    try:
        doc = get_spreadsheet()
        sheet = doc.worksheet("Configuracion")
        # get_all_values is more robust than get_all_records for mixed formats
        all_rows = sheet.get_all_values()
        now = datetime.now()

        for row in all_rows:
            if len(row) < 2: continue
            
            # Normalize column A (Variable name)
            var_name = normalize(row[0])
            var_val = str(row[1]).strip()

            if var_name == "mes activo":
                config["active_month"] = var_val
            elif var_name == "habilitar encuesta":
                config["is_voting_enabled"] = (var_val.lower() == "si")
            elif var_name == "mostrar votaciones":
                config["show_results"] = (var_val.lower() == "si")
            elif var_name == "fecha limite edicion":
                config["edit_deadline"] = var_val
                # Extract date components ignoring separators
                # Supports YYYY-MM-DD, DD-MM-YYYY, etc.
                match = re.search(r"(\d{1,4})[-/.](\d{1,2})[-/.](\d{1,4})", var_val)
                if match:
                    parts = [int(p) for p in match.groups()]
                    try:
                        # Try YYYY-MM-DD
                        if parts[0] > 1000: deadline = datetime(parts[0], parts[1], parts[2])
                        # Try DD-MM-YYYY
                        else: deadline = datetime(parts[2], parts[1], parts[0])
                        
                        if now.date() > deadline.date():
                            config["can_edit_votes"] = False
                    except: pass
        print(f"DEBUG CONFIG: {config}")
    except Exception as e:
        print(f"Config error: {e}")
    return config

class VoteSchema(BaseModel):
    email: str
    nick: str
    tier: str
    votes: dict
    overwrite: bool = False

@app.get("/api/config")
@app.get("/config")
async def get_config(): return fetch_app_config()

@app.get("/api/donghuas")
@app.get("/donghuas")
async def get_donghuas():
    try:
        doc = get_spreadsheet()
        sheet = doc.worksheet("ListaDeDonghuas")
        data = sheet.get_all_values()
        return [{"id": r[0] or f"id-{i}", "name": r[1], "img": r[2] if len(r)>2 else ""} for i, r in enumerate(data[1:])] if len(data)>1 else []
    except: return []

@app.get("/api/results")
@app.get("/results")
async def get_results():
    try:
        cfg = fetch_app_config()
        if not cfg["show_results"]: return {"active_month": cfg["active_month"], "data": [], "hidden": True}
        doc = get_spreadsheet()
        v_sheet = doc.worksheet("Votaciones")
        all_votes = v_sheet.get_all_records()
        names = v_sheet.row_values(1)[4:]
        
        manual_v = {}
        try:
            res_sheet = doc.worksheet("Resumen")
            for r in res_sheet.get_all_records():
                if r.get("Donghua") and str(r.get("Votos Patreon")).isdigit():
                    manual_v[r["Donghua"]] = int(r["Votos Patreon"])
        except: pass

        summary = []
        excel_data = [["Donghua", "Patrocinio", "x2", "Votos Patreon", "Total votos"]]
        for i, name in enumerate(names):
            col = chr(69+i) if i<=21 else "A"+chr(65+(i-22))
            pts = sum(int(r.get(name) or 0) for r in all_votes if str(r.get("Fecha","")).startswith(cfg["active_month"]))
            man = manual_v.get(name, 0)
            row_idx = len(summary) + 2
            summary.append({"Donghua":name, "Patrocinio":pts, "x2":pts*2, "VotosPatreon":man, "Total":(pts*2)+man})
            excel_data.append([name, f'=SUM(Votaciones!{col}:{col})', f'=B{row_idx}*2', man, f'=C{row_idx}+D{row_idx}'])
        
        last = len(excel_data)
        excel_data.append(["Votos totales", f"=SUM(B2:B{last})", f"=SUM(C2:C{last})", f"=SUM(D2:D{last})", f"=SUM(E2:E{last})"])
        try:
            r_sheet = doc.worksheet("Resumen")
            r_sheet.clear(); r_sheet.update(range_name='A1', values=excel_data, value_input_option='USER_ENTERED')
        except: pass
        return {"active_month": cfg["active_month"], "data": summary}
    except: return {"active_month": "", "data": []}

@app.post("/api/submit")
@app.post("/submit")
async def submit_vote(vote: VoteSchema):
    try:
        cfg = fetch_app_config()
        if not cfg["is_voting_enabled"]: return {"status":"error", "message":"Cerrado."}
        if vote.overwrite and not cfg["can_edit_votes"]: return {"status":"error", "message":f"Expiró el {cfg['edit_deadline']}"}
        
        doc = get_spreadsheet()
        v_sheet = doc.worksheet("Votaciones")
        all_logs = v_sheet.get_all_records()
        email_clean = vote.email.strip().lower()
        
        dup_idx = -1
        for i, r in enumerate(all_logs):
            if str(r.get("Email")).strip().lower() == email_clean and str(r.get("Fecha")).startswith(cfg["active_month"]):
                dup_idx = i + 2; break
        
        if dup_idx != -1:
            if not vote.overwrite: return {"status": "needs_confirmation"}
            else: v_sheet.delete_rows(dup_idx)

        master = doc.worksheet("ListaDeDonghuas")
        series = [r[1] for r in master.get_all_values()[1:] if len(r)>1]
        headers = v_sheet.row_values(1)
        new_h = list(headers)
        mod = False
        for s in series:
            if s not in new_h: new_h.append(s); mod = True
        if mod: v_sheet.update(range_name='A1', values=[new_h]); headers = new_h

        row = [None]*len(headers)
        row[0:4] = [datetime.now().strftime("%Y-%m-%d %H:%M:%S"), email_clean, vote.nick.strip(), vote.tier]
        for name, p in vote.votes.items():
            if p>0 and name in headers: row[headers.index(name)] = p
        v_sheet.append_row(row)
        return {"status": "success"}
    except: return {"status":"error", "message":"Error."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
