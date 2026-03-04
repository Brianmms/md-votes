import React, { useState, useEffect } from 'react';
import './App.css';

// --- CONSTANTS ---

const VOTING_TIERS = [
  { id: 'base-5', label: 'Formación de base $5', limit: 2, value: 'Formación de base $5' },
  { id: 'elixir-plus-5', label: 'Un paso a formación de elixir $5+', limit: 3, value: 'Un paso a formación de elixir $5+' },
  { id: 'elixir-10', label: 'Formación de elixir $10', limit: 4, value: 'Formación de elixir $10' },
  { id: 'alma-plus-10', label: 'Un paso a Alma Naciente $10+', limit: 5, value: 'Un paso a Alma Naciente $10+' },
  { id: 'alma-15', label: 'Alma Naciente $15', limit: 6, value: 'Alma Naciente $15' },
  { id: 'semi-celestial-20', label: 'Semi-Celestial $20', limit: 8, value: 'Semi-Celestial $20' },
  { id: 'celestial-25', label: 'Celestial $25', limit: 10, value: 'Celestial $25' },
  { id: 'semi-dios-35', label: 'Semi-Dios $35', limit: 15, value: 'Semi-Dios $35' },
  { id: 'dios-50', label: 'Dios $50', limit: 20, value: 'Dios $50' },
  { id: 'inmortal-100', label: 'Inmortal $100', limit: 40, value: 'Inmortal $100' },
  { id: 'staff', label: 'Staff', limit: 2, value: 'Staff' },
];

const API_BASE_URL = "/api";
const LOCAL_STORAGE_KEY = 'mundo_donghua_pro_v4';

/** 
 * Wraps original image URLs with a proxy to avoid CORS and hotlinking restrictions.
 */
