import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, serverTimestamp, doc, updateDoc } from 'firebase/firestore';

function MatchForm({ user }) {
    const [roster, setRoster] = useState([]);
    const [meta, setMeta] = useState({ avversario: '', dataPartita: '' });
    const [quarti, setQuarti] = useState({
        q1: { fatti: 0, subiti: 0 }, q2: { fatti: 0, subiti: 0 },
        q3: { fatti: 0, subiti: 0 }, q4: { fatti: 0, subiti: 0 }
    });
    const [superiorita, setSuperiorita] = useState({ ottenute: 0, sfruttate: 0 });
    const [playerStats, setPlayerStats] = useState({});
    
    const [analisi, setAnalisi] = useState('');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchRoster = async () => {
            const q = query(collection(db, "roster"), where("userId", "==", user.uid));
            const snapshot = await getDocs(q);
            const players = snapshot.docs.map(d => ({ id: d.id, ...d.data() })).sort((a,b) => a.numero - b.numero);
            setRoster(players);
            
            const initStats = {};
            players.forEach(p => initStats[p.id] = { 
                minutiGiocati: 0, gol: 0, assist: 0, 
                palleRecuperate: 0, pallePerse: 0, 
                espulsioniPrese: 0, espulsioniSubite: 0 
            });
            setPlayerStats(initStats);
        };
        if (user) fetchRoster();
    }, [user]);

    const handleQuarti = (q, field, val) => {
        setQuarti({ ...quarti, [q]: { ...quarti[q], [field]: parseInt(val) || 0 } });
    };

    const handlePlayerStat = (id, field, val) => {
        setPlayerStats({ ...playerStats, [id]: { ...playerStats[id], [field]: parseInt(val) || 0 } });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setAnalisi('Generazione analisi in corso... I dati numerici sono stati salvati.');

        const golFattiTot = Object.values(quarti).reduce((acc, curr) => acc + curr.fatti, 0);
        const golSubitiTot = Object.values(quarti).reduce((acc, curr) => acc + curr.subiti, 0);
        const percentualeSup = superiorita.ottenute > 0 ? ((superiorita.sfruttate / superiorita.ottenute) * 100).toFixed(1) : 0;

        const payloadDati = {
            avversario: meta.avversario,
            data: meta.dataPartita,
            risultatoFinale: `${golFattiTot} - ${golSubitiTot}`,
            parziali: quarti,
            uomoInPiu: { ...superiorita, percentuale: `${percentualeSup}%` },
            statisticheIndividuali: roster.map(p => ({
                id: p.id, nome: p.nome, numero: p.numero, stats: playerStats[p.id]
            }))
        };

        let docRef = null;

        try {
            console.log(">>> 1. Inizio salvataggio su Firebase...");
            // RIPRISTINO: Invia i dati reali della partita
            docRef = await addDoc(collection(db, "matches"), {
                userId: user.uid,
                datiPartita: payloadDati, // Usa i dati veri qui
                analysis: "Analisi in corso...",
                createdAt: serverTimestamp()
            });
            console.log(">>> 2. Salvataggio completato. ID:", docRef.id);

            console.log(">>> 3. Avvio chiamata di rete verso Python/Gemini...");
            const response = await axios.post('/api/analyze', payloadDati, {
                timeout: 30000
            });
            console.log(">>> 4. Risposta ricevuta da Python:", response.data);

            const aiAnalysis = response.data.analysis;
            setAnalisi(aiAnalysis);

            await updateDoc(doc(db, "matches", docRef.id), { analysis: aiAnalysis });
            console.log(">>> 5. Analisi salvata con successo su Firebase.");
            
        } catch (error) {
            console.error(">>> ERRORE RILEVATO:", error);
            const errorMsg = "Analisi non disponibile. Tempo di attesa superato o errore del server AI.";
            setAnalisi(errorMsg);
            
            if (docRef) {
                await updateDoc(doc(db, "matches", docRef.id), {
                    analysis: errorMsg
                });
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="card" style={{ maxWidth: '900px', margin: '0 auto' }}>
            <h2>Inserimento Dati Avanzati</h2>
            <form onSubmit={handleSubmit}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginBottom: '20px' }}>
                    <input type="text" placeholder="Avversario" value={meta.avversario} onChange={e => setMeta({...meta, avversario: e.target.value})} required />
                    <input type="date" value={meta.dataPartita} onChange={e => setMeta({...meta, dataPartita: e.target.value})} required />
                </div>

                <h3>Parziali (Fatti - Subiti)</h3>
                <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
                    {['q1', 'q2', 'q3', 'q4'].map((q, idx) => (
                        <div key={q} style={{ border: '1px solid #dfe6e9', padding: '10px', borderRadius: '8px', flex: '1', minWidth: '120px' }}>
                            <strong>{idx + 1}° Tempo</strong><br/><br/>
                            <input type="number" min="0" value={quarti[q].fatti} onChange={e => handleQuarti(q, 'fatti', e.target.value)} style={{ width: '45px', padding: '8px' }}/> - 
                            <input type="number" min="0" value={quarti[q].subiti} onChange={e => handleQuarti(q, 'subiti', e.target.value)} style={{ width: '45px', padding: '8px', marginLeft: '5px' }}/>
                        </div>
                    ))}
                </div>

                <h3>Uomo in Più (Superiorità)</h3>
                <div style={{ display: 'flex', gap: '15px', marginBottom: '20px' }}>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Ottenute</label>
                        <input type="number" min="0" value={superiorita.ottenute} onChange={e => setSuperiorita({...superiorita, ottenute: parseInt(e.target.value)||0})} style={{ width: '80px' }} />
                    </div>
                    <div>
                        <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>Sfruttate</label>
                        <input type="number" min="0" value={superiorita.sfruttate} onChange={e => setSuperiorita({...superiorita, sfruttate: parseInt(e.target.value)||0})} style={{ width: '80px' }} />
                    </div>
                </div>

                <h3>Statistiche Giocatori</h3>
                <div style={{ overflowX: 'auto', marginBottom: '20px' }}>
                    <table style={{ minWidth: '800px' }}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nome</th>
                                <th title="Minuti Giocati">MIN</th>
                                <th title="Gol Fatti">GOL</th>
                                <th title="Assist">AST</th>
                                <th title="Palle Recuperate">PR</th>
                                <th title="Palle Perse">PP</th>
                                <th title="Espulsioni Prese (a carico)">EP</th>
                                <th title="Espulsioni Subite (a favore)">ES</th>
                            </tr>
                        </thead>
                        <tbody>
                            {roster.map(p => (
                                <tr key={p.id}>
                                    <td><strong>{p.numero}</strong></td>
                                    <td>{p.nome}</td>
                                    {['minutiGiocati', 'gol', 'assist', 'palleRecuperate', 'pallePerse', 'espulsioniPrese', 'espulsioniSubite'].map(field => (
                                        <td key={field} style={{ textAlign: 'center' }}>
                                            <input type="number" min="0" value={playerStats[p.id]?.[field] || 0} onChange={e => handlePlayerStat(p.id, field, e.target.value)} style={{ width: '55px', padding: '5px' }} />
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <button type="submit" disabled={loading} style={{ width: '100%', padding: '15px', fontSize: '1.1rem' }}>
                    {loading ? 'Elaborazione in corso...' : 'Salva e Invia a Gemini'}
                </button>
            </form>

            {analisi && (
                <div className="ai-box">
                    <h3 style={{ margin: '0 0 10px 0' }}>Riscontro dell'Allenatore</h3>
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0, lineHeight: '1.5' }}>{analisi}</p>
                </div>
            )}
        </div>
    );
}

export default MatchForm;