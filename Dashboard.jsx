import React, { useState, useEffect } from 'react';
import { db } from './firebase';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

function Dashboard({ user }) {
    const [matches, setMatches] = useState([]);
    const [chartData, setChartData] = useState([]);
    const [leaderboards, setLeaderboards] = useState({ gol: [], assist: [], recuperi: [] });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchMatches = async () => {
            try {
                const q = query(
                    collection(db, "matches"),
                    where("userId", "==", user.uid),
                    orderBy("createdAt", "desc")
                );
                
                const querySnapshot = await getDocs(q);
                const matchesData = querySnapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));
                
                setMatches(matchesData);

                // Elaborazione Grafico Lineare
                const dataForChart = [...matchesData].reverse().map(m => {
                    const p = m.datiPartita || {};
                    const gf = parseInt(p.risultatoFinale?.split('-')[0]) || 0;
                    const gs = parseInt(p.risultatoFinale?.split('-')[1]) || 0;
                    return { data: p.data || 'N/D', golFatti: gf, golSubiti: gs };
                });
                setChartData(dataForChart);

                // Elaborazione Classifiche Interne (Leaderboards)
                const playerTotals = {};
                matchesData.forEach(match => {
                    const stats = match.datiPartita?.statisticheIndividuali || [];
                    stats.forEach(st => {
                        if (!playerTotals[st.id]) {
                            playerTotals[st.id] = { nome: st.nome, gol: 0, assist: 0, palleRecuperate: 0 };
                        }
                        const s = st.stats || {};
                        playerTotals[st.id].gol += (s.gol || 0);
                        playerTotals[st.id].assist += (s.assist || 0);
                        playerTotals[st.id].palleRecuperate += (s.palleRecuperate || 0);
                    });
                });

                const playersArray = Object.values(playerTotals);
                setLeaderboards({
                    gol: [...playersArray].sort((a, b) => b.gol - a.gol).slice(0, 3).filter(p => p.gol > 0),
                    assist: [...playersArray].sort((a, b) => b.assist - a.assist).slice(0, 3).filter(p => p.assist > 0),
                    recuperi: [...playersArray].sort((a, b) => b.palleRecuperate - a.palleRecuperate).slice(0, 3).filter(p => p.palleRecuperate > 0)
                });

            } catch (error) {
                console.error("Errore nel recupero dati:", error);
            } finally {
                setLoading(false);
            }
        };

        if (user) {
            fetchMatches();
        }
    }, [user]);

    if (loading) return <p>Caricamento dashboard...</p>;

    return (
        <div style={{ maxWidth: '1000px', margin: '0 auto' }}>
            
            {/* Sezione Leaderboard */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '30px' }}>
                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ marginTop: 0, borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px' }}>Top Marcatori</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {leaderboards.gol.length === 0 ? <li style={{ fontSize: '14px' }}>Dati insufficienti</li> : 
                            leaderboards.gol.map((p, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                    <span>{i+1}. {p.nome}</span>
                                    <strong style={{ color: 'var(--primary-color)' }}>{p.gol}</strong>
                                </li>
                            ))
                        }
                    </ul>
                </div>
                
                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ marginTop: 0, borderBottom: '2px solid var(--secondary-color)', paddingBottom: '10px' }}>Top Assist</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {leaderboards.assist.length === 0 ? <li style={{ fontSize: '14px' }}>Dati insufficienti</li> : 
                            leaderboards.assist.map((p, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                    <span>{i+1}. {p.nome}</span>
                                    <strong style={{ color: 'var(--secondary-color)' }}>{p.assist}</strong>
                                </li>
                            ))
                        }
                    </ul>
                </div>

                <div className="card" style={{ marginBottom: 0 }}>
                    <h3 style={{ marginTop: 0, borderBottom: '2px solid #2ecc71', paddingBottom: '10px' }}>Migliori Difensori (PR)</h3>
                    <ul style={{ listStyle: 'none', padding: 0, margin: 0 }}>
                        {leaderboards.recuperi.length === 0 ? <li style={{ fontSize: '14px' }}>Dati insufficienti</li> : 
                            leaderboards.recuperi.map((p, i) => (
                                <li key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #eee' }}>
                                    <span>{i+1}. {p.nome}</span>
                                    <strong style={{ color: '#2ecc71' }}>{p.palleRecuperate}</strong>
                                </li>
                            ))
                        }
                    </ul>
                </div>
            </div>

            {chartData.length > 0 && (
                <div className="chart-container">
                    <h2 style={{ marginTop: 0 }}>Andamento Stagionale</h2>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={chartData} margin={{ top: 5, right: 20, bottom: 5, left: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#eee" />
                            <XAxis dataKey="data" tick={{fontSize: 12}} />
                            <YAxis tick={{fontSize: 12}} />
                            <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }} />
                            <Legend wrapperStyle={{ paddingTop: '10px' }} />
                            <Line type="monotone" dataKey="golFatti" stroke="var(--secondary-color)" strokeWidth={3} name="Gol Fatti" activeDot={{ r: 8 }} />
                            <Line type="monotone" dataKey="golSubiti" stroke="var(--danger)" strokeWidth={3} name="Gol Subiti" />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            <div className="card">
                <h2 style={{ marginTop: 0 }}>Storico Partite</h2>
                {matches.length === 0 ? (
                    <p>Nessuna partita registrata.</p>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        {matches.map((match) => (
                            <div key={match.id} style={{ border: '1px solid #dfe6e9', padding: '15px', borderRadius: '8px', backgroundColor: '#fff' }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid var(--primary-color)', paddingBottom: '10px', marginBottom: '10px' }}>
                                    <span style={{ fontSize: '18px', fontWeight: 'bold' }}>vs {match.datiPartita?.avversario || 'Sconosciuto'}</span>
                                    <span style={{ fontWeight: 'bold' }}>{match.datiPartita?.data || 'Data non inserita'}</span>
                                </div>
                                
                                <div style={{ display: 'flex', justifyContent: 'space-around', backgroundColor: 'var(--bg-color)', padding: '10px', borderRadius: '5px', marginBottom: '15px' }}>
                                    <div style={{ textAlign: 'center' }}>
                                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: 'var(--primary-color)' }}>
                                            {match.datiPartita?.risultatoFinale || 'N/D'}
                                        </div>
                                        <span style={{ fontSize: '12px' }}>Risultato Finale</span>
                                    </div>
                                </div>
                                
                                <div className="ai-box">
                                    <strong style={{ display: 'block', marginBottom: '8px' }}>Analisi AI:</strong>
                                    <p style={{ fontSize: '14px', margin: 0, whiteSpace: 'pre-wrap', lineHeight: '1.5' }}>
                                        {match.analysis}
                                    </p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}

export default Dashboard;