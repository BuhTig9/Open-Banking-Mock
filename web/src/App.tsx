import React, { useState, useEffect } from 'react';

interface Account {
  id: string;
  name: string;
  type: string;
  balance: number;
}

interface Transaction {
  id: string;
  account_id: string;
  date: string;
  name: string;
  amount: number;
}

const API_BASE = 'http://localhost:3000';

export default function App() {
  const [showModal, setShowModal] = useState(false);
  const [persona, setPersona] = useState<string | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [error, setError] = useState<string | null>(null);

  // When persona changes, perform the linking flow
  useEffect(() => {
    async function runFlow() {
      if (!persona) return;
      setError(null);
      try {
        // Step 1: create link token (not used further but included for parity)
        await fetch(`${API_BASE}/link/token/create`, {
          method: 'POST'
        });
        // Step 2: exchange public token (persona) for access token
        const exchRes = await fetch(`${API_BASE}/item/public_token/exchange`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({ public_token: persona })
        });
        if (!exchRes.ok) {
          const err = await exchRes.json();
          throw new Error(err.error || 'failed to exchange token');
        }
        const { access_token } = await exchRes.json();
        setAccessToken(access_token);
        // Step 3: fetch accounts
        const accRes = await fetch(`${API_BASE}/accounts`, {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        });
        if (!accRes.ok) {
          throw new Error('failed to fetch accounts');
        }
        const accData = await accRes.json();
        setAccounts(accData.accounts);
        // Step 4: fetch transactions for last 90 days
        const end = new Date();
        const start = new Date();
        start.setDate(end.getDate() - 90);
        const params = new URLSearchParams({
          start: start.toISOString().substring(0, 10),
          end: end.toISOString().substring(0, 10)
        });
        const txRes = await fetch(`${API_BASE}/transactions?${params.toString()}`, {
          headers: {
            Authorization: `Bearer ${access_token}`
          }
        });
        if (!txRes.ok) {
          throw new Error('failed to fetch transactions');
        }
        const txData = await txRes.json();
        setTransactions(txData.transactions);
      } catch (err: any) {
        setError(err.message);
      }
    }
    runFlow();
  }, [persona]);

  return (
    <div>
      <button onClick={() => setShowModal(true)}>Link</button>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      {accounts.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Accounts</h2>
          <table border={1} cellPadding={4} cellSpacing={0}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Name</th>
                <th>Type</th>
                <th>Balance</th>
              </tr>
            </thead>
            <tbody>
              {accounts.map(acc => (
                <tr key={acc.id}>
                  <td>{acc.id}</td>
                  <td>{acc.name}</td>
                  <td>{acc.type}</td>
                  <td>{acc.balance.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {transactions.length > 0 && (
        <div style={{ marginTop: '1rem' }}>
          <h2>Transactions</h2>
          <table border={1} cellPadding={4} cellSpacing={0}>
            <thead>
              <tr>
                <th>ID</th>
                <th>Account ID</th>
                <th>Date</th>
                <th>Name</th>
                <th>Amount</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map(tx => (
                <tr key={tx.id}>
                  <td>{tx.id}</td>
                  <td>{tx.account_id}</td>
                  <td>{tx.date}</td>
                  <td>{tx.name}</td>
                  <td>{tx.amount.toFixed(2)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {showModal && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
          onClick={() => setShowModal(false)}
        >
          <div
            style={{
              background: 'white',
              padding: '1rem',
              minWidth: '200px',
              cursor: 'default'
            }}
            onClick={e => e.stopPropagation()}
          >
            <h3>Select a persona</h3>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {['steady', 'seasonal', 'risky'].map(p => (
                <li key={p} style={{ margin: '0.5rem 0' }}>
                  <button
                    onClick={() => {
                      setPersona(p);
                      setShowModal(false);
                    }}
                  >
                    {p}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}