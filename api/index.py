import os
import json
import traceback
import requests
from datetime import datetime
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# --- CONFIGURATION ---
project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
load_dotenv(os.path.join(project_root, ".env"))

app = FastAPI()
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# En esta rama, solo necesitamos la URL de la Web App de Google
APPS_SCRIPT_URL = os.getenv("APPS_SCRIPT_URL", "").strip().strip("'").strip('"')

def fetch_application_config():
    """Llama al puente de Google Apps Script para obtener la config."""
    try:
        response = requests.get(f"{APPS_SCRIPT_URL}?action=getConfig")
        gas_config = response.json()
        
        # Mapeo a nuestro formato interno para no romper el Front
        config = {
            "active_month": gas_config.get("Mes Activo", datetime.now().strftime("%Y-%m")),
            "is_voting_enabled": str(gas_config.get("Habilitar Encuesta", "")).lower() == "si",
            "show_results": str(gas_config.get("Mostrar Votaciones", "")).lower() == "si",
            "can_edit_votes": True, # Simplificado para el puente
            "edit_deadline": str(gas_config.get("Fecha Limite Edicion", ""))
        }
        
        # Lógica de fecha limite
        if config["edit_deadline"]:
            try:
                deadline = datetime.strptime(config["edit_deadline"], "%Y-%m-%d")
                if datetime.now().date() > deadline.date():
                    config["can_edit_votes"] = False
            except: pass
            
        return config
    except Exception as e:
        print(f"Error bridge config: {e}")
        return {"active_month": "", "is_voting_enabled": False, "show_results": False, "can_edit_votes": False}

class VoteSchema(BaseModel):
    email: str
    nick: str
    tier: str
    votes: dict
    overwrite: bool = False

@app.get("/api/config")
@app.get("/config")
async def get_config(): return fetch_application_config()

@app.get("/api/donghuas")
@app.get("/donghuas")
async def get_donghuas():
    try:
        response = requests.get(f"{APPS_SCRIPT_URL}?action=getDonghuas")
        return response.json()
    except: return []

@app.get("/api/results")
@app.get("/results")
async def get_results():
    """Obtiene los resultados calculados directamente desde el puente."""
    try:
        response = requests.get(f"{APPS_SCRIPT_URL}?action=getResults")
        results_data = response.json()
        
        # Necesitamos el mes activo para el título del Front
        config = fetch_application_config()
        
        return {
            "active_month": config.get("active_month", ""),
            "data": results_data,
            "hidden": not config.get("show_results", True)
        }
    except Exception as e:
        print(f"Error results bridge: {e}")
        return {"active_month": "", "data": [], "hidden": False}

@app.post("/api/submit")
@app.post("/submit")
async def submit_vote(vote: VoteSchema):
    try:
        payload = vote.dict()
        payload["action"] = "submitVote"
        response = requests.post(APPS_SCRIPT_URL, json=payload)
        return response.json()
    except: return {"status":"error", "message":"Error en el puente."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
