import React, { useState, useEffect } from 'react';
import './App.css';

const TIERS = [
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

const imgProxy = (url) => url ? `https://wsrv.nl/?url=${encodeURIComponent(url)}&w=200&h=300&fit=cover` : '';
const API_BASE = "/api";

function App() {
  const [seriesList, setSeriesList] = useState([]);
  const [resultsData, setResultsData] = useState({ active_month: '', data: [] });
  const [loading, setLoading] = useState(false);
  const [imageErrors, setImageErrors] = useState({});
  const [notification, setNotification] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  
  const currentMonthISO = new Date().toISOString().slice(0,7);

  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('mundo_donghua_pro_v2');
    return saved ? JSON.parse(saved) : {
      email: '', nick: '', tier: TIERS[0].id, votes: {}, lastVotedMonth: '', votedEmail: '', lastVotedDate: ''
    };
  });

  const showNotify = (msg, type = 'success') => {
    setNotification({ msg, type });
    setTimeout(() => setNotification(null), 5000);
  };

  const refreshData = async () => {
    try {
      const [seriesRes, resultsRes] = await Promise.all([
        fetch(`${API_BASE}/donghuas`),
        fetch(`${API_BASE}/results`)
      ]);
      if (seriesRes.ok) setSeriesList(await seriesRes.json());
      if (resultsRes.ok) setResultsData(await resultsRes.json());
    } catch (e) { console.error(e); }
  };

  useEffect(() => { refreshData(); }, []);
  useEffect(() => { localStorage.setItem('mundo_donghua_pro_v2', JSON.stringify(formData)); }, [formData]);

  const currentTier = TIERS.find(t => t.id === formData.tier) || TIERS[0];
  const usedPoints = Object.values(formData.votes).reduce((a, b) => a + b, 0);
  const pointsRemaining = currentTier.limit - usedPoints;
  
  const hasVotedThisMonth = formData.lastVotedMonth === (resultsData.active_month || currentMonthISO) && !isEditing;

  const updateVote = (name, delta) => {
    if (hasVotedThisMonth) return;
    setFormData(prev => {
      const currentPoints = prev.votes[name] || 0;
      const newPoints = Math.max(0, currentPoints + delta);
      if (delta > 0 && pointsRemaining <= 0) return prev;
      return { ...prev, votes: { ...prev.votes, [name]: newPoints } };
    });
  };

  const handleSubmit = async (e, forceOverwrite = false) => {
    if (e) e.preventDefault();
    if (pointsRemaining !== 0) return showNotify(`Asigna tus ${currentTier.limit} puntos totales.`, "error");

    const emailClean = formData.email.trim().toLowerCase();
    const isOverwriting = forceOverwrite || (isEditing && emailClean === formData.votedEmail.trim().toLowerCase());

    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          nick: formData.nick,
          tier: currentTier.label,
          votes: formData.votes,
          overwrite: isOverwriting
        })
      });
      
      const result = await response.json();
      if (result.status === "success") {
        const now = new Date().toLocaleString();
        showNotify(isOverwriting ? "¡Voto actualizado!" : "¡Votación registrada!", "success");
        setFormData(prev => ({ 
          ...prev, 
          lastVotedMonth: (resultsData.active_month || currentMonthISO), 
          votedEmail: emailClean,
          lastVotedDate: now
        }));
        setIsEditing(false);
        setShowConfirm(false);
        refreshData();
      } else if (result.status === "needs_confirmation") {
        setShowConfirm(true);
      } else {
        showNotify(result.message || "Error.", "error");
      }
    } catch (error) {
      showNotify("Error de servidor.", "error");
    } finally {
      setLoading(false);
    }
  };

  const getButtonText = () => {
    if (loading) return 'Enviando...';
    if (!formData.email.trim()) return 'Ingresa tu Email';
    if (!formData.nick.trim()) return 'Ingresa tu Nick';
    if (pointsRemaining !== 0) return `Faltan ${pointsRemaining} puntos`;
    return isEditing && formData.email === formData.votedEmail ? 'Actualizar mi Voto' : '🚀 Enviar Votos';
  };

  const getDynamicTitle = () => {
    if (!resultsData.active_month) return "Calculando...";
    const date = new Date(resultsData.active_month + "-01T12:00:00Z");
    const nextDate = new Date(date);
    nextDate.setMonth(date.getMonth() + 1);
    const monthName = date.toLocaleString('es-ES', { month: 'long' });
    const nextMonthName = nextDate.toLocaleString('es-ES', { month: 'long' });
    const year = nextDate.getFullYear();
    const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
    return `Votación de ${cap(monthName)} para ${cap(nextMonthName)} ${year}`;
  };

  return (
    <div className="container">
      {notification && (
        <div className={`notification ${notification.type}`}>
          <span className="icon">{notification.type === 'success' ? '✅' : '❌'}</span>
          <span className="msg">{notification.msg}</span>
          <button className="close" onClick={() => setNotification(null)}>&times;</button>
        </div>
      )}

      {showConfirm && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-icon">🔄</div>
            <h3>Voto detectado</h3>
            <p>Ya has registrado un voto este mes con el correo <strong>{formData.email}</strong>.</p>
            <p className="modal-sub">¿Deseas reemplazar tus votos anteriores con esta nueva selección?</p>
            <div className="modal-actions">
              <button className="cancel-btn" onClick={() => setShowConfirm(false)}>Cancelar</button>
              <button className="submit-btn ready" onClick={() => handleSubmit(null, true)}>Sí, Reemplazar</button>
            </div>
          </div>
        </div>
      )}

      <header>
        <h1>MUNDO DONGHUA</h1>
        {hasVotedThisMonth ? (
          <div className="voted-banner">
            🎉 Voto registrado para {getDynamicTitle().split('Votación de ')[1]}.
            <div className="banner-actions">
              <button className="edit-btn" onClick={() => setIsEditing(true)}>✏️ Modificar mis votos</button>
            </div>
          </div>
        ) : (
          <p className="subtitle">{isEditing ? '📝 Editando sesión de votación' : 'Votación directa para patrocinadores'}</p>
        )}
      </header>

      <div className="main-layout">
        <div className="voting-area">
          <section className={`config-section ${hasVotedThisMonth ? 'locked' : ''}`}>
            <form onSubmit={handleSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Email Patreon</label>
                  <input type="email" value={formData.email} onChange={(e) => setFormData({...formData, email: e.target.value})} required disabled={hasVotedThisMonth} />
                </div>
                <div className="input-group">
                  <label>Nick</label>
                  <input type="text" value={formData.nick} onChange={(e) => setFormData({...formData, nick: e.target.value})} required disabled={hasVotedThisMonth} />
                </div>
                <div className="input-group">
                  <label>Tu Tier</label>
                  <select value={formData.tier} disabled={hasVotedThisMonth} onChange={(e) => {
                    const t = TIERS.find(t => t.id === e.target.value);
                    setFormData(prev => ({ ...prev, tier: e.target.value, votes: {} }));
                  }}>
                    {TIERS.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
                  </select>
                </div>
              </div>

              {formData.lastVotedDate && (
                <div className="last-vote-info">
                  📅 Último registro: <span>{formData.lastVotedDate}</span>
                </div>
              )}

              {!hasVotedThisMonth && (
                <div className="status-bar">
                  <div className="point-counter">
                    Disponibles: <span className={pointsRemaining === 0 ? 'zero' : ''}>{pointsRemaining}</span>
                  </div>
                  <div style={{display: 'flex', gap: '1rem'}}>
                    {isEditing && <button type="button" className="cancel-btn" onClick={() => { setIsEditing(false); setFormData(JSON.parse(localStorage.getItem('mundo_donghua_pro_v2')))}} >Volver</button>}
                    <button type="submit" className={`submit-btn ${pointsRemaining === 0 ? 'ready' : ''}`} disabled={pointsRemaining !== 0 || loading}>
                      {getButtonText()}
                    </button>
                  </div>
                </div>
              )}
            </form>
          </section>

          <div className={`series-grid ${hasVotedThisMonth ? 'locked' : ''}`}>
            {seriesList.length === 0 ? (
              loading ? (
                [...Array(8)].map((_, i) => <div key={i} className="skeleton skeleton-card"></div>)
              ) : (
                <div className="empty-state">
                  <div className="empty-icon">📁</div>
                  <h3>No hay series disponibles</h3>
                  <p>Por favor, intenta nuevamente más tarde o contacta al soporte.</p>
                </div>
              )
            ) : (
              seriesList.map(series => {
                const points = formData.votes[series.name] || 0;
                const hasError = imageErrors[series.id];
                return (
                  <div key={series.id} className={`series-card ${points > 0 ? 'selected' : ''} ${pointsRemaining === 0 && points === 0 ? 'disabled' : ''}`}>
                    {!hasError && series.img && (
                      <div className="image-container">
                        <img src={imgProxy(series.img)} alt={series.name} loading="lazy" onError={() => setImageErrors(prev => ({ ...prev, [series.id]: true }))} />
                      </div>
                    )}
                    <div className="series-info">
                      <div className="series-title">{series.name}</div>
                      {!hasVotedThisMonth && (
                        <div className="vote-controls">
                          <button type="button" onClick={() => updateVote(series.name, -1)} disabled={points === 0}>-</button>
                          <span className="points-display">{points}</span>
                          <button type="button" onClick={() => updateVote(series.name, 1)} disabled={pointsRemaining === 0}>+</button>
                        </div>
                      )}
                      {hasVotedThisMonth && points > 0 && (
                        <div className="voted-points">+{points} {points === 1 ? 'voto' : 'votos'}</div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <section className="results-section">
          <div className="results-container">
            <table className="votos-table">
              <thead>
                <tr>
                  <th className="th-main">{getDynamicTitle()}</th>
                  <th>Patrocinio</th>
                  <th>x2</th>
                  <th>Votos Patreon</th>
                  <th>Total votos</th>
                </tr>
              </thead>
              <tbody>
                {resultsData.data && resultsData.data.length > 0 ? [...resultsData.data].sort((a, b) => (b.Total || 0) - (a.Total || 0)).map((r, i) => (
                  <tr key={i}>
                    <td className="serie-name">{r.Donghua}</td>
                    <td>{r.Patrocinio || 0}</td>
                    <td>{r.x2 || 0}</td>
                    <td>{r.VotosPatreon || 0}</td>
                    <td className={`total-cell ${r.Total < 10 ? 'red-bg' : ''}`}>{r.Total || 0}</td>
                  </tr>
                )) : (
                  [...Array(5)].map((_, i) => (
                    <tr key={i}>
                      <td colSpan="5" style={{ padding: '5px' }}><div className="skeleton skeleton-row"></div></td>
                    </tr>
                  ))
                )}
              </tbody>
              {resultsData.data && resultsData.data.length > 0 && (
                <tfoot>
                  <tr className="totals-row">
                    <td className="serie-name">Votos totales</td>
                    <td>{resultsData.data.reduce((a, b) => a + (b.Patrocinio || 0), 0)}</td>
                    <td>{resultsData.data.reduce((a, b) => a + (b.x2 || 0), 0)}</td>
                    <td>{resultsData.data.reduce((a, b) => a + (b.VotosPatreon || 0), 0)}</td>
                    <td className="total-cell">{resultsData.data.reduce((a, b) => a + (b.Total || 0), 0)}</td>
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
