import { useState, useEffect, useRef } from 'react';
import { euro, getPersonne, getPatrimoine, getActifsByOwner } from '../utils.js';
import { ChouetteTete } from './Chouette.jsx';

const SUGGESTIONS = [
  'Que se passe-t-il si le grand-père décède demain ?',
  'Comment fonctionne l\'abattement de la tante ?',
  'Quelle est la priorité absolue pour Lucas ?',
  'Expliquez la communauté universelle',
];

const buildSystemPrompt = (pov, actifs) => {
  const p = getPersonne(pov);
  const mesActifs = getActifsByOwner(pov, actifs);
  const patrimoine = getPatrimoine(pov, actifs);
  return `Tu es le conseiller patrimonial de Nesso, une plateforme française de clarté patrimoniale familiale.
Tu réponds aux questions de ${p?.prenom} sur son patrimoine et celui de sa famille.

SITUATION DE ${p?.prenom?.toUpperCase()} :
- Âge : ${p?.age} ans | Rôle : ${p?.role} | Profession : ${p?.profession || 'non renseigné'}
- Patrimoine propre estimé : ${euro(patrimoine)}
- Ses actifs : ${mesActifs.map(a => `${a.nom} (${euro(a.valeur / a.proprietaires.length)})`).join(', ') || 'aucun'}
${p?.handicap ? '- Bénéficie de l\'abattement handicap (159 325€ supplémentaire)' : ''}

FAMILLE MARTIN (démo fictive) :
- Henri/Suzanne (84/80 ans) : communauté universelle | RP Versailles 520k€ + Villa Porto Vecchio 65k€ (non cadastré IT) + AV 28k€
- Claire (57 ans) : femme au foyer | co-propriétaire Maison Biarritz 240k€ + liquidités 27.5k€ + AV 17.5k€
- Michel (60 ans) : retraité 2 400€/mois | co-propriétaire Biarritz + liquidités
- Sophie : handicapée, fonctionnaire | Appartement Bordeaux 135k€ (crédit), abattement succession 159 325€
- Lucas (34 ans) : consultant indépendant (SASU) | épargne 110k€ + société 22k€
- Camille (31 ans) : mariée sans contrat de mariage

RÈGLES :
- Adapte le ton niveau intermédiaire (jargon contextualisé, pédagogue)
- Ne donne jamais de conseil sans toutes les infos nécessaires
- Mentionne toujours quand un notaire/fiscaliste/avocat est indispensable
- Règles fiscales françaises exactes uniquement — dis "je ne suis pas certain" si doute
- Réponses structurées, concises, avec des chiffres précis

RÈGLES FISCALES CLÉS :
- Abattement succession parent→enfant : 100 000€ / parent / enfant (renouvelable 15 ans)
- Abattement conjoint survivant : exonération totale
- Abattement handicap : 159 325€ supplémentaire
- AV avant 70 ans : abattement 152 500€ / bénéficiaire hors succession
- AV après 70 ans : abattement global 30 500€ tous bénéficiaires
- Communauté universelle + clause attribution intégrale : 1er décès = 0 droit de succession
- Biens étrangers : Règlement UE 650/2012 — risque double imposition`;
};

