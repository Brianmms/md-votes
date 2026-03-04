import os
import json
import re
import traceback
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import requests
from bs4 import BeautifulSoup
import gspread
from oauth2client.service_account import ServiceAccountCredentials
from dotenv import load_dotenv

# Cargar .env
base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(base_dir, ".env"))

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

SHEET_ID = os.getenv("SPREADSHEET_ID", "").strip()
SVC_DATA = os.getenv("MD_SVC")

def get_gsheet():
    if not SHEET_ID: raise Exception("Falta SPREADSHEET_ID")
    scope = ["https://spreadsheets.google.com/feeds", "https://www.googleapis.com/auth/drive"]
    if os.path.exists(os.path.join(base_dir, "key.json")):
        client = gspread.service_account(filename=os.path.join(base_dir, "key.json"))
    else:
        creds_dict = json.loads(SVC_DATA.strip("'").strip('"'))
        creds = ServiceAccountCredentials.from_json_keyfile_dict(creds_dict, scope)
        client = gspread.authorize(creds)
    return client.open_by_key(SHEET_ID)

def get_active_month(doc):
    try:
        conf = doc.worksheet("Configuracion").get_all_records()
        for row in conf:
            if row.get("Variable") == "Mes Activo":
                return str(row.get("Valor"))
    except: pass
    return datetime.now().strftime("%Y-%m")

class VoteSubmit(BaseModel):
    email: str
    nick: str
    tier: str
    votes: dict
    overwrite: bool = False

@app.get("/api/donghuas")
@app.get("/donghuas")
async def get_donghuas():
    try:
        doc = get_gsheet()
        sheet = doc.worksheet("ListaDeDonghuas")
        rows = sheet.get_all_values()
        if len(rows) > 1:
            return [{"id": r[0] or f"gs-{i}", "name": r[1], "img": r[2] if len(r) > 2 else ""} for i, r in enumerate(rows[1:])]
        return []
    except: return []

@app.get("/api/results")
@app.get("/results")
async def get_results():
    try:
        doc = get_gsheet()
        active_month = get_active_month(doc)
        v_sheet = doc.worksheet("Votaciones")
        all_data = v_sheet.get_all_records()
        headers = v_sheet.row_values(1)
        donghuas = headers[4:] 
        
        # LEER DATOS ACTUALES DEL RESUMEN PARA PRESERVAR CAMBIOS MANUALES
        manual_patreon_votos = {}
        try:
            r_sheet = doc.worksheet("Resumen")
            current_resumen = r_sheet.get_all_records()
            for row in current_resumen:
                d_name = row.get("Donghua")
                val = row.get("Votos Patreon")
                # Solo guardamos si es un número real escrito a mano
                if d_name and str(val).isdigit():
                    manual_patreon_votos[d_name] = int(val)
        except: pass

        summary = []
        sheet_output = [["Donghua", "Patrocinio", "x2", "Votos Patreon", "Total votos"]]

        for i, d in enumerate(donghuas):
            col_letter = chr(69 + i) if i <= 21 else "A" + chr(65 + (i - 22))
            
            total_puntos_app = 0
            for row in all_data:
                if str(row.get("Fecha", "")).startswith(active_month):
                    total_puntos_app += int(row.get(d) or 0)
            
            # Recuperar valor manual o poner 0
            v_patreon_manual = manual_patreon_votos.get(d, 0)
            
            x2_val = total_puntos_app * 2
            total_final = x2_val + v_patreon_manual

            row_idx = len(summary) + 2
            f_patrocinio = f'=SUM(Votaciones!{col_letter}:{col_letter})'
            f_x2 = f'=B{row_idx} * 2'
            f_total = f'=C{row_idx} + D{row_idx}'

            summary.append({
                "Donghua": d, "Patrocinio": total_puntos_app, "x2": x2_val,
                "VotosPatreon": v_patreon_manual, "Total": total_final
            })
            # Escribimos el valor manual (número plano) en la columna D
            sheet_output.append([d, f_patrocinio, f_x2, v_patreon_manual, f_total])
        
        # Fila de totales finales
        last_row = len(sheet_output)
        sheet_output.append([
            "Votos totales", 
            f"=SUM(B2:B{last_row})", 
            f"=SUM(C2:C{last_row})", 
            f"=SUM(D2:D{last_row})", 
            f"=SUM(E2:E{last_row})"
        ])

        try:
            r_sheet = doc.worksheet("Resumen")
            r_sheet.clear()
            r_sheet.update(range_name='A1', values=sheet_output, value_input_option='USER_ENTERED')
        except: pass
        
        return { "active_month": active_month, "data": summary }
    except Exception as e:
        print(f"Error results: {e}")
        return {"active_month": "", "data": []}

@app.post("/api/submit")
@app.post("/submit")
async def submit_vote(vote: VoteSubmit):
    try:
        doc = get_gsheet()
        active_month = get_active_month(doc)
        email_clean = vote.email.strip().lower()
        try:
            v_sheet = doc.worksheet("Votaciones")
        except:
            v_sheet = doc.add_worksheet(title="Votaciones", rows="1000", cols="100")
            v_sheet.append_row(["Fecha", "Email", "Nick", "Tier"])

        all_records = v_sheet.get_all_records()
        existing_row_index = -1
        for i, record in enumerate(all_records):
            if str(record.get("Email")).strip().lower() == email_clean and str(record.get("Fecha")).startswith(active_month):
                existing_row_index = i + 2; break

        if existing_row_index != -1:
            if not vote.overwrite: return {"status": "needs_confirmation"}
            else: v_sheet.delete_rows(existing_row_index)

        list_sheet = doc.worksheet("ListaDeDonghuas")
        all_series = [r[1] for r in list_sheet.get_all_values()[1:] if len(r) > 1]
        headers = v_sheet.row_values(1)
        updated_headers = list(headers)
        h_changed = False
        for s in all_series:
            if s not in updated_headers: updated_headers.append(s); h_changed = True
        if h_changed:
            v_sheet.update(range_name='A1', values=[updated_headers])
            headers = updated_headers

        row_data = [None] * len(headers)
        row_data[0:4] = [datetime.now().strftime("%Y-%m-%d %H:%M:%S"), email_clean, vote.nick.strip(), vote.tier]
        for name, points in vote.votes.items():
            if points > 0 and name in headers: row_data[headers.index(name)] = points
        v_sheet.append_row(row_data)
        return {"status": "success"}
    except Exception as e:
        print(traceback.format_exc())
        return {"status": "error", "message": str(e)}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