const getProxiedImageUrl = (url) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&h=300&fit=cover` : '';

function App() {
  // --- STATE MANAGEMENT ---
  
  const [availableDonghuas, setAvailableDonghuas] = useState([]);
  const [votingDashboard, setVotingDashboard] = useState({ active_month: '', data: [] });
  const [isRequestPending, setIsRequestPending] = useState(false);
  const [imageLoadErrors, setImageLoadErrors] = useState({});
  const [activeNotification, setActiveNotification] = useState(null); // { msg, type }
  const [isUserEditing, setIsUserEditing] = useState(false);
  const [showDuplicateVoteModal, setShowDuplicateVoteModal] = useState(false);
  
  const currentMonthISO = new Date().toISOString().slice(0, 7);

  // Initialize form state from localStorage or defaults
  const [userFormData, setUserFormData] = useState(() => {
    const savedSession = localStorage.getItem(LOCAL_STORAGE_KEY);
    const defaultData = {
      email: '', nick: '', tierId: VOTING_TIERS[0].id, 
      assignedPoints: {}, lastVotedMonth: '', 
      registeredEmail: '', lastVoteDateStr: ''
    };
    if (!savedSession) return defaultData;
    try {
      const parsedData = JSON.parse(savedSession);
      return { ...defaultData, ...parsedData, assignedPoints: parsedData.assignedPoints || {} };
    } catch (error) { return defaultData; }
  });

  // --- ACTIONS & HELPERS ---

  const triggerNotification = (message, type = 'success') => {
    setActiveNotification({ msg: message, type });
    setTimeout(() => setActiveNotification(null), 5000);
  };

  /**
   * Syncs series and results from the server
   */
  const synchronizeData = async () => {
    try {
      setIsRequestPending(true);
      const [seriesResponse, resultsResponse] = await Promise.all([
        fetch(`${API_BASE_URL}/donghuas`),
        fetch(`${API_BASE_URL}/results`)
      ]);
      if (seriesResponse.ok) setAvailableDonghuas(await seriesResponse.ok ? await seriesResponse.json() : []);
      if (resultsResponse.ok) setVotingDashboard(await resultsResponse.json());
    } catch (error) {
      console.error("Sync error:", error);
    } finally { setIsRequestPending(false); }
  };

  useEffect(() => { synchronizeData(); }, []);
  useEffect(() => { localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(userFormData)); }, [userFormData]);

  const selectedTier = VOTING_TIERS.find(tier => tier.id === userFormData.tierId) || VOTING_TIERS[0];
  const pointsSpent = Object.values(userFormData.assignedPoints || {}).reduce((sum, val) => sum + val, 0);
  const remainingPoints = selectedTier.limit - pointsSpent;
  
  // Logic to determine if voting is locked for the current session
  const hasAlreadyVotedThisMonth = userFormData.lastVotedMonth === (votingDashboard.active_month || currentMonthISO) && !isUserEditing;

  const handlePointAdjustment = (donghuaName, delta) => {
    if (hasAlreadyVotedThisMonth) return;
    setUserFormData(prevData => {
      const currentVal = (prevData.assignedPoints && prevData.assignedPoints[donghuaName]) || 0;
      const newVal = Math.max(0, currentVal + delta);
      if (delta > 0 && remainingPoints <= 0) return prevData;
      return {
        ...prevData,
        assignedPoints: { ...(prevData.assignedPoints || {}), [donghuaName]: newVal }
      };
    });
  };

  /**
   * Sends the voting data to the backend
   */
  const handleSubmission = async (event, confirmOverwrite = false) => {
    if (event) event.preventDefault();
    if (remainingPoints !== 0) return triggerNotification(`Asigna todos tus ${selectedTier.limit} puntos.`, "error");

    const cleanEmail = userFormData.email.trim().toLowerCase();
    const isUpdate = confirmOverwrite || (isUserEditing && cleanEmail === userFormData.registeredEmail.trim().toLowerCase());

    try {
      setIsRequestPending(true);
      const response = await fetch(`${API_BASE_URL}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: userFormData.email, nick: userFormData.nick,
          tier: selectedTier.label, votes: userFormData.assignedPoints,
          overwrite: isUpdate
        })
      });
      
      const result = await response.json();
      if (result.status === "success") {
        triggerNotification(isUpdate ? "¡Voto actualizado!" : "¡Votación registrada!", "success");
        setUserFormData(prev => ({ 
          ...prev, lastVotedMonth: (votingDashboard.active_month || currentMonthISO), 
          registeredEmail: cleanEmail, lastVoteDateStr: new Date().toLocaleString()
        }));
        setIsUserEditing(false);
        setShowDuplicateVoteModal(false);
        synchronizeData();
      } else if (result.status === "needs_confirmation") {
        setShowDuplicateVoteModal(true);
      } else {
        triggerNotification(result.message || "Error al enviar.", "error");
      }
    } catch (e) { triggerNotification("Error de servidor.", "error"); } finally { setIsRequestPending(false); }
  };

  const getSubmitButtonText = () => {
    if (isRequestPending) return 'Procesando...';
    if (!userFormData.email.trim()) return 'Ingresa tu Email';
    if (!userFormData.nick.trim()) return 'Ingresa tu Nick';
    if (remainingPoints !== 0) return `Faltan ${remainingPoints} puntos`;
    return isUserEditing && userFormData.email === userFormData.registeredEmail ? 'Actualizar mi Voto' : '🚀 Enviar Votos';
  };

  const getFormattedDashboardTitle = () => {
    if (!votingDashboard.active_month) return "Cargando...";
    const startData = new Date(votingDashboard.active_month + "-01T12:00:00Z");
    const nextData = new Date(startData);
    nextData.setMonth(startData.getMonth() + 1);
    const curLabel = startData.toLocaleString('es-ES', { month: 'long' });
    const nextLabel = nextData.toLocaleString('es-ES', { month: 'long' });
    const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return `Votación de ${capitalize(curLabel)} para ${capitalize(nextLabel)} ${nextData.getFullYear()}`;
  };

  // --- VIEW RENDERING ---

  return (
    <div className="container">
      {/* Toast Overlay */}
      {activeNotification && (
        <div className={`notification ${activeNotification.type}`}>
          <span className="icon">{activeNotification.type === 'success' ? '✅' : '❌'}</span>
          <span className="msg">{activeNotification.msg}</span>
          <button className="close" onClick={() => setActiveNotification(null)}>&times;</button>
        </div>
      )}

      {/* Confirmation Overlay */}
      {showDuplicateVoteModal && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">🔄</div>
            <h3>Voto detectado</h3>
            <p>Ya has votado este mes con <strong>{userFormData.email}</strong>.</p>
            <p className="modal-sub">¿Deseas reemplazar tu voto anterior?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowDuplicateVoteModal(false)}>Cancelar</button>
              <button className="submit-btn ready" onClick={() => handleSubmission(null, true)}>Sí, Reemplazar</button>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1>MUNDO DONGHUA</h1>
        {hasAlreadyVotedThisMonth ? (
          <div className="voted-banner">
            🎉 Voto registrado. ¡Gracias!
            <div className="banner-actions">
              <button className="edit-btn" onClick={() => setIsUserEditing(true)}>✏️ Editar votos</button>
            </div>
          </div>
        ) : (
          <p className="subtitle">{isUserEditing ? '📝 Editando tus votos actuales' : 'Votación directa para patrocinadores'}</p>
        )}
      </header>

      <div className="main-layout">
        <div className="voting-area">
          {/* Settings Section */}
          <section className={`config-section ${hasAlreadyVotedThisMonth ? 'locked' : ''}`}>
            <form onSubmit={handleSubmission}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Email Patreon</label>
                  <input type="email" value={userFormData.email} onChange={(e) => setUserFormData({...userFormData, email: e.target.value})} required disabled={hasAlreadyVotedThisMonth} />
                </div>
                <div className="input-group">
                  <label>Nick</label>
                  <input type="text" value={userFormData.nick} onChange={(e) => setUserFormData({...userFormData, nick: e.target.value})} required disabled={hasAlreadyVotedThisMonth} />
                </div>
                <div className="input-group">
                  <label>Tu Tier</label>
                  <select value={userFormData.tierId} disabled={hasAlreadyVotedThisMonth} onChange={(e) => {
                    setUserFormData(prev => ({ ...prev, tierId: e.target.value, assignedPoints: {} }));
                  }}>
                    {VOTING_TIERS.map(tier => <option key={tier.id} value={tier.id}>{tier.label}</option>)}
                  </select>
                </div>
              </div>
              {userFormData.lastVoteDateStr && <div className="last-vote-info">📅 Último registro: <span>{userFormData.lastVoteDateStr}</span></div>}
              {!hasAlreadyVotedThisMonth && (
                <div className="status-bar">
                  <div className="point-counter">Disponibles: <span className={remainingPoints === 0 ? 'zero' : ''}>{remainingPoints}</span></div>
                  <div style={{display: 'flex', gap: '1rem'}}>
                    {isUserEditing && <button type="button" className="cancel-btn" onClick={() => setIsUserEditing(false)}>Volver</button>}
                    <button type="submit" className={`submit-btn ${remainingPoints === 0 ? 'ready' : ''}`} disabled={remainingPoints !== 0 || isRequestPending}>
                      {getSubmitButtonText()}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </section>

          {/* Donghua Cards Grid */}
          <div className={`series-grid ${hasAlreadyVotedThisMonth ? 'locked' : ''}`}>
            {availableDonghuas.length === 0 ? (
              isRequestPending ? [...Array(8)].map((_, i) => <div key={i} className="skeleton skeleton-card"></div>) : 
              <div className="empty-state"><div className="empty-icon">📁</div><h3>No hay series disponibles</h3></div>
            ) : (
              availableDonghuas.map(donghua => {
                const currentDonghuaPoints = userFormData.assignedPoints[donghua.name] || 0;
                return (
                  <div key={donghua.id} className={`series-card ${currentDonghuaPoints > 0 ? 'selected' : ''} ${remainingPoints === 0 && currentDonghuaPoints === 0 ? 'disabled' : ''}`}>
                    {!imageLoadErrors[donghua.id] && donghua.img && (
                      <div className="image-container"><img src={getProxiedImageUrl(donghua.img)} alt={donghua.name} loading="lazy" onError={() => setImageLoadErrors(prev => ({ ...prev, [donghua.id]: true }))} /></div>
                    )}
                    <div className="series-info">
                      <div className="series-title">{donghua.name}</div>
                      {!hasAlreadyVotedThisMonth && (
                        <div className="vote-controls">
                          <button type="button" onClick={() => handlePointAdjustment(donghua.name, -1)} disabled={currentDonghuaPoints === 0}>-</button>
                          <span className="points-display">{currentDonghuaPoints}</span>
                          <button type="button" onClick={() => handlePointAdjustment(donghua.name, 1)} disabled={remainingPoints === 0}>+</button>
                        </div>
                      )}
                      {hasAlreadyVotedThisMonth && currentDonghuaPoints > 0 && <div className="voted-points">+{currentDonghuaPoints} {currentDonghuaPoints === 1 ? 'voto' : 'votos'}</div>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Dashboard Section */}
        <section className="results-section">
          <div className="results-container">
            <table className="votos-table">
              <thead>
                <tr><th className="th-main">{getFormattedDashboardTitle()}</th><th>Patrocinio</th><th>x2</th><th>Patreon</th><th>Total</th></tr>
              </thead>
              <tbody>
                {votingDashboard.data && votingDashboard.data.length > 0 ? [...votingDashboard.data].sort((a, b) => (b.Total || 0) - (a.Total || 0)).map((row, i) => (
                  <tr key={i}>
                    <td className="serie-name">{row.Donghua}</td>
                    <td>{row.Patrocinio || 0}</td>
                    <td>{row.x2 || 0}</td>
                    <td>{row.VotosPatreon || 0}</td>
                    <td className={`total-cell ${row.Total < 10 ? 'red-bg' : ''}`}>{row.Total || 0}</td>
                  </tr>
                )) : [...Array(5)].map((_, i) => <tr key={i}><td colSpan="5" style={{ padding: '5px' }}><div className="skeleton skeleton-row"></div></td></tr>)}
              </tbody>
              {votingDashboard.data && votingDashboard.data.length > 0 && (
                <tfoot>
                  <tr className="totals-row">
                    <td className="serie-name">Votos totales</td>
                    <td>{votingDashboard.data.reduce((acc, row) => acc + (row.Patrocinio || 0), 0)}</td>
                    <td>{votingDashboard.data.reduce((acc, row) => acc + (row.x2 || 0), 0)}</td>
                    <td>{votingDashboard.data.reduce((acc, row) => acc + (row.VotosPatreon || 0), 0)}</td>
                    <td className="total-cell">{votingDashboard.data.reduce((acc, row) => acc + (row.Total || 0), 0)}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App;