export default function Aide({ pov, actifs }) {
  const person = getPersonne(pov);
  const [messages, setMessages] = useState([]);
  const [input, setInput]       = useState('');
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState(null);
  const endRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: 'assistant', content: `Bonjour ${person?.prenom} ! Je suis votre conseiller patrimonial Nesso.\n\nJe connais votre situation : ${euro(getPatrimoine(pov, actifs))} de patrimoine propre, et la situation complète de votre famille.\n\nPosez-moi vos questions — succession, fiscalité, optimisation…` }]);
    setError(null);
  }, [pov]);

  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async () => {
    if (!input.trim() || loading) return;
    const userMsg = { role: 'user', content: input.trim() };
    const history = [...messages, userMsg];
    setMessages(history);
    setInput('');
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/anthropic/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ model: 'claude-sonnet-4-6', max_tokens: 800, system: buildSystemPrompt(pov, actifs), messages: history.map(m => ({ role: m.role, content: m.content })) }),
      });
      if (!res.ok) { const e = await res.json(); throw new Error(e.error?.message || `Erreur ${res.status}`); }
      const data = await res.json();
      const text = data.content?.[0]?.text;
      if (!text) throw new Error('Réponse vide du modèle');
      setMessages(prev => [...prev, { role: 'assistant', content: text }]);
    } catch (e) {
      setError(e.message.includes('fetch') ? 'Service temporairement indisponible.' : e.message);
    } finally { setLoading(false); }
  };

  return (
    <div style={{ maxWidth: 780, margin: '0 auto', padding: '36px 24px 100px' }}>
      <div style={{ marginBottom: 24 }}>
        <p style={{ color: '#1F6B4A', fontSize: 12, fontWeight: 600, letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 6 }}>Aide</p>
        <h1 className="font-serif" style={{ color: '#1A201C', fontSize: 30, margin: 0 }}>Votre conseiller Nesso</h1>
      </div>

      <div className="card" style={{ display: 'flex', flexDirection: 'column', height: 560 }}>
        <div style={{ padding: '14px 20px', borderBottom: '1px solid #F6F4ED', display: 'flex', alignItems: 'center', gap: 12 }}>
          <ChouetteTete size={34} style={{ flexShrink: 0 }} />
          <div>
            <p style={{ fontWeight: 600, color: '#1A201C', fontSize: 14, margin: 0 }}>Conseiller Nesso</p>
            <p style={{ color: '#1F8A5F', fontSize: 11, margin: 0, display: 'flex', alignItems: 'center', gap: 4 }}>
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: '#1F8A5F', display: 'inline-block' }} /> En ligne · Contexte : {person?.prenom}
            </p>
          </div>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20, display: 'flex', flexDirection: 'column', gap: 14 }}>
          {messages.map((m, i) => (
            <div key={i} className="fade-in" style={{ display: 'flex', justifyContent: m.role === 'user' ? 'flex-end' : 'flex-start', alignItems: 'flex-start', gap: 8 }}>
              {m.role === 'assistant' && (
                <ChouetteTete size={28} style={{ flexShrink: 0, marginTop: 2 }} />
              )}
              <div style={{ maxWidth: '78%', background: m.role === 'user' ? '#1A201C' : '#FBFAF6', color: m.role === 'user' ? 'white' : '#1A201C', padding: '11px 15px', borderRadius: m.role === 'user' ? '12px 12px 3px 12px' : '3px 12px 12px 12px', fontSize: 14, lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>
                {m.content}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <ChouetteTete size={28} style={{ flexShrink: 0 }} />
              <div style={{ background: '#FBFAF6', padding: '10px 14px', borderRadius: '3px 12px 12px 12px', display: 'flex', gap: 5 }}>
                {[0,1,2].map(i => <div key={i} style={{ width: 7, height: 7, borderRadius: '50%', background: '#1F6B4A', animation: `bounce 0.8s ${i*0.15}s infinite` }} />)}
              </div>
            </div>
          )}
          {error && (
            <div style={{ background: '#FAEDE7', border: '1px solid #E5A88F', borderRadius: 8, padding: 12 }}>
              <p style={{ color: '#C2502F', fontSize: 13, margin: 0 }}>⚠ {error}</p>
            </div>
          )}
          <div ref={endRef} />
        </div>

        {messages.length <= 1 && (
          <div style={{ padding: '0 20px 12px', display: 'flex', gap: 7, flexWrap: 'wrap' }}>
            {SUGGESTIONS.map((s, i) => (
              <button key={i} onClick={() => setInput(s)} style={{ background: '#F6F4ED', border: '1px solid #E5D9C8', color: '#1A201C', borderRadius: 18, padding: '5px 13px', fontSize: 12, cursor: 'pointer', fontFamily: 'DM Sans, sans-serif', transition: 'background 0.15s' }}
                onMouseEnter={e => e.target.style.background = '#EDE8E0'} onMouseLeave={e => e.target.style.background = '#F6F4ED'}>
                {s}
              </button>
            ))}
          </div>
        )}

        <div style={{ borderTop: '1px solid #F6F4ED', padding: 16, display: 'flex', gap: 10 }}>
          <input value={input} onChange={e => setInput(e.target.value)} onKeyDown={e => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder="Posez votre question..."
            style={{ flex: 1, border: '1px solid #DDD8C9', borderRadius: 10, padding: '11px 15px', fontSize: 14, fontFamily: 'DM Sans, sans-serif' }} />
          <button className="btn-navy" onClick={send} disabled={loading || !input.trim()} style={{ padding: '11px 20px' }}>→</button>
        </div>
      </div>
    </div>
  );
}
