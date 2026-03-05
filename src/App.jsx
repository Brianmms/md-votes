import React, { useState, useEffect } from 'react';
import './App.css';

// --- CONSTANTS ---
const VOTING_TIERS = [
  { id: 'base-5', label: 'Formación de base $5', limit: 2 },
  { id: 'elixir-plus-5', label: 'Un paso a formación de elixir $5+', limit: 3 },
  { id: 'elixir-10', label: 'Formación de elixir $10', limit: 4 },
  { id: 'alma-plus-10', label: 'Un paso a Alma Naciente $10+', limit: 5 },
  { id: 'alma-15', label: 'Alma Naciente $15', limit: 6 },
  { id: 'semi-celestial-20', label: 'Semi-Celestial $20', limit: 8 },
  { id: 'celestial-25', label: 'Celestial $25', limit: 10 },
  { id: 'semi-dios-35', label: 'Semi-Dios $35', limit: 15 },
  { id: 'dios-50', label: 'Dios $50', limit: 20 },
  { id: 'inmortal-100', label: 'Inmortal $100', limit: 40 },
  { id: 'staff', label: 'Staff', limit: 2 },
];

const API_BASE_URL = "/api";
const LOCAL_STORAGE_KEY = 'mundo_donghua_pro_v4';
const getProxiedImageUrl = (url) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&h=300&fit=cover` : '';

function App() {
  // --- STATE ---
  const [appConfig, setAppConfig] = useState({ 
    active_month: '', is_voting_enabled: true, 
    show_results: false, // Default to false to avoid dashboard flickering
    can_edit_votes: false, 
    edit_deadline: '' 
  });
  const [availableDonghuas, setAvailableDonghuas] = useState([]);
  const [votingDashboard, setVotingDashboard] = useState({ active_month: '', data: [] });
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [activeNotification, setActiveNotification] = useState(null);
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [showDuplicateVoteModal, setShowDuplicateVoteModal] = useState(false);
  
  const systemCurrentMonth = new Date().toISOString().slice(0, 7);

  const [userFormData, setUserFormData] = useState(() => {
    const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
    const def = { email: '', nick: '', tierId: VOTING_TIERS[0].id, assignedPoints: {}, lastVotedMonth: '', registeredEmail: '', lastVoteDateStr: '' };
    if (!saved) return def;
    try {
      const parsed = JSON.parse(saved);
      return { ...def, ...parsed, assignedPoints: parsed.assignedPoints || {} };
    } catch { return def; }
  });

  // --- ACTIONS ---
  const triggerNotification = (msg, type = 'success') => {
    setActiveNotification({ msg, type });
    setTimeout(() => setActiveNotification(null), 5000);
  };

  const synchronizeData = async () => {
    try {
      setIsRequestPending(true);
      const [configRes, seriesRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/config`),
        fetch(`${API_BASE_URL}/donghuas`),
        fetch(`${API_BASE_URL}/results`)
      ]);
      
      if (configRes.ok) setAppConfig(await configRes.json());
      if (seriesRes.ok) setAvailableDonghuas(await seriesRes.json());
      if (resultsRes.ok) setVotingDashboard(await resultsRes.json());
    } catch (e) {
      console.error("Sync error:", e);
    } finally { setIsRequestPending(false); }
  };

  useEffect(() => { synchronizeData(); }, []);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userFormData)); }, [userFormData]);

  const selectedTier = VOTING_TIERS.find(t => t.id === userFormData.tierId) || VOTING_TIERS[0];
  const pointsSpent = Object.values(userFormData.assignedPoints).reduce((acc, val) => acc + val, 0);
  const remainingPoints = selectedTier.limit - pointsSpent;
  
  const hasAlreadyVotedThisMonth = userFormData.lastVotedMonth === (appConfig.active_month || systemCurrentMonth) && !isUserEditing;

  const handlePointAdjustment = (name, delta) => {
    if (hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled) return;
    setUserFormData(prev => {
      const current = prev.assignedPoints[name] || 0;
      const newVal = Math.max(0, current + delta);
      if (delta > 0 && remainingPoints <= 0) return prev;
      return { ...prev, assignedPoints: { ...prev.assignedPoints, [name]: newVal } };
    });
  };

  const handleSubmission = async (event, confirmOverwrite = false) => {
    if (event) event.preventDefault();
    if (!appConfig.is_voting_enabled) return triggerNotification("La encuesta está cerrada.", "error");
    if (confirmOverwrite && !appConfig.can_edit_votes) return triggerNotification(`Plazo de edición vencido: ${appConfig.edit_deadline}`, "error");
    if (remainingPoints !== 0) return triggerNotification(`Asigna tus ${selectedTier.limit} puntos.`, "error");

    try {
      setIsRequestPending(true);
      const res = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userFormData.email, nick: userFormData.nick,
          tier: selectedTier.label || userFormData.tierId, 
          votes: userFormData.assignedPoints,
          overwrite: confirmOverwrite || (isUserEditing && userFormData.email.trim().toLowerCase() === userFormData.registeredEmail.trim().toLowerCase())
        })
      });
      
      const result = await res.json();
      if (result.status === "success") {
        triggerNotification(confirmOverwrite || isUserEditing ? "¡Voto actualizado!" : "¡Votación registrada!", "success");
        setUserFormData(prev => ({ 
          ...prev, lastVotedMonth: (appConfig.active_month || systemCurrentMonth), 
          registeredEmail: userFormData.email.trim().toLowerCase(), lastVoteDateStr: new Date().toLocaleString()
        }));
        setIsUserEditing(false);
        setShowDuplicateVoteModal(false);
        synchronizeData();
      } else if (result.status === "needs_confirmation") {
        setShowDuplicateVoteModal(true);
      } else {
        triggerNotification(result.message || "Error al enviar.", "error");
      }
    } catch { triggerNotification("Error de servidor.", "error"); } finally { setIsRequestPending(false); }
  };

  const getFormattedTitle = () => {
    const monthId = appConfig.active_month || systemCurrentMonth;
    const date = new Date(monthId + "-01T12:00:00Z");
    const next = new Date(date);
    next.setMonth(date.getMonth() + 1);
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return `Votación de ${capitalize(date.toLocaleString('es-ES',{month:'long'}))} para ${capitalize(next.toLocaleString('es-ES',{month:'long'}))} ${next.getFullYear()}`;
  };

  return (
    <div className="container">
      {activeNotification && <div className={`notification ${activeNotification.type}`}><span className="msg">{activeNotification.msg}</span></div>}

      {showDuplicateVoteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <h3>Voto detectado</h3>
            <p>Ya has votado con <strong>{userFormData.email}</strong>.</p>
            {appConfig.can_edit_votes ? (
              <div className="modal-actions">
                <button className="cancel-btn" onClick={() => setShowDuplicateVoteModal(false)}>Cancelar</button>
                <button className="submit-btn ready" onClick={() => handleSubmission(null, true)}>Reemplazar</button>
              </div>
            ) : (
              <p className="modal-sub red-bg">El plazo de edición venció el {appConfig.edit_deadline}.</p>
            )}
          </div>
        </div>
      )}

      <header>
        <h1>MUNDO DONGHUA</h1>
        {!appConfig.is_voting_enabled ? (
          <div className="closed-banner">🔒 Encuesta cerrada temporalmente</div>
        ) : hasAlreadyVotedThisMonth ? (
          <div className="voted-banner">
            🎉 Voto registrado.
            {appConfig.edit_deadline && <div style={{fontSize:'0.75rem', opacity:0.9, marginTop: '5px'}}>Plazo máximo de edición: {appConfig.edit_deadline}</div>}
            {appConfig.can_edit_votes && <button className="edit-btn" style={{marginTop: '10px'}} onClick={() => setIsUserEditing(true)}>✏️ Editar mi voto</button>}
          </div>
        ) : (
          <p className="subtitle">{isUserEditing ? '📝 Editando' : 'Votación directa para patrocinadores'}</p>
        )}
      </header>

      <div className={`main-layout ${!appConfig.show_results ? 'full-width' : ''}`}>
        <div className="voting-area">
          <section className={`config-section ${hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled ? 'locked' : ''}`}>
            <form onSubmit={handleSubmission}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Email Patreon</label>
                  <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} required disabled={hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled} />
                </div>
                <div className="input-group">
                  <label>Nick</label>
                  <input type="text" value={userFormData.nick} onChange={(e) => setUserFormData({...userFormData, nick: e.target.value})} required disabled={hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled} />
                </div>
                <div className="input-group">
                  <label>Tu Tier</label>
                  <select value={userFormData.tierId} disabled={hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled} onChange={(e) => setUserFormData(prev => ({ ...prev, tierId: e.target.value, assignedPoints: {} }))}>
                    {VOTING_TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>
              {userFormData.lastVoteDateStr && <div className="last-vote-info">📅 Registro: <span>{userFormData.lastVoteDateStr}</span></div>}
              {appConfig.is_voting_enabled && !hasAlreadyVotedThisMonth && (
                <div className="status-bar">
                  <div className="point-counter">Votos: <span>{remainingPoints}</span></div>
                  <button type="submit" className={`submit-btn ${remainingPoints === 0 ? 'ready' : ''}`} disabled={remainingPoints !== 0 || isRequestPending}>
                    {isUserEditing ? 'Actualizar' : '🚀 Enviar'}
                  </button>
                </div>
              )}
            </form>
          </section>

          <div className={`series-grid ${hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled ? 'locked' : ''}`}>
            {availableDonghuas.length === 0 ? <p>Cargando...</p> : availableDonghuas.map(donghua => {
              const pts = userFormData.assignedPoints[donghua.name] || 0;
              return (
                <div key={donghua.id} className={`series-card ${pts > 0 ? 'selected' : ''}`}>
                  {!imageLoadErrors[donghua.id] && donghua.img && (
                    <div className="image-container"><img src={getProxiedImageUrl(donghua.img)} alt={donghua.name} loading="lazy" onError={() => setImageLoadErrors(prev => ({ ...prev, [donghua.id]: true }))} /></div>
                  )}
                  <div className="series-info">
                    <div className="series-title">{donghua.name}</div>
                    {appConfig.is_voting_enabled && !hasAlreadyVotedThisMonth && (
                      <div className="vote-controls">
                        <button type="button" onClick={() => handlePointAdjustment(donghua.name, -1)} disabled={pts === 0}>-</button>
                        <span>{pts}</span>
                        <button type="button" onClick={() => handlePointAdjustment(donghua.name, 1)} disabled={remainingPoints === 0}>+</button>
                      </div>
                    )}
                    {pts > 0 && (hasAlreadyVotedThisMonth || !appConfig.is_voting_enabled) && (
                      <div className="voted-points">+{pts} {pts === 1 ? 'voto' : 'votos'}</div>
                    )}
                  </div>                </div>
              );
            })}
          </div>
        </div>

        {appConfig.show_results && (
          <section className="results-section">
            <table className="votos-table">
              <thead><tr><th className="th-main">{getFormattedTitle()}</th><th>Total</th></tr></thead>
              <tbody>
                {votingDashboard.data && votingDashboard.data.length > 0 ? [...votingDashboard.data].sort((a,b) => b.Total - a.Total).map((row, i) => (
                  <tr key={i}><td className="serie-name">{row.Donghua}</td><td className={row.Total < 10 ? 'red-bg' : ''}>{row.Total}</td></tr>
                )) : <tr><td>Cargando...</td></tr>}
              </tbody>
            </table>
          </section>
        )}
      </div>
    </div>
  );
}

export default App;
