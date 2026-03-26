import React, { useState, useEffect, useCallback } from 'react';
import { db } from './firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';

function Roster({ user }) {
    const [, setPlayers] = useState([]);
    const [aggregateStats, setAggregateStats] = useState([]);
    const [newPlayer, setNewPlayer] = useState({ nome: '', numero: '' });
    const [loading, setLoading] = useState(true);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // Recupero Roster
            const qRoster = query(collection(db, "roster"), where("userId", "==", user.uid));
            const snapRoster = await getDocs(qRoster);
            const rosterData = snapRoster.docs.map(d => ({ id: d.id, ...d.data() }));
            setPlayers(rosterData);

            // Recupero Storico Partite
            const qMatches = query(collection(db, "matches"), where("userId", "==", user.uid));
            const snapMatches = await getDocs(qMatches);
            const matchesData = snapMatches.docs.map(d => d.data());

            // Aggregazione Statistiche
            const statsMap = {};
            rosterData.forEach(p => {
                statsMap[p.id] = { 
                    ...p, partiteGiocate: 0, minutiGiocati: 0, gol: 0, 
                    assist: 0, palleRecuperate: 0, pallePerse: 0, 
                    espulsioniPrese: 0, espulsioniSubite: 0 
                };
            });

            matchesData.forEach(match => {
                const stats = match.datiPartita?.statisticheIndividuali || [];
                stats.forEach(st => {
                    if (statsMap[st.id]) {
                        const s = st.stats;
                        if (s.minutiGiocati > 0) statsMap[st.id].partiteGiocate += 1;
                        statsMap[st.id].minutiGiocati += (s.minutiGiocati || 0);
                        statsMap[st.id].gol += (s.gol || 0);
                        statsMap[st.id].assist += (s.assist || 0);
                        statsMap[st.id].palleRecuperate += (s.palleRecuperate || 0);
                        statsMap[st.id].pallePerse += (s.pallePerse || 0);
                        statsMap[st.id].espulsioniPrese += (s.espulsioniPrese || 0);
                        statsMap[st.id].espulsioniSubite += (s.espulsioniSubite || 0);
                    }
                });
            });

            setAggregateStats(Object.values(statsMap).sort((a,b) => a.numero - b.numero));
        } catch (error) {
            console.error("Errore recupero dati aggregati:", error);
        } finally {
            setLoading(false);
        }
    }, [user]);

    useEffect(() => {
        if (user) fetchData();
    }, [user, fetchData]);

    const handleAddPlayer = async (e) => {
        e.preventDefault();
        const tempId = Date.now().toString();
        const newPlayerData = { id: tempId, userId: user.uid, nome: newPlayer.nome, numero: parseInt(newPlayer.numero) };
        
        setPlayers(prev => [...prev, newPlayerData]);
        setNewPlayer({ nome: '', numero: '' });

        try {
            await addDoc(collection(db, "roster"), { userId: user.uid, nome: newPlayerData.nome, numero: newPlayerData.numero });
            fetchData();
        } catch (error) {
            console.error("Errore operazione:", error);
            fetchData();
        }
    };

    const handleDelete = async (id) => {
        setPlayers(prev => prev.filter(p => p.id !== id));
        try {
            await deleteDoc(doc(db, "roster", id));
            fetchData();
        } catch (error) {
            console.error("Errore operazione:", error);
            fetchData();
        }
    };

    const handleExportCSV = () => {
        const headers = "Numero,Nome,Partite Giocate,Minuti,Gol,Assist,Palle Recuperate,Palle Perse,Esp. Prese,Esp. Subite\n";
        const rows = aggregateStats.map(p => 
            `${p.numero},${p.nome},${p.partiteGiocate},${p.minutiGiocati},${p.gol},${p.assist},${p.palleRecuperate},${p.pallePerse},${p.espulsioniPrese},${p.espulsioniSubite}`
        ).join("\n");
        
        const blob = new Blob([headers + rows], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.setAttribute("download", "statistiche_stagionali.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="card" style={{ maxWidth: '1000px', margin: '0 auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h2 style={{ margin: 0 }}>Roster e Statistiche Aggregate</h2>
                <button onClick={handleExportCSV} style={{ backgroundColor: '#2ecc71' }}>Esporta CSV</button>
            </div>

            <form onSubmit={handleAddPlayer} style={{ display: 'flex', gap: '10px', marginBottom: '20px' }}>
                <input type="number" placeholder="Num" value={newPlayer.numero} onChange={e => setNewPlayer({...newPlayer, numero: e.target.value})} required style={{ width: '80px' }} />
                <input type="text" placeholder="Nome Giocatore" value={newPlayer.nome} onChange={e => setNewPlayer({...newPlayer, nome: e.target.value})} required style={{ flex: 1 }} />
                <button type="submit">Aggiungi</button>
            </form>

            {loading ? <p>Elaborazione dati stagionali in corso...</p> : (
                <div style={{ overflowX: 'auto' }}>
                    <table style={{ minWidth: '800px', fontSize: '14px' }}>
                        <thead>
                            <tr>
                                <th>#</th>
                                <th>Nome</th>
                                <th title="Partite Giocate">PG</th>
                                <th title="Minuti Giocati">MIN</th>
                                <th title="Gol Fatti">GOL</th>
                                <th title="Assist">AST</th>
                                <th title="Palle Recuperate">PR</th>
                                <th title="Palle Perse">PP</th>
                                <th title="Espulsioni Prese">EP</th>
                                <th title="Espulsioni Subite">ES</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {aggregateStats.map(p => (
                                <tr key={p.id}>
                                    <td><strong>{p.numero}</strong></td>
                                    <td>{p.nome}</td>
                                    <td style={{ textAlign: 'center' }}>{p.partiteGiocate}</td>
                                    <td style={{ textAlign: 'center' }}>{p.minutiGiocati}</td>
                                    <td style={{ textAlign: 'center', fontWeight: 'bold', color: 'var(--primary-color)' }}>{p.gol}</td>
                                    <td style={{ textAlign: 'center' }}>{p.assist}</td>
                                    <td style={{ textAlign: 'center' }}>{p.palleRecuperate}</td>
                                    <td style={{ textAlign: 'center' }}>{p.pallePerse}</td>
                                    <td style={{ textAlign: 'center', color: 'var(--danger)' }}>{p.espulsioniPrese}</td>
                                    <td style={{ textAlign: 'center', color: '#27ae60' }}>{p.espulsioniSubite}</td>
                                    <td style={{ textAlign: 'right' }}>
                                        <button onClick={() => handleDelete(p.id)} className="btn-danger" style={{ padding: '5px 10px', fontSize: '12px' }}>Rimuovi</button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

export default Roster;